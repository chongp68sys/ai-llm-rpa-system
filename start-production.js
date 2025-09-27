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