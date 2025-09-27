import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';

// Load environment variables
config();

// Import our new systems
import { dbManager } from '../database/connection.js';
import { queueManager } from '../queue/QueueManager.js';
import { authService } from '../auth/AuthService.js';
import { WorkflowWebSocketServer } from '../websocket/WebSocketServer.js';
import { config as envConfig, validateConfig } from '../config/environment.js';

// Import existing workflow functionality
import ExecutionContext from './ExecutionContext.js';

const app = express();
const port = envConfig.general.port;

// Create HTTP server for WebSocket integration
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    error: envConfig.general.nodeEnv === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Initialize systems
let wsServer;

async function initializeSystems() {
  try {
    console.log('🚀 Initializing AI LLM RPA System...');
    
    // Validate configuration
    const configValidation = validateConfig();
    if (!configValidation.isValid) {
      console.warn('⚠️ Configuration warnings:', configValidation.errors);
    }

    // Initialize database
    console.log('📊 Initializing database...');
    await dbManager.initialize();
    console.log('✅ Database initialized');

    // Initialize queue system
    console.log('🚀 Initializing queue system...');
    await queueManager.initialize();
    console.log('✅ Queue system initialized');

    // Initialize WebSocket server
    console.log('🔌 Initializing WebSocket server...');
    wsServer = new WorkflowWebSocketServer(server);
    console.log('✅ WebSocket server initialized');

    console.log('🎉 All systems initialized successfully!');
    
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await dbManager.healthCheck();
    const queueHealth = await queueManager.healthCheck();
    const wsStats = wsServer?.getStats() || { status: 'unavailable' };
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: envConfig.general.nodeEnv,
      services: {
        database: dbHealth,
        queue: queueHealth,
        websocket: wsStats
      }
    };

    // Check if any service is unhealthy
    if (!dbHealth || queueHealth.status !== 'healthy') {
      health.status = 'unhealthy';
      res.status(503);
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/auth/change-password', authService.createAuthMiddleware(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.auth.userId, currentPassword, newPassword);
    res.json({
      success: true,
      user: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/auth/profile', authService.createAuthMiddleware(), async (req, res) => {
  try {
    const profile = await authService.getProfile(req.auth.userId);
    res.json({
      success: true,
      user: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Queue management routes (admin only)
app.get('/api/admin/queue-stats', authService.createAuthMiddleware({ requiredRole: 'admin' }), async (req, res) => {
  try {
    const stats = {};
    const queueNames = ['workflow-execution', 'email-sending', 'webhook-processing', 'file-processing', 'llm-processing'];
    
    for (const queueName of queueNames) {
      try {
        stats[queueName] = await queueManager.getQueueStats(queueName);
      } catch (error) {
        stats[queueName] = { error: error.message };
      }
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WebSocket stats (admin only)
app.get('/api/admin/websocket-stats', authService.createAuthMiddleware({ requiredRole: 'admin' }), (req, res) => {
  try {
    const stats = wsServer?.getStats() || { error: 'WebSocket server not available' };
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Protected workflow routes
const workflowRouter = express.Router();

// Apply authentication to all workflow routes
workflowRouter.use(authService.createAuthMiddleware());

// Get all workflows
workflowRouter.get('/workflows', async (req, res) => {
  try {
    const result = await dbManager.query(`
      SELECT id, name, description, status, created_at, updated_at
      FROM workflows
      WHERE created_by = $1 OR $2 = 'admin'
      ORDER BY updated_at DESC
    `, [req.auth.userId, req.auth.role]);
    
    res.json({
      success: true,
      workflows: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflow by ID
workflowRouter.get('/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbManager.query(`
      SELECT * FROM workflows 
      WHERE id = $1 AND (created_by = $2 OR $3 = 'admin')
    `, [id, req.auth.userId, req.auth.role]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }
    
    res.json({
      success: true,
      workflow: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Save/Create workflow
workflowRouter.post('/workflows', async (req, res) => {
  try {
    const { name, description, nodes, edges } = req.body;
    
    const result = await dbManager.query(`
      INSERT INTO workflows (name, description, nodes_data, edges_data, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, created_at
    `, [
      name || 'Untitled Workflow',
      description || 'Workflow created via API',
      JSON.stringify(nodes || []),
      JSON.stringify(edges || []),
      'active',
      req.auth.userId
    ]);
    
    res.json({
      success: true,
      workflow: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update workflow
workflowRouter.put('/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, nodes, edges, status } = req.body;
    
    const result = await dbManager.query(`
      UPDATE workflows 
      SET name = $1, description = $2, nodes_data = $3, edges_data = $4, status = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND (created_by = $7 OR $8 = 'admin')
      RETURNING id, name, updated_at
    `, [
      name,
      description,
      JSON.stringify(nodes || []),
      JSON.stringify(edges || []),
      status || 'active',
      id,
      req.auth.userId,
      req.auth.role
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found or not authorized'
      });
    }
    
    res.json({
      success: true,
      workflow: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enhanced workflow execution with queue
workflowRouter.post('/workflows/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const triggerData = req.body;
    
    // Get workflow
    const workflow = await dbManager.query('SELECT * FROM workflows WHERE id = $1', [id]);
    if (workflow.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    // Create execution context with proper constructor
    const executionId = randomUUID();
    const executionContext = new ExecutionContext(id, executionId);
    
    // Set initial variables
    executionContext.setVariable('userId', req.auth.userId);
    executionContext.setVariable('triggeredBy', 'manual');
    executionContext.setVariable('triggerData', triggerData);

    // Add to queue instead of executing directly
    const job = await queueManager.addWorkflowExecution(
      id, 
      executionContext.executionId, 
      {
        userId: req.auth.userId,
        triggeredBy: 'manual',
        triggerData
      }
    );

    // Broadcast to WebSocket subscribers
    if (wsServer) {
      wsServer.broadcastWorkflowStatus(id, executionContext.executionId, 'queued', {
        jobId: job.id,
        queuedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      executionId: executionContext.executionId,
      jobId: job.id,
      status: 'queued',
      message: 'Workflow execution queued successfully'
    });
    
  } catch (error) {
    console.error('Error queuing workflow execution:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflow execution status
workflowRouter.get('/executions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const execution = await dbManager.query(`
      SELECT we.*, w.name as workflow_name 
      FROM workflow_executions we
      JOIN workflows w ON we.workflow_id = w.id
      WHERE we.id = $1
    `, [id]);
    
    if (execution.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }

    res.json({
      success: true,
      execution: execution.rows[0]
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mount workflow router
app.use('/api', workflowRouter);

// Shutdown flag to prevent multiple shutdowns
let isShuttingDown = false;

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log(`Already shutting down, ignoring ${signal}`);
    return;
  }
  
  isShuttingDown = true;
  console.log(`🔄 Received ${signal}, starting graceful shutdown...`);
  
  try {
    // Close WebSocket server
    if (wsServer) {
      console.log('🔄 Shutting down WebSocket server...');
      await wsServer.close();
    }

    // Close queue system
    console.log('🔄 Shutting down queue manager...');
    await queueManager.close();

    // Close database connections
    console.log('🔄 Shutting down database connections...');
    await dbManager.close();

    // Close HTTP server
    console.log('🔄 Shutting down HTTP server...');
    server.close(() => {
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    });

    // Force exit after 15 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown due to timeout');
      process.exit(1);
    }, 15000);

  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
async function startServer() {
  try {
    await initializeSystems();
    
    server.listen(port, () => {
      console.log('🎉 AI LLM RPA System Started Successfully!');
      console.log('');
      console.log('📊 Server Information:');
      console.log(`   🌐 HTTP Server: http://localhost:${port}`);
      console.log(`   🔌 WebSocket Server: ws://localhost:${port}/ws`);
      console.log(`   🏥 Health Check: http://localhost:${port}/api/health`);
      console.log('');
      console.log('🔐 Authentication:');
      console.log(`   📝 Register: POST http://localhost:${port}/api/auth/register`);
      console.log(`   🔑 Login: POST http://localhost:${port}/api/auth/login`);
      console.log('');
      console.log('⚙️ System Features:');
      console.log('   ✅ PostgreSQL Database with Connection Pool');
      console.log('   ✅ Redis Queue System (BullMQ)');
      console.log('   ✅ JWT Authentication');
      console.log('   ✅ Real-time WebSocket Updates');
      console.log('   ✅ Rate Limiting & Security Headers');
      console.log('   ✅ Graceful Shutdown Handling');
      console.log('');
      console.log('🚀 Ready to process workflows!');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();