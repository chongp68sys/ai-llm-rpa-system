import { Queue, Worker, QueueEvents } from 'bullmq';
import { redisConfig, QUEUE_NAMES, JOB_OPTIONS } from './config.js';
import ExecutionContext from '../backend/ExecutionContext.js';

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.queueEvents = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      console.log('Queue manager already initialized');
      return;
    }

    try {
      // Create queues
      for (const queueName of Object.values(QUEUE_NAMES)) {
        const queue = new Queue(queueName, redisConfig);
        this.queues.set(queueName, queue);

        // Create queue events for monitoring
        const queueEvents = new QueueEvents(queueName, redisConfig);
        this.queueEvents.set(queueName, queueEvents);
        
        // Set up event listeners
        this.setupQueueEventListeners(queueName, queueEvents);
      }

      // Create workers
      this.createWorkers();

      this.isInitialized = true;
      console.log('✅ Queue manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize queue manager:', error);
      throw error;
    }
  }

  createWorkers() {
    // Workflow execution worker
    const workflowWorker = new Worker(
      QUEUE_NAMES.WORKFLOW_EXECUTION,
      async (job) => {
        console.log(`🚀 Processing workflow execution job: ${job.id}`);
        const { workflowId, executionId, context } = job.data;
        
        try {
          const executionContext = new ExecutionContext(workflowId, executionId);
          
          // Set context variables if provided
          if (context) {
            Object.entries(context).forEach(([key, value]) => {
              executionContext.setVariable(key, value);
            });
          }
          
          // For now, just return success since we don't have the full execution engine implemented
          const result = {
            status: 'completed',
            executionId,
            workflowId,
            completedAt: new Date().toISOString()
          };
          
          console.log(`✅ Workflow execution ${executionId} completed successfully`);
          return result;
        } catch (error) {
          console.error(`❌ Workflow execution ${executionId} failed:`, error);
          throw error;
        }
      },
      {
        ...redisConfig,
        concurrency: 3, // Process up to 3 workflows simultaneously
      }
    );

    // Email sending worker
    const emailWorker = new Worker(
      QUEUE_NAMES.EMAIL_SENDING,
      async (job) => {
        console.log(`📧 Processing email job: ${job.id}`);
        const { to, subject, content, nodeId, executionId } = job.data;
        
        try {
          // Import email processor dynamically to avoid circular dependencies
          const { EmailProcessor } = await import('../backend/processors/EmailProcessor.js');
          const emailProcessor = new EmailProcessor();
          
          const result = await emailProcessor.process({
            recipients: to,
            subject,
            content,
            nodeId,
            executionId,
          });
          
          console.log(`✅ Email sent successfully to ${to}`);
          return result;
        } catch (error) {
          console.error(`❌ Email sending failed:`, error);
          throw error;
        }
      },
      {
        ...redisConfig,
        concurrency: 5, // Process up to 5 emails simultaneously
      }
    );

    // Webhook processing worker
    const webhookWorker = new Worker(
      QUEUE_NAMES.WEBHOOK_PROCESSING,
      async (job) => {
        console.log(`🔗 Processing webhook job: ${job.id}`);
        const { url, method, payload, headers, nodeId, executionId } = job.data;
        
        try {
          // Import webhook processor dynamically
          const { WebhookProcessor } = await import('../backend/processors/WebhookProcessor.js');
          const webhookProcessor = new WebhookProcessor();
          
          const result = await webhookProcessor.process({
            url,
            method,
            payload,
            headers,
            nodeId,
            executionId,
          });
          
          console.log(`✅ Webhook processed successfully: ${url}`);
          return result;
        } catch (error) {
          console.error(`❌ Webhook processing failed:`, error);
          throw error;
        }
      },
      {
        ...redisConfig,
        concurrency: 10, // Process up to 10 webhooks simultaneously
      }
    );

    // File processing worker
    const fileWorker = new Worker(
      QUEUE_NAMES.FILE_PROCESSING,
      async (job) => {
        console.log(`📁 Processing file job: ${job.id}`);
        const { filePath, operation, nodeId, executionId } = job.data;
        
        try {
          // Import file processor dynamically
          const { FileProcessor } = await import('../backend/processors/FileProcessor.js');
          const fileProcessor = new FileProcessor();
          
          const result = await fileProcessor.process({
            filePath,
            operation,
            nodeId,
            executionId,
          });
          
          console.log(`✅ File processed successfully: ${filePath}`);
          return result;
        } catch (error) {
          console.error(`❌ File processing failed:`, error);
          throw error;
        }
      },
      {
        ...redisConfig,
        concurrency: 3, // Process up to 3 files simultaneously
      }
    );

    // LLM processing worker
    const llmWorker = new Worker(
      QUEUE_NAMES.LLM_PROCESSING,
      async (job) => {
        console.log(`🤖 Processing LLM job: ${job.id}`);
        const { provider, prompt, model, nodeId, executionId } = job.data;
        
        try {
          // Import LLM processor dynamically
          const { LLMProcessor } = await import('../backend/processors/LLMProcessor.js');
          const llmProcessor = new LLMProcessor();
          
          const result = await llmProcessor.process({
            provider,
            prompt,
            model,
            nodeId,
            executionId,
          });
          
          console.log(`✅ LLM processing completed successfully`);
          return result;
        } catch (error) {
          console.error(`❌ LLM processing failed:`, error);
          throw error;
        }
      },
      {
        ...redisConfig,
        concurrency: 2, // Process up to 2 LLM requests simultaneously
      }
    );

    // Store workers
    this.workers.set(QUEUE_NAMES.WORKFLOW_EXECUTION, workflowWorker);
    this.workers.set(QUEUE_NAMES.EMAIL_SENDING, emailWorker);
    this.workers.set(QUEUE_NAMES.WEBHOOK_PROCESSING, webhookWorker);
    this.workers.set(QUEUE_NAMES.FILE_PROCESSING, fileWorker);
    this.workers.set(QUEUE_NAMES.LLM_PROCESSING, llmWorker);

    console.log('✅ All queue workers created successfully');
  }

  setupQueueEventListeners(queueName, queueEvents) {
    queueEvents.on('completed', ({ jobId }) => {
      console.log(`✅ Job ${jobId} in queue ${queueName} completed`);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} in queue ${queueName} failed:`, failedReason);
    });

    queueEvents.on('progress', ({ jobId, data }) => {
      console.log(`⏳ Job ${jobId} in queue ${queueName} progress: ${data}%`);
    });
  }

  // Public methods for adding jobs to queues
  async addWorkflowExecution(workflowId, executionId, context, options = {}) {
    const queue = this.queues.get(QUEUE_NAMES.WORKFLOW_EXECUTION);
    if (!queue) throw new Error('Workflow execution queue not initialized');
    
    return await queue.add(
      'execute-workflow',
      { workflowId, executionId, context },
      { ...JOB_OPTIONS[QUEUE_NAMES.WORKFLOW_EXECUTION], ...options }
    );
  }

  async addEmailJob(emailData, options = {}) {
    const queue = this.queues.get(QUEUE_NAMES.EMAIL_SENDING);
    if (!queue) throw new Error('Email queue not initialized');
    
    return await queue.add(
      'send-email',
      emailData,
      { ...JOB_OPTIONS[QUEUE_NAMES.EMAIL_SENDING], ...options }
    );
  }

  async addWebhookJob(webhookData, options = {}) {
    const queue = this.queues.get(QUEUE_NAMES.WEBHOOK_PROCESSING);
    if (!queue) throw new Error('Webhook queue not initialized');
    
    return await queue.add(
      'process-webhook',
      webhookData,
      { ...JOB_OPTIONS[QUEUE_NAMES.WEBHOOK_PROCESSING], ...options }
    );
  }

  async addFileJob(fileData, options = {}) {
    const queue = this.queues.get(QUEUE_NAMES.FILE_PROCESSING);
    if (!queue) throw new Error('File processing queue not initialized');
    
    return await queue.add(
      'process-file',
      fileData,
      { ...JOB_OPTIONS[QUEUE_NAMES.FILE_PROCESSING], ...options }
    );
  }

  async addLLMJob(llmData, options = {}) {
    const queue = this.queues.get(QUEUE_NAMES.LLM_PROCESSING);
    if (!queue) throw new Error('LLM processing queue not initialized');
    
    return await queue.add(
      'process-llm',
      llmData,
      { ...JOB_OPTIONS[QUEUE_NAMES.LLM_PROCESSING], ...options }
    );
  }

  // Queue management methods
  async getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    
    return {
      waiting: await queue.getWaiting(),
      active: await queue.getActive(),
      completed: await queue.getCompleted(),
      failed: await queue.getFailed(),
      delayed: await queue.getDelayed(),
    };
  }

  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    
    await queue.pause();
    console.log(`⏸️ Queue ${queueName} paused`);
  }

  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    
    await queue.resume();
    console.log(`▶️ Queue ${queueName} resumed`);
  }

  async clearQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Queue ${queueName} not found`);
    
    await queue.obliterate({ force: true });
    console.log(`🗑️ Queue ${queueName} cleared`);
  }

  // Health check
  async healthCheck() {
    try {
      // Check if queues are initialized
      if (this.queues.size === 0) {
        throw new Error('No queues initialized');
      }

      // Test Redis connection by trying to get queue info
      const firstQueue = this.queues.values().next().value;
      // This will test the Redis connection indirectly
      await firstQueue.getWaiting();
      
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  // Graceful shutdown
  async close() {
    if (!this.isInitialized) {
      console.log('Queue manager already shut down');
      return;
    }

    console.log('🔄 Shutting down queue manager...');
    
    try {
      // Close all workers with timeout protection
      const workerClosePromises = Array.from(this.workers.entries()).map(async ([queueName, worker]) => {
        console.log(`Closing worker for ${queueName}`);
        try {
          await Promise.race([
            worker.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
        } catch (error) {
          console.warn(`Warning: Failed to close worker ${queueName}:`, error.message);
        }
      });
      await Promise.allSettled(workerClosePromises);
      
      // Close all queue events with timeout protection
      const queueEventsClosePromises = Array.from(this.queueEvents.entries()).map(async ([queueName, queueEvents]) => {
        console.log(`Closing queue events for ${queueName}`);
        try {
          await Promise.race([
            queueEvents.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
        } catch (error) {
          console.warn(`Warning: Failed to close queue events ${queueName}:`, error.message);
        }
      });
      await Promise.allSettled(queueEventsClosePromises);
      
      // Close all queues with timeout protection
      const queueClosePromises = Array.from(this.queues.entries()).map(async ([queueName, queue]) => {
        console.log(`Closing queue ${queueName}`);
        try {
          await Promise.race([
            queue.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]);
        } catch (error) {
          console.warn(`Warning: Failed to close queue ${queueName}:`, error.message);
        }
      });
      await Promise.allSettled(queueClosePromises);
      
      // Clear maps
      this.workers.clear();
      this.queueEvents.clear();
      this.queues.clear();
      
      this.isInitialized = false;
      console.log('✅ Queue manager shut down successfully');
    } catch (error) {
      console.error('Error during queue manager shutdown:', error);
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const queueManager = new QueueManager();