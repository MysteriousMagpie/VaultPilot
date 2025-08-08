"use strict";
/**
 * VaultPilot API Endpoint Definitions
 *
 * Standardized API endpoints that any backend can implement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_METHODS = exports.API_ROUTES = void 0;
/**
 * Standard API routes configuration
 */
exports.API_ROUTES = {
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
};
/**
 * HTTP methods for each route
 */
exports.API_METHODS = {
    [exports.API_ROUTES.HEALTH]: 'GET',
    [exports.API_ROUTES.STATUS]: 'GET',
    [exports.API_ROUTES.VAULT_INFO]: 'GET',
    [exports.API_ROUTES.VAULT_ANALYZE]: 'POST',
    [exports.API_ROUTES.VAULT_ANALYSIS]: 'GET',
    [exports.API_ROUTES.VAULT_SUMMARY]: 'POST',
    [exports.API_ROUTES.CHAT]: 'POST',
    [exports.API_ROUTES.CHAT_HISTORY]: 'GET',
    [exports.API_ROUTES.WORKFLOW_TEMPLATES]: 'GET',
    [exports.API_ROUTES.WORKFLOWS]: ['GET', 'POST'],
    [exports.API_ROUTES.WORKFLOW_DETAIL]: 'GET',
    [exports.API_ROUTES.ANALYTICS_DASHBOARD]: 'GET',
    [exports.API_ROUTES.ANALYTICS_METRICS]: 'GET',
    [exports.API_ROUTES.AGENTS_STATUS]: 'GET',
    [exports.API_ROUTES.AGENTS_RESTART]: 'POST'
};
//# sourceMappingURL=endpoints.js.map