# Database Setup Guide

## Prerequisites
- PostgreSQL installed and running
- Command line access to `psql` or a PostgreSQL client

## Quick Setup

### Option 1: Command Line (Recommended)
```bash
# Create the database
createdb ai_llm_rpa_system

# Or if you need to specify user/host:
createdb -U postgres -h localhost ai_llm_rpa_system
```

### Option 2: Using psql
```bash
# Connect to PostgreSQL
psql -U postgres

# Run the setup script
\i setup-db.sql
```

### Option 3: Manual Setup
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE ai_llm_rpa_system;

-- Exit and verify
\q
```

## Configuration

Update your `.env` file with your PostgreSQL credentials:

```env
# Update these values to match your PostgreSQL setup
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/ai_llm_rpa_system
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ai_llm_rpa_system
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_SSL=false
```

## Test Connection

After setting up the database and updating `.env`:

```bash
npm run test:db
```

This will:
- ✅ Test connection to PostgreSQL
- ✅ Create all necessary tables and indexes
- ✅ Verify CRUD operations work
- ✅ Clean up test data

## Troubleshooting

### Connection Issues
- **"database does not exist"**: Run `createdb ai_llm_rpa_system`
- **"password authentication failed"**: Check your password in `.env`
- **"connection refused"**: Make sure PostgreSQL is running

### Permission Issues
```sql
-- If you get permission errors, grant privileges:
GRANT ALL PRIVILEGES ON DATABASE ai_llm_rpa_system TO your_user;
```

### Check PostgreSQL Status
```bash
# On macOS with Homebrew:
brew services list | grep postgresql

# On Linux:
sudo systemctl status postgresql

# On Windows:
net start postgresql-x64-14  # (version may vary)
```

## Database Schema

The system will automatically create these tables:
- `workflows` - Workflow definitions
- `workflow_executions` - Execution history
- `node_executions` - Individual node execution logs  
- `execution_logs` - Detailed execution logs
- `communication_audit` - Message delivery tracking
- `webhook_events` - Incoming webhook data
- `scheduled_triggers` - Scheduled workflow triggers
- `service_credentials` - Encrypted API keys/credentials
- `system_settings` - System configuration