# AI LLM RPA System

A drag-and-drop visual workflow builder for creating AI-powered Robotic Process Automation (RPA) workflows.

## Features

- 🎯 **Visual Workflow Builder** - Drag and drop interface with React Flow
- 🤖 **AI/LLM Integration** - Support for GPT, Claude, and other language models  
- ⚡ **Multiple Triggers** - Schedule, webhook, and manual triggers
- 🔗 **API Integrations** - HTTP API calls with authentication
- 📊 **Data Transformation** - JSON, XML, CSV processing
- 📧 **Notifications** - Email and messaging integrations
- 🏃 **Workflow Execution** - Real-time execution with logging
- 💾 **Import/Export** - Save and share workflows as JSON

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.1
- **Workflow Engine**: React Flow
- **State Management**: Zustand with Immer
- **Icons**: Lucide React

## Quick Start

1. **Install Dependencies**
   ```bash
   cd /Users/paul/development/ai-llm-rpa-system
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
src/
├── components/
│   ├── nodes/          # Custom React Flow nodes
│   │   ├── ScheduleNode.tsx
│   │   ├── LLMNode.tsx
│   │   └── APINode.tsx
│   └── ui/             # UI components
│       ├── NodePalette.tsx
│       ├── Toolbar.tsx
│       ├── NodePropertiesPanel.tsx
│       └── ExecutionPanel.tsx
├── store/
│   └── workflowStore.ts    # Zustand state management
├── types/
│   └── workflow.ts         # TypeScript definitions
└── App.tsx                 # Main application
```

## Node Types

### Triggers
- **Schedule** - Run workflows on a time-based schedule
- **Webhook** - Trigger via HTTP endpoints
- **Manual** - Start workflows manually

### Actions  
- **AI/LLM** - Process text with language models (GPT, Claude, etc.)
- **API Call** - Make HTTP requests to external services
- **Database** - Query and update databases
- **Email** - Send email notifications
- **Transform** - Process and transform data

### Logic
- **Condition** - Branch workflow based on conditions

## Usage

1. **Create Workflow**
   - Drag nodes from the left palette onto the canvas
   - Connect nodes by dragging from output dots to input dots
   - Configure each node by selecting it and editing properties

2. **Configure Nodes**
   - Click on any node to see its properties in the right panel
   - Fill in required configuration like API URLs, prompts, schedules
   - Add names and descriptions for better organization

3. **Execute Workflow**
   - Click the "Execute" button in the toolbar
   - Watch real-time execution logs in the bottom-right panel
   - View results and debug any issues

4. **Save/Load Workflows**
   - Export workflows as JSON files
   - Import existing workflows
   - Share workflows with team members

## Development

### Adding New Node Types

1. **Define Types** in `src/types/workflow.ts`:
   ```typescript
   export interface CustomNodeConfig extends BaseNodeConfig {
     customProperty: string;
   }
   ```

2. **Create Node Component** in `src/components/nodes/`:
   ```typescript
   const CustomNode: React.FC<NodeProps<WorkflowNode>> = ({ id, data, selected }) => {
     // Node implementation
   };
   ```

3. **Register Node Type** in `src/App.tsx`:
   ```typescript
   const nodeTypes = {
     custom: CustomNode,
     // ... other nodes
   };
   ```

### Extending Execution Engine

The current execution engine is a simulation. To add real execution:

1. Update `executeWorkflow` in `workflowStore.ts`
2. Add actual API calls, database connections, etc.
3. Implement error handling and retry logic
4. Add progress tracking and cancellation

## Roadmap

- [ ] **Real Execution Engine** - Actually execute workflows vs simulation
- [ ] **More Node Types** - File processing, image analysis, webhooks
- [ ] **Authentication** - User accounts and workspace management  
- [ ] **Cloud Deployment** - Deploy and run workflows in the cloud
- [ ] **Collaboration** - Team workspaces and sharing
- [ ] **Templates** - Pre-built workflow templates
- [ ] **Monitoring** - Analytics and performance tracking
- [ ] **Scheduling** - Cloud-based workflow scheduling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
