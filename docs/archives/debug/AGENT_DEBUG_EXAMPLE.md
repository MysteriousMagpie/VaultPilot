# AI Agent Debugging Example: VaultPilot HTTP 422 Error

## Scenario: AI Agent Debugging Session

**Problem Report**: User experiencing "HTTP 422 Unprocessable Entity" when trying to use chat functionality in VaultPilot.

## Step-by-Step Agent Investigation

### Phase 1: Error Type Identification
**Agent Decision**: This is a 422 error = client-side validation issue
**Priority**: High (user-facing feature broken)

### Phase 2: Systematic Search Strategy

#### 2.1 Find the Failing Endpoint
```bash
# Agent executes:
@workspace search "/api/obsidian/chat" in *.ts
```

**Agent Findings**:
- Located in `api-client.ts` line 162: `async chat(request: ChatRequest)`
- Endpoint: `POST /api/obsidian/chat`

#### 2.2 Analyze Request Structure  
```bash
# Agent executes:
@workspace search "ChatRequest" in types.ts
```

**Agent Findings**:
```typescript
export interface ChatRequest {
  message: string;
  conversation_id?: string;
  vault_context?: string;
  agent_id?: string;
}
```

#### 2.3 Trace Frontend Implementation
```bash
# Agent executes:
@workspace search "chat.*request|apiClient.chat" in *.ts
```

**Agent Findings**:
- `main.ts` line 265: `quickChatWithSelection()` method
- `chat-modal.ts`: Chat interface implementation

### Phase 3: Deep Analysis

#### 3.1 Examine Request Construction
**Agent reviews `main.ts` quickChatWithSelection():**
```typescript
const response = await this.apiClient.chat({
  message: `Please explain or analyze this text: "${selection}"`,
  vault_context: editor.getValue()
});
```

#### 3.2 Check API Client Implementation  
**Agent reviews `api-client.ts` chat method:**
```typescript
async chat(request: ChatRequest): Promise<APIResponse<ChatResponse>> {
  return this.makeRequest('/api/obsidian/chat', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
```

### Phase 4: Hypothesis Formation

**Agent Analysis**:
1. ✅ Request structure matches interface
2. ✅ JSON serialization appears correct
3. ❓ Field naming convention unclear
4. ❓ Missing required fields?

#### 4.1 Check for Backend Documentation
```bash
# Agent executes:
@workspace search "conversation_id|conversationId" in *.ts,*.md
```

**Agent Finding**: Mixed naming conventions detected!
- Frontend uses: `conversation_id` (snake_case)
- Some references show: `conversationId` (camelCase)

### Phase 5: Root Cause Identification

**Agent executes additional search**:
```bash
@workspace search "camelCase|snake_case|naming" in *.md,*.ts
```

**Agent Finding in TROUBLESHOOTING.md**:
```
Common issue: Field naming mismatch between frontend/backend
Backend typically expects snake_case, frontend sometimes sends camelCase
```

### Phase 6: Solution Development

**Agent identifies the problem**:
- Backend expects: `conversation_id` (snake_case)
- Frontend sends: `conversation_id` (correct)
- BUT: Missing required field validation

**Agent searches for required fields**:
```bash
@workspace search "required.*field|validation.*error" in *.ts
```

**Agent hypothesis**: Backend requires `agent_id` field that frontend isn't sending.

### Phase 7: Fix Implementation

**Agent proposes solution**:

1. **Update request construction in `main.ts`**:
```typescript
const response = await this.apiClient.chat({
  message: `Please explain or analyze this text: "${selection}"`,
  vault_context: editor.getValue(),
  agent_id: this.settings.defaultAgent || 'default'  // Add missing field
});
```

2. **Add error handling for missing agent**:
```typescript
if (!this.settings.defaultAgent) {
  new Notice('Please configure a default agent in settings');
  return;
}
```

3. **Update settings validation**:
```typescript
// In settings.ts testConnection method
if (!this.plugin.settings.defaultAgent) {
  new Notice('⚠️ Warning: No default agent configured');
}
```

### Phase 8: Verification Strategy

**Agent recommends testing**:
1. Add debug logging to see actual request payload
2. Check backend logs for validation errors
3. Test with known good agent ID
4. Verify settings panel saves defaultAgent correctly

### Phase 9: Prevention Measures

**Agent suggests improvements**:
1. Add client-side validation before API calls
2. Improve error messages to show specific validation failures
3. Add TypeScript strict checks for required fields
4. Create unit tests for request construction

## Agent Success Metrics

- ✅ Identified error type correctly (422 = validation)
- ✅ Located relevant code sections efficiently  
- ✅ Found root cause (missing required field)
- ✅ Proposed specific, actionable fix
- ✅ Recommended testing and prevention strategies

## Generalized Learning

This debugging session demonstrates the agent's ability to:
1. **Pattern Recognition**: 422 errors → validation issues
2. **Systematic Search**: From error to endpoint to implementation
3. **Code Analysis**: Understanding data flow across files
4. **Root Cause Analysis**: Beyond symptoms to actual problems
5. **Solution Design**: Complete fix with error handling
6. **Quality Assurance**: Testing and prevention recommendations

The agent successfully transformed a vague user error report into a specific, fixable issue with implementation details.
