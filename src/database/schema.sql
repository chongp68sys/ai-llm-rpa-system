-- Workflow Management System Database Schema for PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes_data JSONB NOT NULL,
    edges_data JSONB NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'inactive', 'archived')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
    triggered_by VARCHAR(50),
    trigger_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    execution_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Node executions table
CREATE TABLE IF NOT EXISTS node_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Execution logs table
CREATE TABLE IF NOT EXISTS execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(255),
    level VARCHAR(10) CHECK (level IN ('debug', 'info', 'warn', 'error')) DEFAULT 'info',
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Communication audit log
CREATE TABLE IF NOT EXISTS communication_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    channel_type VARCHAR(20) NOT NULL,
    recipient VARCHAR(500) NOT NULL,
    subject VARCHAR(500),
    message_content TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced')) DEFAULT 'pending',
    provider_response JSONB,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    source VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled triggers table
CREATE TABLE IF NOT EXISTS scheduled_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_run_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Service credentials table (encrypted storage)
CREATE TABLE IF NOT EXISTS service_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(50) NOT NULL,
    credential_name VARCHAR(50) NOT NULL,
    encrypted_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_name, credential_name)
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows USING gin(to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON workflow_executions(created_at);

CREATE INDEX IF NOT EXISTS idx_node_executions_execution_id ON node_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_status ON node_executions(status);
CREATE INDEX IF NOT EXISTS idx_node_executions_node_type ON node_executions(node_type);

CREATE INDEX IF NOT EXISTS idx_logs_execution_id ON execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON execution_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON execution_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_communication_audit_execution_id ON communication_audit(execution_id);
CREATE INDEX IF NOT EXISTS idx_communication_audit_status ON communication_audit(status);
CREATE INDEX IF NOT EXISTS idx_communication_audit_channel_type ON communication_audit(channel_type);
CREATE INDEX IF NOT EXISTS idx_communication_audit_created_at ON communication_audit(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_events_workflow_id ON webhook_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_triggers_workflow_id ON scheduled_triggers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_triggers_next_run ON scheduled_triggers(next_run_at, is_active) WHERE is_active;

-- JSONB indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflows_nodes_gin ON workflows USING gin(nodes_data);
CREATE INDEX IF NOT EXISTS idx_workflows_edges_gin ON workflows USING gin(edges_data);
CREATE INDEX IF NOT EXISTS idx_executions_context_gin ON workflow_executions USING gin(execution_context);
CREATE INDEX IF NOT EXISTS idx_communication_provider_gin ON communication_audit USING gin(provider_response);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_triggers_updated_at BEFORE UPDATE ON scheduled_triggers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_credentials_updated_at BEFORE UPDATE ON service_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('system_version', '1.0.0', 'Current system version'),
('max_concurrent_executions', '10', 'Maximum number of concurrent workflow executions'),
('default_execution_timeout', '3600', 'Default execution timeout in seconds'),
('log_retention_days', '90', 'Number of days to retain execution logs'),
('enable_audit_logging', 'true', 'Enable audit logging for communications')
ON CONFLICT (key) DO NOTHING;