import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Globe, Trash2 } from 'lucide-react';
import { WorkflowNode, APINodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const APINode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as APINodeConfig;

  const handleConfigChange = (updates: Partial<APINodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'api', position: { x: 0, y: 0 }, data } as WorkflowNode);
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
        <Globe size={16} />
        <span>API Call</span>
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
              placeholder="API call name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Method
              </label>
              <select 
                value={config.method}
                onChange={(e) => handleConfigChange({ 
                  method: e.target.value as APINodeConfig['method']
                })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="text"
                value={config.url}
                onChange={(e) => handleConfigChange({ url: e.target.value })}
                placeholder="https://api.example.com/endpoint"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {(config.method === 'POST' || config.method === 'PUT') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Request Body
              </label>
              <textarea
                value={config.body || ''}
                onChange={(e) => handleConfigChange({ body: e.target.value })}
                placeholder='{"key": "value"}'
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
              />
            </div>
          )}
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Making API call...
          </div>
        )}
      </div>
    </div>
  );
};

export default APINode;
