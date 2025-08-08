// VaultPilot Frontend Components - Main Export File
// Import this file to get all components and types
// Core Components
export { EnhancedDashboard, VIEW_TYPE_ENHANCED_DASHBOARD } from './EnhancedDashboard';
export { AdvancedChatModal } from './AdvancedChatModal';
export { AgentMarketplaceModal } from './AgentMarketplaceModal';
// Utility functions (if any are added in the future)
export const COMPONENT_VERSION = '1.0.0';
export const SUPPORTED_OBSIDIAN_VERSION = '^1.0.0';
// Component registry for dynamic loading
export const COMPONENT_REGISTRY = {
    'enhanced-dashboard': EnhancedDashboard,
    'advanced-chat-modal': AdvancedChatModal,
    'agent-marketplace-modal': AgentMarketplaceModal
};
// Default configuration
export const DEFAULT_CONFIG = {
    theme: 'auto',
    animations: true,
    realTimeUpdates: true,
    accessibility: true,
    performance: {
        lazyLoading: true,
        virtualScrolling: true,
        caching: true
    }
};
// Helper functions for component management
export function isComponentSupported(componentName) {
    return componentName in COMPONENT_REGISTRY;
}
export function getComponentList() {
    return Object.keys(COMPONENT_REGISTRY);
}
export function getComponentVersion() {
    return COMPONENT_VERSION;
}
