import { config } from 'dotenv';
import { dbManager } from './src/database/connection.js';
import { queueManager } from './src/queue/QueueManager.js';
import { authService } from './src/auth/AuthService.js';

// Load environment variables
config();

async function testInfrastructure() {
  console.log('🧪 Testing Infrastructure Components...\n');

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing Database Connection...');
    await dbManager.initialize();
    const dbHealth = await dbManager.healthCheck();
    console.log('   Database Status:', dbHealth ? '✅ Healthy' : '❌ Unhealthy');

    // Test 2: Queue System
    console.log('\n2️⃣ Testing Queue System...');
    await queueManager.initialize();
    const queueHealth = await queueManager.healthCheck();
    console.log('   Queue Status:', queueHealth);

    // Test 3: Add a test job
    console.log('\n3️⃣ Testing Queue Job Processing...');
    const testJob = await queueManager.addWorkflowExecution(
      'test-workflow-id',
      'test-execution-id',
      { test: 'data' }
    );
    console.log('   Test Job Added:', testJob.id);

    // Test 4: Auth Service
    console.log('\n4️⃣ Testing Auth Service...');
    const testUser = {
      username: 'testuser_' + Date.now(),
      email: 'test@example.com',
      password: 'testpassword123',
      role: 'user'
    };
    
    try {
      const registration = await authService.register(testUser);
      console.log('   User Registration: ✅ Success');
      
      const login = await authService.login({
        username: testUser.username,
        password: testUser.password
      });
      console.log('   User Login: ✅ Success');
      console.log('   JWT Token Generated:', login.token ? '✅ Yes' : '❌ No');
    } catch (error) {
      console.log('   Auth Service Error:', error.message);
    }

    console.log('\n🎉 Infrastructure testing completed!');

  } catch (error) {
    console.error('❌ Infrastructure test failed:', error.message);
  } finally {
    // Cleanup
    try {
      await queueManager.close();
      await dbManager.close();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

testInfrastructure();