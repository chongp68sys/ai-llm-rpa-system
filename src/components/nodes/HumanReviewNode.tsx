import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Users, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { WorkflowNode, HumanReviewNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const HumanReviewNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as HumanReviewNodeConfig;

  const handleConfigChange = (updates: Partial<HumanReviewNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleClick = () => {
    selectNode({ id, type: 'human_review', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { value: 'high', label: 'High', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' }
  ];

  const reviewQueues = [
    'data_quality_review',
    'compliance_review',
    'legal_review',
    'financial_review',
    'customer_service_review',
    'technical_review',
    'management_approval'
  ];

  const getPriorityDisplay = (priority: string) => {
    const option = priorityOptions.find(p => p.value === priority);
    return option || priorityOptions[0];
  };

  const currentPriority = getPriorityDisplay(config.priority);

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-validation">
        <Users size={16} />
        <span>Human Review</span>
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
              placeholder="Human review name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Review Queue</label>
            <select
              value={config.reviewQueue}
              onChange={(e) => handleConfigChange({ reviewQueue: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Queue</option>
              {reviewQueues.map((queue) => (
                <option key={queue} value={queue}>
                  {queue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assign To (Optional)</label>
              <input
                type="text"
                value={config.assignTo || ''}
                onChange={(e) => handleConfigChange({ assignTo: e.target.value || undefined })}
                placeholder="john.doe@company.com"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={config.priority}
                onChange={(e) => handleConfigChange({ priority: e.target.value as HumanReviewNodeConfig['priority'] })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Review Instructions</label>
            <textarea
              value={config.instructions}
              onChange={(e) => handleConfigChange({ instructions: e.target.value })}
              placeholder="Please review the following debt collection case for compliance with local regulations. Check customer contact details, debt amount validation, and payment history accuracy..."
              rows={4}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Timeout (Hours)</label>
              <input
                type="number"
                value={config.timeoutHours}
                onChange={(e) => handleConfigChange({ timeoutHours: parseInt(e.target.value) || 24 })}
                min="1"
                max="168"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">1-168 hours (1 week max)</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`auto-approve-${id}`}
                  checked={config.autoApproveAfterTimeout}
                  onChange={(e) => handleConfigChange({ autoApproveAfterTimeout: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor={`auto-approve-${id}`} className="text-xs text-gray-700">
                  Auto-approve after timeout
                </label>
              </div>
            </div>
          </div>

          <div className={`mt-2 p-2 ${currentPriority.bgColor} rounded text-xs`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`flex items-center gap-1 ${currentPriority.color}`}>
                {config.priority === 'urgent' && <AlertTriangle size={12} />}
                <strong>Priority: {currentPriority.label}</strong>
              </div>
            </div>
            <ul className={`mt-1 space-y-1 ${currentPriority.color}`}>
              <li>• <strong>Queue:</strong> {config.reviewQueue?.replace(/_/g, ' ') || 'Not set'}</li>
              <li>• <strong>Assignee:</strong> {config.assignTo || 'Auto-assigned'}</li>
              <li>• <strong>Timeout:</strong> {config.timeoutHours}h</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={12} className="text-blue-600" />
              <strong className="text-blue-700">Review Process:</strong>
            </div>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• Workflow pauses for human intervention</li>
              <li>• Reviewer gets notification with instructions</li>
              <li>• Data can be approved, rejected, or modified</li>
              <li>• {config.autoApproveAfterTimeout ? 'Auto-approves' : 'Fails'} if timeout exceeded</li>
            </ul>
          </div>

          <div className="mt-2 p-2 bg-amber-50 rounded text-xs">
            <strong className="text-amber-700">Compliance Notes:</strong>
            <ul className="mt-1 space-y-1 text-amber-700">
              <li>• Ensures regulatory compliance verification</li>
              <li>• Provides audit trail for human decisions</li>
              <li>• Maintains data quality standards</li>
              <li>• Supports European GDPR requirements</li>
            </ul>
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
            <div className="loading-spinner"></div>
            Awaiting human review...
          </div>
        )}
      </div>
    </div>
  );
};

export default HumanReviewNode;