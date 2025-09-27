import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mail, MessageSquare, Phone, Webhook, Trash2 } from 'lucide-react';
import { WorkflowNode, CommunicationNodeConfig, CommunicationChannel } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const CommunicationNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as CommunicationNodeConfig;

  const handleConfigChange = (updates: Partial<CommunicationNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleChannelChange = (channel: CommunicationChannel) => {
    const newConfig: Partial<CommunicationNodeConfig> = {
      channel,
      emailConfig: channel === 'email' ? { to: '', subject: '', body: '' } : undefined,
      smsConfig: channel === 'sms' ? { phoneNumber: '', message: '' } : undefined,
      slackConfig: channel === 'slack' ? { message: '' } : undefined,
      discordConfig: channel === 'discord' ? { webhookUrl: '', message: '' } : undefined,
      teamsConfig: channel === 'teams' ? { webhookUrl: '', message: '' } : undefined,
      webhookConfig: channel === 'webhook' ? { url: '', method: 'POST', body: '' } : undefined,
    };
    handleConfigChange(newConfig);
  };

  const handleChannelConfigChange = (channelConfig: any) => {
    const configKey = `${config.channel}Config` as keyof CommunicationNodeConfig;
    handleConfigChange({
      [configKey]: { ...config[configKey], ...channelConfig }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'communication', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const getChannelIcon = () => {
    switch (config.channel) {
      case 'email': return <Mail size={16} />;
      case 'sms': return <Phone size={16} />;
      case 'slack': return <MessageSquare size={16} />;
      case 'discord': return <MessageSquare size={16} />;
      case 'teams': return <MessageSquare size={16} />;
      case 'webhook': return <Webhook size={16} />;
      default: return <Mail size={16} />;
    }
  };

  const renderChannelConfig = () => {
    switch (config.channel) {
      case 'email':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
              <input
                type="email"
                value={config.emailConfig?.to || ''}
                onChange={(e) => handleChannelConfigChange({ to: e.target.value })}
                placeholder="recipient@example.com"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={config.emailConfig?.subject || ''}
                onChange={(e) => handleChannelConfigChange({ subject: e.target.value })}
                placeholder="Email subject..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={config.emailConfig?.body || ''}
                onChange={(e) => handleChannelConfigChange({ body: e.target.value })}
                placeholder="Email message..."
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </>
        );

      case 'sms':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={config.smsConfig?.phoneNumber || ''}
                onChange={(e) => handleChannelConfigChange({ phoneNumber: e.target.value })}
                placeholder="+1234567890"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={config.smsConfig?.message || ''}
                onChange={(e) => handleChannelConfigChange({ message: e.target.value })}
                placeholder="SMS message..."
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </>
        );

      case 'slack':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={config.slackConfig?.webhookUrl || ''}
                onChange={(e) => handleChannelConfigChange({ webhookUrl: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Channel (optional)</label>
              <input
                type="text"
                value={config.slackConfig?.channel || ''}
                onChange={(e) => handleChannelConfigChange({ channel: e.target.value })}
                placeholder="#general"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={config.slackConfig?.message || ''}
                onChange={(e) => handleChannelConfigChange({ message: e.target.value })}
                placeholder="Slack message..."
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </>
        );

      case 'discord':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={config.discordConfig?.webhookUrl || ''}
                onChange={(e) => handleChannelConfigChange({ webhookUrl: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={config.discordConfig?.message || ''}
                onChange={(e) => handleChannelConfigChange({ message: e.target.value })}
                placeholder="Discord message..."
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </>
        );

      case 'teams':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={config.teamsConfig?.webhookUrl || ''}
                onChange={(e) => handleChannelConfigChange({ webhookUrl: e.target.value })}
                placeholder="https://outlook.office.com/webhook/..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title (optional)</label>
              <input
                type="text"
                value={config.teamsConfig?.title || ''}
                onChange={(e) => handleChannelConfigChange({ title: e.target.value })}
                placeholder="Message title..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={config.teamsConfig?.message || ''}
                onChange={(e) => handleChannelConfigChange({ message: e.target.value })}
                placeholder="Teams message..."
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </>
        );

      case 'webhook':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={config.webhookConfig?.url || ''}
                onChange={(e) => handleChannelConfigChange({ url: e.target.value })}
                placeholder="https://api.example.com/webhook"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
              <select
                value={config.webhookConfig?.method || 'POST'}
                onChange={(e) => handleChannelConfigChange({ method: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={config.webhookConfig?.body || ''}
                onChange={(e) => handleChannelConfigChange({ body: e.target.value })}
                placeholder='{"message": "Hello World"}'
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </>
        );

      default:
        return null;
    }
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
        {getChannelIcon()}
        <span>Communication</span>
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
              placeholder="Communication task name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
            <select
              value={config.channel || 'email'}
              onChange={(e) => handleChannelChange(e.target.value as CommunicationChannel)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
              <option value="teams">Microsoft Teams</option>
              <option value="webhook">Custom Webhook</option>
            </select>
          </div>

          {renderChannelConfig()}
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Sending message...
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationNode;