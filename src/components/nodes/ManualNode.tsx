import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play, Trash2 } from 'lucide-react';
import { WorkflowNode, ManualNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const ManualNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as ManualNodeConfig;

  const handleConfigChange = (updates: Partial<ManualNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'manual', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      {/* Output Handle */}
      <Handle type="source" position={Position.Right} />
      
      {/* Header */}
      <div className="node-header node-trigger">
        <Play size={16} />
        <span>Manual</span>
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
              placeholder="Manual trigger name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`require-confirmation-${id}`}
              checked={config.requireConfirmation}
              onChange={(e) => handleConfigChange({ requireConfirmation: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label 
              htmlFor={`require-confirmation-${id}`}
              className="text-xs font-medium text-gray-700 cursor-pointer"
            >
              Require confirmation before execution
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={config.description || ''}
              onChange={(e) => handleConfigChange({ description: e.target.value })}
              placeholder="Describe what this manual trigger does..."
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Ready to execute...
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualNode;