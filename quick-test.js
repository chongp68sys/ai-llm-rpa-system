#!/usr/bin/env node
import { config } from 'dotenv';
config();

// Test basic system components quickly
async function quickTest() {
  console.log('🧪 Quick System Test\n');

  // 1. Test Database
  console.log('1️⃣ Testing Database...');
  try {
    const { testConnection } = await import('./src/database/connection.js');
    await testConnection();
    console.log('✅ Database: Working\n');
  } catch (error) {
    console.log('❌ Database:', error.message + '\n');
  }

  // 2. Test Queue
  console.log('2️⃣ Testing Queue System...');
  try {
    const { queueManager } = await import('./src/queue/QueueManager.js');
    const health = await queueManager.getHealth();
    console.log('✅ Queue System:', health.status);
    await queueManager.shutdown();
    console.log('✅ Queue shutdown: Clean\n');
  } catch (error) {
    console.log('❌ Queue System:', error.message + '\n');
  }

  // 3. Test Auth Service
  console.log('3️⃣ Testing Auth Service...');
  try {
    const { authService } = await import('./src/auth/AuthService.js');
    // Test JWT creation
    const testToken = authService.generateToken({ id: 'test', username: 'test' });
    console.log('✅ JWT Generation: Working');
    
    // Test validation
    const decoded = authService.verifyToken(testToken);
    console.log('✅ JWT Verification: Working');
    console.log('✅ Auth Service: Working\n');
  } catch (error) {
    console.log('❌ Auth Service:', error.message + '\n');
  }

  console.log('🎉 Quick test completed!');
  process.exit(0);
}

quickTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});