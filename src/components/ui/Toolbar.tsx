import React from 'react';
import { Play, Square, Download, Upload, Save, Trash2 } from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

const Toolbar: React.FC = () => {
  const {
    workflowName,
    setWorkflowName,
    nodes,
    edges,
    isExecuting,
    executeWorkflowViaAPI,
    stopExecution,
    exportWorkflow,
    clearWorkflow,
  } = useWorkflowStore();

  const handleExport = () => {
    const data = exportWorkflow();
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workflowName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          // Handle import in store
          console.log('Import data:', data);
        } catch (error) {
          console.error('Invalid JSON file:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="glass-panel border-b border-white/20">
      <div className="p-4 flex items-center justify-between">
        {/* Workflow Name */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-white/30 focus:border-blue-400 focus:outline-none px-2 py-1 min-w-0 text-white placeholder-white/50"
            placeholder="Workflow Name"
          />
          <div className="text-sm text-white/70">
            {nodes.length} nodes • {edges.length} connections
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Execution Controls */}
          {isExecuting ? (
            <button
              onClick={stopExecution}
              className="flex items-center gap-2 px-4 py-2 glass-button text-white rounded-lg hover:bg-red-500/30 transition-all duration-300"
            >
              <Square size={16} />
              Stop
            </button>
          ) : (
            <button
              onClick={executeWorkflowViaAPI}
              disabled={nodes.length === 0}
              className="flex items-center gap-2 px-4 py-2 glass-button text-white rounded-lg hover:bg-green-500/30 disabled:bg-white/10 disabled:cursor-not-allowed transition-all duration-300"
            >
              <Play size={16} />
              Execute
            </button>
          )}

          {/* File Operations */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 glass-button text-white/80 hover:text-white rounded-lg transition-all duration-300"
              title="Export Workflow"
            >
              <Download size={16} />
            </button>
            
            <label className="flex items-center gap-2 px-3 py-2 glass-button text-white/80 hover:text-white rounded-lg cursor-pointer transition-all duration-300" title="Import Workflow">
              <Upload size={16} />
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            
            <button
              onClick={clearWorkflow}
              className="flex items-center gap-2 px-3 py-2 glass-button text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-all duration-300"
              title="Clear Workflow"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
