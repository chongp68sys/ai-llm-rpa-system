import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Trash2 } from 'lucide-react';
import { WorkflowNode, FileParserNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const FileParserNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as FileParserNodeConfig;

  const handleConfigChange = (updates: Partial<FileParserNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'file_parser', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-ingestion">
        <FileText size={16} />
        <span>File Parser</span>
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
              placeholder="File parser name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">File Type</label>
            <select
              value={config.fileType}
              onChange={(e) => handleConfigChange({ fileType: e.target.value as FileParserNodeConfig['fileType'] })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="auto">Auto-detect</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="excel">Excel</option>
              <option value="fixedWidth">Fixed Width</option>
              <option value="binary">Binary/Mainframe</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Encoding</label>
              <select
                value={config.encoding}
                onChange={(e) => handleConfigChange({ encoding: e.target.value as FileParserNodeConfig['encoding'] })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                <option value="utf-8">UTF-8</option>
                <option value="latin1">Latin1</option>
                <option value="cp1252">CP1252</option>
                <option value="ascii">ASCII</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Skip Rows</label>
              <input
                type="number"
                value={config.skipRows}
                onChange={(e) => handleConfigChange({ skipRows: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {(config.fileType === 'csv' || config.fileType === 'auto') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Delimiter</label>
              <input
                type="text"
                value={config.delimiter || ','}
                onChange={(e) => handleConfigChange({ delimiter: e.target.value })}
                placeholder=","
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`header-${id}`}
              checked={config.hasHeader}
              onChange={(e) => handleConfigChange({ hasHeader: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor={`header-${id}`} className="text-xs text-gray-700">
              File has header row
            </label>
          </div>

          {config.fileType === 'fixedWidth' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date Format</label>
              <input
                type="text"
                value={config.dateFormat || 'YYYY-MM-DD'}
                onChange={(e) => handleConfigChange({ dateFormat: e.target.value })}
                placeholder="YYYY-MM-DD"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {config.fileType === 'binary' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Custom Parser Script</label>
              <textarea
                value={config.customParser || ''}
                onChange={(e) => handleConfigChange({ customParser: e.target.value })}
                placeholder="Custom parsing logic for binary files..."
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          )}
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600">
            <div className="loading-spinner"></div>
            Parsing file...
          </div>
        )}
      </div>
    </div>
  );
};

export default FileParserNode;