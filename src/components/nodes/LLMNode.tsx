import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { WorkflowNode, LLMNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const LLMNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as LLMNodeConfig;

  const handleConfigChange = (updates: Partial<LLMNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'llm', position: { x: 0, y: 0 }, data } as WorkflowNode);
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
      <div className="node-header node-action">
        <MessageSquare size={16} />
        <span>AI/LLM</span>
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
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleConfigChange({ name: e.target.value })}
              placeholder="LLM task name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Model
            </label>
            <select 
              value={config.model}
              onChange={(e) => handleConfigChange({ 
                model: e.target.value as LLMNodeConfig['model']
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="claude-3">Claude 3</option>
              <option value="claude-sonnet-4">Claude Sonnet 4</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Prompt Template
            </label>
            <textarea
              value={config.prompt}
              onChange={(e) => handleConfigChange({ prompt: e.target.value })}
              placeholder="Enter your prompt template..."
              rows={3}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Temperature
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature || 0.7}
                onChange={(e) => handleConfigChange({ temperature: parseFloat(e.target.value) })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                min="1"
                max="4000"
                value={config.maxTokens || 1000}
                onChange={(e) => handleConfigChange({ maxTokens: parseInt(e.target.value) })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Processing with AI...
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMNode;
