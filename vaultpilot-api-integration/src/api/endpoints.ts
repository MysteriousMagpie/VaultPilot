/**
 * VaultPilot API Endpoint Definitions
 * 
 * Standardized API endpoints that any backend can implement
 */

import {
  APIResponse,
  VaultInfo,
  VaultAnalysis,
  VaultAnalysisRequest,
  ChatRequest,
  ChatMessage,
  Workflow,
  WorkflowRequest,
  WorkflowTemplate,
  AgentStatus,
  AnalyticsDashboard,
  SummaryRequest,
  ConnectionStatus
} from '../types';

export interface VaultPilotAPI {
  // === System Endpoints ===
  
  /**
   * Health check endpoint
   * GET /health
   */
  health(): Promise<APIResponse<{ status: string; timestamp: string }>>;
  
  /**
   * Get connection status
   * GET /api/status
   */
  getStatus(): Promise<APIResponse<ConnectionStatus & { agents: AgentStatus }>>;

  // === Vault Endpoints ===
  
  /**
   * Get vault information
   * GET /api/vault/info
   */
  getVaultInfo(vaultId: string): Promise<APIResponse<VaultInfo>>;
  
  /**
   * Start vault analysis
   * POST /api/vault/analyze
   */
  analyzeVault(request: VaultAnalysisRequest): Promise<APIResponse<{ analysisId: string }>>;
  
  /**
   * Get analysis status and results
   * GET /api/vault/analysis/{analysisId}
   */
  getAnalysis(analysisId: string): Promise<APIResponse<VaultAnalysis>>;
  
  /**
   * Generate vault summary
   * POST /api/vault/summary
   */
  generateSummary(request: SummaryRequest): Promise<APIResponse<{ summary: string; metadata: any }>>;

  // === Chat Endpoints ===
  
  /**
   * Send chat message
   * POST /api/chat
   */
  sendChatMessage(request: ChatRequest): Promise<APIResponse<ChatMessage>>;
  
  /**
   * Get chat history
   * GET /api/chat/history
   */
  getChatHistory(conversationId: string): Promise<APIResponse<ChatMessage[]>>;

  // === Workflow Endpoints ===
  
  /**
   * Get available workflow templates
   * GET /api/workflows/templates
   */
  getWorkflowTemplates(): Promise<APIResponse<WorkflowTemplate[]>>;
  
  /**
   * Start a new workflow
   * POST /api/workflows
   */
  startWorkflow(request: WorkflowRequest): Promise<APIResponse<{ workflowId: string }>>;
  
  /**
   * Get workflow status
   * GET /api/workflows/{workflowId}
   */
  getWorkflow(workflowId: string): Promise<APIResponse<Workflow>>;
  
  /**
   * List all workflows for a vault
   * GET /api/workflows
   */
  listWorkflows(vaultId: string): Promise<APIResponse<Workflow[]>>;

  // === Analytics Endpoints ===
  
  /**
   * Get analytics dashboard data
   * GET /api/analytics/dashboard
   */
  getAnalyticsDashboard(vaultId: string): Promise<APIResponse<AnalyticsDashboard>>;
  
  /**
   * Get specific metrics
   * GET /api/analytics/metrics
   */
  getMetrics(vaultId: string, metricTypes: string[]): Promise<APIResponse<any>>;

  // === Agent Endpoints ===
  
  /**
   * Get agent status
   * GET /api/agents/status
   */
  getAgentStatus(): Promise<APIResponse<AgentStatus>>;
  
  /**
   * Restart agents
   * POST /api/agents/restart
   */
  restartAgents(): Promise<APIResponse<{ message: string }>>;
}

/**
 * Standard API routes configuration
 */
export const API_ROUTES = {
  // System
  HEALTH: '/health',
  STATUS: '/api/status',
  
  // Vault
  VAULT_INFO: '/api/vault/info',
  VAULT_ANALYZE: '/api/vault/analyze',
  VAULT_ANALYSIS: '/api/vault/analysis/:analysisId',
  VAULT_SUMMARY: '/api/vault/summary',
  
  // Chat
  CHAT: '/api/chat',
  CHAT_HISTORY: '/api/chat/history/:conversationId',
  
  // Workflows
  WORKFLOW_TEMPLATES: '/api/workflows/templates',
  WORKFLOWS: '/api/workflows',
  WORKFLOW_DETAIL: '/api/workflows/:workflowId',
  
  // Analytics
  ANALYTICS_DASHBOARD: '/api/analytics/dashboard',
  ANALYTICS_METRICS: '/api/analytics/metrics',
  
  // Agents
  AGENTS_STATUS: '/api/agents/status',
  AGENTS_RESTART: '/api/agents/restart',
  
  // WebSocket
  WEBSOCKET: '/ws'
} as const;

/**
 * HTTP methods for each route
 */
export const API_METHODS = {
  [API_ROUTES.HEALTH]: 'GET',
  [API_ROUTES.STATUS]: 'GET',
  [API_ROUTES.VAULT_INFO]: 'GET',
  [API_ROUTES.VAULT_ANALYZE]: 'POST',
  [API_ROUTES.VAULT_ANALYSIS]: 'GET',
  [API_ROUTES.VAULT_SUMMARY]: 'POST',
  [API_ROUTES.CHAT]: 'POST',
  [API_ROUTES.CHAT_HISTORY]: 'GET',
  [API_ROUTES.WORKFLOW_TEMPLATES]: 'GET',
  [API_ROUTES.WORKFLOWS]: ['GET', 'POST'],
  [API_ROUTES.WORKFLOW_DETAIL]: 'GET',
  [API_ROUTES.ANALYTICS_DASHBOARD]: 'GET',
  [API_ROUTES.ANALYTICS_METRICS]: 'GET',
  [API_ROUTES.AGENTS_STATUS]: 'GET',
  [API_ROUTES.AGENTS_RESTART]: 'POST'
} as const;
