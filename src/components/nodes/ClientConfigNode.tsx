import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Settings, Trash2 } from 'lucide-react';
import { WorkflowNode, ClientConfigNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const ClientConfigNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as ClientConfigNodeConfig;

  const handleConfigChange = (updates: Partial<ClientConfigNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleBusinessRulesChange = (value: string) => {
    try {
      const rules = JSON.parse(value);
      handleConfigChange({ businessRules: rules });
    } catch (error) {
      // Keep the text for now, will validate on save
    }
  };

  const handleDataSchemasChange = (value: string) => {
    try {
      const schemas = JSON.parse(value);
      handleConfigChange({ dataSchemas: schemas });
    } catch (error) {
      // Keep the text for now, will validate on save
    }
  };

  const handleSftpConfigChange = (value: string) => {
    try {
      const sftpConfig = value.trim() ? JSON.parse(value) : undefined;
      handleConfigChange({ sftpConfig });
    } catch (error) {
      // Keep the text for now, will validate on save
    }
  };

  const handleApiConfigChange = (value: string) => {
    try {
      const apiConfig = value.trim() ? JSON.parse(value) : undefined;
      handleConfigChange({ apiConfig });
    } catch (error) {
      // Keep the text for now, will validate on save
    }
  };

  const handleClick = () => {
    selectNode({ id, type: 'client_config', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const countryCodes = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'
  ];

  const languageCodes = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fi', name: 'Finnish' }
  ];

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-client-mgmt">
        <Settings size={16} />
        <span>Client Config</span>
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
              placeholder="Client configuration name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Client ID</label>
              <input
                type="text"
                value={config.clientId}
                onChange={(e) => handleConfigChange({ clientId: e.target.value })}
                placeholder="CLIENT001"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Client Name</label>
              <input
                type="text"
                value={config.clientName}
                onChange={(e) => handleConfigChange({ clientName: e.target.value })}
                placeholder="Acme Debt Collection"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Country Code</label>
              <select
                value={config.countryCode}
                onChange={(e) => handleConfigChange({ countryCode: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Country</option>
                {countryCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
              <select
                value={config.languageCode}
                onChange={(e) => handleConfigChange({ languageCode: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Language</option>
                {languageCodes.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Business Rules (JSON)</label>
            <textarea
              defaultValue={JSON.stringify(config.businessRules || {}, null, 2)}
              onBlur={(e) => handleBusinessRulesChange(e.target.value)}
              placeholder='{"minDebtAmount": 100, "maxDaysOverdue": 365, "allowedPaymentMethods": ["bank", "card"]}'
              rows={4}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Schemas (JSON)</label>
            <textarea
              defaultValue={JSON.stringify(config.dataSchemas || {}, null, 2)}
              onBlur={(e) => handleDataSchemasChange(e.target.value)}
              placeholder='{"customer": {"name": "string", "balance": "number"}, "payment": {"amount": "number", "date": "date"}}'
              rows={4}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SFTP Config (JSON, Optional)</label>
            <textarea
              defaultValue={config.sftpConfig ? JSON.stringify(config.sftpConfig, null, 2) : ''}
              onBlur={(e) => handleSftpConfigChange(e.target.value)}
              placeholder='{"host": "sftp.client.com", "port": 22, "username": "user", "privateKeyPath": "/keys/client.pem"}'
              rows={3}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">API Config (JSON, Optional)</label>
            <textarea
              defaultValue={config.apiConfig ? JSON.stringify(config.apiConfig, null, 2) : ''}
              onBlur={(e) => handleApiConfigChange(e.target.value)}
              placeholder='{"baseUrl": "https://api.client.com", "apiKey": "key123", "webhookSecret": "secret"}'
              rows={3}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
            <strong>Client Configuration:</strong>
            <ul className="mt-1 space-y-1 text-orange-700">
              <li>• <strong>ID:</strong> {config.clientId || 'Not set'}</li>
              <li>• <strong>Country:</strong> {config.countryCode || 'Not set'}</li>
              <li>• <strong>Language:</strong> {config.languageCode || 'Not set'}</li>
              <li>• <strong>Business Rules:</strong> {Object.keys(config.businessRules || {}).length} defined</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <strong>Integration Setup:</strong>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• <strong>SFTP:</strong> {config.sftpConfig ? 'Configured' : 'Not configured'}</li>
              <li>• <strong>API:</strong> {config.apiConfig ? 'Configured' : 'Not configured'}</li>
              <li>• Multi-tenant data isolation enabled</li>
              <li>• Audit trail and compliance tracking</li>
            </ul>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
            <div className="loading-spinner"></div>
            Configuring client settings...
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientConfigNode;