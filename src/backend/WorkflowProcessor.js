// Workflow and Node execution processor
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import axios from 'axios';
import { config } from 'dotenv';

config();

// Initialize API clients
let openaiClient, anthropicClient, twilioClient, smtpTransporter;

// Initialize clients if API keys are provided
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

if (process.env.SMTP_HOST) {
  smtpTransporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Execute a complete workflow
 */
export const executeWorkflow = async ({ workflowId, executionId, context, triggeredBy, pool }) => {
  try {
    console.log(`🔄 Executing workflow ${workflowId}...`);
    
    // Get workflow data
    const workflowResult = await pool.query(
      'SELECT * FROM workflows WHERE id = $1',
      [workflowId]
    );
    
    if (workflowResult.rows.length === 0) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const workflow = workflowResult.rows[0];
    const workflowData = workflow.workflow_data;
    
    // Process nodes in order (simplified - assumes linear workflow)
    const results = {};
    let currentContext = { ...context };
    
    for (const node of workflowData.nodes) {
      console.log(`Processing node: ${node.id} (${node.type})`);
      
      try {
        const nodeResult = await executeNode({
          nodeId: node.id,
          nodeType: node.type,
          nodeData: node.data,
          context: currentContext,
          pool,
        });
        
        results[node.id] = nodeResult;
        
        // Update context with node results
        currentContext = {
          ...currentContext,
          [node.id]: nodeResult,
          previousNodeResult: nodeResult,
        };
        
      } catch (nodeError) {
        console.error(`Node ${node.id} failed:`, nodeError);
        results[node.id] = { error: nodeError.message };
        
        // Decide whether to continue or stop workflow
        if (node.data?.stopOnError !== false) {
          throw new Error(`Workflow stopped at node ${node.id}: ${nodeError.message}`);
        }
      }
    }
    
    console.log(`✅ Workflow ${workflowId} completed successfully`);
    return {
      workflowId,
      executionId,
      status: 'completed',
      results,
      context: currentContext,
    };
    
  } catch (error) {
    console.error(`❌ Workflow ${workflowId} failed:`, error);
    throw error;
  }
};

/**
 * Execute a single node
 */
export const executeNode = async ({ nodeId, nodeType, nodeData, context, pool }) => {
  console.log(`🔧 Executing node ${nodeId} of type ${nodeType}`);
  
  try {
    switch (nodeType) {
      case 'llm_openai':
        return await executeOpenAINode(nodeData, context);
        
      case 'llm_claude':
        return await executeClaudeNode(nodeData, context);
        
      case 'database_query':
        return await executeDatabaseNode(nodeData, context, pool);
        
      case 'http_request':
        return await executeHttpNode(nodeData, context);
        
      case 'email_send':
        return await executeEmailNode(nodeData, context);
        
      case 'sms_send':
        return await executeSmsNode(nodeData, context);
        
      case 'delay':
        return await executeDelayNode(nodeData, context);
        
      case 'condition':
        return await executeConditionNode(nodeData, context);
        
      case 'transform_data':
        return await executeDataTransformNode(nodeData, context);
        
      default:
        throw new Error(`Unknown node type: ${nodeType}`);
    }
  } catch (error) {
    console.error(`❌ Node ${nodeId} execution failed:`, error);
    throw error;
  }
};

// Individual node processors
async function executeOpenAINode(nodeData, context) {
  if (!openaiClient) {
    throw new Error('OpenAI client not initialized. Check OPENAI_API_KEY environment variable.');
  }
  
  const prompt = interpolateTemplate(nodeData.prompt || '', context);
  const model = nodeData.model || 'gpt-3.5-turbo';
  
  const response = await openaiClient.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: nodeData.maxTokens || 1000,
    temperature: nodeData.temperature || 0.7,
  });
  
  return {
    response: response.choices[0]?.message?.content || '',
    usage: response.usage,
    model: response.model,
  };
}

async function executeClaudeNode(nodeData, context) {
  if (!anthropicClient) {
    throw new Error('Anthropic client not initialized. Check ANTHROPIC_API_KEY environment variable.');
  }
  
  const prompt = interpolateTemplate(nodeData.prompt || '', context);
  const model = nodeData.model || 'claude-3-sonnet-20240229';
  
  const response = await anthropicClient.messages.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: nodeData.maxTokens || 1000,
  });
  
  return {
    response: response.content[0]?.text || '',
    usage: response.usage,
    model: response.model,
  };
}

async function executeDatabaseNode(nodeData, context, pool) {
  const query = interpolateTemplate(nodeData.query || '', context);
  const params = nodeData.parameters ? 
    nodeData.parameters.map(param => interpolateTemplate(param, context)) : [];
  
  const result = await pool.query(query, params);
  return {
    rows: result.rows,
    rowCount: result.rowCount,
    command: result.command,
  };
}

async function executeHttpNode(nodeData, context) {
  const url = interpolateTemplate(nodeData.url || '', context);
  const method = nodeData.method || 'GET';
  const headers = nodeData.headers || {};
  const data = nodeData.body ? interpolateTemplate(JSON.stringify(nodeData.body), context) : null;
  
  const response = await axios({
    url,
    method,
    headers,
    data: data ? JSON.parse(data) : undefined,
    timeout: nodeData.timeout || 30000,
  });
  
  return {
    status: response.status,
    statusText: response.statusText,
    data: response.data,
    headers: response.headers,
  };
}

async function executeEmailNode(nodeData, context) {
  if (!smtpTransporter) {
    throw new Error('SMTP transporter not initialized. Check email configuration.');
  }
  
  const to = interpolateTemplate(nodeData.to || '', context);
  const subject = interpolateTemplate(nodeData.subject || '', context);
  const body = interpolateTemplate(nodeData.body || '', context);
  
  const result = await smtpTransporter.sendMail({
    from: nodeData.from || process.env.SMTP_USER,
    to,
    subject,
    text: nodeData.isHtml ? undefined : body,
    html: nodeData.isHtml ? body : undefined,
  });
  
  return {
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected,
  };
}

async function executeSmsNode(nodeData, context) {
  if (!twilioClient) {
    throw new Error('Twilio client not initialized. Check Twilio configuration.');
  }
  
  const to = interpolateTemplate(nodeData.to || '', context);
  const body = interpolateTemplate(nodeData.body || '', context);
  const from = nodeData.from || process.env.TWILIO_FROM_PHONE;
  
  const message = await twilioClient.messages.create({
    body,
    from,
    to,
  });
  
  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
    from: message.from,
  };
}

async function executeDelayNode(nodeData, context) {
  const delay = nodeData.delay || 1000; // Default 1 second
  
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        delayed: delay,
        timestamp: new Date().toISOString(),
      });
    }, delay);
  });
}

async function executeConditionNode(nodeData, context) {
  const condition = interpolateTemplate(nodeData.condition || 'true', context);
  
  // Simple condition evaluation (can be enhanced)
  let result;
  try {
    result = eval(condition); // In production, use a safer evaluation method
  } catch (error) {
    result = false;
  }
  
  return {
    condition,
    result: Boolean(result),
    branch: result ? 'true' : 'false',
  };
}

async function executeDataTransformNode(nodeData, context) {
  const inputData = context[nodeData.inputSource] || nodeData.inputData;
  const transformation = nodeData.transformation || 'passthrough';
  
  let result;
  
  switch (transformation) {
    case 'json_parse':
      result = typeof inputData === 'string' ? JSON.parse(inputData) : inputData;
      break;
      
    case 'json_stringify':
      result = typeof inputData === 'object' ? JSON.stringify(inputData, null, 2) : String(inputData);
      break;
      
    case 'uppercase':
      result = String(inputData).toUpperCase();
      break;
      
    case 'lowercase':
      result = String(inputData).toLowerCase();
      break;
      
    case 'trim':
      result = String(inputData).trim();
      break;
      
    default:
      result = inputData; // passthrough
  }
  
  return {
    input: inputData,
    transformation,
    result,
  };
}

/**
 * Interpolate template strings with context variables
 * Example: "Hello {{name}}" with context {name: "John"} -> "Hello John"
 */
function interpolateTemplate(template, context) {
  if (typeof template !== 'string') return template;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], context);
    return value !== undefined ? String(value) : match;
  });
}