import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Globe, Trash2 } from 'lucide-react';
import { WorkflowNode, APIEndpointNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const APIEndpointNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as APIEndpointNodeConfig;

  const handleConfigChange = (updates: Partial<APIEndpointNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'api_endpoint', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-ingestion">
        <Globe size={16} />
        <span>API Endpoint</span>
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
              placeholder="API endpoint name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Endpoint Path</label>
              <input
                type="text"
                value={config.endpointPath}
                onChange={(e) => handleConfigChange({ endpointPath: e.target.value })}
                placeholder="/webhook"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
              <select
                value={config.method}
                onChange={(e) => handleConfigChange({ method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Authentication</label>
            <select
              value={config.authentication}
              onChange={(e) => handleConfigChange({ authentication: e.target.value as APIEndpointNodeConfig['authentication'] })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="none">No Authentication</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="apikey">API Key</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Response Format</label>
            <select
              value={config.responseFormat}
              onChange={(e) => handleConfigChange({ responseFormat: e.target.value as APIEndpointNodeConfig['responseFormat'] })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="csv">CSV</option>
              <option value="text">Plain Text</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rate Limit (per minute)</label>
            <input
              type="number"
              value={config.rateLimitPerMinute}
              onChange={(e) => handleConfigChange({ rateLimitPerMinute: parseInt(e.target.value) || 60 })}
              min="1"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          {config.authentication !== 'none' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Webhook Secret</label>
              <input
                type="password"
                value={config.webhookSecret || ''}
                onChange={(e) => handleConfigChange({ webhookSecret: e.target.value })}
                placeholder="Secret for webhook validation"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <strong>Endpoint URL:</strong><br/>
            <code>https://your-domain.com{config.endpointPath}</code>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600">
            <div className="loading-spinner"></div>
            API endpoint active...
          </div>
        )}
      </div>
    </div>
  );
};

export default APIEndpointNode;