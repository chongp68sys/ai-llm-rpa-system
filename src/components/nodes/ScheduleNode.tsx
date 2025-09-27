import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, Trash2 } from 'lucide-react';
import { WorkflowNode, ScheduleNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const ScheduleNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as ScheduleNodeConfig;

  const handleConfigChange = (updates: Partial<ScheduleNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'schedule', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      {/* Output Handle */}
      <Handle type="source" position={Position.Right} />
      
      {/* Header */}
      <div className="node-header node-trigger">
        <Clock size={16} />
        <span>Schedule Trigger</span>
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

      {/* Content */}
      <div className="node-content">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => handleConfigChange({ name: e.target.value })}
              placeholder="Schedule name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <select 
              value={config.frequency}
              onChange={(e) => handleConfigChange({ 
                frequency: e.target.value as 'daily' | 'hourly' | 'weekly' | 'monthly' 
              })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="hourly">Every Hour</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {config.frequency === 'daily' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                value={config.time || '09:00'}
                onChange={(e) => handleConfigChange({ time: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
            <div className="loading-spinner"></div>
            Executing...
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleNode;
