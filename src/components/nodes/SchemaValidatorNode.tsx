import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckSquare, Trash2, Plus, X } from 'lucide-react';
import { WorkflowNode, SchemaValidatorNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const SchemaValidatorNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as SchemaValidatorNodeConfig;

  const handleConfigChange = (updates: Partial<SchemaValidatorNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleSchemaChange = (value: string) => {
    try {
      const schema = JSON.parse(value);
      handleConfigChange({ schema });
    } catch (error) {
      // Keep the text for now, will validate on save
    }
  };

  const handleRequiredFieldsChange = (value: string) => {
    const fields = value.split(',').map(f => f.trim()).filter(f => f.length > 0);
    handleConfigChange({ requiredFields: fields });
  };

  const handleCustomRuleAdd = (rule: string) => {
    if (rule.trim() && !(config.customValidationRules || []).includes(rule.trim())) {
      handleConfigChange({ 
        customValidationRules: [...(config.customValidationRules || []), rule.trim()]
      });
    }
  };

  const handleCustomRuleRemove = (index: number) => {
    const updatedRules = (config.customValidationRules || []).filter((_, i) => i !== index);
    handleConfigChange({ customValidationRules: updatedRules });
  };

  const handleClick = () => {
    selectNode({ id, type: 'schema_validator', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const predefinedRules = [
    'validate_email_format',
    'validate_phone_format',
    'validate_date_format',
    'validate_currency_format',
    'validate_iban_format',
    'validate_postal_code',
    'validate_vat_number',
    'check_field_length',
    'check_numeric_range',
    'validate_european_formats'
  ];

  const sampleSchema = {
    type: "object",
    properties: {
      customer_id: { type: "string", pattern: "^[A-Z]{3}[0-9]{6}$" },
      name: { type: "string", minLength: 2, maxLength: 100 },
      email: { type: "string", format: "email" },
      balance: { type: "number", minimum: 0 },
      last_payment_date: { type: "string", format: "date" }
    },
    required: ["customer_id", "name", "balance"]
  };

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-ai">
        <CheckSquare size={16} />
        <span>Schema Validator</span>
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
              placeholder="Schema validator name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">JSON Schema</label>
            <textarea
              defaultValue={JSON.stringify(config.schema || sampleSchema, null, 2)}
              onBlur={(e) => handleSchemaChange(e.target.value)}
              placeholder={JSON.stringify(sampleSchema, null, 2)}
              rows={6}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Define JSON Schema for data validation</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Required Fields</label>
            <input
              type="text"
              value={config.requiredFields.join(', ')}
              onChange={(e) => handleRequiredFieldsChange(e.target.value)}
              placeholder="customer_id, name, balance"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated required field names</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`strict-mode-${id}`}
                checked={config.strictMode}
                onChange={(e) => handleConfigChange({ strictMode: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`strict-mode-${id}`} className="text-xs text-gray-700">
                Strict mode (reject extra fields)
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`auto-correct-${id}`}
                checked={config.autoCorrect}
                onChange={(e) => handleConfigChange({ autoCorrect: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`auto-correct-${id}`} className="text-xs text-gray-700">
                Auto-correct fixable validation errors
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`llm-correction-${id}`}
                checked={config.useLLMForCorrection}
                onChange={(e) => handleConfigChange({ useLLMForCorrection: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`llm-correction-${id}`} className="text-xs text-gray-700">
                Use AI for intelligent corrections
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Custom Validation Rules</label>
            <div className="flex flex-wrap gap-1 mb-2 p-2 border border-gray-200 rounded bg-gray-50 max-h-20 overflow-y-auto">
              {(config.customValidationRules || []).map((rule, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                >
                  {rule}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCustomRuleRemove(index);
                    }}
                    className="text-purple-500 hover:text-purple-700"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-1">
              {predefinedRules
                .filter(rule => !(config.customValidationRules || []).includes(rule))
                .map((rule) => (
                  <button
                    key={rule}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCustomRuleAdd(rule);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    + {rule.replace(/_/g, ' ')}
                  </button>
                ))}
            </div>
          </div>

          <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
            <strong className="text-purple-700">Validation Summary:</strong>
            <ul className="mt-1 space-y-1 text-purple-700">
              <li>• <strong>Required Fields:</strong> {config.requiredFields.length}</li>
              <li>• <strong>Custom Rules:</strong> {(config.customValidationRules || []).length}</li>
              <li>• <strong>Mode:</strong> {config.strictMode ? 'Strict' : 'Permissive'}</li>
              <li>• <strong>Auto-correct:</strong> {config.autoCorrect ? 'Enabled' : 'Disabled'}</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <strong className="text-blue-700">Schema Features:</strong>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• European format validation (IBAN, VAT, postal codes)</li>
              <li>• Data type and format enforcement</li>
              <li>• Field length and range validation</li>
              <li>• {config.useLLMForCorrection ? 'AI-powered' : 'Rule-based'} error correction</li>
            </ul>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
            <div className="loading-spinner"></div>
            Validating schema...
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemaValidatorNode;