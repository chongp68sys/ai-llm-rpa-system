console.log('🧪 Testing Workflow API Endpoints...');

const API_BASE = 'http://localhost:3001/api';
let authToken = '';

// Test workflow
const testWorkflow = {
  name: 'Test Workflow',
  description: 'Simple test workflow',
  nodes: [
    {
      id: 'start',
      type: 'trigger',
      data: { trigger_type: 'manual' },
      position: { x: 0, y: 0 }
    },
    {
      id: 'delay',
      type: 'delay',
      data: { duration: 1000 },
      position: { x: 200, y: 0 }
    },
    {
      id: 'end',
      type: 'output',
      data: { message: 'Workflow completed' },
      position: { x: 400, y: 0 }
    }
  ],
  edges: [
    { id: 'start-delay', source: 'start', target: 'delay' },
    { id: 'delay-end', source: 'delay', target: 'end' }
  ]
};

async function login() {
  console.log('1️⃣ Authenticating...');
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'user123', password: 'password123' })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  authToken = data.token;
  console.log('✅ Authenticated as:', data.user.username);
  return data;
}

async function testHealthCheck() {
  console.log('2️⃣ Testing health check...');
  
  const response = await fetch(`${API_BASE}/health`);
  const data = await response.json();
  
  console.log('✅ System health:', data.status);
  console.log('   Services:', Object.keys(data.services).join(', '));
}

async function createWorkflow() {
  console.log('3️⃣ Creating test workflow...');
  
  const response = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(testWorkflow)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create workflow: ${error}`);
  }

  const workflow = await response.json();
  console.log('✅ Workflow created:', workflow.id);
  return workflow;
}

async function executeWorkflow(workflowId) {
  console.log('4️⃣ Executing workflow...');
  
  const response = await fetch(`${API_BASE}/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to execute workflow: ${error}`);
  }

  const execution = await response.json();
  console.log('✅ Workflow execution started:', execution.id);
  return execution;
}

async function waitForExecution(executionId) {
  console.log('5️⃣ Waiting for execution to complete...');
  
  for (let i = 0; i < 30; i++) {
    const response = await fetch(`${API_BASE}/executions/${executionId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) continue;

    const execution = await response.json();
    console.log(`   Status: ${execution.status}`);

    if (execution.status === 'completed' || execution.status === 'failed') {
      console.log('✅ Execution finished:', execution.status);
      return execution;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Execution timeout');
}

// Run the tests
try {
  await login();
  await testHealthCheck();
  const workflow = await createWorkflow();
  const execution = await executeWorkflow(workflow.id);
  const result = await waitForExecution(execution.id);
  
  console.log('\n🎉 All workflow tests passed successfully!');
  console.log('   Workflow ID:', workflow.id);
  console.log('   Execution ID:', execution.id);
  console.log('   Final Status:', result.status);
  
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}