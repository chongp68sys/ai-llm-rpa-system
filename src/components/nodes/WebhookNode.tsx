import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap, Trash2 } from 'lucide-react';
import { WorkflowNode, WebhookNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const WebhookNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as WebhookNodeConfig;

  const handleConfigChange = (updates: Partial<WebhookNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'webhook', position: { x: 0, y: 0 }, data } as WorkflowNode);
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
        <Zap size={16} />
        <span>Webhook</span>
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
              placeholder="Webhook name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Method
            </label>
            <select 
              value={config.method}
              onChange={(e) => handleConfigChange({ 
                method: e.target.value as WebhookNodeConfig['method']
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Webhook URL
            </label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => handleConfigChange({ url: e.target.value })}
              placeholder="https://your-app.com/webhook"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Waiting for webhook...
          </div>
        )}
      </div>
    </div>
  );
};

export default WebhookNode;