/**
 * Core VaultPilot API Type Definitions
 * 
 * These types define the standard data structures used across all VaultPilot API implementations.
 */

// === Base Types ===

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// === Vault Types ===

export interface VaultInfo {
  id: string;
  name: string;
  path: string;
  totalFiles: number;
  markdownFiles: number;
  folders: number;
  lastModified: string;
  size: number;
}

export interface VaultFile {
  id: string;
  path: string;
  name: string;
  type: 'markdown' | 'image' | 'pdf' | 'other';
  size: number;
  created: string;
  modified: string;
  tags?: string[];
  links?: string[];
}

export interface VaultAnalysis {
  id: string;
  vaultId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  results?: {
    fileCount: number;
    wordCount: number;
    linkCount: number;
    tagCount: number;
    themes: string[];
    suggestions: string[];
    healthScore: number;
  };
}

// === Chat Types ===

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    vaultContext?: string[];
    relatedFiles?: string[];
    confidence?: number;
  };
}

export interface ChatConversation {
  id: string;
  vaultId: string;
  title: string;
  messages: ChatMessage[];
  created: string;
  updated: string;
  status: 'active' | 'archived';
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  vaultId: string;
  context?: {
    currentFile?: string;
    selectedText?: string;
    recentFiles?: string[];
  };
}

// === Workflow Types ===

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'analysis' | 'summary' | 'custom';
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: WorkflowStep[];
  created: string;
  updated: string;
  vaultId: string;
  config?: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  steps: Omit<WorkflowStep, 'id' | 'status' | 'progress'>[];
  defaultConfig?: Record<string, any>;
}

// === Agent Types ===

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  capabilities: string[];
  lastActivity?: string;
  config?: Record<string, any>;
}

export interface AgentStatus {
  totalAgents: number;
  activeAgents: number;
  agents: Agent[];
}

// === Analytics Types ===

export interface AnalyticsMetric {
  name: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

export interface AnalyticsDashboard {
  vaultId: string;
  updated: string;
  metrics: {
    usage: AnalyticsMetric[];
    performance: AnalyticsMetric[];
    content: AnalyticsMetric[];
  };
  charts: {
    activityOverTime: Array<{ date: string; value: number }>;
    contentDistribution: Array<{ category: string; count: number }>;
    topFiles: Array<{ file: string; views: number }>;
  };
}

// === Real-time Types ===

export interface WebSocketMessage {
  type: 'connection' | 'workflow_update' | 'chat_response' | 'analysis_progress' | 'error';
  data: any;
  timestamp: string;
}

export interface ConnectionStatus {
  backend: 'connected' | 'disconnected' | 'error';
  websocket: 'connected' | 'disconnected' | 'error';
  lastPing?: string;
}

// === Request/Response Types ===

export interface VaultAnalysisRequest {
  vaultId: string;
  options?: {
    deepAnalysis?: boolean;
    includeContent?: boolean;
    analysisType?: 'quick' | 'full' | 'custom';
  };
}

export interface WorkflowRequest {
  templateId?: string;
  name: string;
  type: string;
  vaultId: string;
  config?: Record<string, any>;
}

export interface SummaryRequest {
  vaultId: string;
  options?: {
    fileTypes?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
    maxLength?: number;
    includeMetadata?: boolean;
  };
}

// === Error Types ===

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}
