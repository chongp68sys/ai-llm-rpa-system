import { config } from 'dotenv';
config();

// Import and initialize database
import { dbManager } from './src/database/connection.js';

async function testAuth() {
  try {
    // Initialize database connection
    await dbManager.initialize();
    console.log('🔌 Database initialized successfully');

    // Import auth service after database is ready
    const authModule = await import('./src/auth/AuthService.js');
    const authService = authModule.authService;

    console.log('🧪 Testing Authentication System...\n');

    // Test 1: Register a new user
    console.log('1️⃣ Testing user registration...');
    const userData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    const registrationResult = await authService.register(userData);
    console.log('✅ User registered:', {
      id: registrationResult.user.id,
      username: registrationResult.user.username,
      email: registrationResult.user.email
    });
    console.log('✅ JWT Token generated:', registrationResult.token ? 'Yes' : 'No');

    // Test 2: Login with the registered user
    console.log('\n2️⃣ Testing user login...');
    const loginResult = await authService.login({ 
      username: userData.username, 
      password: userData.password 
    });
    console.log('✅ User logged in:', {
      id: loginResult.user.id,
      username: loginResult.user.username
    });

    // Test 3: Verify token
    console.log('\n3️⃣ Testing token verification...');
    const verifiedUser = await authService.verifyToken(loginResult.token);
    console.log('✅ Token verified:', {
      userId: verifiedUser.userId,
      username: verifiedUser.username,
      role: verifiedUser.role
    });

    // Test 4: Test invalid token
    console.log('\n4️⃣ Testing invalid token...');
    try {
      await authService.verifyToken('invalid-token');
      console.log('❌ Should have failed');
    } catch (error) {
      console.log('✅ Invalid token correctly rejected:', error.message);
    }

    // Test 5: Test wrong password
    console.log('\n5️⃣ Testing wrong password...');
    try {
      await authService.login({ 
        username: userData.username, 
        password: 'WrongPassword' 
      });
      console.log('❌ Should have failed');
    } catch (error) {
      console.log('✅ Wrong password correctly rejected:', error.message);
    }

    console.log('\n🎉 All authentication tests passed!');

    // Cleanup
    console.log('\n🧹 Cleaning up test user...');
    await dbManager.query('DELETE FROM users WHERE username = $1', [userData.username]);
    console.log('✅ Test user deleted');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await dbManager.close();
    console.log('🔒 Database connection closed');
  }
}

testAuth();