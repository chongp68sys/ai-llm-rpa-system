import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mail, Trash2 } from 'lucide-react';
import { WorkflowNode, EmailAttachmentNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const EmailAttachmentNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as EmailAttachmentNodeConfig;

  const handleConfigChange = (updates: Partial<EmailAttachmentNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'email_attachment', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-ingestion">
        <Mail size={16} />
        <span>Email Attachments</span>
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
              placeholder="Email processor name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Server</label>
              <input
                type="text"
                value={config.emailServer}
                onChange={(e) => handleConfigChange({ emailServer: e.target.value })}
                placeholder="imap.gmail.com"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Port</label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => handleConfigChange({ port: parseInt(e.target.value) || 993 })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Protocol</label>
            <select
              value={config.protocol}
              onChange={(e) => handleConfigChange({ protocol: e.target.value as 'imap' | 'pop3' })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="imap">IMAP</option>
              <option value="pop3">POP3</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => handleConfigChange({ username: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => handleConfigChange({ password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mailbox</label>
              <input
                type="text"
                value={config.mailbox}
                onChange={(e) => handleConfigChange({ mailbox: e.target.value })}
                placeholder="INBOX"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search Criteria</label>
              <input
                type="text"
                value={config.searchCriteria}
                onChange={(e) => handleConfigChange({ searchCriteria: e.target.value })}
                placeholder="UNSEEN"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Download Path</label>
            <input
              type="text"
              value={config.downloadPath}
              onChange={(e) => handleConfigChange({ downloadPath: e.target.value })}
              placeholder="/path/to/downloads"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`read-${id}`}
                checked={config.markAsRead}
                onChange={(e) => handleConfigChange({ markAsRead: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`read-${id}`} className="text-xs text-gray-700">
                Mark emails as read
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`delete-${id}`}
                checked={config.deleteAfterProcessing}
                onChange={(e) => handleConfigChange({ deleteAfterProcessing: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`delete-${id}`} className="text-xs text-gray-700">
                Delete after processing
              </label>
            </div>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600">
            <div className="loading-spinner"></div>
            Processing email attachments...
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailAttachmentNode;