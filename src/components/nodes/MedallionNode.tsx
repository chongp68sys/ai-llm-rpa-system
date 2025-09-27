import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Layers, Trash2, Plus, X } from 'lucide-react';
import { WorkflowNode, MedallionNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const MedallionNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as MedallionNodeConfig;

  const handleConfigChange = (updates: Partial<MedallionNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleTransformationRulesChange = (value: string) => {
    try {
      const rules = JSON.parse(value);
      handleConfigChange({ transformationRules: rules });
    } catch (error) {
      // Keep the text for now, will validate on save
    }
  };

  const handleQualityCheckAdd = (check: string) => {
    if (check.trim() && !config.qualityChecks.includes(check.trim())) {
      handleConfigChange({ 
        qualityChecks: [...config.qualityChecks, check.trim()]
      });
    }
  };

  const handleQualityCheckRemove = (index: number) => {
    const updatedChecks = config.qualityChecks.filter((_, i) => i !== index);
    handleConfigChange({ qualityChecks: updatedChecks });
  };

  const handlePartitionFieldsChange = (value: string) => {
    const fields = value.split(',').map(f => f.trim()).filter(f => f.length > 0);
    handleConfigChange({ partitionBy: fields });
  };

  const handleClick = () => {
    selectNode({ id, type: 'medallion', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const medallionLayers = [
    {
      value: 'bronze',
      label: 'Bronze Layer',
      description: 'Raw data ingestion - unprocessed, original format',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      value: 'silver',
      label: 'Silver Layer', 
      description: 'Cleaned, validated, and enriched data',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    },
    {
      value: 'gold',
      label: 'Gold Layer',
      description: 'Business-ready, aggregated, and optimized data',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    }
  ];

  const outputFormats = [
    { value: 'delta', label: 'Delta Lake', description: 'ACID transactions, time travel' },
    { value: 'parquet', label: 'Parquet', description: 'Columnar, compressed format' },
    { value: 'json', label: 'JSON', description: 'Human-readable, flexible schema' }
  ];

  const predefinedQualityChecks = [
    'row_count_validation',
    'schema_drift_detection',
    'data_freshness_check',
    'duplicate_detection',
    'null_value_validation',
    'referential_integrity',
    'data_lineage_tracking',
    'business_rule_validation',
    'regulatory_compliance_check',
    'data_quality_scoring'
  ];

  const getSampleTransformationRules = (layer: string) => {
    switch (layer) {
      case 'bronze':
        return {
          source: 'raw_data_ingestion',
          transformations: {
            'add_ingestion_timestamp': 'CURRENT_TIMESTAMP()',
            'add_source_file': 'input_file_name()',
            'preserve_raw_data': true
          },
          schema_evolution: 'permissive'
        };
      case 'silver':
        return {
          source: 'bronze_layer',
          transformations: {
            'clean_customer_data': 'TRIM(customer_name), UPPER(country_code)',
            'standardize_dates': 'DATE_FORMAT(payment_date, "YYYY-MM-DD")',
            'calculate_debt_age': 'DATEDIFF(CURRENT_DATE(), due_date)',
            'enrich_with_master_data': 'JOIN customer_master ON customer_id'
          },
          quality_rules: ['remove_nulls', 'validate_formats', 'check_referential_integrity']
        };
      case 'gold':
        return {
          source: 'silver_layer',
          transformations: {
            'customer_debt_summary': 'GROUP BY customer_id, SUM(balance) as total_debt',
            'payment_behavior_metrics': 'payment_frequency, avg_payment_amount',
            'risk_segmentation': 'CASE WHEN total_debt > 10000 THEN "HIGH_RISK" ELSE "LOW_RISK" END',
            'compliance_indicators': 'gdpr_consent_status, data_retention_date'
          },
          aggregations: ['daily_collections', 'monthly_targets', 'regional_performance']
        };
      default:
        return {};
    }
  };

  const currentLayer = medallionLayers.find(layer => layer.value === config.layer);
  const currentFormat = outputFormats.find(format => format.value === config.outputFormat);
  const sampleRules = getSampleTransformationRules(config.layer);

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-action">
        <Layers size={16} />
        <span>Medallion Layer</span>
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
              placeholder="Medallion layer name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Medallion Layer</label>
            <div className="grid grid-cols-3 gap-1">
              {medallionLayers.map((layer) => (
                <button
                  key={layer.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfigChange({ 
                      layer: layer.value as MedallionNodeConfig['layer'],
                      transformationRules: getSampleTransformationRules(layer.value)
                    });
                  }}
                  className={`p-2 text-xs border rounded ${
                    config.layer === layer.value
                      ? `${layer.bgColor} ${layer.borderColor} ${layer.color} border-2`
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{layer.label.split(' ')[0]}</div>
                </button>
              ))}
            </div>
            {currentLayer && (
              <p className="text-xs text-gray-500 mt-1">{currentLayer.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Output Format</label>
              <select
                value={config.outputFormat}
                onChange={(e) => handleConfigChange({ outputFormat: e.target.value as MedallionNodeConfig['outputFormat'] })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                {outputFormats.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
              {currentFormat && (
                <p className="text-xs text-gray-500 mt-1">{currentFormat.description}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Partition By</label>
              <input
                type="text"
                value={(config.partitionBy || []).join(', ')}
                onChange={(e) => handlePartitionFieldsChange(e.target.value)}
                placeholder="date, country_code"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Transformation Rules (JSON)</label>
            <textarea
              defaultValue={JSON.stringify(config.transformationRules || sampleRules, null, 2)}
              onBlur={(e) => handleTransformationRulesChange(e.target.value)}
              placeholder={JSON.stringify(sampleRules, null, 2)}
              rows={6}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Define layer-specific transformation logic</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quality Checks</label>
            <div className="flex flex-wrap gap-1 mb-2 p-2 border border-gray-200 rounded bg-gray-50 max-h-20 overflow-y-auto">
              {config.qualityChecks.map((check, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                >
                  {check}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQualityCheckRemove(index);
                    }}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-1">
              {predefinedQualityChecks
                .filter(check => !config.qualityChecks.includes(check))
                .slice(0, 4)
                .map((check) => (
                  <button
                    key={check}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQualityCheckAdd(check);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    + {check.replace(/_/g, ' ')}
                  </button>
                ))}
            </div>
          </div>

          {currentLayer && (
            <div className={`mt-2 p-2 ${currentLayer.bgColor} ${currentLayer.borderColor} border rounded text-xs`}>
              <strong className={currentLayer.color}>{currentLayer.label} Configuration:</strong>
              <ul className={`mt-1 space-y-1 ${currentLayer.color}`}>
                <li>• <strong>Format:</strong> {currentFormat?.label}</li>
                <li>• <strong>Partitions:</strong> {(config.partitionBy || []).length} fields</li>
                <li>• <strong>Quality Checks:</strong> {config.qualityChecks.length}</li>
                <li>• European regulatory compliance included</li>
              </ul>
            </div>
          )}

          <div className="mt-2 p-2 bg-indigo-50 rounded text-xs">
            <strong className="text-indigo-700">Medallion Architecture Benefits:</strong>
            <ul className="mt-1 space-y-1 text-indigo-700">
              <li>• <strong>Bronze:</strong> Raw data preservation and audit trail</li>
              <li>• <strong>Silver:</strong> Cleaned, validated business data</li>
              <li>• <strong>Gold:</strong> Optimized for analytics and reporting</li>
              <li>• Progressive data quality improvement</li>
            </ul>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600">
            <div className="loading-spinner"></div>
            Processing {config.layer} layer...
          </div>
        )}
      </div>
    </div>
  );
};

export default MedallionNode;