import { 
  APIResponse, 
  ChatRequest, 
  ChatResponse, 
  ConversationHistory,
  ConversationHistoryRequest,
  CopilotRequest, 
  CopilotResponse,
  WorkflowRequest,
  WorkflowResponse,
  Agent,
  AgentCreateRequest,
  AgentExecuteRequest,
  VaultContextRequest,
  VaultContextResponse,
  TaskPlanningRequest,
  TaskPlanningResponse,
  IntelligenceParseRequest,
  IntelligenceParseResponse,
  MemoryUpdateRequest,
  WebSocketMessage,
  ErrorResponse,
  Intent,
  IntentResult,
  IntentDebug
} from './types';

export class EvoAgentXClient {
  private baseUrl: string;
  private apiKey?: string;
  private websocket?: WebSocket;
  private wsCallbacks: Map<string, (data: any) => void> = new Map();

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'omit',
      });

      // Handle non-JSON responses gracefully
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage = typeof data === 'object' && data.error 
          ? data.error 
          : `HTTP ${response.status}: ${response.statusText}`;
        
        console.error(`API Error [${response.status}]:`, errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }

      return {
        success: true,
        data: typeof data === 'string' ? { message: data } as T : data,
      };
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Health check
  async healthCheck(): Promise<APIResponse<{ status: string; version: string }>> {
    console.log(`VaultPilot: Attempting health check to ${this.baseUrl}/status`);
    const result = await this.makeRequest<{ status: string; version: string }>('/status', {
      method: 'GET',
    });
    console.log('VaultPilot: Health check result:', result);
    return result;
  }

  // Alternative health check method if the main one fails
  async simpleHealthCheck(): Promise<APIResponse<{ status: string }>> {
    try {
      const url = `${this.baseUrl}/status`;
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (response.ok || response.status === 405) { // 405 means server is up but doesn't support HEAD
        return {
          success: true,
          data: { status: 'ok' }
        };
      }
      
      return {
        success: false,
        error: `Server responded with status ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Chat functionality
  async chat(request: ChatRequest): Promise<APIResponse<ChatResponse>> {
    return this.makeRequest('/api/obsidian/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getConversationHistory(conversationId: string, limit: number = 50): Promise<APIResponse<ConversationHistory>> {
    const requestBody: ConversationHistoryRequest = {
      conversation_id: conversationId,
      limit: limit,
      include_messages: true
    };
    
    return this.makeRequest('/api/obsidian/conversation/history', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async deleteConversation(conversationId: string): Promise<APIResponse<void>> {
    return this.makeRequest(`/api/obsidian/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  // Copilot functionality
  async getCopilotCompletion(request: CopilotRequest): Promise<APIResponse<CopilotResponse>> {
    return this.makeRequest('/api/obsidian/copilot/complete', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Workflow execution
  async executeWorkflow(request: WorkflowRequest): Promise<APIResponse<WorkflowResponse>> {
    return this.makeRequest('/api/obsidian/workflow', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // New unified API methods for simplified context packaging
  async runWorkflow(payload: { message: string; context: string | null }): Promise<APIResponse<WorkflowResponse>> {
    return this.makeRequest('/api/obsidian/workflow', {
      method: 'POST',
      body: JSON.stringify({
        goal: payload.message,
        context: payload.context ? { content: payload.context } : { content: "No specific context provided" }
      }),
    });
  }

  async sendChat(payload: { message: string; context: string | null }, options?: { conversation_id?: string; agent_id?: string }): Promise<APIResponse<ChatResponse>> {
    return this.makeRequest('/api/obsidian/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: payload.message,
        vault_context: payload.context || undefined,
        conversation_id: options?.conversation_id,
        agent_id: options?.agent_id,
        mode: 'ask'
      }),
    });
  }

  // Streaming Chat functionality
  async streamChat(payload: { 
    message: string; 
    context: string | null; 
    conversation_id?: string; 
    agent_id?: string;
    development_context?: any;
  }): Promise<ReadableStream> {
    const url = `${this.baseUrl}/api/obsidian/chat/stream`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/plain',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: payload.message,
        vault_context: payload.context || undefined,
        conversation_id: payload.conversation_id,
        agent_id: payload.agent_id,
        development_context: payload.development_context,
        stream: true
      }),
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    return response.body;
  }

  // Agent management
  async getAgents(): Promise<APIResponse<Agent[]>> {
    return this.makeRequest('/api/obsidian/agents');
  }

  async createAgent(request: AgentCreateRequest): Promise<APIResponse<Agent>> {
    return this.makeRequest('/api/obsidian/agents/create', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async executeAgent(request: AgentExecuteRequest): Promise<APIResponse<any>> {
    return this.makeRequest('/api/obsidian/agent/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Vault analysis
  async analyzeVaultContext(request: VaultContextRequest): Promise<APIResponse<VaultContextResponse>> {
    return this.makeRequest('/api/obsidian/vault/context', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Task planning
  async planTasks(request: TaskPlanningRequest): Promise<APIResponse<TaskPlanningResponse>> {
    return this.makeRequest('/api/obsidian/planning/tasks', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Intelligence parsing
  async parseIntelligence(request: IntelligenceParseRequest): Promise<APIResponse<IntelligenceParseResponse>> {
    return this.makeRequest('/api/obsidian/intelligence/parse', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Intent classification
  async classifyIntent(message: string): Promise<IntentResult> {
    const response = await this.makeRequest<IntentResult>('/api/obsidian/intelligence/parse', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    // Fallback to 'ask' mode if classification fails
    return { intent: 'ask', confidence: 0.5 };
  }

  // Optional: Debug intent classification
  async explainIntent(message: string): Promise<IntentDebug> {
    const response = await this.makeRequest<IntentDebug>('/api/obsidian/intelligence/parse', {
      method: 'POST',
      body: JSON.stringify({ message, include_debug: true }),
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    // Fallback debug info
    return { 
      intent: 'ask', 
      confidence: 0.5, 
      reasoning: 'Classification failed, defaulting to ask mode' 
    };
  }

  // Memory management
  async updateMemory(request: MemoryUpdateRequest): Promise<APIResponse<void>> {
    return this.makeRequest('/api/obsidian/memory/update', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // WebSocket functionality
  connectWebSocket(callbacks: {
    onChat?: (data: any) => void;
    onWorkflowProgress?: (data: any) => void;
    onCopilot?: (data: any) => void;
    onVaultSync?: (data: any) => void;
    onIntentDebug?: (debug: IntentDebug) => void;
    onError?: (error: string) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  }): void {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws/obsidian';
    console.log(`VaultPilot: Attempting WebSocket connection to ${wsUrl}`);
    
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      console.log('VaultPilot: WebSocket connected to EvoAgentX');
      callbacks.onConnect?.();
    };

    this.websocket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('VaultPilot: WebSocket message received:', message.type);
        
        switch (message.type) {
          case 'chat':
            callbacks.onChat?.(message.data);
            break;
          case 'workflow_progress':
            callbacks.onWorkflowProgress?.(message.data);
            break;
          case 'copilot':
            callbacks.onCopilot?.(message.data);
            break;
          case 'vault_sync':
            callbacks.onVaultSync?.(message.data);
            break;
          case 'intent_debug':
            callbacks.onIntentDebug?.(message.data);
            break;
          case 'error':
            callbacks.onError?.(message.data);
            break;
        }
      } catch (error) {
        console.error('VaultPilot: Error parsing WebSocket message:', error);
        callbacks.onError?.('Failed to parse WebSocket message');
      }
    };

    this.websocket.onclose = (event) => {
      console.log('VaultPilot: WebSocket disconnected from EvoAgentX', event.code, event.reason);
      callbacks.onDisconnect?.();
    };

    this.websocket.onerror = (error) => {
      console.error('VaultPilot: WebSocket error:', error);
      callbacks.onError?.('WebSocket connection error');
    };
  }

  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }
  }

  sendWebSocketMessage(type: string, data: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({ type, data }));
    }
  }

  isWebSocketConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }
}
