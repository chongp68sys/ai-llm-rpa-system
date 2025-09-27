import React from 'react';
import { Settings } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

const NodePropertiesPanel: React.FC = () => {
  const { selectedNode, updateNode } = useWorkflowStore();

  if (!selectedNode) {
    return null;
  }

  const { id, data } = selectedNode;
  const { config } = data;

  const handleConfigUpdate = (updates: any) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  return (
    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-gray-600" />
          <h3 className="font-medium text-gray-900">Node Properties</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Node ID
          </label>
          <input
            type="text"
            value={id}
            disabled
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Node Type
          </label>
          <input
            type="text"
            value={selectedNode.type}
            disabled
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => handleConfigUpdate({ name: e.target.value })}
            placeholder="Enter display name..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={config.description || ''}
            onChange={(e) => handleConfigUpdate({ description: e.target.value })}
            placeholder="Enter description..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500 resize-none bg-white"
          />
        </div>

        {data.executionResult && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Execution Result
            </label>
            <pre className="w-full px-3 py-2 text-xs border border-gray-200 rounded bg-gray-50 text-gray-700 overflow-auto max-h-40">
              {JSON.stringify(data.executionResult, null, 2)}
            </pre>
          </div>
        )}

        {data.error && (
          <div>
            <label className="block text-sm font-medium text-red-700 mb-2">
              Error
            </label>
            <div className="w-full px-3 py-2 text-sm border border-red-300 rounded bg-red-50 text-red-700">
              {data.error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodePropertiesPanel;
