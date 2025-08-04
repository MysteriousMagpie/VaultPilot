# VaultPilot Dev-Pipe Framework Guide for Claude

## Overview

The VaultPilot Dev-Pipe framework provides a robust, multi-transport communication system that enables intelligent, context-aware conversations between Claude (AI assistants) and the EvoAgentX backend. This framework enhances AI conversations with comprehensive development context, intelligent model selection, and optimized transport protocols.

## Key Components

### 1. ConversationDevService
The main service that orchestrates enhanced conversations with development context awareness.

**Location**: `src/services/ConversationDevService.ts`

**Key Features**:
- Development context enrichment
- Intelligent model selection via dev-pipe
- Multi-transport support (HTTP, WebSocket, FileSystem)
- Performance metrics and monitoring
- Error recovery and graceful degradation

### 2. DevelopmentContextService
Provides comprehensive development context including workspace state, active files, project structure, and Git information.

**Location**: `src/services/DevelopmentContextService.ts`

**Context Types**:
- **Workspace Context**: File counts, recent files, project structure
- **Active File Context**: Current file content, metadata, code symbols
- **Selection Context**: User's current text selection with surrounding context
- **Project Context**: Project type, dependencies, build systems, testing frameworks
- **Git Context**: Repository information, branch status, commit history

### 3. DevPipe Transport System
Multi-transport communication framework with intelligent failover and optimization.

**Location**: `src/devpipe/`

**Available Transports**:
- **HTTPTransport**: Standard HTTP/HTTPS communication
- **WebSocketTransport**: Real-time bidirectional communication
- **FileSystemTransport**: File-based communication for development environments
- **DevPipeTransport**: Main transport interface with intelligent routing

## How to Use Dev-Pipe as Claude

### 1. Basic Enhanced Conversation

```typescript
// Via the ConversationDevService
const response = await this.conversationDevService.chat(
  "Help me refactor this component for better performance",
  {
    conversation_type: 'code_review',
    mode: 'agent'
  }
);
```

The framework automatically:
- Gathers comprehensive development context
- Selects the optimal AI model for the task
- Routes the request via the most efficient transport
- Enriches the conversation with project-specific information

### 2. Enhanced Chat Request Structure

When using the dev-pipe framework, conversations are automatically enriched with:

```typescript
interface EnrichedChatRequest {
  message: string;
  conversation_id?: string;
  development_context?: DevelopmentContext;
  context_summary?: string;
  conversation_type?: 'general' | 'code_review' | 'debugging' | 'architecture' | 'documentation';
  project_context?: {
    type: string;
    structure: any;
    dependencies: any[];
  };
}
```

### 3. Context Awareness Levels

The framework supports three levels of context depth:

- **Minimal**: Basic workspace and active file information
- **Standard**: Includes workspace, active file, selection, project, and Git context
- **Comprehensive**: Full context with all available development information

### 4. Transport Selection

The framework automatically selects the best transport based on:
- **Availability**: Which transports are currently functional
- **Performance**: Response times and reliability metrics
- **Capabilities**: Feature support (streaming, real-time updates, etc.)
- **Environment**: Development vs. production considerations

## Commands for Claude Integration

VaultPilot provides several commands that Claude can use or recommend to users:

### Enhanced Development Chat
```
Command: Enhanced Development Chat
ID: vaultpilot:dev-chat-enhanced
```
Opens a specialized chat interface with full development context awareness.

### Conversation Insights
```
Command: Show Conversation Development Insights  
ID: vaultpilot:conversation-insights
```
Displays analysis of current development context and recommendations.

### Service Status
```
Command: Show Conversation Dev Service Status
ID: vaultpilot:conversation-dev-status
```
Shows the status of dev-pipe services, metrics, and configuration.

## Context Types and Usage

### 1. Workspace Context
```typescript
interface WorkspaceContext {
  totalFiles: number;
  recentFiles: string[];
  tags: string[];
  folders: FolderStructure[];
  fileTypes: Record<string, number>;
  vaultPath: string;
}
```

**Use Cases**:
- Project overview and navigation
- File organization recommendations
- Workspace optimization suggestions

### 2. Active File Context
```typescript
interface FileContext {
  path: string;
  name: string;
  content: string;
  language: string;
  extension: string;
  size: number;
  metadata: FileMetadata;
  symbols: CodeSymbol[];
  dependencies: string[];
  lastModified: number;
}
```

**Use Cases**:
- Code review and analysis
- Refactoring suggestions
- Dependency analysis
- Security audits

### 3. Selection Context
```typescript
interface SelectionContext {
  text: string;
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
  surroundingContext: string;
  lineContext: string;
}
```

**Use Cases**:
- Targeted code explanations
- Specific function improvements
- Debugging assistance
- Code documentation generation

### 4. Project Context
```typescript
interface ProjectContext {
  type: ProjectType;
  structure: ProjectStructure;
  dependencies: DependencyInfo[];
  buildSystem: BuildSystemInfo | null;
  testFramework: TestFrameworkInfo | null;
  documentation: DocumentationInfo[];
}
```

**Use Cases**:
- Architecture recommendations
- Technology stack analysis
- Best practices guidance
- Migration planning

## Best Practices for Claude

### 1. Context Utilization
- **Always check context relevance**: Use the contextRelevance score to gauge how much context is available
- **Adapt responses to project type**: Tailor advice based on detected project type (React, Node.js, Python, etc.)
- **Consider file selection**: If user has selected code, focus responses on that specific area
- **Leverage project structure**: Use dependency and build system information to provide relevant suggestions

### 2. Conversation Types
Use appropriate conversation types for better model selection:
- **code_review**: For analyzing and improving existing code
- **debugging**: For troubleshooting issues and errors
- **architecture**: For system design and structural decisions
- **documentation**: For generating or improving documentation
- **general**: For open-ended development discussions

### 3. Transport Optimization
- **Monitor transport status**: Check DevPipe availability for enhanced responses
- **Graceful degradation**: Provide useful responses even when enhanced context isn't available
- **Performance awareness**: Consider response time requirements when making recommendations

### 4. Error Handling
- **Context gathering failures**: Provide helpful responses even if context collection fails
- **Transport failures**: Fall back to standard communication methods
- **Model selection issues**: Continue with default models if intelligent selection fails

## Advanced Features

### 1. Real-time Context Updates
The framework supports real-time context updates as users work:
- File changes are reflected immediately
- Selection changes update context automatically
- Project structure changes are detected and incorporated

### 2. Intelligent Caching
- Context information is cached for performance
- Cache invalidation happens automatically when files change
- Manual cache clearing available when needed

### 3. Metrics and Monitoring
The framework tracks:
- Response times for different transports
- Context enrichment success rates
- Model selection effectiveness
- Error rates and patterns

### 4. Configuration Options
```typescript
interface ConversationDevConfig {
  enableContextEnrichment: boolean;
  enableIntelligentModelSelection: boolean;
  enableDevPipeTransport: boolean;
  contextDepth: 'minimal' | 'standard' | 'comprehensive';
  debugMode: boolean;
}
```

## Troubleshooting

### Common Issues

1. **DevPipe Not Available**
   - Framework automatically falls back to standard HTTP transport
   - Users can check status via the service status command
   - Ensure model selection service is enabled in settings

2. **Context Collection Failures**
   - Framework provides graceful degradation
   - Basic conversations still work without enhanced context
   - Users can manually refresh context

3. **Performance Issues**
   - Framework includes automatic performance monitoring
   - Transport selection optimizes for speed
   - Caching reduces repeated context gathering overhead

### Debug Information

When debug mode is enabled, the framework logs:
- Transport selection decisions
- Context gathering performance
- Model selection rationale
- Error details and recovery attempts

## Integration Examples

### 1. Code Review Request
```typescript
// User selects problematic code and asks for review
// Framework automatically:
// 1. Detects 'code_review' conversation type
// 2. Gathers file context and selection
// 3. Includes project dependencies and build info
// 4. Selects appropriate model for code analysis
// 5. Sends enriched request via optimal transport
```

### 2. Architecture Discussion
```typescript
// User asks about system design
// Framework provides:
// 1. Complete project structure analysis
// 2. Dependency graph information
// 3. Existing architecture patterns
// 4. Technology stack details
// 5. Best practices for the specific project type
```

### 3. Debugging Session
```typescript
// User reports an error
// Framework includes:
// 1. Error context from active file
// 2. Surrounding code for analysis
// 3. Project configuration details
// 4. Recent changes from Git context
// 5. Related dependencies and imports
```

## Conclusion

The VaultPilot Dev-Pipe framework provides a comprehensive foundation for intelligent, context-aware AI conversations in development environments. By leveraging this framework, Claude can provide more relevant, accurate, and helpful assistance by understanding the full context of the user's development work.

The framework's multi-transport architecture ensures reliable communication, while the rich context awareness enables more sophisticated and targeted AI assistance. This combination creates a powerful platform for enhanced developer productivity and AI-assisted coding.