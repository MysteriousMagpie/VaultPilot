# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
```bash
# Development with hot reload
cd vaultpilot && npm run dev

# Production build
cd vaultpilot && npm run build

# Clean build
cd vaultpilot && npm run build:clean

# Type checking
cd vaultpilot && npm run lint

# Run tests
cd vaultpilot && npm test
```

### Backend Services
```bash
# Start VaultPilot backend server
python vaultpilot_server.py

# Start EvoAgentX integration server
python server.py

# Test WebSocket connection
python test_websocket.py
```

### Quick Development Setup
```bash
# Complete setup and build
./start_vaultpilot.sh

# Build and install to demo vault
cd vaultpilot && npm run dev:watch
```

## Architecture Overview

VaultPilot is an advanced Obsidian plugin that integrates with EvoAgentX backend services to provide AI-powered knowledge management capabilities.

### Core Components

#### Plugin Architecture
- **Main Plugin Class**: `VaultPilotPlugin` extends Obsidian's Plugin class
- **Service Layer**: Model selection, development context, recommendations
- **UI Layer**: Enhanced views, modals, and components
- **Integration Layer**: Phase 3 features, onboarding, transport management

#### Backend Communication
- **Primary Backend**: EvoAgentX integration at `/evoagentx_integration/`
- **API Client**: `EvoAgentXClient` handles REST API and WebSocket communication
- **Transport System**: DevPipe with multiple transport layers (HTTP, WebSocket, FileSystem)
- **Health Monitoring**: Automatic failover and service health checking

#### Key Services
- **Model Selection Service**: Intelligent routing of AI requests to appropriate models
- **Development Context Service**: Extracts project context for AI interactions
- **Vault Management**: Advanced file operations and vault analysis
- **Recommendation Engine**: AI-powered optimization suggestions

### File Structure
```
vaultpilot/src/
├── main.ts                   # Main plugin entry point
├── settings.ts               # Plugin configuration
├── api-client.ts             # EvoAgentX backend client
├── types.ts                  # Core TypeScript interfaces
├── services/                 # Service layer components
├── components/               # UI components and modals
├── devpipe/                  # Transport management system
└── examples/                 # Integration examples
```

## Development Patterns

### TypeScript Best Practices
- **Async/Await**: All API interactions use async/await with comprehensive error handling
- **Error Handling**: Graceful fallbacks for backend connectivity issues
- **Type Safety**: Comprehensive TypeScript coverage with strict mode
- **Interface-First**: Define interfaces before implementation

### Error Handling Strategy
- User-friendly error messages through Obsidian Notice system
- Multiple fallback layers (cache → simple checks → static rules)
- Graceful degradation when backend services are unavailable

Example pattern:
```typescript
try {
  const response = await this.apiClient.healthCheck();
  if (!response.success) {
    // Graceful fallback logic
  }
} catch (error) {
  new Notice(`Connection error: ${error.message}`);
}
```

### WebSocket Integration
- Real-time communication for chat, workflow progress, and copilot suggestions
- Automatic reconnection and health monitoring
- Event-driven architecture for live updates

### Settings Management
- Hierarchical configuration in `VaultPilotSettings`
- Feature toggles for progressive enhancement
- Modular sections for different plugin capabilities

## Backend Integration

### EvoAgentX Integration Package
The `/evoagentx_integration/` directory contains production-ready backend integration:
- **Core Components**: API models, route handlers, WebSocket management
- **AI Services**: Vault analysis, copilot engine, workflow processing
- **Advanced Systems**: Agent evolution, marketplace, multi-modal intelligence

### API Endpoints
Key endpoints the plugin communicates with:
- `/api/obsidian/chat` - AI chat interactions
- `/api/obsidian/copilot/complete` - Text completion
- `/api/obsidian/workflow` - Workflow execution
- `/api/obsidian/planning/tasks` - Task planning
- `/api/obsidian/vault/context` - Vault analysis

### Running Backend Services
The plugin requires a running EvoAgentX backend. Use the integration package:
```python
from evoagentx_integration import setup_vaultpilot_integration
app = FastAPI()
setup_vaultpilot_integration(app)
```

## Key Features Implementation

### Phase 3 Integration
Advanced features are implemented in the Phase 3 system:
- **Onboarding Wizard**: Guided setup for new users
- **Transport Dashboard**: Real-time monitoring interface
- **Enhanced UI**: Progress indicators and keyboard shortcuts

### AI-Powered Capabilities
- **Chat System**: Intelligent mode detection (Ask vs Agent)
- **Copilot**: Context-aware auto-completion
- **Workflow Engine**: Complex task automation
- **Task Planning**: "Plan My Day" with schedule injection

### Vault Management
- **Smart Search**: AI-powered content search
- **File Operations**: Batch operations and automation
- **Structure Analysis**: Organization insights
- **Context Services**: Development context extraction

## Testing

### Test Configuration
- **Framework**: Jest with TypeScript support
- **Environment**: Node.js with Obsidian mocks
- **Coverage**: Configured for `src/**/*.ts` files
- **Mocks**: Obsidian API mocked in `__mocks__/obsidian.js`

### Running Tests
```bash
cd vaultpilot && npm test
```

### Python Testing (Backend)
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies and run tests
pip install -r requirements.txt
pytest
```

## Performance Considerations

### Optimization Strategies
- **Caching**: Model health status and conversation history
- **Debouncing**: Auto-complete requests with cooldowns
- **Lazy Loading**: Phase 3 features and enhancement manager
- **Connection Pooling**: WebSocket reuse and health monitoring

### Resource Management
- Proper cleanup in component lifecycle methods
- WebSocket connection management with automatic reconnection
- Memory efficient caching strategies

## Common Development Tasks

### Adding New API Endpoints
1. Update `api-client.ts` with new method
2. Add corresponding types in `types.ts`
3. Update backend integration in `/evoagentx_integration/`
4. Add error handling and fallback logic

### Creating New UI Components
1. Follow existing component patterns in `components/`
2. Implement proper cleanup in lifecycle methods
3. Use Obsidian's UI components where possible
4. Add keyboard shortcuts and accessibility features

### Extending Settings
1. Update `VaultPilotSettings` interface in `types.ts`
2. Add UI elements in `settings.ts`
3. Handle setting changes in relevant services
4. Maintain backward compatibility

### Working with WebSocket Events
1. Add event handlers in the WebSocket client
2. Implement real-time UI updates
3. Handle connection failures gracefully
4. Add proper event cleanup

## Troubleshooting

### Common Issues
- **Backend Connection**: Ensure EvoAgentX server is running on correct port
- **WebSocket Failures**: Check firewall settings and proxy configuration
- **Build Issues**: Run `npm run build:clean` to reset build state
- **Type Errors**: Run `npm run lint` to check TypeScript issues

### Development Tips
- Use the demo vault for testing with `npm run dev:watch`
- Enable debug mode in plugin settings for detailed logging
- Monitor WebSocket connections in browser dev tools
- Test with different vault sizes and structures

## Context Engineering Guidelines

### 🔄 Project Awareness & Context
- **Always read `README.md`** at the start of a new conversation to understand the project's architecture, goals, and capabilities
- **Review the current git status** to understand what work is in progress
- **Use consistent naming conventions, file structure, and architecture patterns** as described in this document
- **Use virtual environments** when executing Python commands, including for unit tests

### 🧱 Code Structure & Modularity
- **Never create a file longer than 500 lines of code.** If a file approaches this limit, refactor by splitting it into modules or helper files
- **Organize code into clearly separated modules**, grouped by feature or responsibility
- **Use clear, consistent imports** (prefer relative imports within packages)
- **Use python_dotenv and load_dotenv()** for environment variables

### 🧪 Testing & Reliability
- **Always create unit tests for new features** (functions, classes, routes, etc)
- **After updating any logic**, check whether existing unit tests need to be updated
- **Tests should live in appropriate test directories** mirroring the main app structure
- Include at least:
  - 1 test for expected use
  - 1 edge case
  - 1 failure case

### ✅ Task Completion
- **Use TodoWrite tool** to track and manage tasks during development
- Mark completed tasks immediately after finishing them
- Add new sub-tasks or TODOs discovered during development

### 📎 Style & Conventions

#### TypeScript/JavaScript
- **Follow modern ES6+ patterns** with async/await
- **Use TypeScript strict mode** with comprehensive type coverage
- **Follow consistent naming conventions** (camelCase for variables, PascalCase for classes)
- **Use Obsidian's built-in UI components** where possible

#### Python (Backend)
- **Follow PEP8** and use type hints consistently
- **Use `pydantic` for data validation**
- **Use `FastAPI` for APIs** and `SQLAlchemy` or `SQLModel` for ORM if applicable
- **Format with `black`** and lint with appropriate tools

#### Documentation
- Write **docstrings for every function** using appropriate style guides
- **Comment non-obvious code** and ensure everything is understandable
- **Update documentation** when adding new features or changing APIs

### 🧠 AI Behavior Rules
- **Never assume missing context.** Ask questions if uncertain
- **Never hallucinate libraries or functions** – only use known, verified packages
- **Always confirm file paths and module names** exist before referencing them
- **Never delete or overwrite existing code** unless explicitly instructed to do so
- **Test changes thoroughly** before marking tasks as complete

### 🚀 Performance & Scalability
- **Use async/await patterns** for all I/O operations
- **Implement proper caching strategies** for frequently accessed data
- **Handle errors gracefully** with appropriate fallbacks
- **Monitor WebSocket connections** and implement reconnection logic
- **Use lazy loading** for heavy components and features