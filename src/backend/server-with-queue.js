import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Import queue system
import { workflowQueue, nodeQueue, scheduledQueue, getQueueStats, checkRedisHealth } from '../queue/WorkflowQueue.js';
import { workflowWorker, nodeWorker, scheduledWorker, closeWorkers } from '../queue/WorkflowWorker.js';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database configuration
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME || 'ai_llm_rpa_system',
  user: process.env.DATABASE_USER || 'paul',
  password: process.env.DATABASE_PASSWORD || '',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    // Check Redis connection
    const redisHealthy = await checkRedisHealth();
    
    // Get queue stats
    const queueStats = await getQueueStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: redisHealthy ? 'connected' : 'disconnected',
        queues: queueStats
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Queue monitoring endpoints
app.get('/api/queues/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Workflow execution endpoint (with queue)
app.post('/api/workflows/:id/execute', async (req, res) => {
  const workflowId = req.params.id;
  const { context = {}, triggeredBy = 'manual' } = req.body;
  
  try {
    // Create workflow execution record
    const executionResult = await pool.query(
      'INSERT INTO workflow_executions (workflow_id, status, triggered_by, execution_context, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id',
      [workflowId, 'queued', triggeredBy, JSON.stringify(context)]
    );
    
    const executionId = executionResult.rows[0].id;
    
    // Add workflow to queue
    const job = await workflowQueue.add('execute-workflow', {
      workflowId,
      executionId,
      context,
      triggeredBy
    }, {
      priority: triggeredBy === 'scheduled' ? 5 : 10, // Higher priority for manual executions
    });
    
    res.json({
      success: true,
      executionId,
      jobId: job.id,
      status: 'queued',
      message: 'Workflow execution queued successfully'
    });
    
  } catch (error) {
    console.error('Error queueing workflow execution:', error);
    res.status(500).json({
      error: 'Failed to queue workflow execution',
      details: error.message
    });
  }
});

// Get workflow execution status
app.get('/api/workflows/:id/executions/:executionId', async (req, res) => {
  const { id: workflowId, executionId } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM workflow_executions WHERE id = $1 AND workflow_id = $2',
      [executionId, workflowId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    const execution = result.rows[0];
    
    // Get node executions for this workflow execution
    const nodeExecutions = await pool.query(
      'SELECT * FROM node_executions WHERE workflow_execution_id = $1 ORDER BY started_at',
      [executionId]
    );
    
    res.json({
      ...execution,
      nodeExecutions: nodeExecutions.rows
    });
    
  } catch (error) {
    console.error('Error fetching execution details:', error);
    res.status(500).json({
      error: 'Failed to fetch execution details',
      details: error.message
    });
  }
});

// Get recent workflow executions
app.get('/api/workflows/:id/executions', async (req, res) => {
  const workflowId = req.params.id;
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const result = await pool.query(
      'SELECT * FROM workflow_executions WHERE workflow_id = $1 ORDER BY created_at DESC LIMIT $2',
      [workflowId, limit]
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({
      error: 'Failed to fetch executions',
      details: error.message
    });
  }
});

// Manual node execution (for testing)
app.post('/api/nodes/execute', async (req, res) => {
  const { nodeId, nodeType, nodeData, context = {} } = req.body;
  
  try {
    // Create temporary execution record
    const testWorkflowId = uuidv4();
    const executionResult = await pool.query(
      'INSERT INTO workflow_executions (workflow_id, status, triggered_by, execution_context, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id',
      [testWorkflowId, 'queued', 'manual', JSON.stringify(context)]
    );
    
    const executionId = executionResult.rows[0].id;
    
    // Add node to queue
    const job = await nodeQueue.add('execute-node', {
      nodeId: nodeId || uuidv4(),
      nodeType,
      nodeData,
      context,
      executionId
    });
    
    res.json({
      success: true,
      jobId: job.id,
      executionId,
      status: 'queued',
      message: 'Node execution queued successfully'
    });
    
  } catch (error) {
    console.error('Error queueing node execution:', error);
    res.status(500).json({
      error: 'Failed to queue node execution',
      details: error.message
    });
  }
});

// Schedule workflow (simplified scheduler)
app.post('/api/workflows/:id/schedule', async (req, res) => {
  const workflowId = req.params.id;
  const { cronExpression, name, context = {}, isActive = true } = req.body;
  
  try {
    // Create scheduled trigger  
    const result = await pool.query(
      'INSERT INTO scheduled_triggers (workflow_id, cron_expression, is_active, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id',
      [workflowId, cronExpression, isActive]
    );
    
    const triggerId = result.rows[0].id;
    
    // For demo purposes, add to scheduled queue (in production, use a proper cron scheduler)
    const job = await scheduledQueue.add('scheduled-workflow', {
      triggerId,
      workflowId
    }, {
      delay: 60000, // Execute in 1 minute (demo)
      repeat: { pattern: cronExpression }
    });
    
    res.json({
      success: true,
      triggerId,
      jobId: job.id,
      message: 'Workflow scheduled successfully'
    });
    
  } catch (error) {
    console.error('Error scheduling workflow:', error);
    res.status(500).json({
      error: 'Failed to schedule workflow',
      details: error.message
    });
  }
});

// CRUD endpoints for workflows
app.get('/api/workflows', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, workflow_data, created_at, updated_at, is_active FROM workflows ORDER BY updated_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

app.get('/api/workflows/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workflows WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

app.post('/api/workflows', async (req, res) => {
  const { name, description, workflowData } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO workflows (name, description, workflow_data, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      [name, description, JSON.stringify(workflowData)]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

app.put('/api/workflows/:id', async (req, res) => {
  const { name, description, workflowData } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE workflows SET name = $1, description = $2, workflow_data = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, description, JSON.stringify(workflowData), req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Start the server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
    
    // Test Redis connection
    const redisHealthy = await checkRedisHealth();
    console.log(`✅ Redis connection: ${redisHealthy ? 'healthy' : 'failed'}`);
    
    // Start queue workers (they're already started when imported)
    console.log('✅ Queue workers initialized');
    
    // Start Express server
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/api/health`);
      console.log(`📈 Queue stats: http://localhost:${port}/api/queues/stats`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  await closeWorkers();
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  await closeWorkers();
  await pool.end();
  process.exit(0);
});

// Start the server
startServer();