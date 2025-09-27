import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Eye, Trash2 } from 'lucide-react';
import { WorkflowNode, FileMonitorNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const FileMonitorNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as FileMonitorNodeConfig;

  const handleConfigChange = (updates: Partial<FileMonitorNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'file_monitor', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-ingestion">
        <Eye size={16} />
        <span>File Monitor</span>
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
              placeholder="File monitor name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Monitor Type</label>
            <select
              value={config.monitorType}
              onChange={(e) => handleConfigChange({ monitorType: e.target.value as 'sftp' | 'local' | 'email' | 'api' })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="sftp">SFTP Directory</option>
              <option value="local">Local Directory</option>
              <option value="email">Email Inbox</option>
              <option value="api">API Endpoint</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Path</label>
            <input
              type="text"
              value={config.path}
              onChange={(e) => handleConfigChange({ path: e.target.value })}
              placeholder="/path/to/monitor"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">File Pattern</label>
              <input
                type="text"
                value={config.filePattern}
                onChange={(e) => handleConfigChange({ filePattern: e.target.value })}
                placeholder="*.csv"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Poll Interval (s)</label>
              <input
                type="number"
                value={config.pollInterval}
                onChange={(e) => handleConfigChange({ pollInterval: parseInt(e.target.value) || 60 })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`recursive-${id}`}
              checked={config.recursive}
              onChange={(e) => handleConfigChange({ recursive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor={`recursive-${id}`} className="text-xs text-gray-700">
              Monitor subdirectories
            </label>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600">
            <div className="loading-spinner"></div>
            Monitoring for files...
          </div>
        )}
      </div>
    </div>
  );
};

export default FileMonitorNode;