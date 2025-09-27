import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from 'dotenv';

// Load environment variables
config();

// Redis connection
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null, // Required for BullMQ
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
});

// Workflow execution queue
export const workflowQueue = new Queue('workflow-execution', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
  },
});

// Node execution queue for individual node processing
export const nodeQueue = new Queue('node-execution', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000,
    },
    removeOnComplete: 200,
    removeOnFail: 100,
  },
});

// Scheduled workflows queue
export const scheduledQueue = new Queue('scheduled-workflows', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 50,
    removeOnFail: 25,
  },
});

// Queue status monitoring
export const getQueueStats = async () => {
  try {
    const [workflowWaiting, workflowActive, workflowCompleted, workflowFailed] = await Promise.all([
      workflowQueue.getWaiting(),
      workflowQueue.getActive(),
      workflowQueue.getCompleted(),
      workflowQueue.getFailed(),
    ]);

    const [nodeWaiting, nodeActive, nodeCompleted, nodeFailed] = await Promise.all([
      nodeQueue.getWaiting(),
      nodeQueue.getActive(), 
      nodeQueue.getCompleted(),
      nodeQueue.getFailed(),
    ]);

    return {
      workflow: {
        waiting: workflowWaiting.length,
        active: workflowActive.length,
        completed: workflowCompleted.length,
        failed: workflowFailed.length,
      },
      node: {
        waiting: nodeWaiting.length,
        active: nodeActive.length,
        completed: nodeCompleted.length,
        failed: nodeFailed.length,
      },
      redis: {
        status: redisConnection.status,
      }
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
};

// Health check for Redis connection
export const checkRedisHealth = async () => {
  try {
    const pong = await redisConnection.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
};

// Graceful shutdown
export const closeQueues = async () => {
  console.log('🔄 Closing queue connections...');
  await Promise.all([
    workflowQueue.close(),
    nodeQueue.close(),
    scheduledQueue.close(),
    redisConnection.disconnect(),
  ]);
  console.log('✅ Queue connections closed');
};

// Export Redis connection for use in workers
export { redisConnection };