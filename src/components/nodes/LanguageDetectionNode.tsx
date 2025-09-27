import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Languages, Trash2 } from 'lucide-react';
import { WorkflowNode, LanguageDetectionNodeConfig } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

const LanguageDetectionNode: React.FC<NodeProps<WorkflowNode>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const { updateNode, deleteNode, selectNode } = useWorkflowStore();
  const config = data.config as LanguageDetectionNodeConfig;

  const handleConfigChange = (updates: Partial<LanguageDetectionNodeConfig>) => {
    updateNode(id, {
      config: { ...config, ...updates }
    });
  };

  const handleFieldsChange = (value: string) => {
    const fields = value.split(',').map(f => f.trim()).filter(f => f.length > 0);
    handleConfigChange({ targetFields: fields });
  };

  const handleLanguageToggle = (langCode: string, checked: boolean) => {
    const newLanguages = checked
      ? [...config.supportedLanguages, langCode]
      : config.supportedLanguages.filter(l => l !== langCode);
    handleConfigChange({ supportedLanguages: newLanguages });
  };

  const handleClick = () => {
    selectNode({ id, type: 'language_detection', position: { x: 0, y: 0 }, data } as WorkflowNode);
  };

  const europeanLanguages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fi', name: 'Finnish' }
  ];

  return (
    <div 
      className={`workflow-node ${selected ? 'selected' : ''} ${data.isExecuting ? 'executing' : ''}`}
      onClick={handleClick}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      
      <div className="node-header node-ai">
        <Languages size={16} />
        <span>Language Detection</span>
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
              placeholder="Language detection name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Target Fields</label>
            <input
              type="text"
              value={config.targetFields.join(', ')}
              onChange={(e) => handleFieldsChange(e.target.value)}
              placeholder="customer_name, address, notes"
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated field names to analyze</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Supported Languages</label>
            <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto">
              {europeanLanguages.map((lang) => (
                <div key={lang.code} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    id={`${id}-${lang.code}`}
                    checked={config.supportedLanguages.includes(lang.code)}
                    onChange={(e) => handleLanguageToggle(lang.code, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`${id}-${lang.code}`} className="text-xs text-gray-700 cursor-pointer">
                    {lang.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Confidence Threshold</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={config.confidenceThreshold}
              onChange={(e) => handleConfigChange({ confidenceThreshold: parseFloat(e.target.value) })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum confidence for language detection</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`auto-translate-${id}`}
                checked={config.autoTranslate}
                onChange={(e) => handleConfigChange({ autoTranslate: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor={`auto-translate-${id}`} className="text-xs text-gray-700">
                Auto-translate to standard language
              </label>
            </div>

            {config.autoTranslate && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Translation Target</label>
                <select
                  value={config.translationTarget || 'en'}
                  onChange={(e) => handleConfigChange({ translationTarget: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  {europeanLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-700">
            <strong>Detection:</strong> {config.targetFields.length} field(s)<br/>
            <strong>Languages:</strong> {config.supportedLanguages.length} supported<br/>
            <strong>Translation:</strong> {config.autoTranslate ? 'Enabled' : 'Disabled'}
          </div>
        </div>

        {data.isExecuting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-pink-600">
            <div className="loading-spinner"></div>
            Detecting languages...
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageDetectionNode;