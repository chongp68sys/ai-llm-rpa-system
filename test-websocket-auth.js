import WebSocket from 'ws';

console.log('🔌 Testing Authenticated WebSocket Connection...');

// Get JWT token first
const loginResponse = await fetch('http://localhost:3005/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user123', password: 'password123' })
});

if (!loginResponse.ok) {
  console.error('❌ Failed to login');
  process.exit(1);
}

const loginData = await loginResponse.json();
const token = loginData.token;

console.log('✅ Got authentication token');

// Connect to WebSocket with token
const ws = new WebSocket(`ws://localhost:3005/ws?token=${token}`);

ws.on('open', function open() {
  console.log('✅ Authenticated WebSocket connected successfully!');
  
  // Send a test message
  const testMessage = {
    type: 'ping',
    data: { message: 'Hello WebSocket!' },
    timestamp: new Date().toISOString()
  };
  
  ws.send(JSON.stringify(testMessage));
  console.log('📤 Sent test message:', testMessage);
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    console.log('📥 Received message:', parsed);
  } catch (e) {
    console.log('📥 Received raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket closed:', code, reason.toString());
  process.exit(0);
});

// Close after 5 seconds
setTimeout(() => {
  console.log('⏰ Closing WebSocket connection...');
  ws.close();
}, 5000);