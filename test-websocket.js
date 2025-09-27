#!/usr/bin/env node

import WebSocket from 'ws';
import { authService } from './src/auth/AuthService.js';
import { dbManager } from './src/database/connection.js';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🔌 Testing WebSocket Connection...\n');

// First, let's test authentication by getting a token
async function testWebSocket() {
  try {
    // Initialize database first
    console.log('0. Initializing database...');
    await dbManager.initialize();
    console.log('✅ Database initialized');
    
    // Login to get a token
    console.log('1. Getting authentication token...');
    const loginResult = await authService.login({
      username: 'user123',
      password: 'password123'
    });
    
    console.log(`✅ Authenticated as: ${loginResult.user.username}`);
    const token = loginResult.token;

    // Connect to WebSocket with token
    console.log('2. Connecting to WebSocket...');
    const ws = new WebSocket(`ws://localhost:3001/ws?token=${token}`);

    ws.on('open', function open() {
      console.log('✅ WebSocket connected successfully!\n');
      
      // Test subscription to a workflow room
      console.log('3. Testing room subscription...');
      ws.send(JSON.stringify({
        type: 'subscribe',
        room: 'workflow_test-123'
      }));
      
      // Test ping/pong
      setTimeout(() => {
        console.log('4. Testing ping...');
        ws.send(JSON.stringify({
          type: 'ping'
        }));
      }, 1000);
      
      // Test workflow action
      setTimeout(() => {
        console.log('5. Testing workflow action...');
        ws.send(JSON.stringify({
          type: 'workflow_action',
          action: 'start',
          workflowId: 'test-workflow-123'
        }));
      }, 2000);
      
      // Close connection after tests
      setTimeout(() => {
        console.log('6. Closing connection...');
        ws.close();
      }, 3000);
    });

    ws.on('message', function message(data) {
      const msg = JSON.parse(data.toString());
      console.log(`📨 Received message:`, {
        type: msg.type,
        ...msg
      });
    });

    ws.on('close', function close() {
      console.log('🔌 WebSocket connection closed');
      console.log('\n🎉 WebSocket test completed!');
      process.exit(0);
    });

    ws.on('error', function error(err) {
      console.error('❌ WebSocket error:', err.message);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testWebSocket();