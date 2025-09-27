import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Cloud, Trash2 } from 'lucide-react';
import { WorkflowNode, DatabricksNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const DatabricksNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as DatabricksNodeConfig;

  const handleConfigChange = (updates: Partial<DatabricksNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleParametersChange = (value: string) => {
    try {
      const params = JSON.parse(value);
      handleConfigChange({ parameters: params });
    } catch (error) {
      // Keep the text for now, will validate on save
    }
  };

  const handleClick = () => {
    selectNode({ id, type: 'databricks', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-action">
        <Cloud size={16} />
        <span>Databricks</span>
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
              placeholder="Databricks job name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Workspace URL</label>
            <input
              type="url"
              value={config.workspaceUrl}
              onChange={(e) => handleConfigChange({ workspaceUrl: e.target.value })}
              placeholder="https://your-workspace.databricks.com"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Cluster ID</label>
            <input
              type="text"
              value={config.clusterId}
              onChange={(e) => handleConfigChange({ clusterId: e.target.value })}
              placeholder="0123-456789-abcde"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Operation</label>
            <select
              value={config.operation}
              onChange={(e) => handleConfigChange({ operation: e.target.value as DatabricksNodeConfig['operation'] })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="runNotebook">Run Notebook</option>
              <option value="runJob">Run Job</option>
              <option value="uploadData">Upload Data</option>
              <option value="query">Execute Query</option>
            </select>
          </div>

          {config.operation === 'runNotebook' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notebook Path</label>
              <input
                type="text"
                value={config.notebookPath || ''}
                onChange={(e) => handleConfigChange({ notebookPath: e.target.value })}
                placeholder="/Users/user@company.com/ETL_Notebook"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {config.operation === 'runJob' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Job ID</label>
              <input
                type="text"
                value={config.jobId || ''}
                onChange={(e) => handleConfigChange({ jobId: e.target.value })}
                placeholder="123456"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Parameters (JSON)</label>
            <textarea
              defaultValue={JSON.stringify(config.parameters || {}, null, 2)}
              onBlur={(e) => handleParametersChange(e.target.value)}
              placeholder='{"input_path": "/data/raw", "output_path": "/data/processed"}'
              rows={4}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (seconds)</label>
            <input
              type="number"
              value={config.timeout}
              onChange={(e) => handleConfigChange({ timeout: parseInt(e.target.value) || 3600 })}
              min="60"
              max="86400"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum execution time (60-86400 seconds)</p>
          </div>

          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <strong>Medallion Architecture Tips:</strong>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• <strong>Bronze:</strong> Raw ingested data</li>
              <li>• <strong>Silver:</strong> Cleaned & validated data</li>
              <li>• <strong>Gold:</strong> Business-ready aggregated data</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-green-50 rounded text-xs">
            <strong>Common ETL Operations:</strong>
            <ul className="mt-1 space-y-1 text-green-700">
              <li>• Data validation and quality checks</li>
              <li>• Customer data standardization</li>
              <li>• Balance calculations and aggregations</li>
              <li>• Compliance and audit trail creation</li>
            </ul>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
            <div className="loading-spinner"></div>
            {config.operation === 'runNotebook' ? 'Running notebook...' :
             config.operation === 'runJob' ? 'Executing job...' :
             config.operation === 'uploadData' ? 'Uploading data...' :
             'Executing query...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabricksNode;