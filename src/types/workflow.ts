import { Node, Edge } from '@xyflow/react';

// Base node configuration
export interface BaseNodeConfig {
  name: string;
  description?: string;
}

// Trigger node types
export interface ScheduleNodeConfig extends BaseNodeConfig {
  frequency: 'daily' | 'hourly' | 'weekly' | 'monthly';
  time?: string;
  timezone?: string;
}

export interface WebhookNodeConfig extends BaseNodeConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
}

export interface ManualNodeConfig extends BaseNodeConfig {
  requireConfirmation: boolean;
}

// Action node types
export interface LLMNodeConfig extends BaseNodeConfig {
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'claude-3' | 'claude-sonnet-4';
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface APINodeConfig extends BaseNodeConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  authentication?: {
    type: 'bearer' | 'api-key' | 'basic';
    token: string;
  };
}

export interface DatabaseNodeConfig extends BaseNodeConfig {
  connectionString: string;
  query: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
}

export interface ConditionNodeConfig extends BaseNodeConfig {
  expression: string;
  trueOutput: string;
  falseOutput: string;
}

// Data transformation node
export interface TransformNodeConfig extends BaseNodeConfig {
  transformType: 'json' | 'xml' | 'csv' | 'text';
  script: string;
}

// Communication channels
export type CommunicationChannel = 'email' | 'sms' | 'slack' | 'discord' | 'teams' | 'webhook';

// Channel-specific configurations
export interface EmailChannelConfig {
  to: string;
  subject: string;
  body: string;
  attachments?: string[];
}

export interface SMSChannelConfig {
  phoneNumber: string;
  message: string;
}

export interface SlackChannelConfig {
  webhookUrl?: string;
  channel?: string;
  username?: string;
  message: string;
}

export interface DiscordChannelConfig {
  webhookUrl: string;
  username?: string;
  message: string;
}

export interface TeamsChannelConfig {
  webhookUrl: string;
  message: string;
  title?: string;
}

export interface WebhookChannelConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body: string;
}

// Communication node configuration
export interface CommunicationNodeConfig extends BaseNodeConfig {
  channel: CommunicationChannel;
  emailConfig?: EmailChannelConfig;
  smsConfig?: SMSChannelConfig;
  slackConfig?: SlackChannelConfig;
  discordConfig?: DiscordChannelConfig;
  teamsConfig?: TeamsChannelConfig;
  webhookConfig?: WebhookChannelConfig;
}

// ETL Data Ingestion Nodes
export interface FileMonitorNodeConfig extends BaseNodeConfig {
  monitorType: 'sftp' | 'local' | 'email' | 'api';
  path: string;
  filePattern: string;
  pollInterval: number; // in seconds
  recursive: boolean;
}

export interface SFTPNodeConfig extends BaseNodeConfig {
  host: string;
  port: number;
  username: string;
  passwordOrKey: string;
  keyType: 'password' | 'privateKey';
  remotePath: string;
  localPath: string;
  operation: 'download' | 'upload' | 'list';
  deleteAfterDownload: boolean;
}

export interface EmailAttachmentNodeConfig extends BaseNodeConfig {
  emailServer: string;
  port: number;
  protocol: 'imap' | 'pop3';
  username: string;
  password: string;
  mailbox: string;
  searchCriteria: string;
  downloadPath: string;
  markAsRead: boolean;
  deleteAfterProcessing: boolean;
}

export interface APIEndpointNodeConfig extends BaseNodeConfig {
  endpointPath: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authentication: 'none' | 'bearer' | 'basic' | 'apikey';
  responseFormat: 'json' | 'xml' | 'csv' | 'text';
  webhookSecret?: string;
  rateLimitPerMinute: number;
}

export interface FileParserNodeConfig extends BaseNodeConfig {
  fileType: 'csv' | 'json' | 'xml' | 'excel' | 'fixedWidth' | 'binary' | 'auto';
  encoding: 'utf-8' | 'latin1' | 'cp1252' | 'ascii';
  delimiter?: string; // for CSV
  hasHeader: boolean;
  skipRows: number;
  columnMapping?: Record<string, string>;
  dateFormat?: string;
  customParser?: string; // for binary/mainframe files
}

// AI-Powered Data Processing Nodes
export interface LLMDataMapperNodeConfig extends BaseNodeConfig {
  model: 'gpt-4' | 'claude-3' | 'claude-sonnet-4';
  mappingPrompt: string;
  expectedSchema: Record<string, any>;
  confidenceThreshold: number;
  fallbackAction: 'error' | 'skip' | 'manual_review';
  clientContext?: string;
}

export interface SchemaValidatorNodeConfig extends BaseNodeConfig {
  schema: Record<string, any>; // JSON Schema
  strictMode: boolean;
  autoCorrect: boolean;
  useLLMForCorrection: boolean;
  requiredFields: string[];
  customValidationRules?: string[];
}

export interface DataQualityNodeConfig extends BaseNodeConfig {
  checks: ('completeness' | 'uniqueness' | 'validity' | 'consistency' | 'accuracy')[];
  qualityThreshold: number; // percentage
  useLLMDetection: boolean;
  generateQualityReport: boolean;
  failOnThresholdBreach: boolean;
}

export interface LanguageDetectionNodeConfig extends BaseNodeConfig {
  targetFields: string[];
  supportedLanguages: string[]; // ISO codes: en, de, fr, es, it, etc.
  autoTranslate: boolean;
  translationTarget?: string;
  confidenceThreshold: number;
}

// ETL Processing Nodes
export interface DataCleansingNodeConfig extends BaseNodeConfig {
  operations: ('trim' | 'removeNulls' | 'removeDuplicates' | 'standardizeFormats' | 'fixEncoding')[];
  customRules?: string[];
  preserveOriginal: boolean;
}

export interface DataEnrichmentNodeConfig extends BaseNodeConfig {
  enrichmentType: 'lookup' | 'calculation' | 'geocoding' | 'classification';
  lookupTable?: string;
  calculationFormula?: string;
  enrichmentRules: Record<string, any>;
  cacheResults: boolean;
}

export interface MedallionNodeConfig extends BaseNodeConfig {
  layer: 'bronze' | 'silver' | 'gold';
  transformationRules: Record<string, any>;
  qualityChecks: string[];
  outputFormat: 'delta' | 'parquet' | 'json';
  partitionBy?: string[];
}

export interface DatabricksNodeConfig extends BaseNodeConfig {
  workspaceUrl: string;
  clusterId: string;
  notebookPath?: string;
  jobId?: string;
  operation: 'runNotebook' | 'runJob' | 'uploadData' | 'query';
  parameters?: Record<string, any>;
  timeout: number;
}

// Validation & Error Handling Nodes
export interface BusinessRulesNodeConfig extends BaseNodeConfig {
  clientId: string;
  ruleSet: string;
  rules: Array<{
    field: string;
    condition: string;
    action: 'reject' | 'flag' | 'correct' | 'skip';
    message: string;
  }>;
  strictMode: boolean;
}

export interface LLMErrorResolverNodeConfig extends BaseNodeConfig {
  model: 'gpt-4' | 'claude-3' | 'claude-sonnet-4';
  errorTypes: string[];
  resolutionPrompt: string;
  maxRetries: number;
  confidenceThreshold: number;
  escalateToHuman: boolean;
}

export interface HumanReviewNodeConfig extends BaseNodeConfig {
  reviewQueue: string;
  assignTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  instructions: string;
  timeoutHours: number;
  autoApproveAfterTimeout: boolean;
}

// Client Management Nodes  
export interface ClientConfigNodeConfig extends BaseNodeConfig {
  clientId: string;
  clientName: string;
  countryCode: string;
  languageCode: string;
  businessRules: Record<string, any>;
  dataSchemas: Record<string, any>;
  sftpConfig?: Record<string, any>;
  apiConfig?: Record<string, any>;
}

// Union of all node configs
export type NodeConfig = 
  | ScheduleNodeConfig
  | WebhookNodeConfig
  | ManualNodeConfig
  | LLMNodeConfig
  | APINodeConfig
  | DatabaseNodeConfig
  | ConditionNodeConfig
  | TransformNodeConfig
  | CommunicationNodeConfig
  // ETL Data Ingestion
  | FileMonitorNodeConfig
  | SFTPNodeConfig
  | EmailAttachmentNodeConfig
  | APIEndpointNodeConfig
  | FileParserNodeConfig
  // AI-Powered Processing
  | LLMDataMapperNodeConfig
  | SchemaValidatorNodeConfig
  | DataQualityNodeConfig
  | LanguageDetectionNodeConfig
  // ETL Processing
  | DataCleansingNodeConfig
  | DataEnrichmentNodeConfig
  | MedallionNodeConfig
  | DatabricksNodeConfig
  // Validation & Error Handling
  | BusinessRulesNodeConfig
  | LLMErrorResolverNodeConfig
  | HumanReviewNodeConfig
  // Client Management
  | ClientConfigNodeConfig;

// Node categories
export type NodeCategory = 'trigger' | 'action' | 'condition' | 'transform' | 'ingestion' | 'ai_processing' | 'validation' | 'client_mgmt';

// Node types
export type NodeType = 
  // Existing types
  | 'schedule' | 'webhook' | 'manual'
  | 'llm' | 'api' | 'database' | 'condition' | 'transform' | 'communication'
  // ETL Data Ingestion
  | 'file_monitor' | 'sftp' | 'email_attachment' | 'api_endpoint' | 'file_parser'
  // AI-Powered Processing
  | 'llm_data_mapper' | 'schema_validator' | 'data_quality' | 'language_detection'
  // ETL Processing
  | 'data_cleansing' | 'data_enrichment' | 'medallion' | 'databricks'
  // Validation & Error Handling
  | 'business_rules' | 'llm_error_resolver' | 'human_review'
  // Client Management
  | 'client_config';

// Extended React Flow node
export interface WorkflowNode extends Node {
  type: NodeType;
  data: {
    category: NodeCategory;
    config: NodeConfig;
    isExecuting?: boolean;
    executionResult?: any;
    error?: string;
  };
}

// Extended React Flow edge
export interface WorkflowEdge extends Edge {
  data?: {
    condition?: string;
    label?: string;
  };
}

// Workflow execution status
export type ExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused';

// Workflow definition
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: ExecutionStatus;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// Execution context
export interface ExecutionContext {
  workflowId: string;
  variables: Record<string, any>;
  currentNodeId?: string;
  executionId: string;
  startTime: Date;
  logs: ExecutionLog[];
}

// Execution log
export interface ExecutionLog {
  id: string;
  nodeId: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}
