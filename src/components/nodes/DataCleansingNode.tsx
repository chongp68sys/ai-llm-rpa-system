import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Eraser, Trash2, Plus, X } from 'lucide-react';
import { WorkflowNode, DataCleansingNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const DataCleansingNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as DataCleansingNodeConfig;

  const handleConfigChange = (updates: Partial<DataCleansingNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleOperationToggle = (operation: string, checked: boolean) => {
    const newOperations = checked
      ? [...config.operations, operation as any]
      : config.operations.filter(op => op !== operation);
    handleConfigChange({ operations: newOperations });
  };

  const handleCustomRuleAdd = (rule: string) => {
    if (rule.trim() && !(config.customRules || []).includes(rule.trim())) {
      handleConfigChange({ 
        customRules: [...(config.customRules || []), rule.trim()]
      });
    }
  };

  const handleCustomRuleRemove = (index: number) => {
    const updatedRules = (config.customRules || []).filter((_, i) => i !== index);
    handleConfigChange({ customRules: updatedRules });
  };

  const handleClick = () => {
    selectNode({ id, type: 'data_cleansing', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const cleansingOperations = [
    { 
      key: 'trim', 
      label: 'Trim Whitespace', 
      description: 'Remove leading/trailing spaces from all text fields'
    },
    { 
      key: 'removeNulls', 
      label: 'Remove Null Values', 
      description: 'Remove records with null/empty critical fields'
    },
    { 
      key: 'removeDuplicates', 
      label: 'Remove Duplicates', 
      description: 'Identify and remove duplicate records'
    },
    { 
      key: 'standardizeFormats', 
      label: 'Standardize Formats', 
      description: 'Apply consistent formatting (dates, phones, etc.)'
    },
    { 
      key: 'fixEncoding', 
      label: 'Fix Character Encoding', 
      description: 'Correct character encoding issues'
    }
  ];

  const predefinedCustomRules = [
    'normalize_phone_numbers',
    'standardize_country_codes',
    'fix_currency_formatting',
    'normalize_address_format',
    'standardize_date_formats',
    'clean_special_characters',
    'normalize_case_formatting',
    'fix_decimal_separators',
    'remove_invalid_characters',
    'standardize_postal_codes'
  ];

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-transform">
        <Eraser size={16} />
        <span>Data Cleansing</span>
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
              placeholder="Data cleansing name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Cleansing Operations</label>
            <div className="space-y-2">
              {cleansingOperations.map((operation) => (
                <div key={operation.key} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id={`${id}-${operation.key}`}
                    checked={config.operations.includes(operation.key as any)}
                    onChange={(e) => handleOperationToggle(operation.key, e.target.checked)}
                    className="rounded border-gray-300 mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor={`${id}-${operation.key}`} className="text-xs font-medium text-gray-700 cursor-pointer">
                      {operation.label}
                    </label>
                    <p className="text-xs text-gray-500">{operation.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`preserve-original-${id}`}
              checked={config.preserveOriginal}
              onChange={(e) => handleConfigChange({ preserveOriginal: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor={`preserve-original-${id}`} className="text-xs text-gray-700">
              Preserve original data (backup before cleansing)
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Custom Cleansing Rules</label>
            <div className="flex flex-wrap gap-1 mb-2 p-2 border border-gray-200 rounded bg-gray-50 max-h-20 overflow-y-auto">
              {(config.customRules || []).map((rule, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded"
                >
                  {rule}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCustomRuleRemove(index);
                    }}
                    className="text-orange-500 hover:text-orange-700"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-1">
              {predefinedCustomRules
                .filter(rule => !(config.customRules || []).includes(rule))
                .slice(0, 6)
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

          <div className="mt-2 p-2 bg-orange-50 rounded text-xs">
            <strong className="text-orange-700">Cleansing Summary:</strong>
            <ul className="mt-1 space-y-1 text-orange-700">
              <li>• <strong>Operations:</strong> {config.operations.length} selected</li>
              <li>• <strong>Custom Rules:</strong> {(config.customRules || []).length}</li>
              <li>• <strong>Backup:</strong> {config.preserveOriginal ? 'Enabled' : 'Disabled'}</li>
              <li>• European format standardization included</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <strong className="text-blue-700">Cleansing Benefits:</strong>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• Improves data quality and consistency</li>
              <li>• Reduces processing errors downstream</li>
              <li>• Standardizes formats across data sources</li>
              <li>• Ensures compliance with European standards</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
            <strong className="text-yellow-700">Processing Steps:</strong>
            <ul className="mt-1 space-y-1 text-yellow-700">
              <li>• 1. {config.preserveOriginal ? 'Backup original data' : 'Process in-place'}</li>
              <li>• 2. Apply selected cleansing operations</li>
              <li>• 3. Execute custom cleansing rules</li>
              <li>• 4. Validate cleaned data quality</li>
            </ul>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
            <div className="loading-spinner"></div>
            Cleansing data...
          </div>
        )}
      </div>
    </div>
  );
};

export default DataCleansingNode;