// EvoAgentX API Type Definitions

// Import vault management types
import { VaultManagementSettings } from './vault-types';

// Import model selection types
export * from './types/ModelSelection';

// Import model selection types
export * from './types/ModelSelection';

// Intent classification types
export type Intent = "ask" | "agent";

export interface IntentResult {
  intent: Intent;
  confidence: number;
}

export interface IntentDebug {
  intent: Intent;
  confidence: number;
  matched_example?: string;
  reasoning?: string;
  features?: Record<string, number>;
}

// Base response structure
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Chat related types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  vault_context?: string;
  agent_id?: string;
  mode?: 'ask' | 'agent'; // Default: "ask"
}

export interface ChatResponse {
  response: string;
  conversation_id: string;
  agent_used: string;
}

// Streaming Chat Types
export interface ChatStreamRequest {
  message: string;
  conversation_id?: string;
  vault_context?: string;
  agent_id?: string;
  stream?: boolean;
  stream_options?: Record<string, any>;
}

export interface ChatStreamChunk {
  id: string;
  conversation_id?: string;
  content: string;
  is_complete: boolean;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface StreamMessage {
  type: 'start' | 'chunk' | 'complete' | 'error';
  stream_id?: string;
  conversation_id?: string;
  content?: string;
  is_complete?: boolean;
  metadata?: Record<string, any>;
  error?: string;
  timestamp: string;
}

export interface ConversationHistory {
  conversation_id: string;
  messages: ChatMessage[];
  total_count: number;
}

export interface ConversationHistoryRequest {
  conversation_id: string;  // Required field according to backend API
  limit?: number;
  include_messages?: boolean;
}

// Copilot types
export interface CopilotRequest {
  text: string;
  cursor_position: number;
  file_type?: string;
  context?: string;
}

export interface CopilotResponse {
  completion: string;
  confidence: number;
  suggestions: string[];
}

// Workflow types
export interface WorkflowRequest {
  goal: string;
  context?: string;
  vault_content?: string;
  constraints?: string[];
}

export interface WorkflowResponse {
  result: string;
  steps_taken: string[];
  artifacts: WorkflowArtifact[];
  execution_time: number;
}

export interface WorkflowArtifact {
  type: 'note' | 'plan' | 'analysis';
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  active: boolean;
}

export interface AgentCreateRequest {
  name: string;
  description: string;
  system_prompt: string;
  capabilities?: string[];
}

export interface AgentExecuteRequest {
  agent_id: string;
  task: string;
  context?: string;
}

// Vault analysis types
export interface VaultContextRequest {
  content: string;
  analysis_type?: 'summary' | 'connections' | 'insights' | 'gaps';
}

export interface VaultContextResponse {
  analysis: string;
  insights: string[];
  connections: Connection[];
  recommendations: string[];
}

export interface Connection {
  from: string;
  to: string;
  type: string;
  strength: number;
}

// Task planning types
export interface TaskPlanningRequest {
  goal: string;
  timeframe?: string;
  context?: string;
  constraints?: string[];
}

export interface TaskPlanningResponse {
  plan: TaskPlan;
  timeline: string;
  milestones: Milestone[];
}

export interface TaskPlan {
  title: string;
  description: string;
  tasks: Task[];
  estimated_duration: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimated_time: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

export interface Milestone {
  title: string;
  description: string;
  target_date: string;
  tasks: string[];
}

// Intelligence parsing types
export interface IntelligenceParseRequest {
  text: string;
  parse_type?: 'intent' | 'entities' | 'context' | 'all';
}

export interface IntelligenceParseResponse {
  intent: string;
  entities: Entity[];
  context: ContextInfo;
  confidence: number;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  start: number;
  end: number;
}

export interface ContextInfo {
  domain: string;
  sentiment: string;
  topics: string[];
  keywords: string[];
}

// Memory types
export interface MemoryUpdateRequest {
  user_id?: string;
  information: string;
  context?: string;
  importance?: number;
}

// WebSocket types
export interface WebSocketMessage {
  type: 'chat' | 'workflow_progress' | 'copilot' | 'vault_sync' | 'intent_debug' | 'error';
  data: any;
  timestamp: string;
}

export interface WorkflowProgress {
  step: string;
  progress: number;
  status: 'running' | 'completed' | 'error';
  details?: string;
}

// Settings types
export interface VaultPilotSettings {
  backendUrl: string;
  apiKey?: string;
  enableWebSocket: boolean;
  enableCopilot: boolean;
  enableAutoComplete: boolean;
  defaultAgent?: string;
  defaultMode: 'ask' | 'agent';
  chatHistoryLimit: number;
  debugMode: boolean;
  showIntentDebug: boolean;
  vaultManagement?: VaultManagementSettings;
  modelSelection?: ModelSelectionSettings;
  
  // Phase 3 Settings
  onboardingComplete?: boolean;
  performanceMode?: 'performance' | 'balanced' | 'reliability';
  enableRealTimeUpdates?: boolean;
  enableAnalytics?: boolean;
  webSocketUrl?: string;
  transportConfig?: any;
  advancedConfiguration?: any;
  configurationProfiles?: any[];
}

export interface ModelSelectionSettings {
  enabled: boolean;
  devpipePath: string;
  monitoringInterval: number;
  fallbackEnabled: boolean;
  cacheDuration: number;
  retryAttempts: number;
  timeout: number;
  debugMode: boolean;
  userPreferences: {
    priority: 'performance' | 'cost' | 'balanced';
    maxCostPerRequest: number;
    preferredProviders: string[];
    qualityThreshold: number;
  };
}

// Planner types for "Plan My Day" feature
export interface PlannerResponse {
  scheduleMarkdown: string;
  headline: string;
}

export interface PlannerRequest {
  note: string;
}

// Error types
export interface ErrorResponse {
  error: string;
  code?: number;
  details?: string;
  timestamp: string;
}
