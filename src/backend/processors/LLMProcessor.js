import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config/environment.js';

export class LLMProcessor {
  constructor() {
    this.openaiClient = null;
    this.anthropicClient = null;
    this.initializeClients();
  }

  initializeClients() {
    // Initialize OpenAI client if API key is available
    if (config.openai?.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    }

    // Initialize Anthropic client if API key is available
    if (config.anthropic?.apiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: config.anthropic.apiKey,
      });
    }
  }

  async process(data) {
    const { provider, prompt, model, nodeId, executionId, options = {} } = data;

    if (!prompt) {
      throw new Error('Prompt is required for LLM processing');
    }

    if (!provider) {
      throw new Error('LLM provider is required (openai or anthropic)');
    }

    try {
      switch (provider.toLowerCase()) {
        case 'openai':
          return await this.processOpenAI(prompt, model, options, nodeId, executionId);
        case 'anthropic':
        case 'claude':
          return await this.processAnthropic(prompt, model, options, nodeId, executionId);
        default:
          throw new Error(`Unsupported LLM provider: ${provider}`);
      }
    } catch (error) {
      console.error(`LLM processing failed for execution ${executionId}:`, error);
      throw new Error(`LLM processing failed: ${error.message}`);
    }
  }

  async processOpenAI(prompt, model = 'gpt-3.5-turbo', options = {}, nodeId, executionId) {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not configured. Please set OPENAI_API_KEY in environment variables.');
    }

    try {
      const messages = this.prepareMessages(prompt, options.systemMessage);
      
      const completion = await this.openaiClient.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        stream: false, // For queue processing, we don't want streaming
      });

      const result = {
        success: true,
        provider: 'openai',
        model,
        response: completion.choices[0].message.content,
        usage: {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        },
        timestamp: new Date().toISOString(),
        nodeId,
        executionId
      };

      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI processing failed: ${error.message}`);
    }
  }

  async processAnthropic(prompt, model = 'claude-3-haiku-20240307', options = {}, nodeId, executionId) {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not configured. Please set ANTHROPIC_API_KEY in environment variables.');
    }

    try {
      const systemMessage = options.systemMessage || 'You are a helpful assistant processing data in an automated workflow.';
      
      const message = await this.anthropicClient.messages.create({
        model: model,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        system: systemMessage,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      const result = {
        success: true,
        provider: 'anthropic',
        model,
        response: message.content[0].text,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        },
        timestamp: new Date().toISOString(),
        nodeId,
        executionId
      };

      return result;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(`Anthropic processing failed: ${error.message}`);
    }
  }

  prepareMessages(prompt, systemMessage) {
    const messages = [];

    if (systemMessage) {
      messages.push({
        role: 'system',
        content: systemMessage
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    return messages;
  }

  // Validate model availability for provider
  validateModel(provider, model) {
    const supportedModels = {
      openai: [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-4-turbo-preview',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k'
      ],
      anthropic: [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'claude-2.1',
        'claude-2.0',
        'claude-instant-1.2'
      ]
    };

    const providerModels = supportedModels[provider.toLowerCase()];
    if (!providerModels) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!providerModels.includes(model)) {
      console.warn(`Model ${model} may not be supported for ${provider}. Supported models: ${providerModels.join(', ')}`);
    }

    return true;
  }

  // Test LLM connectivity
  async testConnection(provider, model = null) {
    try {
      const testPrompt = 'Hello! This is a connectivity test. Please respond with "Connection successful".';
      const defaultModels = {
        openai: 'gpt-3.5-turbo',
        anthropic: 'claude-3-haiku-20240307'
      };

      const testModel = model || defaultModels[provider.toLowerCase()];
      
      const result = await this.process({
        provider,
        prompt: testPrompt,
        model: testModel,
        nodeId: 'test',
        executionId: 'connection-test',
        options: { maxTokens: 100 }
      });

      return {
        status: 'connected',
        provider,
        model: testModel,
        response: result.response,
        usage: result.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'failed',
        provider,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get available models for configured providers
  getAvailableProviders() {
    const providers = [];

    if (this.openaiClient) {
      providers.push({
        name: 'openai',
        displayName: 'OpenAI',
        configured: true,
        defaultModel: 'gpt-3.5-turbo'
      });
    }

    if (this.anthropicClient) {
      providers.push({
        name: 'anthropic',
        displayName: 'Anthropic (Claude)',
        configured: true,
        defaultModel: 'claude-3-haiku-20240307'
      });
    }

    if (providers.length === 0) {
      providers.push({
        name: 'none',
        displayName: 'No LLM providers configured',
        configured: false,
        message: 'Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY in environment variables'
      });
    }

    return providers;
  }

  // Extract structured data from LLM response
  async extractStructuredData(response, schema = {}) {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to find JSON-like content in the response
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonContent = response.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonContent);
      }

      // If no JSON found, return the raw response
      return { text: response };
    } catch (error) {
      console.warn('Failed to extract structured data from LLM response:', error.message);
      return { text: response };
    }
  }

  // Estimate token count (rough approximation)
  estimateTokenCount(text) {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
}