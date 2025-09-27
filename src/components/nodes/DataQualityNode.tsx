import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { BarChart3, Trash2 } from 'lucide-react';
import { WorkflowNode, DataQualityNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const DataQualityNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as DataQualityNodeConfig;

  const handleConfigChange = (updates: Partial<DataQualityNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleChecksChange = (checkType: string, checked: boolean) => {
    const newChecks = checked 
      ? [...config.checks, checkType as any]
      : config.checks.filter(c => c !== checkType);
    handleConfigChange({ checks: newChecks });
  };

  const handleClick = () => {
    selectNode({ id, type: 'data_quality', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const qualityChecks = [
    { key: 'completeness', label: 'Completeness', description: 'Check for missing values' },
    { key: 'uniqueness', label: 'Uniqueness', description: 'Identify duplicate records' },
    { key: 'validity', label: 'Validity', description: 'Validate data formats' },
    { key: 'consistency', label: 'Consistency', description: 'Check data consistency' },
    { key: 'accuracy', label: 'Accuracy', description: 'Verify data accuracy' }
  ];

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-ai">
        <BarChart3 size={16} />
        <span>Data Quality</span>
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
              placeholder="Data quality check name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Quality Checks</label>
            <div className="space-y-2">
              {qualityChecks.map((check) => (
                <div key={check.key} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id={`${id}-${check.key}`}
                    checked={config.checks.includes(check.key as any)}
                    onChange={(e) => handleChecksChange(check.key, e.target.checked)}
                    className="rounded border-gray-300 mt-0.5"
                  />
                  <div className="flex-1">
                    <label htmlFor={`${id}-${check.key}`} className="text-xs font-medium text-gray-700 cursor-pointer">
                      {check.label}
                    </label>
                    <p className="text-xs text-gray-500">{check.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quality Threshold (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={config.qualityThreshold}
              onChange={(e) => handleConfigChange({ qualityThreshold: parseInt(e.target.value) || 90 })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum acceptable quality score</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`llm-detect-${id}`}
                checked={config.useLLMDetection}
                onChange={(e) => handleConfigChange({ useLLMDetection: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`llm-detect-${id}`} className="text-xs text-gray-700">
                Use AI for quality detection
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`generate-report-${id}`}
                checked={config.generateQualityReport}
                onChange={(e) => handleConfigChange({ generateQualityReport: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`generate-report-${id}`} className="text-xs text-gray-700">
                Generate quality report
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`fail-threshold-${id}`}
                checked={config.failOnThresholdBreach}
                onChange={(e) => handleConfigChange({ failOnThresholdBreach: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`fail-threshold-${id}`} className="text-xs text-gray-700">
                Fail workflow if threshold not met
              </label>
            </div>
          </div>

          <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
            <strong>Quality Score:</strong> Based on selected checks<br/>
            <strong>Actions:</strong> {config.failOnThresholdBreach ? 'Stop on failure' : 'Continue with warnings'}
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-pink-600">
            <div className="loading-spinner"></div>
            Analyzing data quality...
          </div>
        )}
      </div>
    </div>
  );
};

export default DataQualityNode;