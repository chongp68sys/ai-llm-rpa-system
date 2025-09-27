import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Server, Trash2 } from 'lucide-react';
import { WorkflowNode, SFTPNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const SFTPNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as SFTPNodeConfig;

  const handleConfigChange = (updates: Partial<SFTPNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'sftp', position: { x: 0, y: 0 }, data } as WorkflowNode);
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
      <div className="node-header node-ingestion">
        <Server size={16} />
        <span>SFTP</span>
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
              placeholder="SFTP connection name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Host</label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => handleConfigChange({ host: e.target.value })}
                placeholder="sftp.example.com"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => handleConfigChange({ port: parseInt(e.target.value) || 22 })}
                placeholder="22"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => handleConfigChange({ username: e.target.value })}
              placeholder="username"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Authentication</label>
            <select
              value={config.keyType}
              onChange={(e) => handleConfigChange({ keyType: e.target.value as 'password' | 'privateKey' })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="password">Password</option>
              <option value="privateKey">Private Key</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {config.keyType === 'password' ? 'Password' : 'Private Key'}
            </label>
            <input
              type={config.keyType === 'password' ? 'password' : 'text'}
              value={config.passwordOrKey}
              onChange={(e) => handleConfigChange({ passwordOrKey: e.target.value })}
              placeholder={config.keyType === 'password' ? '••••••••' : 'Private key content...'}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Operation</label>
            <select
              value={config.operation}
              onChange={(e) => handleConfigChange({ operation: e.target.value as 'download' | 'upload' | 'list' })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="download">Download</option>
              <option value="upload">Upload</option>
              <option value="list">List Files</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Remote Path</label>
              <input
                type="text"
                value={config.remotePath}
                onChange={(e) => handleConfigChange({ remotePath: e.target.value })}
                placeholder="/remote/path"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Local Path</label>
              <input
                type="text"
                value={config.localPath}
                onChange={(e) => handleConfigChange({ localPath: e.target.value })}
                placeholder="/local/path"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {config.operation === 'download' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`delete-${id}`}
                checked={config.deleteAfterDownload}
                onChange={(e) => handleConfigChange({ deleteAfterDownload: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`delete-${id}`} className="text-xs text-gray-700">
                Delete after download
              </label>
            </div>
          )}
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            {config.operation === 'download' ? 'Downloading files...' : 
             config.operation === 'upload' ? 'Uploading files...' : 
             'Listing files...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default SFTPNode;