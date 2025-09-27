-- Migration: Add users table for authentication
-- Created: 2025-09-27

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('user', 'admin', 'viewer')) DEFAULT 'user',
    active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- Add updated_at trigger for users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Add user_id to workflow_executions for tracking who triggered execution
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add user_id to workflows for tracking ownership
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Create default admin user (password: admin123)
-- In production, change this immediately!
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@localhost', '$2a$12$K8QKx8VV7QjF2L2BVvWxCeL9XxM.Xql8Vq2QjzKuZvJlZxKq4r6Tq', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Add some sample workflows ownership to admin user (if admin exists)
UPDATE workflows 
SET created_by = (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
WHERE created_by IS NULL;