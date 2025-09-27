/**
 * ExecutionContext - Manages data flow and variables between workflow nodes
 */
class ExecutionContext {
  constructor(workflowId, executionId) {
    this.workflowId = workflowId;
    this.executionId = executionId;
    this.variables = new Map(); // Global workflow variables
    this.nodeOutputs = new Map(); // Outputs from each node by nodeId
    this.metadata = {
      startTime: new Date(),
      currentNode: null,
      executionPath: []
    };
  }

  /**
   * Set a global workflow variable
   * @param {string} key - Variable name
   * @param {any} value - Variable value
   */
  setVariable(key, value) {
    this.variables.set(key, {
      value,
      timestamp: new Date(),
      type: typeof value
    });
  }

  /**
   * Get a global workflow variable
   * @param {string} key - Variable name
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Variable value
   */
  getVariable(key, defaultValue = null) {
    const variable = this.variables.get(key);
    return variable ? variable.value : defaultValue;
  }

  /**
   * Store output data from a node
   * @param {string} nodeId - Node identifier
   * @param {any} output - Node output data
   */
  setNodeOutput(nodeId, output) {
    this.nodeOutputs.set(nodeId, {
      output,
      timestamp: new Date(),
      nodeId
    });
  }

  /**
   * Get output data from a specific node
   * @param {string} nodeId - Node identifier
   * @returns {any} Node output data
   */
  getNodeOutput(nodeId) {
    const result = this.nodeOutputs.get(nodeId);
    return result ? result.output : null;
  }

  /**
   * Get outputs from multiple nodes
   * @param {string[]} nodeIds - Array of node identifiers
   * @returns {Object} Map of nodeId to output
   */
  getNodeOutputs(nodeIds) {
    const outputs = {};
    nodeIds.forEach(nodeId => {
      outputs[nodeId] = this.getNodeOutput(nodeId);
    });
    return outputs;
  }

  /**
   * Process template strings with context variables
   * Supports {{variable}} and {{node.nodeId.field}} syntax
   * @param {string} template - Template string
   * @returns {string} Processed string
   */
  processTemplate(template) {
    if (typeof template !== 'string') return template;

    return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      const trimmed = expression.trim();
      
      // Handle node output references: {{node.nodeId.field}}
      if (trimmed.startsWith('node.')) {
        const parts = trimmed.split('.');
        if (parts.length >= 2) {
          const nodeId = parts[1];
          const fieldPath = parts.slice(2);
          const nodeOutput = this.getNodeOutput(nodeId);
          
          if (nodeOutput) {
            return this.getNestedValue(nodeOutput, fieldPath) || match;
          }
        }
        return match;
      }
      
      // Handle direct variable references: {{variableName}}
      const value = this.getVariable(trimmed);
      return value !== null ? value : match;
    });
  }

  /**
   * Get nested value from object using dot notation path
   * @param {Object} obj - Source object
   * @param {string[]} path - Array of property names
   * @returns {any} Nested value or null
   */
  getNestedValue(obj, path) {
    return path.reduce((current, prop) => {
      return current && current[prop] !== undefined ? current[prop] : null;
    }, obj);
  }

  /**
   * Set nested value in object using dot notation path
   * @param {Object} obj - Target object
   * @param {string[]} path - Array of property names
   * @param {any} value - Value to set
   */
  setNestedValue(obj, path, value) {
    const lastKey = path.pop();
    const target = path.reduce((current, prop) => {
      if (!current[prop]) current[prop] = {};
      return current[prop];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Transform data using mapping rules
   * @param {any} data - Input data
   * @param {Object} mappingRules - Transformation rules
   * @returns {any} Transformed data
   */
  transformData(data, mappingRules) {
    if (!mappingRules || typeof mappingRules !== 'object') {
      return data;
    }

    const result = {};
    
    for (const [targetField, sourceRule] of Object.entries(mappingRules)) {
      if (typeof sourceRule === 'string') {
        // Simple field mapping or template
        if (sourceRule.includes('{{')) {
          result[targetField] = this.processTemplate(sourceRule);
        } else if (sourceRule.includes('.')) {
          // Nested field access
          result[targetField] = this.getNestedValue(data, sourceRule.split('.'));
        } else {
          // Direct field mapping
          result[targetField] = data[sourceRule];
        }
      } else if (typeof sourceRule === 'object' && sourceRule.type) {
        // Complex transformation rule
        result[targetField] = this.applyTransformation(data, sourceRule);
      } else {
        // Direct value assignment
        result[targetField] = sourceRule;
      }
    }

    return result;
  }

  /**
   * Apply complex transformation rules
   * @param {any} data - Input data
   * @param {Object} rule - Transformation rule
   * @returns {any} Transformed value
   */
  applyTransformation(data, rule) {
    switch (rule.type) {
      case 'concat':
        return rule.values.map(v => this.processTemplate(v)).join(rule.separator || '');
      
      case 'format_date':
        const date = new Date(this.getNestedValue(data, rule.field.split('.')));
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      case 'uppercase':
        const value = this.getNestedValue(data, rule.field.split('.'));
        return typeof value === 'string' ? value.toUpperCase() : value;
      
      case 'default':
        const fieldValue = this.getNestedValue(data, rule.field.split('.'));
        return fieldValue !== null && fieldValue !== undefined ? fieldValue : rule.value;
      
      default:
        return rule.value;
    }
  }

  /**
   * Update execution metadata
   * @param {string} currentNode - Currently executing node ID
   */
  updateMetadata(currentNode) {
    this.metadata.currentNode = currentNode;
    this.metadata.executionPath.push({
      nodeId: currentNode,
      timestamp: new Date()
    });
  }

  /**
   * Get execution summary for logging/debugging
   * @returns {Object} Execution context summary
   */
  getSummary() {
    return {
      workflowId: this.workflowId,
      executionId: this.executionId,
      variableCount: this.variables.size,
      nodeOutputCount: this.nodeOutputs.size,
      executionPath: this.metadata.executionPath,
      duration: new Date() - this.metadata.startTime
    };
  }

  /**
   * Serialize context for database storage
   * @returns {string} JSON serialized context
   */
  serialize() {
    return JSON.stringify({
      variables: Object.fromEntries(this.variables),
      nodeOutputs: Object.fromEntries(this.nodeOutputs),
      metadata: this.metadata
    });
  }

  /**
   * Restore context from database
   * @param {string} serializedData - JSON serialized context
   */
  deserialize(serializedData) {
    try {
      const data = JSON.parse(serializedData);
      
      if (data.variables) {
        this.variables = new Map(Object.entries(data.variables));
      }
      
      if (data.nodeOutputs) {
        this.nodeOutputs = new Map(Object.entries(data.nodeOutputs));
      }
      
      if (data.metadata) {
        this.metadata = { ...this.metadata, ...data.metadata };
      }
    } catch (error) {
      console.error('Failed to deserialize execution context:', error);
    }
  }
}

export default ExecutionContext;