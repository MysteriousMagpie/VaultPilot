/**
 * VaultPilot API Endpoint Definitions
 *
 * Standardized API endpoints that any backend can implement
 */
import { APIResponse, VaultInfo, VaultAnalysis, VaultAnalysisRequest, ChatRequest, ChatMessage, Workflow, WorkflowRequest, WorkflowTemplate, AgentStatus, AnalyticsDashboard, SummaryRequest, ConnectionStatus } from '../types';
export interface VaultPilotAPI {
    /**
     * Health check endpoint
     * GET /health
     */
    health(): Promise<APIResponse<{
        status: string;
        timestamp: string;
    }>>;
    /**
     * Get connection status
     * GET /api/status
     */
    getStatus(): Promise<APIResponse<ConnectionStatus & {
        agents: AgentStatus;
    }>>;
    /**
     * Get vault information
     * GET /api/vault/info
     */
    getVaultInfo(vaultId: string): Promise<APIResponse<VaultInfo>>;
    /**
     * Start vault analysis
     * POST /api/vault/analyze
     */
    analyzeVault(request: VaultAnalysisRequest): Promise<APIResponse<{
        analysisId: string;
    }>>;
    /**
     * Get analysis status and results
     * GET /api/vault/analysis/{analysisId}
     */
    getAnalysis(analysisId: string): Promise<APIResponse<VaultAnalysis>>;
    /**
     * Generate vault summary
     * POST /api/vault/summary
     */
    generateSummary(request: SummaryRequest): Promise<APIResponse<{
        summary: string;
        metadata: any;
    }>>;
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
    /**
     * Get available workflow templates
     * GET /api/workflows/templates
     */
    getWorkflowTemplates(): Promise<APIResponse<WorkflowTemplate[]>>;
    /**
     * Start a new workflow
     * POST /api/workflows
     */
    startWorkflow(request: WorkflowRequest): Promise<APIResponse<{
        workflowId: string;
    }>>;
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
    /**
     * Get agent status
     * GET /api/agents/status
     */
    getAgentStatus(): Promise<APIResponse<AgentStatus>>;
    /**
     * Restart agents
     * POST /api/agents/restart
     */
    restartAgents(): Promise<APIResponse<{
        message: string;
    }>>;
}
/**
 * Standard API routes configuration
 */
export declare const API_ROUTES: {
    readonly HEALTH: "/health";
    readonly STATUS: "/api/status";
    readonly VAULT_INFO: "/api/vault/info";
    readonly VAULT_ANALYZE: "/api/vault/analyze";
    readonly VAULT_ANALYSIS: "/api/vault/analysis/:analysisId";
    readonly VAULT_SUMMARY: "/api/vault/summary";
    readonly CHAT: "/api/chat";
    readonly CHAT_HISTORY: "/api/chat/history/:conversationId";
    readonly WORKFLOW_TEMPLATES: "/api/workflows/templates";
    readonly WORKFLOWS: "/api/workflows";
    readonly WORKFLOW_DETAIL: "/api/workflows/:workflowId";
    readonly ANALYTICS_DASHBOARD: "/api/analytics/dashboard";
    readonly ANALYTICS_METRICS: "/api/analytics/metrics";
    readonly AGENTS_STATUS: "/api/agents/status";
    readonly AGENTS_RESTART: "/api/agents/restart";
    readonly WEBSOCKET: "/ws";
};
/**
 * HTTP methods for each route
 */
export declare const API_METHODS: {
    readonly "/health": "GET";
    readonly "/api/status": "GET";
    readonly "/api/vault/info": "GET";
    readonly "/api/vault/analyze": "POST";
    readonly "/api/vault/analysis/:analysisId": "GET";
    readonly "/api/vault/summary": "POST";
    readonly "/api/chat": "POST";
    readonly "/api/chat/history/:conversationId": "GET";
    readonly "/api/workflows/templates": "GET";
    readonly "/api/workflows": readonly ["GET", "POST"];
    readonly "/api/workflows/:workflowId": "GET";
    readonly "/api/analytics/dashboard": "GET";
    readonly "/api/analytics/metrics": "GET";
    readonly "/api/agents/status": "GET";
    readonly "/api/agents/restart": "POST";
};
//# sourceMappingURL=endpoints.d.ts.map