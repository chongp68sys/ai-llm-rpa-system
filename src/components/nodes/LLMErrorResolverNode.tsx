import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bot, Trash2, Plus, X } from 'lucide-react';
import { WorkflowNode, LLMErrorResolverNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const LLMErrorResolverNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as LLMErrorResolverNodeConfig;

  const handleConfigChange = (updates: Partial<LLMErrorResolverNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleErrorTypeAdd = (errorType: string) => {
    if (errorType.trim() && !config.errorTypes.includes(errorType.trim())) {
      handleConfigChange({ 
        errorTypes: [...config.errorTypes, errorType.trim()]
      });
    }
  };

  const handleErrorTypeRemove = (index: number) => {
    const updatedTypes = config.errorTypes.filter((_, i) => i !== index);
    handleConfigChange({ errorTypes: updatedTypes });
  };

  const handleClick = () => {
    selectNode({ id, type: 'llm_error_resolver', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const modelOptions = [
    { value: 'gpt-4', label: 'GPT-4 (OpenAI)' },
    { value: 'claude-3', label: 'Claude 3 (Anthropic)' },
    { value: 'claude-sonnet-4', label: 'Claude Sonnet 4 (Anthropic)' }
  ];

  const commonErrorTypes = [
    'data_format_error',
    'validation_error',
    'missing_field',
    'invalid_date',
    'invalid_email',
    'invalid_phone',
    'duplicate_record',
    'referential_integrity',
    'business_rule_violation',
    'encoding_error'
  ];

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-validation">
        <Bot size={16} />
        <span>AI Error Resolver</span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          className="ml-auto hover:bg-white hover:bg-opacity-20 p-1 rounded"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="node-content">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleConfigChange({ name: e.target.value })}
              placeholder="AI error resolver name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">AI Model</label>
            <select
              value={config.model}
              onChange={(e) => handleConfigChange({ model: e.target.value as LLMErrorResolverNodeConfig['model'] })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Error Types to Resolve</label>
            <div className="flex flex-wrap gap-1 mb-2 p-2 border border-gray-200 rounded bg-gray-50 max-h-20 overflow-y-auto">
              {config.errorTypes.map((errorType, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
                >
                  {errorType}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleErrorTypeRemove(index);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-1">
              {commonErrorTypes
                .filter(type => !config.errorTypes.includes(type))
                .map((errorType) => (
                  <button
                    key={errorType}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleErrorTypeAdd(errorType);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    + {errorType.replace(/_/g, ' ')}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Resolution Prompt</label>
            <textarea
              value={config.resolutionPrompt}
              onChange={(e) => handleConfigChange({ resolutionPrompt: e.target.value })}
              placeholder="You are an expert data processor. Analyze the following error and provide a corrected version of the data. Consider European debt collection regulations and best practices..."
              rows={4}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Retries</label>
              <input
                type="number"
                value={config.maxRetries}
                onChange={(e) => handleConfigChange({ maxRetries: parseInt(e.target.value) || 3 })}
                min="1"
                max="10"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confidence Threshold</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.confidenceThreshold}
                onChange={(e) => handleConfigChange({ confidenceThreshold: parseFloat(e.target.value) })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`escalate-${id}`}
              checked={config.escalateToHuman}
              onChange={(e) => handleConfigChange({ escalateToHuman: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor={`escalate-${id}`} className="text-xs text-gray-700">
              Escalate to human review if AI cannot resolve
            </label>
          </div>

          <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
            <strong>AI Resolution:</strong>
            <ul className="mt-1 space-y-1 text-purple-700">
              <li>• <strong>Model:</strong> {modelOptions.find(m => m.value === config.model)?.label}</li>
              <li>• <strong>Error Types:</strong> {config.errorTypes.length} configured</li>
              <li>• <strong>Retries:</strong> Up to {config.maxRetries} attempts</li>
              <li>• <strong>Escalation:</strong> {config.escalateToHuman ? 'Enabled' : 'Disabled'}</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
            <strong>Resolution Process:</strong>
            <ul className="mt-1 space-y-1 text-yellow-700">
              <li>• Analyzes error context and data</li>
              <li>• Applies domain expertise for corrections</li>
              <li>• Validates corrections against business rules</li>
              <li>• Escalates complex cases to human review</li>
            </ul>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
            <div className="loading-spinner"></div>
            Resolving errors with AI...
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMErrorResolverNode;