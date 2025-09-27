import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Sparkles, Trash2 } from 'lucide-react';
import { WorkflowNode, DataEnrichmentNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const DataEnrichmentNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as DataEnrichmentNodeConfig;

  const handleConfigChange = (updates: Partial<DataEnrichmentNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleEnrichmentRulesChange = (value: string) => {
    try {
      const rules = JSON.parse(value);
      handleConfigChange({ enrichmentRules: rules });
    } catch (error) {
      // Keep the text for now, will validate on save
    }
  };

  const handleClick = () => {
    selectNode({ id, type: 'data_enrichment', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const enrichmentTypes = [
    { 
      value: 'lookup', 
      label: 'Data Lookup', 
      description: 'Enrich with data from lookup tables or databases'
    },
    { 
      value: 'calculation', 
      label: 'Calculated Fields', 
      description: 'Add computed fields based on existing data'
    },
    { 
      value: 'geocoding', 
      label: 'Geocoding', 
      description: 'Add geographic information from addresses'
    },
    { 
      value: 'classification', 
      label: 'Data Classification', 
      description: 'Categorize or classify data using ML/AI'
    }
  ];

  const getSampleRules = (type: string) => {
    switch (type) {
      case 'lookup':
        return {
          lookupField: 'customer_id',
          targetTable: 'customer_master',
          enrichFields: ['credit_score', 'customer_segment', 'risk_level'],
          joinType: 'left'
        };
      case 'calculation':
        return {
          totalDebt: 'principal + interest + fees',
          daysOverdue: 'DATEDIFF(CURDATE(), due_date)',
          riskScore: 'CASE WHEN totalDebt > 10000 THEN "HIGH" WHEN totalDebt > 1000 THEN "MEDIUM" ELSE "LOW" END'
        };
      case 'geocoding':
        return {
          addressField: 'full_address',
          enrichFields: ['latitude', 'longitude', 'country_code', 'postal_district'],
          provider: 'google_maps'
        };
      case 'classification':
        return {
          classifyField: 'customer_communication_history',
          categories: ['responsive', 'difficult', 'payment_plan_candidate'],
          model: 'debt_collection_classifier'
        };
      default:
        return {};
    }
  };

  const lookupTables = [
    'customer_master',
    'payment_history',
    'credit_scores',
    'geographic_data',
    'regulatory_data',
    'business_rules_lookup',
    'country_specific_rules'
  ];

  const currentType = enrichmentTypes.find(t => t.value === config.enrichmentType);
  const sampleRules = getSampleRules(config.enrichmentType);

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-transform">
        <Sparkles size={16} />
        <span>Data Enrichment</span>
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
              placeholder="Data enrichment name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Enrichment Type</label>
            <select
              value={config.enrichmentType}
              onChange={(e) => {
                const newType = e.target.value as DataEnrichmentNodeConfig['enrichmentType'];
                handleConfigChange({ 
                  enrichmentType: newType,
                  enrichmentRules: getSampleRules(newType)
                });
              }}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              {enrichmentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {currentType && (
              <p className="text-xs text-gray-500 mt-1">{currentType.description}</p>
            )}
          </div>

          {config.enrichmentType === 'lookup' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lookup Table</label>
              <select
                value={config.lookupTable || ''}
                onChange={(e) => handleConfigChange({ lookupTable: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="">Select lookup table</option>
                {lookupTables.map((table) => (
                  <option key={table} value={table}>
                    {table.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          )}

          {config.enrichmentType === 'calculation' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Calculation Formula</label>
              <textarea
                value={config.calculationFormula || ''}
                onChange={(e) => handleConfigChange({ calculationFormula: e.target.value })}
                placeholder="total_debt = principal + interest + fees&#10;risk_score = CASE WHEN total_debt > 10000 THEN 'HIGH' ELSE 'LOW' END"
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Enrichment Rules (JSON)</label>
            <textarea
              defaultValue={JSON.stringify(config.enrichmentRules || sampleRules, null, 2)}
              onBlur={(e) => handleEnrichmentRulesChange(e.target.value)}
              placeholder={JSON.stringify(sampleRules, null, 2)}
              rows={6}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Define enrichment rules and mappings</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`cache-results-${id}`}
              checked={config.cacheResults}
              onChange={(e) => handleConfigChange({ cacheResults: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor={`cache-results-${id}`} className="text-xs text-gray-700">
              Cache enrichment results for performance
            </label>
          </div>

          <div className="mt-2 p-2 bg-emerald-50 rounded text-xs">
            <strong className="text-emerald-700">Enrichment Configuration:</strong>
            <ul className="mt-1 space-y-1 text-emerald-700">
              <li>• <strong>Type:</strong> {currentType?.label}</li>
              {config.enrichmentType === 'lookup' && (
                <li>• <strong>Table:</strong> {config.lookupTable || 'Not selected'}</li>
              )}
              <li>• <strong>Caching:</strong> {config.cacheResults ? 'Enabled' : 'Disabled'}</li>
              <li>• European compliance and formatting included</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <strong className="text-blue-700">Enrichment Examples:</strong>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• Customer credit scores and risk ratings</li>
              <li>• Geographic data from addresses</li>
              <li>• Payment history and behavior patterns</li>
              <li>• Regulatory compliance indicators</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
            <strong className="text-purple-700">Processing Benefits:</strong>
            <ul className="mt-1 space-y-1 text-purple-700">
              <li>• Enhanced decision-making capabilities</li>
              <li>• Improved customer segmentation</li>
              <li>• Better risk assessment accuracy</li>
              <li>• Automated compliance checking</li>
            </ul>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
            <div className="loading-spinner"></div>
            Enriching data...
          </div>
        )}
      </div>
    </div>
  );
};

export default DataEnrichmentNode;