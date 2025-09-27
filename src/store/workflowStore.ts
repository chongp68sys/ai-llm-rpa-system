import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  Connection,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowNode, WorkflowEdge, NodeType, NodeCategory, ExecutionStatus } from '../types/workflow';

interface WorkflowState {
  // Workflow data
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  
  // Execution state
  executionStatus: ExecutionStatus;
  executionLogs: Array<{
    id: string;
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    nodeId?: string;
  }>;
  
  // UI state
  selectedNode: WorkflowNode | null;
  isExecuting: boolean;
  
  // Actions
  setWorkflowName: (name: string) => void;
  
  // Node operations
  addNode: (type: NodeType, category: NodeCategory, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode['data']>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (node: WorkflowNode | null) => void;
  
  // Edge operations  
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  // Execution
  executeWorkflow: () => Promise<void>;
  executeWorkflowViaAPI: () => Promise<void>;
  stopExecution: () => void;
  
  // API methods
  saveWorkflowToAPI: () => Promise<any>;
  fetchExecutionLogs: (executionId: string) => Promise<void>;
  
  // Persistence
  exportWorkflow: () => object;
  importWorkflow: (data: any) => void;
  clearWorkflow: () => void;
}

const createDefaultNodeConfig = (type: NodeType) => {
  const baseConfig = {
    name: '',
    description: '',
  };
  
  switch (type) {
    case 'schedule':
      return { ...baseConfig, frequency: 'daily' as const };
    case 'webhook':
      return { ...baseConfig, url: '', method: 'POST' as const };
    case 'manual':
      return { ...baseConfig, requireConfirmation: false };
    case 'llm':
      return { 
        ...baseConfig, 
        model: 'gpt-3.5-turbo' as const, 
        prompt: '', 
        temperature: 0.7,
        maxTokens: 1000 
      };
    case 'api':
      return { ...baseConfig, url: '', method: 'GET' as const };
    case 'database':
      return { ...baseConfig, connectionString: '', query: '', operation: 'select' as const };
    case 'condition':
      return { ...baseConfig, expression: '', trueOutput: 'true', falseOutput: 'false' };
    case 'transform':
      return { ...baseConfig, transformType: 'json' as const, script: '' };
    case 'communication':
      return { 
        ...baseConfig, 
        channel: 'email' as const, 
        emailConfig: { to: '', subject: '', body: '' }
      };

    // ETL Data Ingestion Nodes
    case 'file_monitor':
      return { 
        ...baseConfig, 
        monitorType: 'sftp' as const, 
        path: '', 
        filePattern: '*',
        pollInterval: 60,
        recursive: false
      };
    case 'sftp':
      return { 
        ...baseConfig, 
        host: '', 
        port: 22, 
        username: '', 
        passwordOrKey: '',
        keyType: 'password' as const,
        remotePath: '',
        localPath: '',
        operation: 'download' as const,
        deleteAfterDownload: false
      };
    case 'email_attachment':
      return { 
        ...baseConfig, 
        emailServer: '', 
        port: 993, 
        protocol: 'imap' as const,
        username: '',
        password: '',
        mailbox: 'INBOX',
        searchCriteria: 'UNSEEN',
        downloadPath: '',
        markAsRead: true,
        deleteAfterProcessing: false
      };
    case 'api_endpoint':
      return { 
        ...baseConfig, 
        endpointPath: '/webhook', 
        method: 'POST' as const,
        authentication: 'none' as const,
        responseFormat: 'json' as const,
        rateLimitPerMinute: 60
      };
    case 'file_parser':
      return { 
        ...baseConfig, 
        fileType: 'auto' as const, 
        encoding: 'utf-8' as const,
        hasHeader: true,
        skipRows: 0
      };

    // AI-Powered Processing Nodes
    case 'llm_data_mapper':
      return { 
        ...baseConfig, 
        model: 'gpt-4' as const, 
        mappingPrompt: 'Map the following data fields to the expected schema:',
        expectedSchema: {},
        confidenceThreshold: 0.8,
        fallbackAction: 'manual_review' as const
      };
    case 'schema_validator':
      return { 
        ...baseConfig, 
        schema: {}, 
        strictMode: false,
        autoCorrect: true,
        useLLMForCorrection: true,
        requiredFields: []
      };
    case 'data_quality':
      return { 
        ...baseConfig, 
        checks: ['completeness', 'validity'],
        qualityThreshold: 90,
        useLLMDetection: true,
        generateQualityReport: true,
        failOnThresholdBreach: false
      };
    case 'language_detection':
      return { 
        ...baseConfig, 
        targetFields: [], 
        supportedLanguages: ['en', 'de', 'fr', 'es', 'it'],
        autoTranslate: false,
        confidenceThreshold: 0.7
      };

    // ETL Processing Nodes
    case 'data_cleansing':
      return { 
        ...baseConfig, 
        operations: ['trim', 'removeNulls'],
        preserveOriginal: true
      };
    case 'data_enrichment':
      return { 
        ...baseConfig, 
        enrichmentType: 'lookup' as const, 
        enrichmentRules: {},
        cacheResults: true
      };
    case 'medallion':
      return { 
        ...baseConfig, 
        layer: 'bronze' as const, 
        transformationRules: {},
        qualityChecks: [],
        outputFormat: 'delta' as const
      };
    case 'databricks':
      return { 
        ...baseConfig, 
        workspaceUrl: '', 
        clusterId: '',
        operation: 'runNotebook' as const,
        timeout: 3600
      };

    // Validation & Error Handling Nodes
    case 'business_rules':
      return { 
        ...baseConfig, 
        clientId: '', 
        ruleSet: '',
        rules: [],
        strictMode: true
      };
    case 'llm_error_resolver':
      return { 
        ...baseConfig, 
        model: 'gpt-4' as const, 
        errorTypes: [],
        resolutionPrompt: 'Resolve the following data error:',
        maxRetries: 3,
        confidenceThreshold: 0.8,
        escalateToHuman: true
      };
    case 'human_review':
      return { 
        ...baseConfig, 
        reviewQueue: 'default', 
        priority: 'medium' as const,
        instructions: '',
        timeoutHours: 24,
        autoApproveAfterTimeout: false
      };

    // Client Management Nodes
    case 'client_config':
      return { 
        ...baseConfig, 
        clientId: '', 
        clientName: '',
        countryCode: '',
        languageCode: 'en',
        businessRules: {},
        dataSchemas: {}
      };

    default:
      return baseConfig;
  }
};

export const useWorkflowStore = create<WorkflowState>()(
  immer((set, get) => ({
    // Initial state
    workflowId: uuidv4(),
    workflowName: 'Untitled Workflow',
    nodes: [],
    edges: [],
    executionStatus: 'idle',
    executionLogs: [],
    selectedNode: null,
    isExecuting: false,
    
    // Actions
    setWorkflowName: (name: string) => {
      set((state) => {
        state.workflowName = name;
      });
    },
    
    addNode: (type: NodeType, category: NodeCategory, position: { x: number; y: number }) => {
      set((state) => {
        const newNode: WorkflowNode = {
          id: `${type}-${uuidv4()}`,
          type,
          position,
          data: {
            category,
            config: createDefaultNodeConfig(type),
          },
        };
        state.nodes.push(newNode);
      });
    },
    
    updateNode: (nodeId: string, updates: Partial<WorkflowNode['data']>) => {
      set((state) => {
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          Object.assign(node.data, updates);
        }
      });
    },
    
    deleteNode: (nodeId: string) => {
      set((state) => {
        state.nodes = state.nodes.filter(n => n.id !== nodeId);
        state.edges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        if (state.selectedNode?.id === nodeId) {
          state.selectedNode = null;
        }
      });
    },
    
    selectNode: (node: WorkflowNode | null) => {
      set((state) => {
        state.selectedNode = node;
      });
    },
    
    onNodesChange: (changes: NodeChange[]) => {
      set((state) => {
        state.nodes = applyNodeChanges(changes, state.nodes) as WorkflowNode[];
      });
    },
    
    onEdgesChange: (changes: EdgeChange[]) => {
      set((state) => {
        state.edges = applyEdgeChanges(changes, state.edges) as WorkflowEdge[];
      });
    },
    
    onConnect: (connection: Connection) => {
      set((state) => {
        const newEdge = {
          ...connection,
          id: `edge-${uuidv4()}`,
        };
        state.edges = addEdge(newEdge, state.edges) as WorkflowEdge[];
      });
    },
    
    // API Methods
    saveWorkflowToAPI: async () => {
      const { workflowName, nodes, edges } = get();
      console.log('🔄 Saving workflow to API:', { workflowName, nodesCount: nodes.length, edgesCount: edges.length });
      
      try {
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: workflowName,
            description: 'Workflow created in UI',
            nodes,
            edges
          })
        });
        
        console.log('📡 API Response status:', response.status);
        const result = await response.json();
        console.log('📡 API Response data:', result);
        
        if (result.success) {
          set((state) => {
            state.workflowId = result.workflow.id;
            state.executionLogs.push({
              id: uuidv4(),
              timestamp: new Date(),
              level: 'info',
              message: `Workflow saved to database: ${result.workflow.id}`
            });
          });
          return result.workflow;
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        console.error('❌ Failed to save workflow:', error);
        set((state) => {
          state.executionLogs.push({
            id: uuidv4(),
            timestamp: new Date(),
            level: 'error',
            message: `Failed to save workflow: ${error.message}`
          });
        });
        throw error;
      }
    },

    executeWorkflowViaAPI: async () => {
      const { workflowId, workflowName } = get();
      console.log('🚀 Starting workflow execution via API:', { workflowId, workflowName });
      
      // Always save the workflow first to ensure it's in the database
      console.log('💾 Saving workflow to database before execution...');
      let currentWorkflowId;
      try {
        const workflow = await get().saveWorkflowToAPI();
        currentWorkflowId = workflow.id;
        console.log('✅ Workflow saved successfully, ID:', currentWorkflowId);
      } catch (error) {
        console.error('❌ Failed to save workflow:', error);
        set((state) => {
          state.executionLogs.push({
            id: uuidv4(),
            timestamp: new Date(),
            level: 'error',
            message: 'Failed to save workflow before execution'
          });
        });
        return;
      }

      set((state) => {
        state.isExecuting = true;
        state.executionStatus = 'running';
        state.executionLogs = [];
        state.executionLogs.push({
          id: uuidv4(),
          timestamp: new Date(),
          level: 'info',
          message: `Starting API execution for workflow: ${workflowName}`
        });
      });

      try {
        console.log('🎯 Executing workflow with ID:', currentWorkflowId);
        const response = await fetch(`/api/workflows/${currentWorkflowId}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manual_trigger: true })
        });

        console.log('📡 Execution API Response status:', response.status);
        const result = await response.json();
        console.log('📡 Execution API Response data:', result);
        
        if (result.success) {
          // Fetch execution logs
          await get().fetchExecutionLogs(result.executionId);
          
          set((state) => {
            state.isExecuting = false;
            state.executionStatus = 'completed';
            state.executionLogs.push({
              id: uuidv4(),
              timestamp: new Date(),
              level: 'info',
              message: `Workflow execution completed successfully. Execution ID: ${result.executionId}`
            });
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        set((state) => {
          state.isExecuting = false;
          state.executionStatus = 'error';
          state.executionLogs.push({
            id: uuidv4(),
            timestamp: new Date(),
            level: 'error',
            message: `API execution failed: ${error.message}`
          });
        });
      }
    },

    fetchExecutionLogs: async (executionId: string) => {
      try {
        const response = await fetch(`/api/executions/${executionId}/logs`);
        const result = await response.json();
        
        if (result.success) {
          set((state) => {
            // Convert API logs to our format
            const apiLogs = result.logs.map((log: any) => ({
              id: log.id,
              timestamp: new Date(log.created_at),
              level: log.level as 'info' | 'warn' | 'error',
              message: log.message,
              nodeId: log.node_id
            }));
            
            state.executionLogs.push(...apiLogs);
          });
        }
      } catch (error: any) {
        set((state) => {
          state.executionLogs.push({
            id: uuidv4(),
            timestamp: new Date(),
            level: 'error',
            message: `Failed to fetch execution logs: ${error.message}`
          });
        });
      }
    },

    executeWorkflow: async () => {
      set((state) => {
        state.isExecuting = true;
        state.executionStatus = 'running';
        state.executionLogs = [{
          id: uuidv4(),
          timestamp: new Date(),
          level: 'info',
          message: 'Workflow execution started'
        }];
      });
      
      // Simulate workflow execution
      const { nodes } = get();
      
      try {
        // Find trigger nodes
        const triggerNodes = nodes.filter(n => n.data.category === 'trigger');
        
        if (triggerNodes.length === 0) {
          throw new Error('No trigger nodes found');
        }
        
        // Simple execution simulation
        for (const node of nodes) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          set((state) => {
            state.executionLogs.push({
              id: uuidv4(),
              timestamp: new Date(),
              level: 'info',
              message: `Executing node: ${node.data.config.name || node.type}`,
              nodeId: node.id
            });
          });
        }
        
        set((state) => {
          state.executionStatus = 'completed';
          state.isExecuting = false;
          state.executionLogs.push({
            id: uuidv4(),
            timestamp: new Date(),
            level: 'info',
            message: 'Workflow execution completed successfully'
          });
        });
        
      } catch (error: any) {
        set((state) => {
          state.executionStatus = 'error';
          state.isExecuting = false;
          state.executionLogs.push({
            id: uuidv4(),
            timestamp: new Date(),
            level: 'error',
            message: `Execution failed: ${error.message}`
          });
        });
      }
    },
    
    stopExecution: () => {
      set((state) => {
        state.isExecuting = false;
        state.executionStatus = 'idle';
      });
    },
    
    exportWorkflow: () => {
      const { workflowId, workflowName, nodes, edges } = get();
      return {
        workflowId,
        workflowName,
        nodes,
        edges,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
    },
    
    importWorkflow: (data: any) => {
      set((state) => {
        state.workflowId = data.workflowId || uuidv4();
        state.workflowName = data.workflowName || 'Imported Workflow';
        state.nodes = data.nodes || [];
        state.edges = data.edges || [];
        state.selectedNode = null;
        state.executionStatus = 'idle';
        state.executionLogs = [];
      });
    },
    
    clearWorkflow: () => {
      set((state) => {
        state.workflowId = uuidv4();
        state.workflowName = 'Untitled Workflow';
        state.nodes = [];
        state.edges = [];
        state.selectedNode = null;
        state.executionStatus = 'idle';
        state.executionLogs = [];
      });
    },
  }))
);
