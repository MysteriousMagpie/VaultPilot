// Model Selection Types for DevPipe Framework Integration

export interface ModelSelectionRequest {
  task_type: TaskType;
  quality_requirement?: QualityRequirement;
  max_cost?: number;
  context_length?: number;
  preferred_providers?: string[];
  timeout_ms?: number;
  user_preferences?: UserPreferences;
}

export interface ModelSelectionResponse {
  selected_model: ModelInfo;
  reasoning: string;
  fallback_models: ModelInfo[];
  estimated_cost: number;
  estimated_time_ms: number;
  selection_metadata: {
    selection_time_ms: number;
    factors_considered: string[];
    confidence_score: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: ModelCapability[];
  cost_per_token: number;
  max_tokens: number;
  response_time_avg_ms: number;
  availability_score: number;
  quality_score: number;
}

export interface ModelCapability {
  type: TaskType;
  score: number;
  specializations?: string[];
}

export interface ModelHealthStatus {
  model_id: string;
  status: 'healthy' | 'degraded' | 'offline';
  response_time: number;
  error_rate: number;
  last_check: string;
  availability_percentage: number;
}

export interface UserPreferences {
  priority: 'performance' | 'cost' | 'balanced';
  max_cost_per_request: number;
  preferred_providers: string[];
  fallback_enabled: boolean;
  quality_threshold: number;
  timeout_preference: number;
}

export interface ModelPerformanceMetrics {
  model_id: string;
  task_type: TaskType;
  success_rate: number;
  average_response_time: number;
  average_cost: number;
  user_satisfaction_score: number;
  last_updated: string;
}

export type TaskType = 
  | 'text-generation'
  | 'code-generation'
  | 'chat'
  | 'summarization'
  | 'translation'
  | 'embedding'
  | 'editing'
  | 'analysis'
  | 'planning'
  | 'workflow-execution';

export type QualityRequirement = 'low' | 'medium' | 'high';

export interface DevPipeMessage {
  id: string;
  timestamp: string;
  type: DevPipeMessageType;
  payload: any;
  sender: string;
  recipient: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  expires_at?: string;
}

export type DevPipeMessageType = 
  | 'model-selection-request'
  | 'model-selection-response'
  | 'health-check-request'
  | 'health-check-response'
  | 'performance-metrics-request'
  | 'performance-metrics-response'
  | 'preferences-update'
  | 'status-update'
  | 'error-report';

export class ModelSelectionError extends Error {
  public code: 'NO_HEALTHY_MODELS' | 'BUDGET_EXCEEDED' | 'TIMEOUT' | 'INVALID_REQUEST' | 'SERVICE_UNAVAILABLE';
  public details?: any;
  public suggestions?: string[];

  constructor(
    code: 'NO_HEALTHY_MODELS' | 'BUDGET_EXCEEDED' | 'TIMEOUT' | 'INVALID_REQUEST' | 'SERVICE_UNAVAILABLE',
    message: string,
    details?: any,
    suggestions?: string[]
  ) {
    super(message);
    this.name = 'ModelSelectionError';
    this.code = code;
    this.details = details;
    this.suggestions = suggestions;
  }
}

export interface ModelSelectionEvent {
  type: 'model-selected' | 'health-updated' | 'performance-metrics' | 'preferences-updated' | 'connected' | 'disconnected';
  data: any;
  timestamp: string;
}

// Configuration types
export interface ModelSelectionConfig {
  devpipe_path: string;
  server_url: string;
  monitoring_interval: number;
  fallback_enabled: boolean;
  cache_duration: number;
  retry_attempts: number;
  timeout: number;
  debug_mode: boolean;
}

export interface ModelProviderConfig {
  name: string;
  enabled: boolean;
  api_key?: string;
  base_url?: string;
  max_tokens?: number;
  default_temperature?: number;
  custom_settings?: Record<string, any>;
}
