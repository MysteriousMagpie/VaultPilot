# VaultPilot AI Agent Debugging Configuration

## Project Analysis Summary

**Project Type**: Obsidian Plugin (TypeScript)
**Architecture**: Client-Server with WebSocket integration
**Backend**: EvoAgentX API
**Key Technologies**: TypeScript, Obsidian API, WebSocket, REST API

## Core Components Identified

### 1. Main Plugin Entry Points
- **`main.ts`**: Primary plugin class with command registration
- **`api-client.ts`**: EvoAgentX backend communication
- **`settings.ts`**: Plugin configuration and connection testing
- **`types.ts`**: TypeScript interfaces and data models

### 2. Key API Endpoints
```
Health Check: GET /api/obsidian/health
Chat: POST /api/obsidian/chat  
Copilot: POST /api/obsidian/copilot/complete
Workflow: POST /api/obsidian/workflow
Vault Analysis: POST /api/obsidian/vault/context
Task Planning: POST /api/obsidian/planning/tasks
WebSocket: WS /ws/obsidian
```

### 3. Common Error Patterns Found
- **CORS issues**: 400 Bad Request on OPTIONS preflight
- **Connection failures**: Backend offline scenarios
- **WebSocket disconnections**: Network reliability issues
- **API response validation**: Non-JSON response handling

## Autonomous Debugging Workflows

### For Backend Connection Issues (HTTP 422, 400, 500 errors)

#### Investigation Sequence:
1. **Identify Error Type**
   ```bash
   @workspace search "error" in *.ts files
   @workspace search "APIResponse" in api-client.ts
   ```

2. **Trace Request Flow**
   ```bash
   # Find endpoint definition
   @workspace search "/api/obsidian/conversation/history"
   
   # Locate request construction
   @workspace search "makeRequest" in api-client.ts
   
   # Check payload structure
   @workspace search "ChatRequest" in types.ts
   ```

3. **Compare Schema Expectations**
   - Backend expects: Check `types.ts` interface definitions
   - Frontend sends: Check `api-client.ts` request construction
   - Validation: Look for field mismatches, type errors

#### Specific Commands for VaultPilot:
```bash
# For chat/conversation errors
@workspace search "ChatRequest|ChatResponse|ConversationHistory" in types.ts

# For copilot completion issues  
@workspace search "CopilotRequest|CopilotResponse" in types.ts

# For workflow execution problems
@workspace search "WorkflowRequest|WorkflowResponse" in types.ts

# Check error handling patterns
@workspace search "APIResponse.*error" in api-client.ts
```

### For Frontend Integration Issues

#### Investigation Sequence:
1. **Find UI Components**
   ```bash
   @workspace search "Modal|View" in *.ts files
   @workspace search "Notice|new Notice" in main.ts
   ```

2. **Trace User Actions**
   ```bash
   # Command registration
   @workspace search "addCommand" in main.ts
   
   # Event handlers  
   @workspace search "onClick|callback" in *.ts files
   
   # Editor interactions
   @workspace search "Editor|MarkdownView" in main.ts
   ```

3. **Debug State Management**
   ```bash
   # Settings state
   @workspace search "settings|DEFAULT_SETTINGS" in settings.ts
   
   # WebSocket state
   @workspace search "websocketConnected|connectWebSocket" in main.ts
   
   # Plugin lifecycle
   @workspace search "onload|onunload" in main.ts
   ```

### For WebSocket Connection Problems

#### Investigation Sequence:
1. **Check Connection Logic**
   ```bash
   @workspace search "WebSocket|connectWebSocket" in api-client.ts
   @workspace search "wsCallbacks|WebSocketMessage" in types.ts
   ```

2. **Trace Message Handling**
   ```bash
   @workspace search "onChat|onWorkflowProgress|onCopilot" in main.ts
   @workspace search "WebSocketMessage.*type" in types.ts
   ```

3. **Debug Connection State**
   ```bash
   @workspace search "websocketConnected|isWebSocketConnected" in main.ts
   @workspace search "disconnectWebSocket" in main.ts
   ```

## Error Analysis Templates

### HTTP 422 Error Template (Validation Issues)
```typescript
// 1. Find the failing endpoint
const endpoint = "/api/obsidian/conversation/history";

// 2. Locate request interface
interface ChatRequest {
  message: string;
  conversation_id?: string;
  vault_context?: string;
  agent_id?: string;
}

// 3. Check actual request in api-client.ts
async chat(request: ChatRequest): Promise<APIResponse<ChatResponse>> {
  return this.makeRequest('/api/obsidian/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// 4. Identify mismatch - Common issues:
// - Field naming (camelCase vs snake_case)
// - Missing required fields
// - Type mismatches (string vs number)
// - Extra unexpected fields
```

### CORS/400 Error Template (Connection Issues)
```typescript
// 1. Check health check implementation
async healthCheck(): Promise<APIResponse<{ status: string; version: string }>> {
  console.log(`VaultPilot: Attempting health check to ${this.baseUrl}/api/obsidian/health`);
  const result = await this.makeRequest<{ status: string; version: string }>('/api/obsidian/health', {
    method: 'GET',
  });
  console.log('VaultPilot: Health check result:', result);
  return result;
}

// 2. Look for fallback mechanism
async simpleHealthCheck(): Promise<APIResponse<{ status: string }>> {
  // Alternative method for CORS issues
}

// 3. Check CORS configuration in makeRequest
const response = await fetch(url, {
  ...options,
  headers,
  mode: 'cors',
  credentials: 'omit',
});
```

## Debugging Command Library

### Quick Investigation Commands
```bash
# Find all error handling
@workspace search "catch.*error|Error.*message" in *.ts

# Find all API endpoints
@workspace search "\/api\/obsidian" in *.ts

# Find all Notice displays (user-facing errors)
@workspace search "new Notice.*error" in *.ts

# Find all console.log/error statements
@workspace search "console\.(log|error|warn)" in *.ts

# Find all try-catch blocks
@workspace search "try\s*{.*catch" in *.ts --regex
```

### Component-Specific Commands
```bash
# Settings debugging
@workspace search "testConnection|backendUrl|apiKey" in settings.ts

# Main plugin debugging  
@workspace search "onload|loadSettings|saveSettings" in main.ts

# API client debugging
@workspace search "makeRequest|baseUrl|headers" in api-client.ts

# Type definitions
@workspace search "interface.*Request|interface.*Response" in types.ts
```

## Systematic Fix Patterns

### Pattern 1: Field Name Mismatch (422 Errors)
```typescript
// Problem: Backend expects snake_case, frontend sends camelCase
// Search: @workspace search "conversation_id|conversationId" in *.ts

// Fix: Update interface or transform request
interface ChatRequest {
  message: string;
  conversation_id?: string;  // Use backend naming
  vault_context?: string;
  agent_id?: string;
}
```

### Pattern 2: Missing Error Handling
```typescript
// Problem: Unhandled promise rejections
// Search: @workspace search "async.*{.*await.*}" in *.ts --regex

// Fix: Add comprehensive error handling
try {
  const response = await this.apiClient.chat(request);
  if (!response.success) {
    new Notice(`Chat error: ${response.error}`);
    return;
  }
  // Handle success
} catch (error) {
  new Notice(`Unexpected error: ${error.message}`);
  console.error('Chat error:', error);
}
```

### Pattern 3: WebSocket Connection Issues
```typescript
// Problem: WebSocket fails silently
// Search: @workspace search "WebSocket.*onerror|onclose" in *.ts

// Fix: Add robust error handling
connectWebSocket() {
  try {
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (this.settings.debugMode) {
        new Notice('WebSocket connection failed', 5000);
      }
    };
    
    this.websocket.onclose = () => {
      this.websocketConnected = false;
      // Implement reconnection logic
    };
  } catch (error) {
    console.error('WebSocket setup error:', error);
  }
}
```

## File Modification Priority Matrix

### High Priority (Core Functionality)
1. **`api-client.ts`** - All backend communication
2. **`main.ts`** - Plugin lifecycle and commands  
3. **`types.ts`** - Data structure contracts

### Medium Priority (User Experience)
4. **`settings.ts`** - Configuration and testing
5. **`chat-modal.ts`** - User interface
6. **`workflow-modal.ts`** - Advanced features

### Low Priority (Enhancement)
7. **`view.ts`** - Sidebar view
8. **Documentation files** - User guidance

## Agent Validation Checklist

After making any changes, validate:

1. **Compile Check**: Run `npm run build` successfully
2. **Type Check**: No TypeScript errors in `types.ts`
3. **API Consistency**: Request/response interfaces match
4. **Error Handling**: All async operations have try-catch
5. **User Feedback**: Appropriate Notice messages for errors
6. **Debug Logging**: Console messages for troubleshooting
7. **Settings Integration**: New options properly configured

## Emergency Debugging Commands

When everything fails:
```bash
# Find all recent changes
@workspace search "TODO|FIXME|BUG" in *.ts

# Find all hardcoded values
@workspace search "localhost|8000|http://" in *.ts

# Find all async operations without error handling
@workspace search "await.*\(" in *.ts --regex

# Find all user-facing strings for error messages
@workspace search "Notice.*['\"]" in *.ts --regex
```

This configuration provides a comprehensive framework for AI agents to autonomously debug the VaultPilot codebase using systematic approaches and the tools available in VS Code.
