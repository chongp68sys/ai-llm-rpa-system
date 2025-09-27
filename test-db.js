import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const config = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME || 'ai_llm_rpa_system',
  user: process.env.DATABASE_USER || 'paul',
  password: process.env.DATABASE_PASSWORD || '',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

async function testDatabaseConnection() {
  console.log('🔍 Testing PostgreSQL Connection...\n');

  let pool = null;

  try {
    // 1. Show connection details
    console.log('1. Connection details:');
    console.log(`   Host: ${config.host}`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    console.log(`   SSL: ${config.ssl}\n`);

    // 2. Create connection pool
    console.log('2. Creating connection pool...');
    pool = new Pool(config);
    console.log('✅ Connection pool created\n');

    // 3. Test connection
    console.log('3. Testing connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`✅ Connected successfully`);
    console.log(`✅ Current time: ${result.rows[0].current_time}`);
    console.log(`✅ PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}\n`);
    client.release();

    // 4. Check existing tables
    console.log('4. Checking existing tables...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tables.rows.length > 0) {
      console.log('✅ Existing tables found:');
      tables.rows.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('📝 No tables found - will create schema');
    }
    console.log('');

    // 5. Skip schema setup if tables already exist
    if (tables.rows.length > 0) {
      console.log('5. Schema already exists - skipping setup...');
      console.log('✅ Database ready\n');
    } else {
      console.log('5. Setting up database schema...');
      const schemaPath = join(__dirname, 'src', 'database', 'schema.sql');
      
      try {
        const schema = readFileSync(schemaPath, 'utf-8');
        await pool.query('BEGIN');
        await pool.query(schema);
        await pool.query('COMMIT');
        console.log('✅ Schema created/updated successfully\n');
      } catch (schemaError) {
        await pool.query('ROLLBACK');
        throw schemaError;
      }
    }

    // 6. Verify tables were created
    console.log('6. Verifying schema tables...');
    const newTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('✅ Schema tables verified:');
    newTables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    console.log('');

    // 7. Test basic operations
    console.log('7. Testing basic CRUD operations...');
    
    // Create a test workflow
    const workflowResult = await pool.query(`
      INSERT INTO workflows (name, description, nodes_data, edges_data)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name
    `, [
      'Test Workflow',
      'A test workflow for connection testing',
      JSON.stringify([{ id: 'node1', type: 'manual' }]),
      JSON.stringify([{ id: 'edge1', source: 'node1', target: 'node2' }])
    ]);
    
    const workflowId = workflowResult.rows[0].id;
    console.log(`✅ Created test workflow: ${workflowId}`);

    // Read it back
    const readResult = await pool.query('SELECT * FROM workflows WHERE id = $1', [workflowId]);
    if (readResult.rows.length > 0) {
      console.log('✅ Successfully retrieved workflow from database');
    }

    // Create test execution
    const executionResult = await pool.query(`
      INSERT INTO workflow_executions (workflow_id, triggered_by, trigger_data)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [workflowId, 'manual', JSON.stringify({ test: true })]);
    
    const executionId = executionResult.rows[0].id;
    console.log(`✅ Created test execution: ${executionId}`);

    // Add log entry
    await pool.query(`
      INSERT INTO execution_logs (execution_id, level, message, metadata)
      VALUES ($1, $2, $3, $4)
    `, [executionId, 'info', 'Test log entry', JSON.stringify({ test: true })]);
    console.log('✅ Added test log entry');

    // Clean up test data
    console.log('8. Cleaning up test data...');
    await pool.query('DELETE FROM workflows WHERE id = $1', [workflowId]);
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All database tests passed! PostgreSQL connection is working correctly.');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    console.error('   Full error:', error);
  } finally {
    if (pool) {
      await pool.end();
      console.log('\n🔒 Database connection closed.');
    }
  }
}

// Run the test
testDatabaseConnection();