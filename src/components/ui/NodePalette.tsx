import React, { useState } from 'react';
import { 
  Clock, Zap, Play, MessageSquare, Globe, Database, GitBranch, Mail, Code,
  FolderOpen, Server, FileText, Upload, Download, Search, Brain, Shield, 
  CheckSquare, Languages, Wand2, Filter, BarChart3, Package, AlertCircle,
  Users, Settings, Eye, FileCheck, Cloud, HardDrive
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { NodeType, NodeCategory } from '../../types/workflow';

interface NodeTypeConfig {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  description: string;
  category: NodeCategory;
}

const NODE_TYPES: Record<NodeType, NodeTypeConfig> = {
  // Triggers
  schedule: {
    icon: Clock,
    label: 'Schedule',
    description: 'Run on a schedule (daily, hourly, etc.)',
    category: 'trigger'
  },
  webhook: {
    icon: Zap,
    label: 'Webhook',
    description: 'Trigger via HTTP webhook',
    category: 'trigger'
  },
  manual: {
    icon: Play,
    label: 'Manual',
    description: 'Start manually by user',
    category: 'trigger'
  },
  
  // Actions
  llm: {
    icon: MessageSquare,
    label: 'AI/LLM',
    description: 'Process with AI language models',
    category: 'action'
  },
  api: {
    icon: Globe,
    label: 'API Call',
    description: 'Make HTTP API requests',
    category: 'action'
  },
  database: {
    icon: Database,
    label: 'Database',
    description: 'Query or update database',
    category: 'action'
  },
  communication: {
    icon: Mail,
    label: 'Communication',
    description: 'Send messages via email, SMS, Slack, Discord, Teams, or webhooks',
    category: 'action'
  },
  transform: {
    icon: Code,
    label: 'Transform',
    description: 'Transform data (JSON, XML, etc.)',
    category: 'transform'
  },
  condition: {
    icon: GitBranch,
    label: 'Condition',
    description: 'Branch based on conditions',
    category: 'condition'
  },

  // ETL Data Ingestion Nodes
  file_monitor: {
    icon: Eye,
    label: 'File Monitor',
    description: 'Monitor directories, SFTP, or email for new files',
    category: 'ingestion'
  },
  sftp: {
    icon: Server,
    label: 'SFTP',
    description: 'Transfer files via SFTP protocol',
    category: 'ingestion'
  },
  email_attachment: {
    icon: Mail,
    label: 'Email Attachments',
    description: 'Process email attachments automatically',
    category: 'ingestion'
  },
  api_endpoint: {
    icon: Globe,
    label: 'API Endpoint',
    description: 'Create custom API endpoints for data submission',
    category: 'ingestion'
  },
  file_parser: {
    icon: FileText,
    label: 'File Parser',
    description: 'Parse CSV, JSON, Excel, fixed-width, binary files',
    category: 'ingestion'
  },

  // AI-Powered Processing Nodes
  llm_data_mapper: {
    icon: Brain,
    label: 'AI Data Mapper',
    description: 'Use LLM to intelligently map data fields',
    category: 'ai_processing'
  },
  schema_validator: {
    icon: FileCheck,
    label: 'Schema Validator',
    description: 'Validate data against expected schemas',
    category: 'ai_processing'
  },
  data_quality: {
    icon: BarChart3,
    label: 'Data Quality',
    description: 'Assess data quality with AI assistance',
    category: 'ai_processing'
  },
  language_detection: {
    icon: Languages,
    label: 'Language Detection',
    description: 'Detect and translate multiple European languages',
    category: 'ai_processing'
  },

  // ETL Processing Nodes
  data_cleansing: {
    icon: Filter,
    label: 'Data Cleansing',
    description: 'Clean, standardize, and normalize data',
    category: 'transform'
  },
  data_enrichment: {
    icon: Wand2,
    label: 'Data Enrichment',
    description: 'Enrich data with lookups and calculations',
    category: 'transform'
  },
  medallion: {
    icon: Package,
    label: 'Medallion Layer',
    description: 'Bronze, Silver, Gold data transformations',
    category: 'transform'
  },
  databricks: {
    icon: Cloud,
    label: 'Databricks',
    description: 'Execute jobs and notebooks in Databricks',
    category: 'action'
  },

  // Validation & Error Handling Nodes
  business_rules: {
    icon: Shield,
    label: 'Business Rules',
    description: 'Apply client-specific business validation rules',
    category: 'validation'
  },
  llm_error_resolver: {
    icon: AlertCircle,
    label: 'AI Error Resolver',
    description: 'Use LLM to resolve data errors automatically',
    category: 'validation'
  },
  human_review: {
    icon: Users,
    label: 'Human Review',
    description: 'Queue problematic records for manual review',
    category: 'validation'
  },

  // Client Management Nodes
  client_config: {
    icon: Settings,
    label: 'Client Config',
    description: 'Configure client-specific settings and rules',
    category: 'client_mgmt'
  },
};

const CATEGORIES = [
  { key: 'trigger', label: 'Triggers', color: 'text-blue-600' },
  { key: 'ingestion', label: 'Data Ingestion', color: 'text-indigo-600' },
  { key: 'ai_processing', label: 'AI Processing', color: 'text-pink-600' },
  { key: 'transform', label: 'Transform', color: 'text-green-600' },
  { key: 'validation', label: 'Validation', color: 'text-yellow-600' },
  { key: 'action', label: 'Actions', color: 'text-purple-600' },
  { key: 'condition', label: 'Logic', color: 'text-orange-600' },
  { key: 'client_mgmt', label: 'Client Mgmt', color: 'text-gray-600' },
] as const;

const NodePalette: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<NodeCategory>('trigger');
  const { addNode } = useWorkflowStore();

  const handleAddNode = (type: NodeType, category: NodeCategory) => {
    // Add node at a default position - React Flow will handle positioning
    const position = { 
      x: Math.random() * 300 + 100, 
      y: Math.random() * 300 + 100 
    };
    addNode(type, category, position);
  };

  const filteredNodes = Object.entries(NODE_TYPES).filter(
    ([_, config]) => config.category === activeCategory
  );

  return (
    <div className="w-72 glass-panel flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/20">
        <h2 className="text-lg font-semibold text-white">Components</h2>
        <p className="text-sm text-white/70 mt-1">
          Drag and drop to add nodes
        </p>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-white/20 p-2">
        <nav className="flex flex-wrap gap-1">
          {CATEGORIES.map((category) => (
            <button
              key={category.key}
              onClick={() => setActiveCategory(category.key)}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
                activeCategory === category.key
                  ? `${category.color} bg-white/20 text-white border border-white/30`
                  : 'text-white/60 hover:text-white/80 hover:bg-white/10'
              }`}
            >
              {category.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredNodes.map(([type, config]) => {
          const IconComponent = config.icon;
          return (
            <button
              key={type}
              onClick={() => handleAddNode(type as NodeType, config.category)}
              className="w-full p-3 text-left rounded-lg glass-button transition-all duration-200 group"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${
                  config.category === 'trigger' ? 'bg-blue-500/20 text-blue-200' :
                  config.category === 'action' ? 'bg-purple-500/20 text-purple-200' :
                  config.category === 'condition' ? 'bg-yellow-500/20 text-yellow-200' :
                  'bg-cyan-500/20 text-cyan-200'
                }`}>
                  <IconComponent size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white group-hover:text-white/90">
                    {config.label}
                  </div>
                  <div className="text-xs text-white/60 mt-1 line-clamp-2">
                    {config.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/20 text-xs text-white/60">
        Click to add nodes to your workflow
      </div>
    </div>
  );
};

export default NodePalette;
