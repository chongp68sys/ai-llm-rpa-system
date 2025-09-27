# 🏗️ AI/LLM RPA System - Initial Project Structure

## 📋 Project Initialization Prompt

**Task**: Create the backend foundation for an AI/LLM RPA (Robotic Process Automation) workflow system.

**Context**: We have a React TypeScript frontend with a visual workflow editor (React Flow) that allows users to create workflows with different node types (Schedule, API Call, LLM, Database, Email, etc.). Now we need to build the backend that can execute these workflows.

## 🎯 Phase 1 Requirements

### 1. **Project Structure**
Create a Node.js TypeScript backend with this structure:

```
backend/
├── src/
│   ├── controllers/        # API route handlers
│   │   ├── auth.controller.ts
│   │   ├── workflows.controller.ts
│   │   └── executions.controller.ts
│   ├── services/           # Business logic
│   │   ├── auth.service.ts
│   │   ├── workflow.service.ts
│   │   └── execution.service.ts
│   ├── models/             # Database models (Prisma)
│   ├── middleware/         # Express middleware
│   │   ├── auth.middleware.ts
│   │   └── validation.middleware.ts
│   ├── types/              # TypeScript interfaces
│   │   ├── workflow.types.ts
│   │   ├── execution.types.ts
│   │   └── api.types.ts
│   ├── workflows/          # Workflow execution engine
│   │   ├── engine.ts
│   │   ├── nodes/
│   │   │   ├── base.node.ts
│   │   │   ├── schedule.node.ts
│   │   │   └── api.node.ts
│   │   └── scheduler.ts
│   ├── utils/              # Helper functions
│   ├── config/             # Configuration
│   └── app.ts              # Express app setup
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── docker-compose.yml      # PostgreSQL + Redis setup
├── Dockerfile
├── package.json
└── tsconfig.json
```

### 2. **Technology Stack Setup**
- **Node.js + TypeScript + Express** for the API server
- **Prisma** as the ORM for PostgreSQL
- **PostgreSQL** for workflow and execution data
- **Redis** for queues and caching
- **BullMQ** for job queue management
- **JWT** for authentication
- **Zod** for validation
- **Docker** for local development

### 3. **Core Data Models** (Prisma Schema)

```typescript
// User model
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  workflows Workflow[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Workflow model
model Workflow {
  id          String      @id @default(cuid())
  name        String
  description String?
  nodes       Json        # Workflow nodes configuration
  edges       Json        # Node connections
  status      WorkflowStatus @default(DRAFT)
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  executions  WorkflowExecution[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

// Execution model
model WorkflowExecution {
  id           String           @id @default(cuid())
  workflowId   String
  workflow     Workflow         @relation(fields: [workflowId], references: [id])
  status       ExecutionStatus  @default(PENDING)
  currentNode  String?
  variables    Json             @default("{}")
  startTime    DateTime         @default(now())
  endTime      DateTime?
  logs         ExecutionLog[]
}

// Execution logs
model ExecutionLog {
  id          String            @id @default(cuid())
  executionId String
  execution   WorkflowExecution @relation(fields: [executionId], references: [id])
  nodeId      String?
  level       LogLevel
  message     String
  data        Json?
  timestamp   DateTime          @default(now())
}
```

### 4. **Essential TypeScript Interfaces**
Create shared types that match the frontend interfaces:

```typescript
// workflow.types.ts
export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    category: NodeCategory;
    config: NodeConfig;
    isExecuting?: boolean;
    executionResult?: any;
    error?: string;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  currentNodeId?: string;
  variables: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  logs: ExecutionLog[];
}

export type NodeType = 
  | 'schedule' | 'webhook' | 'manual'
  | 'llm' | 'api' | 'database' | 'email'
  | 'condition' | 'transform';

export type ExecutionStatus = 
  | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
```

### 5. **Core API Endpoints**
Implement these essential routes:

```typescript
// Authentication
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me

// Workflows
GET    /api/workflows           # List user workflows
POST   /api/workflows           # Create workflow
GET    /api/workflows/:id       # Get workflow
PUT    /api/workflows/:id       # Update workflow
DELETE /api/workflows/:id       # Delete workflow

// Execution
POST   /api/workflows/:id/execute  # Start execution
GET    /api/executions/:id         # Get execution details
GET    /api/executions/:id/logs    # Get execution logs
POST   /api/executions/:id/cancel  # Cancel execution
```

### 6. **Basic Workflow Execution Engine**
Create a simple engine that can:
- Load a workflow from database
- Execute nodes sequentially
- Handle basic node types (Schedule, API Call)
- Log execution steps
- Update execution status
- Store variables between nodes

### 7. **Docker Setup**
Provide docker-compose.yml with:
- PostgreSQL database
- Redis for queues
- Adminer for database management
- Redis Commander for queue monitoring

## ✅ Acceptance Criteria for Phase 1

1. ✅ **Project boots up** - `npm run dev` starts the server
2. ✅ **Database works** - Prisma migrations run successfully
3. ✅ **Authentication** - Users can register/login with JWT
4. ✅ **Workflow CRUD** - Can create, read, update, delete workflows
5. ✅ **Basic execution** - Can execute a simple workflow with API calls
6. ✅ **Logging works** - Execution logs are stored and retrievable
7. ✅ **Docker runs** - `docker-compose up` starts all services

## 🚀 Implementation Instructions

1. **Initialize** the Node.js TypeScript project with proper dependencies
2. **Setup** Prisma with PostgreSQL and create initial schema
3. **Configure** Express with security middleware and CORS
4. **Implement** JWT authentication system
5. **Create** basic workflow CRUD operations
6. **Build** simple workflow execution engine
7. **Setup** Docker environment for easy development
8. **Test** everything works end-to-end

## 📦 Key Dependencies to Include

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.0",
    "bullmq": "^4.0.0",
    "ioredis": "^5.3.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "typescript": "^5.0.0",
    "ts-node-dev": "^2.0.0",
    "prisma": "^5.0.0"
  }
}
```

This foundation will serve as the base for implementing all the advanced features in subsequent phases!