import { config } from '../config/environment.js';

// BullMQ Redis connection configuration
export const redisConfig = {
  connection: {
    host: config.redis?.host || 'localhost',
    port: config.redis?.port || 6379,
    // Add auth if needed in production
    ...(config.redis?.password && { password: config.redis.password }),
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
  },
};

// Queue names
export const QUEUE_NAMES = {
  WORKFLOW_EXECUTION: 'workflow-execution',
  EMAIL_SENDING: 'email-sending',
  WEBHOOK_PROCESSING: 'webhook-processing',
  FILE_PROCESSING: 'file-processing',
  LLM_PROCESSING: 'llm-processing',
};

// Default job options
export const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 50, // Keep only 50 completed jobs
  removeOnFail: 100,    // Keep only 100 failed jobs
  attempts: 3,          // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',
    delay: 2000,        // Start with 2 second delay, then exponential backoff
  },
};

// Specific job options for different queue types
export const JOB_OPTIONS = {
  [QUEUE_NAMES.WORKFLOW_EXECUTION]: {
    ...DEFAULT_JOB_OPTIONS,
    delay: 0,           // Execute immediately
    priority: 10,       // High priority
  },
  [QUEUE_NAMES.EMAIL_SENDING]: {
    ...DEFAULT_JOB_OPTIONS,
    delay: 0,
    priority: 5,        // Medium priority
    attempts: 5,        // More retries for email
  },
  [QUEUE_NAMES.WEBHOOK_PROCESSING]: {
    ...DEFAULT_JOB_OPTIONS,
    delay: 0,
    priority: 8,        // High priority
  },
  [QUEUE_NAMES.FILE_PROCESSING]: {
    ...DEFAULT_JOB_OPTIONS,
    delay: 0,
    priority: 3,        // Lower priority
    attempts: 2,        // Fewer retries for file processing
  },
  [QUEUE_NAMES.LLM_PROCESSING]: {
    ...DEFAULT_JOB_OPTIONS,
    delay: 0,
    priority: 7,        // High priority
    attempts: 2,        // Fewer retries due to cost
  },
};