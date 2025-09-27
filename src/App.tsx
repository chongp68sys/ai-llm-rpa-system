import React from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from './store/workflowStore';
import NodePalette from './components/ui/NodePalette';
import Toolbar from './components/ui/Toolbar';
import NodePropertiesPanel from './components/ui/NodePropertiesPanel';
import ExecutionPanel from './components/ui/ExecutionPanel';
import ScheduleNode from './components/nodes/ScheduleNode';
import WebhookNode from './components/nodes/WebhookNode';
import ManualNode from './components/nodes/ManualNode';
import LLMNode from './components/nodes/LLMNode';
import APINode from './components/nodes/APINode';
import CommunicationNode from './components/nodes/CommunicationNode';
import DatabaseNode from './components/nodes/DatabaseNode';
import TransformNode from './components/nodes/TransformNode';
import ConditionNode from './components/nodes/ConditionNode';
import SFTPNode from './components/nodes/SFTPNode';
import LLMDataMapperNode from './components/nodes/LLMDataMapperNode';
import FileMonitorNode from './components/nodes/FileMonitorNode';
import FileParserNode from './components/nodes/FileParserNode';
import EmailAttachmentNode from './components/nodes/EmailAttachmentNode';
import APIEndpointNode from './components/nodes/APIEndpointNode';
import DataQualityNode from './components/nodes/DataQualityNode';
import LanguageDetectionNode from './components/nodes/LanguageDetectionNode';
import DatabricksNode from './components/nodes/DatabricksNode';
import ClientConfigNode from './components/nodes/ClientConfigNode';
import BusinessRulesNode from './components/nodes/BusinessRulesNode';
import LLMErrorResolverNode from './components/nodes/LLMErrorResolverNode';
import HumanReviewNode from './components/nodes/HumanReviewNode';
import SchemaValidatorNode from './components/nodes/SchemaValidatorNode';
import DataCleansingNode from './components/nodes/DataCleansingNode';
import DataEnrichmentNode from './components/nodes/DataEnrichmentNode';
import MedallionNode from './components/nodes/MedallionNode';
import { useMemo } from 'react';

function App() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNode,
    isExecuting,
  } = useWorkflowStore();

  // Memoize nodeTypes to prevent React Flow warning
  const nodeTypes = useMemo(() => ({
    schedule: ScheduleNode,
    webhook: WebhookNode,
    manual: ManualNode,
    llm: LLMNode,
    api: APINode,
    database: DatabaseNode,
    condition: ConditionNode,
    transform: TransformNode,
  communication: CommunicationNode,
  // ETL Data Ingestion Nodes
  file_monitor: FileMonitorNode,
  sftp: SFTPNode,
  email_attachment: EmailAttachmentNode,
  api_endpoint: APIEndpointNode,
  file_parser: FileParserNode,
  // AI Processing Nodes
  llm_data_mapper: LLMDataMapperNode,
  schema_validator: SchemaValidatorNode,
  data_quality: DataQualityNode,
  language_detection: LanguageDetectionNode,
  // ETL Processing Nodes
  data_cleansing: DataCleansingNode,
  data_enrichment: DataEnrichmentNode,
  medallion: MedallionNode,
  // Action Nodes
  databricks: DatabricksNode,
  // Validation Nodes
  business_rules: BusinessRulesNode,
  llm_error_resolver: LLMErrorResolverNode,
  human_review: HumanReviewNode,
  // Client Management Nodes
  client_config: ClientConfigNode,
  // Note: Add remaining node components as needed
  }), []);

  return (
    <div className="h-screen flex">
      {/* Node Palette */}
      <NodePalette />
      
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <Toolbar />
        
        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-transparent"
          >
            <Background color="rgba(255, 255, 255, 0.1)" gap={20} />
            <Controls className="glass" />
            <MiniMap 
              nodeColor="#6366f1"
              maskColor="rgba(0, 0, 0, 0.1)"
              className="glass rounded-lg"
            />
          </ReactFlow>
          
          {/* Execution Overlay */}
          {isExecuting && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Workflow Executing...
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Side Panels */}
      <div className="w-72 glass-panel flex flex-col p-4">
        {/* Node Properties */}
        {selectedNode && (
          <NodePropertiesPanel />
        )}
        
        {/* Execution Logs */}
        <ExecutionPanel />
      </div>
    </div>
  );
}

export default App;
