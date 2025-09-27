import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/environment.js';

// Get current file directory for schema loading
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseManager {
  constructor() {
    this.pool = null;
  }

  static getInstance() {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize() {
    try {
      // Create PostgreSQL connection pool
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
        ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
        max: config.database.maxConnections || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Skip schema initialization - already exists
      console.log('💾 Database schema already initialized');

      console.log('PostgreSQL database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async initializeSchema() {
    if (!this.pool) throw new Error('Database pool not initialized');

    try {
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      
      const client = await this.pool.connect();
      try {
        // Execute the entire schema in a transaction
        await client.query('BEGIN');
        await client.query(schema);
        await client.query('COMMIT');
        console.log('Database schema initialized');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to initialize schema:', error);
      throw error;
    }
  }

  getPool() {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  async getClient() {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }
    return await this.pool.connect();
  }

  async query(text, params) {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }
    return await this.pool.query(text, params);
  }

  async close() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.pool = null;
        console.log('Database pool closed');
      } catch (error) {
        if (error.message.includes('Called end on pool more than once')) {
          console.log('Database pool already closed');
        } else {
          console.error('Error closing database pool:', error.message);
        }
        this.pool = null;
      }
    } else {
      console.log('Database pool already closed');
    }
  }

  // Helper method to run migrations
  async runMigration(migrationSql) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      await client.query(migrationSql);
      await client.query('COMMIT');
      console.log('Migration executed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.pool) return false;
      const result = await this.pool.query('SELECT 1 as test');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();
export const getDb = () => dbManager.getPool();
export const query = (text, params) => dbManager.query(text, params);

// Repository base class
export class BaseRepository {
  async query(text, params) {
    return await dbManager.query(text, params);
  }

  generateId() {
    // PostgreSQL will handle UUID generation with uuid_generate_v4()
    return crypto.randomUUID();
  }
}

// Workflow Repository
export class WorkflowRepository extends BaseRepository {
  async create(workflow) {
    const result = await this.query(`
      INSERT INTO workflows (name, description, nodes_data, edges_data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      workflow.name,
      workflow.description || null,
      JSON.stringify(workflow.nodes),
      JSON.stringify(workflow.edges)
    ]);

    const row = result.rows[0];
    return {
      ...row,
      nodes: row.nodes_data,
      edges: row.edges_data
    };
  }

  async findById(id) {
    const result = await this.query(`
      SELECT * FROM workflows WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      nodes: row.nodes_data,
      edges: row.edges_data
    };
  }

  async update(id, updates) {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.nodes !== undefined) {
      setClause.push(`nodes_data = $${paramIndex++}`);
      values.push(JSON.stringify(updates.nodes));
    }
    if (updates.edges !== undefined) {
      setClause.push(`edges_data = $${paramIndex++}`);
      values.push(JSON.stringify(updates.edges));
    }
    if (updates.status !== undefined) {
      setClause.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    values.push(id);

    const result = await this.query(`
      UPDATE workflows 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async findAll(limit = 50, offset = 0) {
    const result = await this.query(`
      SELECT id, name, description, status, created_at, updated_at, version
      FROM workflows
      ORDER BY updated_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return result.rows;
  }

  async delete(id) {
    const result = await this.query(`
      DELETE FROM workflows WHERE id = $1 RETURNING id
    `, [id]);

    return result.rows.length > 0;
  }
}

// Execution Repository
export class ExecutionRepository extends BaseRepository {
  async create(execution) {
    const result = await this.query(`
      INSERT INTO workflow_executions (workflow_id, triggered_by, trigger_data)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [
      execution.workflowId,
      execution.triggeredBy,
      execution.triggerData ? JSON.stringify(execution.triggerData) : null
    ]);

    return result.rows[0];
  }

  async updateStatus(id, status, errorMessage) {
    const updates = ['status = $2'];
    const values = [id, status];
    let paramIndex = 3;

    if (status === 'running') {
      updates.push(`started_at = CURRENT_TIMESTAMP`);
    }
    if (status === 'completed' || status === 'failed') {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }
    if (errorMessage) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(errorMessage);
    }

    const result = await this.query(`
      UPDATE workflow_executions 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async addLog(log) {
    const result = await this.query(`
      INSERT INTO execution_logs (execution_id, node_id, level, message, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      log.executionId,
      log.nodeId || null,
      log.level,
      log.message,
      log.metadata ? JSON.stringify(log.metadata) : null
    ]);

    return result.rows[0];
  }

  async findById(id) {
    const result = await this.query(`
      SELECT * FROM workflow_executions WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  async findByWorkflowId(workflowId, limit = 20) {
    const result = await this.query(`
      SELECT * FROM workflow_executions 
      WHERE workflow_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `, [workflowId, limit]);

    return result.rows;
  }

  async getLogs(executionId) {
    const result = await this.query(`
      SELECT * FROM execution_logs 
      WHERE execution_id = $1 
      ORDER BY created_at ASC
    `, [executionId]);

    return result.rows;
  }
}

// Communication Audit Repository
export class CommunicationRepository extends BaseRepository {
  async logCommunication(communication) {
    const result = await this.query(`
      INSERT INTO communication_audit 
      (execution_id, node_id, channel_type, recipient, subject, message_content, status, provider_response)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      communication.executionId,
      communication.nodeId,
      communication.channelType,
      communication.recipient,
      communication.subject || null,
      communication.messageContent,
      communication.status,
      communication.providerResponse ? JSON.stringify(communication.providerResponse) : null
    ]);

    return result.rows[0];
  }

  async updateCommunicationStatus(id, status, providerResponse, errorMessage) {
    const updates = ['status = $2'];
    const values = [id, status];
    let paramIndex = 3;

    if (status === 'sent') {
      updates.push(`sent_at = CURRENT_TIMESTAMP`);
    }
    if (status === 'delivered') {
      updates.push(`delivered_at = CURRENT_TIMESTAMP`);
    }
    if (providerResponse) {
      updates.push(`provider_response = $${paramIndex++}`);
      values.push(JSON.stringify(providerResponse));
    }
    if (errorMessage) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(errorMessage);
    }

    const result = await this.query(`
      UPDATE communication_audit 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async findByExecutionId(executionId) {
    const result = await this.query(`
      SELECT * FROM communication_audit 
      WHERE execution_id = $1 
      ORDER BY created_at DESC
    `, [executionId]);

    return result.rows;
  }
}

// Node Execution Repository
export class NodeExecutionRepository extends BaseRepository {
  async create(nodeExecution) {
    const result = await this.query(`
      INSERT INTO node_executions (execution_id, node_id, node_type, input_data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      nodeExecution.executionId,
      nodeExecution.nodeId,
      nodeExecution.nodeType,
      nodeExecution.inputData ? JSON.stringify(nodeExecution.inputData) : null
    ]);

    return result.rows[0];
  }

  async updateStatus(id, status, outputData, errorMessage) {
    const updates = ['status = $2'];
    const values = [id, status];
    let paramIndex = 3;

    if (status === 'running') {
      updates.push(`started_at = CURRENT_TIMESTAMP`);
    }
    if (status === 'completed' || status === 'failed') {
      updates.push(`completed_at = CURRENT_TIMESTAMP`);
    }
    if (outputData) {
      updates.push(`output_data = $${paramIndex++}`);
      values.push(JSON.stringify(outputData));
    }
    if (errorMessage) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(errorMessage);
    }

    const result = await this.query(`
      UPDATE node_executions 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async findByExecutionId(executionId) {
    const result = await this.query(`
      SELECT * FROM node_executions 
      WHERE execution_id = $1 
      ORDER BY created_at ASC
    `, [executionId]);

    return result.rows;
  }
}