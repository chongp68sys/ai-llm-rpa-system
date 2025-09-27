import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Shield, Trash2, Plus, X } from 'lucide-react';
import { WorkflowNode, BusinessRulesNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const BusinessRulesNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as BusinessRulesNodeConfig;

  const handleConfigChange = (updates: Partial<BusinessRulesNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleRuleChange = (index: number, field: keyof typeof config.rules[0], value: any) => {
    const updatedRules = [...config.rules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    handleConfigChange({ rules: updatedRules });
  };

  const addRule = () => {
    const newRule = {
      field: '',
      condition: '',
      action: 'flag' as const,
      message: ''
    };
    handleConfigChange({ rules: [...config.rules, newRule] });
  };

  const removeRule = (index: number) => {
    const updatedRules = config.rules.filter((_, i) => i !== index);
    handleConfigChange({ rules: updatedRules });
  };

  const handleClick = () => {
    selectNode({ id, type: 'business_rules', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const conditionOptions = [
    'is_empty',
    'is_not_empty',
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'regex_match',
    'is_valid_email',
    'is_valid_phone',
    'is_valid_date'
  ];

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-validation">
        <Shield size={16} />
        <span>Business Rules</span>
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
              placeholder="Business rules name..."
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Rule Set</label>
              <input
                type="text"
                value={config.ruleSet}
                onChange={(e) => handleConfigChange({ ruleSet: e.target.value })}
                placeholder="debt_collection_rules"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-700">Business Rules</label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addRule();
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <Plus size={12} />
                Add Rule
              </button>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {config.rules.map((rule, index) => (
                <div key={index} className="p-2 border border-gray-200 rounded bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">Rule {index + 1}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRule(index);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    <input
                      type="text"
                      value={rule.field}
                      onChange={(e) => handleRuleChange(index, 'field', e.target.value)}
                      placeholder="Field name"
                      className="px-1 py-1 text-xs border border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <select
                      value={rule.condition}
                      onChange={(e) => handleRuleChange(index, 'condition', e.target.value)}
                      className="px-1 py-1 text-xs border border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">Select condition</option>
                      {conditionOptions.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    <select
                      value={rule.action}
                      onChange={(e) => handleRuleChange(index, 'action', e.target.value)}
                      className="px-1 py-1 text-xs border border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="reject">Reject</option>
                      <option value="flag">Flag</option>
                      <option value="correct">Auto-correct</option>
                      <option value="skip">Skip</option>
                    </select>
                    <input
                      type="text"
                      value={rule.message}
                      onChange={(e) => handleRuleChange(index, 'message', e.target.value)}
                      placeholder="Error message"
                      className="px-1 py-1 text-xs border border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 p-2 bg-green-50 rounded text-xs">
            <strong>Rules Summary:</strong>
            <ul className="mt-1 space-y-1 text-green-700">
              <li>• <strong>Client:</strong> {config.clientId || 'Not specified'}</li>
              <li>• <strong>Rule Set:</strong> {config.ruleSet || 'Not specified'}</li>
              <li>• <strong>Rules Count:</strong> {config.rules.length}</li>
              <li>• Validates data against business logic</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <strong>Rule Actions:</strong>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• <strong>Reject:</strong> Stop processing and fail</li>
              <li>• <strong>Flag:</strong> Mark for review but continue</li>
              <li>• <strong>Auto-correct:</strong> Apply automatic fixes</li>
              <li>• <strong>Skip:</strong> Ignore and continue processing</li>
            </ul>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Applying business rules...
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessRulesNode;