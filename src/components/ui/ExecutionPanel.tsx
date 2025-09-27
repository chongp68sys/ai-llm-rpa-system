import React, { useEffect, useRef } from 'react';
import { Activity, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

const ExecutionPanel: React.FC = () => {
  const { executionLogs, executionStatus, isExecuting } = useWorkflowStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [executionLogs]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />;
      case 'warn':
        return <AlertTriangle size={14} className="text-yellow-500" />;
      case 'info':
        return <Info size={14} className="text-blue-500" />;
      default:
        return <Info size={14} className="text-gray-500" />;
    }
  };

  const getLogTextColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-700';
      case 'warn':
        return 'text-yellow-700';
      case 'info':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  const getStatusColor = () => {
    switch (executionStatus) {
      case 'running':
        return 'text-green-600';
      case 'completed':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-white/70" />
            <h3 className="font-medium text-white">Execution Logs</h3>
          </div>
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {executionStatus.charAt(0).toUpperCase() + executionStatus.slice(1)}
            {isExecuting && (
              <div className="inline-block w-2 h-2 bg-current rounded-full ml-2 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Logs Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {executionLogs.length === 0 ? (
          <div className="text-center text-white/60 py-8">
            <Activity size={32} className="mx-auto mb-2 text-white/30" />
            <p className="text-sm">No execution logs yet</p>
            <p className="text-xs mt-1">Run your workflow to see logs here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {executionLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 p-2 rounded-lg glass-button hover:bg-white/10 transition-all duration-200"
              >
                <div className="mt-0.5">
                  {getLogIcon(log.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-xs font-medium ${getLogTextColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-xs text-white/50">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white break-words">
                    {log.message}
                  </p>
                  {log.nodeId && (
                    <p className="text-xs text-white/50 mt-1">
                      Node: {log.nodeId}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionPanel;
