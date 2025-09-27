import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Trash2 } from 'lucide-react';
import { WorkflowNode, ConditionNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const ConditionNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as ConditionNodeConfig;

  const handleConfigChange = (updates: Partial<ConditionNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'condition', position: { x: 0, y: 0 }, data } as WorkflowNode);
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
      <div className="node-header node-condition">
        <GitBranch size={16} />
        <span>Condition</span>
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
              placeholder="Condition name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Condition Expression
            </label>
            <textarea
              value={config.expression}
              onChange={(e) => handleConfigChange({ expression: e.target.value })}
              placeholder="data.status === 'active' && data.count > 10"
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                True Output
              </label>
              <input
                type="text"
                value={config.trueOutput}
                onChange={(e) => handleConfigChange({ trueOutput: e.target.value })}
                placeholder="success"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                False Output
              </label>
              <input
                type="text"
                value={config.falseOutput}
                onChange={(e) => handleConfigChange({ falseOutput: e.target.value })}
                placeholder="failed"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Evaluating condition...
          </div>
        )}
      </div>
    </div>
  );
};

export default ConditionNode;