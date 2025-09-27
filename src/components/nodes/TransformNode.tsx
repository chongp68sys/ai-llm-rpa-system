import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Code, Trash2 } from 'lucide-react';
import { WorkflowNode, TransformNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const TransformNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as TransformNodeConfig;

  const handleConfigChange = (updates: Partial<TransformNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'transform', position: { x: 0, y: 0 }, data } as WorkflowNode);
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
      <div className="node-header node-transform">
        <Code size={16} />
        <span>Transform</span>
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
              placeholder="Transform operation name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Transform Type
            </label>
            <select 
              value={config.transformType}
              onChange={(e) => handleConfigChange({ 
                transformType: e.target.value as TransformNodeConfig['transformType']
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="csv">CSV</option>
              <option value="text">Text</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Transform Script
            </label>
            <textarea
              value={config.script}
              onChange={(e) => handleConfigChange({ script: e.target.value })}
              placeholder="// JavaScript transformation code
return data.map(item => ({
  ...item,
  processed: true
}));"
              rows={4}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Transforming data...
          </div>
        )}
      </div>
    </div>
  );
};

export default TransformNode;