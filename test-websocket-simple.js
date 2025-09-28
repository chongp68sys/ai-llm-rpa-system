import WebSocket from 'ws';

console.log('🔌 Testing WebSocket Connection (Simple)...');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  
  // Send a test message
  const testMessage = {
    type: 'ping',
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

// Close after 3 seconds
setTimeout(() => {
  console.log('⏰ Closing WebSocket connection...');
  ws.close();
}, 3000);