#!/usr/bin/env node
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { randomUUID } from 'crypto';

// Load environment variables first
config();

console.log('🚀 Starting AI LLM RPA System...\n');

// Import our systems with error handling
let dbManager, queueManager, authService, WorkflowWebSocketServer, envConfig;

try {
  const dbModule = await import('./src/database/connection.js');
  dbManager = dbModule.dbManager;
  console.log('✅ Database module loaded');
} catch (error) {
  console.error('❌ Database module failed:', error.message);
  process.exit(1);
}

try {
  const queueModule = await import('./src/queue/QueueManager.js');
  queueManager = queueModule.queueManager;
  console.log('✅ Queue module loaded');
} catch (error) {
  console.error('❌ Queue module failed:', error.message);
  process.exit(1);
}

try {
  const authModule = await import('./src/auth/AuthService.js');
  authService = authModule.authService;
  console.log('✅ Auth module loaded');
} catch (error) {
  console.error('❌ Auth module failed:', error.message);
  process.exit(1);
}

try {
  const wsModule = await import('./src/websocket/WebSocketServer.js');
  WorkflowWebSocketServer = wsModule.WorkflowWebSocketServer;
  console.log('✅ WebSocket module loaded');
} catch (error) {
  console.error('❌ WebSocket module failed:', error.message);
  process.exit(1);
}

try {
  const configModule = await import('./src/config/environment.js');
  envConfig = configModule.config;
  console.log('✅ Config module loaded');
} catch (error) {
  console.error('❌ Config module failed:', error.message);
  process.exit(1);
}

// Import ExecutionContext
let ExecutionContext;
try {
  const contextModule = await import('./src/backend/ExecutionContext.js');
  ExecutionContext = contextModule.default;
  console.log('✅ Execution context loaded');
} catch (error) {
  console.error('❌ Execution context failed:', error.message);
  process.exit(1);
}

const app = express();
const port = envConfig.general.port;
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

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

let wsServer;
let systemsInitialized = false;

// Initialize systems with timeout
async function initializeSystems() {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('System initialization timeout')), 30000)
  );

  const init = async () => {
    console.log('\n🔧 Initializing systems...');
    
    // Initialize database
    console.log('📊 Initializing database...');
    await dbManager.initialize();
    console.log('✅ Database initialized');

    // Initialize queue system with timeout
    console.log('🚀 Initializing queue system...');
    await queueManager.initialize();
    console.log('✅ Queue system initialized');

    // Initialize WebSocket server
    console.log('🔌 Initializing WebSocket server...');
    wsServer = new WorkflowWebSocketServer(server);
    console.log('✅ WebSocket server initialized');

    systemsInitialized = true;
    console.log('🎉 All systems initialized!\n');
  };

  return Promise.race([init(), timeout]);
}

// Health check endpoint (works even if systems aren't initialized)
app.get('/api/health', async (req, res) => {
  try {
    if (!systemsInitialized) {
      return res.status(503).json({
        status: 'initializing',
        message: 'Systems are still starting up',
        timestamp: new Date().toISOString()
      });
    }

    const dbHealth = await dbManager.healthCheck();
    const queueHealth = await queueManager.healthCheck();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: envConfig.general.nodeEnv,
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        queue: queueHealth,
        websocket: wsServer?.getStats() || { status: 'unavailable' }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Basic info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: 'AI LLM RPA System',
    version: '1.0.0',
    status: systemsInitialized ? 'running' : 'starting',
    features: [
      'Workflow Automation',
      'LLM Integration',
      'Queue Processing',
      'Real-time Updates',
      'JWT Authentication'
    ]
  });
});

// Authentication routes (only if systems are initialized)
app.post('/api/auth/register', async (req, res) => {
  if (!systemsInitialized) {
    return res.status(503).json({ error: 'System still initializing' });
  }
  
  try {
    const result = await authService.register(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!systemsInitialized) {
    return res.status(503).json({ error: 'System still initializing' });
  }

  try {
    const result = await authService.login(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

// Middleware to check if systems are initialized
function requireInitialized(req, res, next) {
  if (!systemsInitialized) {
    return res.status(503).json({ error: 'System still initializing' });
  }
  next();
}

// Middleware to authenticate JWT tokens
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    console.log('Token verification error:', error.message);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// Workflow API Routes
app.get('/api/workflows', requireInitialized, authenticateToken, async (req, res) => {
  try {
    const result = await dbManager.pool.query(
      'SELECT id, name, description, nodes_data, edges_data, status, created_at, updated_at FROM workflows WHERE created_by = $1 ORDER BY updated_at DESC',
      [req.user.userId]
    );
    // Transform to expected format
    const workflows = result.rows.map(row => ({
      ...row,
      workflow_data: {
        nodes: row.nodes_data || [],
        edges: row.edges_data || []
      }
    }));
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

app.get('/api/workflows/:id', requireInitialized, authenticateToken, async (req, res) => {
  try {
    const result = await dbManager.pool.query(
      'SELECT * FROM workflows WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const workflow = result.rows[0];
    res.json({
      ...workflow,
      workflow_data: {
        nodes: workflow.nodes_data || [],
        edges: workflow.edges_data || []
      }
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

app.post('/api/workflows', requireInitialized, authenticateToken, async (req, res) => {
  const { name, description, workflow_data } = req.body;
  
  try {
    const nodes = workflow_data?.nodes || [];
    const edges = workflow_data?.edges || [];
    
    const result = await dbManager.pool.query(
      'INSERT INTO workflows (id, name, description, nodes_data, edges_data, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
      [randomUUID(), name, description, JSON.stringify(nodes), JSON.stringify(edges), req.user.userId]
    );
    
    const workflow = result.rows[0];
    res.status(201).json({
      ...workflow,
      workflow_data: {
        nodes: workflow.nodes_data || [],
        edges: workflow.edges_data || []
      }
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

app.put('/api/workflows/:id', requireInitialized, authenticateToken, async (req, res) => {
  const { name, description, workflow_data } = req.body;
  
  try {
    const nodes = workflow_data?.nodes || [];
    const edges = workflow_data?.edges || [];
    
    const result = await dbManager.pool.query(
      'UPDATE workflows SET name = $1, description = $2, nodes_data = $3, edges_data = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND created_by = $6 RETURNING *',
      [name, description, JSON.stringify(nodes), JSON.stringify(edges), req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const workflow = result.rows[0];
    res.json({
      ...workflow,
      workflow_data: {
        nodes: workflow.nodes_data || [],
        edges: workflow.edges_data || []
      }
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

app.post('/api/workflows/:id/execute', requireInitialized, authenticateToken, async (req, res) => {
  try {
    // Verify workflow ownership
    const workflowResult = await dbManager.pool.query(
      'SELECT * FROM workflows WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.userId]
    );
    
    if (workflowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const workflow = workflowResult.rows[0];
    const executionId = randomUUID();
    
    // Create execution record
    await dbManager.pool.query(
      'INSERT INTO workflow_executions (id, workflow_id, status, started_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [executionId, req.params.id, 'queued']
    );
    
    // Queue the workflow for execution
    await queueManager.addWorkflowExecution(
      req.params.id, 
      executionId, 
      {
        userId: req.user.userId,
        workflowData: {
          nodes: workflow.nodes_data || [],
          edges: workflow.edges_data || []
        },
        ...req.body.context || {}
      }
    );
    
    res.json({ 
      success: true, 
      executionId,
      status: 'queued',
      message: 'Workflow execution queued successfully' 
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

app.get('/api/workflows/:id/executions', requireInitialized, authenticateToken, async (req, res) => {
  try {
    const result = await dbManager.pool.query(
      'SELECT we.* FROM workflow_executions we JOIN workflows w ON we.workflow_id = w.id WHERE w.id = $1 AND w.created_by = $2 ORDER BY we.started_at DESC',
      [req.params.id, req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

app.get('/api/workflows/:id/executions/:executionId', requireInitialized, authenticateToken, async (req, res) => {
  try {
    const result = await dbManager.pool.query(
      'SELECT we.* FROM workflow_executions we JOIN workflows w ON we.workflow_id = w.id WHERE we.id = $1 AND w.created_by = $2',
      [req.params.executionId, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    // Also get execution logs
    const logsResult = await dbManager.pool.query(
      'SELECT * FROM execution_logs WHERE execution_id = $1 ORDER BY created_at',
      [req.params.executionId]
    );
    
    res.json({
      ...result.rows[0],
      logs: logsResult.rows
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    error: envConfig.general.nodeEnv === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n🔄 Received ${signal}, shutting down gracefully...`);
  
  try {
    if (wsServer) {
      await wsServer.close();
      console.log('✅ WebSocket server closed');
    }

    if (systemsInitialized && queueManager) {
      await queueManager.close();
      console.log('✅ Queue manager closed');
    }

    if (systemsInitialized && dbManager) {
      await dbManager.close();
      console.log('✅ Database closed');
    }

    server.close(() => {
      console.log('✅ HTTP server closed');
      console.log('👋 Goodbye!');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    // Start HTTP server first
    server.listen(port, () => {
      console.log(`\n🌐 Server running on http://localhost:${port}`);
      console.log(`🏥 Health check: http://localhost:${port}/api/health`);
      console.log(`ℹ️  System info: http://localhost:${port}/api/info\n`);
    });

    // Initialize systems after server is listening
    await initializeSystems();
    
    console.log('🎯 Production Features Active:');
    console.log('   ✅ PostgreSQL Database');
    console.log('   ✅ Redis Queue System');
    console.log('   ✅ JWT Authentication');
    console.log('   ✅ WebSocket Real-time');
    console.log('   ✅ Rate Limiting');
    console.log('   ✅ Security Headers');
    console.log('\n🚀 Ready for production workloads!');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();