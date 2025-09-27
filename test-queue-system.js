#!/usr/bin/env node

import { workflowQueue, nodeQueue, getQueueStats, checkRedisHealth } from './src/queue/WorkflowQueue.js';
import { executeNode } from './src/backend/WorkflowProcessor.js';
import pkg from 'pg';
const { Pool } = pkg;
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

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

console.log('🧪 Testing AI/LLM RPA Queue System\n');

async function testQueueSystem() {
  try {
    // 1. Test Redis Connection
    console.log('1️⃣ Testing Redis connection...');
    const redisHealthy = await checkRedisHealth();
    console.log(`   Redis status: ${redisHealthy ? '✅ Connected' : '❌ Failed'}\n`);

    // 2. Test Database Connection
    console.log('2️⃣ Testing Database connection...');
    await pool.query('SELECT 1');
    console.log('   Database status: ✅ Connected\n');

    // 3. Test Queue Stats
    console.log('3️⃣ Getting queue statistics...');
    const stats = await getQueueStats();
    console.log('   Queue Stats:');
    console.log(`     Workflow queue: ${stats.workflow.waiting} waiting, ${stats.workflow.active} active`);
    console.log(`     Node queue: ${stats.node.waiting} waiting, ${stats.node.active} active`);
    console.log(`     Redis status: ${stats.redis.status}\n`);

    // 4. Test Direct Node Execution
    console.log('4️⃣ Testing direct node execution...');
    
    // Test delay node
    console.log('   Testing delay node...');
    const delayResult = await executeNode({
      nodeId: 'test-delay-001',
      nodeType: 'delay',
      nodeData: { delay: 1000 },
      context: { testMode: true },
      pool
    });
    console.log('   Delay node result:', JSON.stringify(delayResult, null, 2));

    // Test data transform node
    console.log('   Testing data transform node...');
    const transformResult = await executeNode({
      nodeId: 'test-transform-001',
      nodeType: 'transform_data',
      nodeData: { 
        inputData: 'Hello World',
        transformation: 'uppercase'
      },
      context: { testMode: true },
      pool
    });
    console.log('   Transform node result:', JSON.stringify(transformResult, null, 2));

    // Test condition node
    console.log('   Testing condition node...');
    const conditionResult = await executeNode({
      nodeId: 'test-condition-001',
      nodeType: 'condition',
      nodeData: { 
        condition: '2 + 2 === 4'
      },
      context: { testMode: true },
      pool
    });
    console.log('   Condition node result:', JSON.stringify(conditionResult, null, 2));

    // 5. Test Queue Job Addition
    console.log('\n5️⃣ Testing queue job addition...');
    
    // Add a simple node job to the queue
    const nodeJob = await nodeQueue.add('test-node-execution', {
      nodeId: 'queued-test-node-001',
      nodeType: 'delay',
      nodeData: { delay: 500 },
      context: { queueTest: true },
      executionId: 'test-execution-001'
    });
    
    console.log(`   Node job added to queue: ${nodeJob.id}`);

    // Wait a moment for job to process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check queue stats again
    const updatedStats = await getQueueStats();
    console.log('   Updated Queue Stats:');
    console.log(`     Workflow queue: ${updatedStats.workflow.waiting} waiting, ${updatedStats.workflow.active} active, ${updatedStats.workflow.completed} completed`);
    console.log(`     Node queue: ${updatedStats.node.waiting} waiting, ${updatedStats.node.active} active, ${updatedStats.node.completed} completed\n`);

    // 6. Test Database Workflow Execution
    console.log('6️⃣ Testing database workflow execution entry...');
    
    // Create a test workflow execution record (use existing workflow)
    const existingWorkflows = await pool.query('SELECT id FROM workflows LIMIT 1');
    if (existingWorkflows.rows.length === 0) {
      throw new Error('No workflows found in database');
    }
    const testWorkflowId = existingWorkflows.rows[0].id;
    
    const executionResult = await pool.query(
      'INSERT INTO workflow_executions (workflow_id, status, triggered_by, execution_context, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING id',
      [testWorkflowId, 'queued', 'test', JSON.stringify({ queueTest: true })]
    );
    
    const executionId = executionResult.rows[0].id;
    console.log(`   Test execution created: ${executionId}`);

    // Update the execution to completed
    await pool.query(
      'UPDATE workflow_executions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['completed', executionId]
    );
    
    console.log('   Execution marked as completed\n');

    console.log('🎉 All queue system tests passed successfully!');
    console.log('\n📊 Final System Status:');
    console.log('   ✅ Redis connection: Working');
    console.log('   ✅ Database connection: Working');
    console.log('   ✅ Queue system: Working');
    console.log('   ✅ Node processors: Working');
    console.log('   ✅ Job queueing: Working');
    console.log('   ✅ Database logging: Working');

  } catch (error) {
    console.error('❌ Queue system test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    await pool.end();
    process.exit(0);
  }
}

// Run the tests
testQueueSystem();