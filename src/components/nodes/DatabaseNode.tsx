import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database, Trash2 } from 'lucide-react';
import { WorkflowNode, DatabaseNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const DatabaseNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as DatabaseNodeConfig;

  const handleConfigChange = (updates: Partial<DatabaseNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'database', position: { x: 0, y: 0 }, data } as WorkflowNode);
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
        <Database size={16} />
        <span>Database</span>
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
              placeholder="Database operation name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Operation
            </label>
            <select 
              value={config.operation}
              onChange={(e) => handleConfigChange({ 
                operation: e.target.value as DatabaseNodeConfig['operation']
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="select">SELECT</option>
              <option value="insert">INSERT</option>
              <option value="update">UPDATE</option>
              <option value="delete">DELETE</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Connection String
            </label>
            <input
              type="text"
              value={config.connectionString}
              onChange={(e) => handleConfigChange({ connectionString: e.target.value })}
              placeholder="postgresql://user:pass@host:port/db"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Query
            </label>
            <textarea
              value={config.query}
              onChange={(e) => handleConfigChange({ query: e.target.value })}
              placeholder="SELECT * FROM users WHERE..."
              rows={3}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Executing query...
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseNode;