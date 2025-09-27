import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Brain, Trash2 } from 'lucide-react';
import { WorkflowNode, LLMDataMapperNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const LLMDataMapperNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as LLMDataMapperNodeConfig;

  const handleConfigChange = (updates: Partial<LLMDataMapperNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'llm_data_mapper', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const handleSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const schema = JSON.parse(e.target.value);
      handleConfigChange({ expectedSchema: schema });
    } catch (error) {
      // Keep the text for now, will validate on save
    }
  };

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      {/* Header */}
      <div className="node-header node-ai">
        <Brain size={16} />
        <span>AI Data Mapper</span>
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

      {/* Content */}
      <div className="node-content">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleConfigChange({ name: e.target.value })}
              placeholder="AI mapping task name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">AI Model</label>
            <select
              value={config.model}
              onChange={(e) => handleConfigChange({ model: e.target.value as LLMDataMapperNodeConfig['model'] })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3">Claude 3</option>
              <option value="claude-sonnet-4">Claude Sonnet 4</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mapping Prompt</label>
            <textarea
              value={config.mappingPrompt}
              onChange={(e) => handleConfigChange({ mappingPrompt: e.target.value })}
              placeholder="Describe how to map the data fields..."
              rows={3}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Expected Schema (JSON)</label>
            <textarea
              defaultValue={JSON.stringify(config.expectedSchema, null, 2)}
              onBlur={handleSchemaChange}
              placeholder='{"customer_id": "string", "balance": "number", "currency": "string"}'
              rows={4}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">On Low Confidence</label>
              <select
                value={config.fallbackAction}
                onChange={(e) => handleConfigChange({ fallbackAction: e.target.value as 'error' | 'skip' | 'manual_review' })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="manual_review">Manual Review</option>
                <option value="skip">Skip Record</option>
                <option value="error">Throw Error</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Client Context (Optional)</label>
            <input
              type="text"
              value={config.clientContext || ''}
              onChange={(e) => handleConfigChange({ clientContext: e.target.value })}
              placeholder="Additional context about this client's data..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-pink-600">
            <div className="loading-spinner"></div>
            AI mapping data fields...
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMDataMapperNode;