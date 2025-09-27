-- Schema updates for enhanced execution context support
-- Add execution context fields to support data flow between nodes

-- Update workflow_executions table to better support execution context
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS node_outputs JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS execution_metadata JSONB DEFAULT '{}';

-- Update node_executions table to store input/output data with schemas
ALTER TABLE node_executions 
ADD COLUMN IF NOT EXISTS input_schema JSONB,
ADD COLUMN IF NOT EXISTS output_schema JSONB,
ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS data_transformations JSONB DEFAULT '{}';

-- Create indexes for better query performance on JSONB fields
CREATE INDEX IF NOT EXISTS idx_workflow_executions_variables_gin 
ON workflow_executions USING gin(variables);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_node_outputs_gin 
ON workflow_executions USING gin(node_outputs);

CREATE INDEX IF NOT EXISTS idx_node_executions_input_gin 
ON node_executions USING gin(input_data);

CREATE INDEX IF NOT EXISTS idx_node_executions_output_gin 
ON node_executions USING gin(output_data);

-- Create table for storing workflow variable definitions (optional schemas)
CREATE TABLE IF NOT EXISTS workflow_variables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    variable_name VARCHAR(255) NOT NULL,
    variable_type VARCHAR(50) NOT NULL, -- string, number, boolean, object, array
    description TEXT,
    default_value JSONB,
    is_required BOOLEAN DEFAULT false,
    validation_schema JSONB, -- JSON Schema for validation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_id, variable_name)
);

-- Create table for storing node schema definitions
CREATE TABLE IF NOT EXISTS node_schemas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_type VARCHAR(50) NOT NULL,
    schema_version VARCHAR(20) DEFAULT '1.0',
    input_schema JSONB NOT NULL DEFAULT '{}',
    output_schema JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(node_type, schema_version)
);

-- Create table for data transformation templates
CREATE TABLE IF NOT EXISTS data_transformations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_schema JSONB NOT NULL,
    target_schema JSONB NOT NULL,
    transformation_rules JSONB NOT NULL,
    category VARCHAR(100), -- etl, formatting, validation, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default node schemas for common node types
INSERT INTO node_schemas (node_type, input_schema, output_schema, description) VALUES

-- Trigger nodes
('manual', 
 '{}', 
 '{"type": "object", "properties": {"triggeredBy": {"type": "string"}, "timestamp": {"type": "string", "format": "date-time"}}}',
 'Manual trigger node - no input required'),

('schedule', 
 '{}', 
 '{"type": "object", "properties": {"scheduledTime": {"type": "string", "format": "date-time"}, "frequency": {"type": "string"}}}',
 'Schedule trigger node'),

-- Action nodes  
('llm',
 '{"type": "object", "properties": {"prompt": {"type": "string"}, "context": {"type": "object"}}}',
 '{"type": "object", "properties": {"response": {"type": "string"}, "model": {"type": "string"}, "tokens": {"type": "number"}}}',
 'LLM processing node'),

('api',
 '{"type": "object", "properties": {"url": {"type": "string"}, "method": {"type": "string"}, "headers": {"type": "object"}, "body": {"type": "object"}}}',
 '{"type": "object", "properties": {"status": {"type": "number"}, "data": {"type": "object"}, "headers": {"type": "object"}}}',
 'API call node'),

('database',
 '{"type": "object", "properties": {"query": {"type": "string"}, "parameters": {"type": "object"}}}',
 '{"type": "object", "properties": {"rows": {"type": "array"}, "rowCount": {"type": "number"}, "fields": {"type": "array"}}}',
 'Database query node'),

('communication',
 '{"type": "object", "properties": {"recipient": {"type": "string"}, "subject": {"type": "string"}, "message": {"type": "string"}, "channel": {"type": "string"}}}',
 '{"type": "object", "properties": {"sent": {"type": "boolean"}, "messageId": {"type": "string"}, "timestamp": {"type": "string", "format": "date-time"}}}',
 'Communication node'),

-- ETL nodes
('file_parser',
 '{"type": "object", "properties": {"filePath": {"type": "string"}, "format": {"type": "string"}}}',
 '{"type": "object", "properties": {"data": {"type": "array"}, "headers": {"type": "array"}, "rowCount": {"type": "number"}}}',
 'File parsing node'),

('data_cleansing',
 '{"type": "object", "properties": {"data": {"type": "array"}, "operations": {"type": "array"}}}',
 '{"type": "object", "properties": {"cleanedData": {"type": "array"}, "summary": {"type": "object"}, "errors": {"type": "array"}}}',
 'Data cleansing node'),

('data_enrichment',
 '{"type": "object", "properties": {"data": {"type": "array"}, "enrichmentRules": {"type": "object"}}}',
 '{"type": "object", "properties": {"enrichedData": {"type": "array"}, "lookupResults": {"type": "object"}, "matchCount": {"type": "number"}}}',
 'Data enrichment node')

ON CONFLICT (node_type, schema_version) DO NOTHING;

-- Insert common data transformation templates
INSERT INTO data_transformations (name, description, source_schema, target_schema, transformation_rules, category) VALUES

('CSV to Customer Record',
 'Transform CSV data to standardized customer record format',
 '{"type": "array", "items": {"type": "object"}}',
 '{"type": "object", "properties": {"customerId": {"type": "string"}, "name": {"type": "string"}, "email": {"type": "string"}, "phone": {"type": "string"}}}',
 '{"customerId": "customer_id", "name": "{{first_name}} {{last_name}}", "email": "email", "phone": "phone_number"}',
 'etl'),

('API Response to Debt Record',
 'Transform API response to debt collection record',
 '{"type": "object", "properties": {"data": {"type": "array"}}}',
 '{"type": "object", "properties": {"debtId": {"type": "string"}, "amount": {"type": "number"}, "dueDate": {"type": "string"}}}',
 '{"debtId": "data.id", "amount": "data.balance", "dueDate": {"type": "format_date", "field": "data.due_date"}}',
 'etl'),

('Customer Data Standardization',
 'Standardize customer data for European compliance',
 '{"type": "object"}',
 '{"type": "object", "properties": {"customerId": {"type": "string"}, "personalData": {"type": "object"}}}',
 '{"customerId": "id", "personalData": {"name": "{{customer.name}}", "country": {"type": "uppercase", "field": "customer.country"}}}',
 'compliance')

ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_variables_workflow_id ON workflow_variables(workflow_id);
CREATE INDEX IF NOT EXISTS idx_node_schemas_type ON node_schemas(node_type);
CREATE INDEX IF NOT EXISTS idx_data_transformations_category ON data_transformations(category);

-- Update triggers for updated_at timestamps
CREATE TRIGGER update_node_schemas_updated_at BEFORE UPDATE ON node_schemas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_transformations_updated_at BEFORE UPDATE ON data_transformations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();