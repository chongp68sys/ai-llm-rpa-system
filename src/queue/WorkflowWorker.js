import { Worker } from 'bullmq';
import { redisConnection } from './WorkflowQueue.js';
import { executeWorkflow, executeNode } from '../backend/WorkflowProcessor.js';
import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';

// Load environment variables
config();

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

// Workflow execution worker
export const workflowWorker = new Worker('workflow-execution', async (job) => {
  const { workflowId, executionId, context, triggeredBy } = job.data;
  
  console.log(`🚀 Starting workflow execution: ${workflowId} (execution: ${executionId})`);
  
  try {
    // Update execution status to running
    await pool.query(
      'UPDATE workflow_executions SET status = $1, started_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['running', executionId]
    );

    // Execute the workflow
    const result = await executeWorkflow({
      workflowId,
      executionId,
      context: context || {},
      triggeredBy: triggeredBy || 'manual',
      pool
    });

    // Update execution status to completed
    await pool.query(
      'UPDATE workflow_executions SET status = $1, completed_at = CURRENT_TIMESTAMP, result = $2 WHERE id = $3',
      ['completed', JSON.stringify(result), executionId]
    );

    console.log(`✅ Workflow execution completed: ${workflowId}`);
    return result;

  } catch (error) {
    console.error(`❌ Workflow execution failed: ${workflowId}`, error);
    
    // Update execution status to failed
    await pool.query(
      'UPDATE workflow_executions SET status = $1, completed_at = CURRENT_TIMESTAMP, error_message = $2 WHERE id = $3',
      ['failed', error.message, executionId]
    );

    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 5, // Process up to 5 workflows concurrently
});

// Individual node execution worker
export const nodeWorker = new Worker('node-execution', async (job) => {
  const { nodeId, nodeType, nodeData, context, executionId } = job.data;
  
  console.log(`🔧 Processing node: ${nodeId} (type: ${nodeType})`);
  
  try {
    // Log node execution start
    const nodeExecutionId = await pool.query(
      'INSERT INTO node_executions (execution_id, node_id, node_type, status, input_data, started_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id',
      [executionId, nodeId, nodeType, 'running', JSON.stringify(nodeData)]
    );

    // Execute the node
    const result = await executeNode({
      nodeId,
      nodeType,
      nodeData,
      context,
      pool
    });

    // Update node execution status
    await pool.query(
      'UPDATE node_executions SET status = $1, completed_at = CURRENT_TIMESTAMP, output_data = $2 WHERE id = $3',
      ['completed', JSON.stringify(result), nodeExecutionId.rows[0].id]
    );

    console.log(`✅ Node execution completed: ${nodeId}`);
    return result;

  } catch (error) {
    console.error(`❌ Node execution failed: ${nodeId}`, error);
    
    // Update node execution status to failed
    await pool.query(
      'UPDATE node_executions SET status = $1, completed_at = CURRENT_TIMESTAMP, error_message = $2 WHERE id = $3',
      ['failed', error.message, nodeExecutionId?.rows[0]?.id]
    );

    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 10, // Process up to 10 nodes concurrently
});

// Scheduled workflow worker
export const scheduledWorker = new Worker('scheduled-workflows', async (job) => {
  const { triggerId, workflowId } = job.data;
  
  console.log(`⏰ Processing scheduled trigger: ${triggerId} for workflow: ${workflowId}`);
  
  try {
    // Get trigger details
    const trigger = await pool.query(
      'SELECT * FROM scheduled_triggers WHERE id = $1 AND is_active = true',
      [triggerId]
    );

    if (trigger.rows.length === 0) {
      throw new Error(`Trigger ${triggerId} not found or inactive`);
    }

    // Create new workflow execution
    const executionResult = await pool.query(
      'INSERT INTO workflow_executions (workflow_id, status, triggered_by, trigger_data, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id',
      [workflowId, 'queued', 'scheduled', JSON.stringify({ triggerId, cronExpression: trigger.rows[0].cron_expression })]
    );

    const executionId = executionResult.rows[0].id;

    // Queue the workflow for execution
    const { workflowQueue } = await import('./WorkflowQueue.js');
    await workflowQueue.add('execute-workflow', {
      workflowId,
      executionId,
      context: {},
      triggeredBy: 'scheduled'
    });

    console.log(`✅ Scheduled workflow queued: ${workflowId} (execution: ${executionId})`);
    return { executionId, workflowId };

  } catch (error) {
    console.error(`❌ Scheduled workflow failed: ${triggerId}`, error);
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 3, // Process up to 3 scheduled workflows concurrently
});

// Worker event handlers
workflowWorker.on('completed', (job) => {
  console.log(`✅ Workflow job ${job.id} completed`);
});

workflowWorker.on('failed', (job, err) => {
  console.error(`❌ Workflow job ${job.id} failed:`, err.message);
});

nodeWorker.on('completed', (job) => {
  console.log(`✅ Node job ${job.id} completed`);
});

nodeWorker.on('failed', (job, err) => {
  console.error(`❌ Node job ${job.id} failed:`, err.message);
});

scheduledWorker.on('completed', (job) => {
  console.log(`✅ Scheduled job ${job.id} completed`);
});

scheduledWorker.on('failed', (job, err) => {
  console.error(`❌ Scheduled job ${job.id} failed:`, err.message);
});

// Graceful shutdown
export const closeWorkers = async () => {
  console.log('🔄 Closing workers...');
  await Promise.all([
    workflowWorker.close(),
    nodeWorker.close(),
    scheduledWorker.close(),
  ]);
  console.log('✅ Workers closed');
  await pool.end();
};

export { pool };