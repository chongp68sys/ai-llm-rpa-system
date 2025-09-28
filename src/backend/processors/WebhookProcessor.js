import axios from 'axios';

export class WebhookProcessor {
  constructor() {
    this.defaultTimeout = 30000; // 30 seconds
    this.maxRetries = 3;
  }

  async process(data) {
    const { url, method = 'POST', payload, headers = {}, nodeId, executionId, timeout = this.defaultTimeout } = data;

    if (!url) {
      throw new Error('Webhook URL is required');
    }

    try {
      // Prepare request configuration
      const config = {
        method: method.toUpperCase(),
        url,
        timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AI-LLM-RPA-System/1.0',
          ...headers
        },
        validateStatus: (status) => status < 500 // Don't throw for 4xx errors
      };

      // Add payload for methods that support body
      if (['POST', 'PUT', 'PATCH'].includes(config.method) && payload) {
        config.data = payload;
      } else if (['GET', 'DELETE'].includes(config.method) && payload) {
        // For GET/DELETE, add payload as query parameters if it's an object
        if (typeof payload === 'object') {
          config.params = payload;
        }
      }

      console.log(`Making webhook request to ${url} with method ${method}`);
      const response = await axios(config);

      // Parse response data
      let responseData = response.data;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch {
          // Keep as string if not valid JSON
        }
      }

      const result = {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        headers: response.headers,
        url,
        method: config.method,
        timestamp: new Date().toISOString(),
        nodeId,
        executionId,
        responseTime: Date.now() - Date.now() // This would be calculated properly in real implementation
      };

      if (!result.success) {
        console.warn(`Webhook returned non-success status: ${response.status} ${response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error(`Webhook request failed for execution ${executionId}:`, error.message);
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
          error: error.message,
          url,
          method: method.toUpperCase(),
          timestamp: new Date().toISOString(),
          nodeId,
          executionId
        };
      } else if (error.request) {
        // Request was made but no response received
        throw new Error(`Webhook request timeout or network error: ${error.message}`);
      } else {
        // Something else happened
        throw new Error(`Webhook configuration error: ${error.message}`);
      }
    }
  }

  async processWithRetry(data, retries = this.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.process(data);
        
        // If successful or client error (4xx), don't retry
        if (result.success || (result.status && result.status >= 400 && result.status < 500)) {
          return result;
        }
        
        // For server errors (5xx), retry
        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`Webhook attempt ${attempt} failed with status ${result.status}. Retrying in ${delay}ms...`);
          await this.delay(delay);
          continue;
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`Webhook attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    
    throw lastError || new Error('All webhook retry attempts failed');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Validate webhook URL
  validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Webhook URL must use HTTP or HTTPS protocol');
      }
      return true;
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error.message}`);
    }
  }

  // Test webhook endpoint
  async testWebhook(url, method = 'GET') {
    try {
      this.validateUrl(url);
      
      const result = await this.process({
        url,
        method,
        payload: { test: true, timestamp: new Date().toISOString() },
        nodeId: 'test',
        executionId: 'test-execution'
      });

      return {
        status: 'success',
        reachable: result.success,
        responseStatus: result.status,
        responseTime: result.responseTime || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'failed',
        reachable: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}