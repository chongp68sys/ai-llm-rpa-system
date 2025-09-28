#!/usr/bin/env node
import { readFileSync } from 'fs';
import axios from 'axios';

async function testWorkflowExecution() {
  console.log('🚀 Testing Workflow Execution...');
  
  try {
    // Start the server
    console.log('1️⃣ Starting server...');
    const { exec } = await import('child_process');
    const serverProcess = exec('npm run server:enhanced');
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test health endpoint
    console.log('2️⃣ Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3001/api/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Register a user
    console.log('3️⃣ Registering test user...');
    const registerResponse = await axios.post('http://localhost:3001/api/auth/register', {
      username: 'testuser_' + Date.now(),
      email: 'test@example.com',
      password: 'testpass123'
    });
    
    const token = registerResponse.data.token;
    console.log('✅ User registered, token received');
    
    // Load test workflow
    const workflowData = JSON.parse(readFileSync('./test-workflow.json', 'utf8'));
    
    // Create workflow
    console.log('4️⃣ Creating workflow...');
    const workflowResponse = await axios.post('http://localhost:3001/api/workflows', workflowData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const workflowId = workflowResponse.data.id;
    console.log('✅ Workflow created:', workflowId);
    
    // Execute workflow
    console.log('5️⃣ Executing workflow...');
    const executionResponse = await axios.post(
      `http://localhost:3001/api/workflows/${workflowId}/execute`, 
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const executionId = executionResponse.data.executionId;
    console.log('✅ Workflow execution started:', executionId);
    
    // Wait a bit for execution to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check execution status
    console.log('6️⃣ Checking execution status...');
    const statusResponse = await axios.get(
      `http://localhost:3001/api/workflows/${workflowId}/executions/${executionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ Execution status:', statusResponse.data.status);
    console.log('📊 Execution details:', statusResponse.data);
    
    // Clean up
    console.log('🧹 Cleaning up...');
    serverProcess.kill();
    
    console.log('🎉 Workflow execution test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testWorkflowExecution();