import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import ExecutionContext from './ExecutionContext.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database configuration
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME || 'ai_llm_rpa_system',
  user: process.env.DATABASE_USER || 'paul',
  password: process.env.DATABASE_PASSWORD || '',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Initialize API clients
let openaiClient, anthropicClient, twilioClient, smtpTransporter;

try {
  // OpenAI client (optional - only if API key provided)
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized');
  }

  // Anthropic client (optional - only if API key provided)  
  if (process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log('✅ Anthropic client initialized');
  }

  // Twilio client (optional - only if credentials provided)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized');
  }

  // SMTP transporter (optional - only if credentials provided)
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    smtpTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('✅ SMTP transporter initialized');
  }
} catch (error) {
  console.warn('⚠️ Some API clients could not be initialized:', error.message);
  console.warn('ℹ️ Check your environment variables in .env file');
}

// Simple workflow execution engine
class WorkflowExecutor {
  constructor(pool) {
    this.pool = pool;
  }

  async executeWorkflow(workflow, triggerData = {}) {
    console.log(`🚀 Starting workflow execution: ${workflow.name}`);
    
    // Create execution context
    const executionContext = new ExecutionContext(workflow.id, null);
    
    // Set initial trigger data as variables
    console.log('🔧 Setting trigger data as variables:', triggerData);
    Object.entries(triggerData).forEach(([key, value]) => {
      executionContext.setVariable(key, value);
      console.log(`   ✓ Set variable: ${key} = ${value}`);
    });
    console.log('🔧 ExecutionContext variables after setting:', Object.fromEntries(executionContext.variables));
    
    // Create execution record with execution context
    const executionResult = await this.pool.query(`
      INSERT INTO workflow_executions (workflow_id, triggered_by, trigger_data, status, started_at, variables, node_outputs, execution_metadata)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7)
      RETURNING id
    `, [
      workflow.id, 
      'manual', 
      JSON.stringify(triggerData), 
      'running',
      JSON.stringify(Object.fromEntries(executionContext.variables)),
      JSON.stringify(Object.fromEntries(executionContext.nodeOutputs)),
      JSON.stringify(executionContext.metadata)
    ]);
    
    const executionId = executionResult.rows[0].id;
    executionContext.executionId = executionId;
    
    try {
      // Log execution start
      await this.logExecution(executionId, 'info', `Workflow execution started: ${workflow.name}`);
      
      // Parse workflow nodes and edges
      const nodes = workflow.nodes_data || [];
      const edges = workflow.edges_data || [];
      
      // Find starting nodes (no incoming edges)
      const startNodes = nodes.filter(node => 
        !edges.some(edge => edge.target === node.id)
      );
      
      if (startNodes.length === 0) {
        throw new Error('No starting nodes found in workflow');
      }
      
      // Execute starting nodes
      for (const node of startNodes) {
        await this.executeNode(executionId, node, nodes, edges, executionContext);
      }
      
      // Mark execution as completed and save final context
      await this.pool.query(`
        UPDATE workflow_executions 
        SET status = $1, completed_at = CURRENT_TIMESTAMP, variables = $2, node_outputs = $3, execution_metadata = $4
        WHERE id = $5
      `, [
        'completed', 
        JSON.stringify(Object.fromEntries(executionContext.variables)),
        JSON.stringify(Object.fromEntries(executionContext.nodeOutputs)),
        JSON.stringify(executionContext.metadata),
        executionId
      ]);
      
      await this.logExecution(executionId, 'info', 'Workflow execution completed successfully');
      
      return { success: true, executionId, message: 'Workflow completed successfully' };
      
    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      
      // Mark execution as failed
      await this.pool.query(`
        UPDATE workflow_executions 
        SET status = $1, completed_at = CURRENT_TIMESTAMP, error_message = $2
        WHERE id = $3
      `, ['failed', error.message, executionId]);
      
      await this.logExecution(executionId, 'error', `Workflow execution failed: ${error.message}`);
      
      return { success: false, executionId, error: error.message };
    }
  }

  async executeNode(executionId, node, allNodes, allEdges, executionContext) {
    console.log(`🔄 Executing node: ${node.id} (${node.type})`);
    
    // Update execution context with current node
    executionContext.updateMetadata(node.id);
    
    // Create node execution record
    const nodeExecResult = await this.pool.query(`
      INSERT INTO node_executions (execution_id, node_id, node_type, status, started_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id
    `, [executionId, node.id, node.type, 'running']);
    
    const nodeExecutionId = nodeExecResult.rows[0].id;
    
    try {
      await this.logExecution(executionId, 'info', `Starting node execution: ${node.id}`, node.id);
      
      // Get node schema for validation
      const schemaResult = await this.pool.query(`
        SELECT input_schema, output_schema FROM node_schemas 
        WHERE node_type = $1 ORDER BY created_at DESC LIMIT 1
      `, [node.type]);
      
      const nodeSchema = schemaResult.rows[0];
      
      // Execute node with context-aware processing
      let output = await this.executeNodeWithContext(node, executionContext, nodeSchema);
      
      // Validate output against schema if available
      let validationErrors = [];
      if (nodeSchema && nodeSchema.output_schema) {
        validationErrors = this.validateDataAgainstSchema(output, nodeSchema.output_schema);
      }
      
      // Store output in execution context
      executionContext.setNodeOutput(node.id, output);
      
      // Update node execution record with schemas and validation
      await this.pool.query(`
        UPDATE node_executions 
        SET input_schema = $1, output_schema = $2, validation_errors = $3, output_data = $4
        WHERE id = $5
      `, [
        nodeSchema ? JSON.stringify(nodeSchema.input_schema) : null,
        nodeSchema ? JSON.stringify(nodeSchema.output_schema) : null,
        JSON.stringify(validationErrors),
        JSON.stringify(output),
        nodeExecutionId
      ]);
      
      // Mark node as completed (status already updated above)
      await this.pool.query(`
        UPDATE node_executions 
        SET status = $1, completed_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, ['completed', nodeExecutionId]);
      
      await this.logExecution(executionId, 'info', `Node execution completed: ${node.id}`, node.id);
      
      // Find and execute next nodes
      const nextEdges = allEdges.filter(edge => edge.source === node.id);
      for (const edge of nextEdges) {
        const nextNode = allNodes.find(n => n.id === edge.target);
        if (nextNode) {
          // Add a small delay to simulate processing
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.executeNode(executionId, nextNode, allNodes, allEdges, executionContext);
        }
      }
      
    } catch (error) {
      console.error(`❌ Node execution failed: ${node.id}`, error);
      
      // Mark node as failed
      await this.pool.query(`
        UPDATE node_executions 
        SET status = $1, completed_at = CURRENT_TIMESTAMP, error_message = $2
        WHERE id = $3
      `, ['failed', error.message, nodeExecutionId]);
      
      await this.logExecution(executionId, 'error', `Node execution failed: ${error.message}`, node.id);
      throw error;
    }
  }

  async executeNodeWithContext(node, executionContext, nodeSchema = null) {
    const { type, data } = node;
    const config = data?.config || {};
    
    // Process template strings in config using execution context
    const processedConfig = this.processConfigTemplates(config, executionContext);
    
    // Execute different node types with context awareness
    switch (type) {
      case 'manual':
        return { 
          message: 'Manual trigger activated',
          timestamp: new Date().toISOString(),
          triggeredBy: 'user'
        };
        
      case 'llm':
        return await this.executeLLMNode(processedConfig, executionContext);
        
      case 'communication':
        return await this.executeCommunicationNode(processedConfig, executionContext);
        
      case 'database':
        return await this.executeDatabaseNode(processedConfig, executionContext);
        
      case 'api':
        return await this.executeAPINode(processedConfig, executionContext);
        
      case 'transform':
        // Apply data transformation using ExecutionContext
        const inputData = executionContext.getVariable('inputData') || {};
        const transformedData = executionContext.transformData(inputData, processedConfig.mappingRules || {});
        return {
          originalData: inputData,
          transformedData,
          mappingRules: processedConfig.mappingRules
        };
        
      default:
        return {
          message: `Executed ${type} node with context`,
          nodeId: node.id,
          config: processedConfig,
          contextVariables: executionContext.variables.size,
          nodeOutputs: executionContext.nodeOutputs.size
        };
    }
  }
  
  processConfigTemplates(config, executionContext) {
    console.log('🔧 Processing config templates:', config);
    console.log('🔧 Available variables:', Object.fromEntries(executionContext.variables));
    const processed = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        const processedValue = executionContext.processTemplate(value);
        processed[key] = processedValue;
        console.log(`   ✓ Processed ${key}: "${value}" -> "${processedValue}"`);
      } else {
        processed[key] = value;
      }
    }
    
    return processed;
  }
  
  validateDataAgainstSchema(data, schema) {
    const errors = [];
    
    try {
      // Basic JSON Schema validation
      if (schema.type && typeof data !== schema.type) {
        errors.push(`Expected type ${schema.type}, got ${typeof data}`);
      }
      
      if (schema.required && Array.isArray(schema.required)) {
        schema.required.forEach(field => {
          if (!data.hasOwnProperty(field)) {
            errors.push(`Missing required field: ${field}`);
          }
        });
      }
      
      if (schema.properties && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          const fieldSchema = schema.properties[key];
          if (fieldSchema && fieldSchema.type && typeof data[key] !== fieldSchema.type) {
            errors.push(`Field ${key}: expected type ${fieldSchema.type}, got ${typeof data[key]}`);
          }
        });
      }
      
    } catch (error) {
      errors.push(`Schema validation error: ${error.message}`);
    }
    
    return errors;
  }

  async executeLLMNode(config, executionContext) {
    const processedPrompt = executionContext.processTemplate(config.prompt || 'Hello World');
    const model = config.model || 'gpt-4';
    const temperature = config.temperature || 0.7;
    const maxTokens = config.maxTokens || 1000;
    const systemPrompt = config.systemPrompt || '';

    console.log(`🤖 Executing LLM node with model: ${model}`);
    console.log(`📝 Processed prompt: "${processedPrompt}"`);

    try {
      let response, tokensUsed = 0;

      // OpenAI models
      if (model.includes('gpt') && openaiClient) {
        const completion = await openaiClient.chat.completions.create({
          model: model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: processedPrompt }
          ],
          temperature: temperature,
          max_tokens: maxTokens,
        });

        response = completion.choices[0].message.content;
        tokensUsed = completion.usage.total_tokens;

      // Anthropic Claude models
      } else if (model.includes('claude') && anthropicClient) {
        const completion = await anthropicClient.messages.create({
          model: model === 'claude-3' ? 'claude-3-haiku-20240307' : 
                model === 'claude-sonnet-4' ? 'claude-3-5-sonnet-20241022' : 
                'claude-3-haiku-20240307',
          max_tokens: maxTokens,
          temperature: temperature,
          system: systemPrompt,
          messages: [
            { role: 'user', content: processedPrompt }
          ],
        });

        response = completion.content[0].text;
        tokensUsed = completion.usage.input_tokens + completion.usage.output_tokens;

      } else {
        // Fallback to simulation if no API client available
        console.warn(`⚠️ No API client available for model: ${model}, falling back to simulation`);
        response = `AI processed: "${processedPrompt}" (simulated - no API key configured)`;
        tokensUsed = Math.floor(Math.random() * 100) + 50;
      }

      console.log(`✅ LLM response generated, tokens used: ${tokensUsed}`);
      
      return {
        response: response,
        model: model,
        tokens: tokensUsed,
        processedPrompt: processedPrompt,
        temperature: temperature,
        maxTokens: maxTokens,
        systemPrompt: systemPrompt
      };

    } catch (error) {
      console.error(`❌ LLM execution failed:`, error);
      
      // Return error information but don't throw to continue workflow
      return {
        response: `Error: ${error.message}`,
        model: model,
        tokens: 0,
        processedPrompt: processedPrompt,
        error: error.message,
        temperature: temperature,
        maxTokens: maxTokens,
        systemPrompt: systemPrompt
      };
    }
  }

  async executeAPINode(config, executionContext) {
    const processedUrl = executionContext.processTemplate(config.url || 'https://httpbin.org/get');
    const method = config.method || 'GET';
    const processedBody = config.body ? executionContext.processTemplate(config.body) : undefined;
    const headers = { ...config.headers };

    // Process headers for template variables
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        headers[key] = executionContext.processTemplate(value);
      }
    }

    // Add authentication if configured
    if (config.authentication) {
      const authToken = executionContext.processTemplate(config.authentication.token);
      switch (config.authentication.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${authToken}`;
          break;
        case 'api-key':
          headers['X-API-Key'] = authToken;
          break;
        case 'basic':
          headers['Authorization'] = `Basic ${Buffer.from(authToken).toString('base64')}`;
          break;
      }
    }

    console.log(`🌐 Executing API call: ${method} ${processedUrl}`);

    const startTime = Date.now();

    try {
      const axiosConfig = {
        method: method.toLowerCase(),
        url: processedUrl,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 30000, // 30 seconds timeout
      };

      if (processedBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        try {
          axiosConfig.data = JSON.parse(processedBody);
        } catch {
          axiosConfig.data = processedBody; // If not JSON, send as-is
        }
      }

      const response = await axios(axiosConfig);
      const responseTime = Date.now() - startTime;

      console.log(`✅ API call successful: ${response.status} ${response.statusText} (${responseTime}ms)`);

      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
        method: method,
        url: processedUrl,
        responseTime: responseTime,
        success: true
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ API call failed: ${error.message} (${responseTime}ms)`);

      // Return error information but don't throw to continue workflow
      return {
        status: error.response?.status || 0,
        statusText: error.response?.statusText || 'Error',
        data: error.response?.data || null,
        headers: error.response?.headers || {},
        method: method,
        url: processedUrl,
        responseTime: responseTime,
        success: false,
        error: error.message
      };
    }
  }

  async executeDatabaseNode(config, executionContext) {
    const processedQuery = executionContext.processTemplate(config.query || 'SELECT 1 as test');
    const operation = config.operation || 'select';
    
    console.log(`🗄️ Executing database query: ${operation.toUpperCase()}`);
    console.log(`📝 Processed query: ${processedQuery}`);

    const startTime = Date.now();

    try {
      // Use the existing pool connection
      const result = await this.pool.query(processedQuery);
      const executionTime = Date.now() - startTime;

      console.log(`✅ Database query successful: ${result.rowCount || 0} rows (${executionTime}ms)`);

      return {
        operation: operation.toUpperCase(),
        query: processedQuery,
        rowCount: result.rowCount || 0,
        rows: result.rows || [],
        fields: result.fields?.map(f => ({ name: f.name, dataType: f.dataTypeID })) || [],
        executionTime: executionTime,
        success: true
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Database query failed: ${error.message} (${executionTime}ms)`);

      // Return error information but don't throw to continue workflow
      return {
        operation: operation.toUpperCase(),
        query: processedQuery,
        rowCount: 0,
        rows: [],
        fields: [],
        executionTime: executionTime,
        success: false,
        error: error.message,
        sqlState: error.code,
        detail: error.detail
      };
    }
  }

  async executeCommunicationNode(config, executionContext) {
    const channel = config.channel || 'email';
    const processedMessage = executionContext.processTemplate(config.message || 'Test message');
    
    console.log(`📧 Executing communication via: ${channel}`);

    try {
      let result;

      switch (channel) {
        case 'email':
          result = await this.sendEmail(config, processedMessage, executionContext);
          break;
          
        case 'sms':
          result = await this.sendSMS(config, processedMessage, executionContext);
          break;
          
        case 'slack':
          result = await this.sendSlackMessage(config, processedMessage, executionContext);
          break;
          
        case 'discord':
          result = await this.sendDiscordMessage(config, processedMessage, executionContext);
          break;
          
        case 'webhook':
          result = await this.sendWebhook(config, processedMessage, executionContext);
          break;
          
        default:
          throw new Error(`Unsupported communication channel: ${channel}`);
      }

      console.log(`✅ Communication sent successfully via ${channel}`);
      return result;

    } catch (error) {
      console.error(`❌ Communication failed via ${channel}: ${error.message}`);
      
      return {
        sent: false,
        channel: channel,
        message: processedMessage,
        error: error.message,
        success: false
      };
    }
  }

  async sendEmail(config, message, executionContext) {
    if (!smtpTransporter) {
      throw new Error('SMTP not configured. Check SMTP environment variables.');
    }

    const to = executionContext.processTemplate(config.emailConfig?.to || config.recipient || 'test@example.com');
    const subject = executionContext.processTemplate(config.emailConfig?.subject || 'Workflow Notification');
    const body = message;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: to,
      subject: subject,
      text: body,
      html: body.includes('<') ? body : undefined, // Send as HTML if contains HTML tags
    };

    const info = await smtpTransporter.sendMail(mailOptions);
    
    return {
      sent: true,
      channel: 'email',
      recipient: to,
      subject: subject,
      message: message,
      messageId: info.messageId,
      success: true
    };
  }

  async sendSMS(config, message, executionContext) {
    if (!twilioClient) {
      throw new Error('Twilio not configured. Check TWILIO environment variables.');
    }

    const to = executionContext.processTemplate(config.smsConfig?.phoneNumber || config.recipient);
    const from = process.env.TWILIO_PHONE_NUMBER;

    const sms = await twilioClient.messages.create({
      body: message,
      from: from,
      to: to
    });
    
    return {
      sent: true,
      channel: 'sms',
      recipient: to,
      message: message,
      messageId: sms.sid,
      success: true
    };
  }

  async sendSlackMessage(config, message, executionContext) {
    const webhookUrl = executionContext.processTemplate(
      config.slackConfig?.webhookUrl || process.env.SLACK_WEBHOOK_URL
    );
    
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const payload = {
      text: message,
      username: config.slackConfig?.username || 'Workflow Bot',
      channel: config.slackConfig?.channel || undefined
    };

    const response = await axios.post(webhookUrl, payload);
    
    return {
      sent: true,
      channel: 'slack',
      message: message,
      webhookUrl: webhookUrl,
      success: true,
      response: response.data
    };
  }

  async sendDiscordMessage(config, message, executionContext) {
    const webhookUrl = executionContext.processTemplate(
      config.discordConfig?.webhookUrl || process.env.DISCORD_WEBHOOK_URL
    );
    
    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured');
    }

    const payload = {
      content: message,
      username: config.discordConfig?.username || 'Workflow Bot'
    };

    const response = await axios.post(webhookUrl, payload);
    
    return {
      sent: true,
      channel: 'discord',
      message: message,
      webhookUrl: webhookUrl,
      success: true,
      response: response.data
    };
  }

  async sendWebhook(config, message, executionContext) {
    const url = executionContext.processTemplate(config.webhookConfig?.url);
    const method = config.webhookConfig?.method || 'POST';
    const headers = config.webhookConfig?.headers || {};
    const body = executionContext.processTemplate(config.webhookConfig?.body || JSON.stringify({ message }));

    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    const response = await axios({
      method: method.toLowerCase(),
      url: url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      data: JSON.parse(body)
    });
    
    return {
      sent: true,
      channel: 'webhook',
      url: url,
      method: method,
      message: message,
      success: true,
      status: response.status,
      response: response.data
    };
  }

  async logExecution(executionId, level, message, nodeId = null) {
    await this.pool.query(`
      INSERT INTO execution_logs (execution_id, node_id, level, message)
      VALUES ($1, $2, $3, $4)
    `, [executionId, nodeId, level, message]);
  }
}

const executor = new WorkflowExecutor(pool);

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Save workflow
app.post('/api/workflows', async (req, res) => {
  try {
    const { name, description, nodes, edges } = req.body;
    
    const result = await pool.query(`
      INSERT INTO workflows (name, description, nodes_data, edges_data, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, created_at
    `, [
      name || 'Untitled Workflow',
      description || 'Workflow created via API',
      JSON.stringify(nodes || []),
      JSON.stringify(edges || []),
      'active'
    ]);
    
    res.json({
      success: true,
      workflow: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflows
app.get('/api/workflows', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, status, created_at, updated_at
      FROM workflows
      ORDER BY updated_at DESC
    `);
    
    res.json({
      success: true,
      workflows: result.rows
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get workflow by ID
app.get('/api/workflows/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT * FROM workflows WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }
    
    res.json({
      success: true,
      workflow: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute workflow
app.post('/api/workflows/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const triggerData = req.body || {};
    
    // Get workflow
    const workflowResult = await pool.query(`
      SELECT * FROM workflows WHERE id = $1 AND status = 'active'
    `, [id]);
    
    if (workflowResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Active workflow not found'
      });
    }
    
    const workflow = workflowResult.rows[0];
    
    // Execute workflow
    const result = await executor.executeWorkflow(workflow, triggerData);
    
    res.json(result);
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get execution logs
app.get('/api/executions/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, node_id, level, message, created_at
      FROM execution_logs
      WHERE execution_id = $1
      ORDER BY created_at ASC
    `, [id]);
    
    res.json({
      success: true,
      logs: result.rows
    });
  } catch (error) {
    console.error('Error fetching execution logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent executions
app.get('/api/executions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT we.id, we.workflow_id, w.name as workflow_name, 
             we.status, we.triggered_by, we.started_at, we.completed_at, we.error_message,
             we.variables, we.node_outputs, we.execution_metadata
      FROM workflow_executions we
      JOIN workflows w ON we.workflow_id = w.id
      ORDER BY we.created_at DESC
      LIMIT 50
    `);
    
    res.json({
      success: true,
      executions: result.rows
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get execution context details
app.get('/api/executions/:id/context', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT variables, node_outputs, execution_metadata
      FROM workflow_executions
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }
    
    res.json({
      success: true,
      context: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching execution context:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get node execution details
app.get('/api/executions/:id/nodes', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT node_id, node_type, status, input_data, output_data, 
             input_schema, output_schema, validation_errors, data_transformations,
             started_at, completed_at, error_message
      FROM node_executions
      WHERE execution_id = $1
      ORDER BY started_at ASC
    `, [id]);
    
    res.json({
      success: true,
      nodeExecutions: result.rows
    });
  } catch (error) {
    console.error('Error fetching node executions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Workflow API server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🔄 ExecutionContext system integrated - Phase 1 complete!`);
});