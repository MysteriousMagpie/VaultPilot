export { EnhancedDashboard, VIEW_TYPE_ENHANCED_DASHBOARD } from './EnhancedDashboard';
export { AdvancedChatModal } from './AdvancedChatModal';
export { AgentMarketplaceModal } from './AgentMarketplaceModal';
export type { ExtendedAgent, MarketplaceAgent, MarketplaceCategory, MarketplaceResponse, SearchParams, InstallationOptions, AgentStatus, PerformanceMetric, Activity, ActivityItem, ConversationBranch, MultiModalAsset, ChatMessage, AnalyticsData, PerformanceData, RealtimeUpdate, APIResponse, VaultPilotAdvancedSettings, VaultPilotComponent, ModalComponent, ViewComponent, ComponentEvent, UIState, ContextState, ComponentError, PerformanceMetrics, ThemeConfig } from '../types/component-types';
export declare const COMPONENT_VERSION = "1.0.0";
export declare const SUPPORTED_OBSIDIAN_VERSION = "^1.0.0";
export declare const COMPONENT_REGISTRY: {
    readonly 'enhanced-dashboard': any;
    readonly 'advanced-chat-modal': any;
    readonly 'agent-marketplace-modal': any;
};
export declare const DEFAULT_CONFIG: {
    theme: "auto";
    animations: boolean;
    realTimeUpdates: boolean;
    accessibility: boolean;
    performance: {
        lazyLoading: boolean;
        virtualScrolling: boolean;
        caching: boolean;
    };
};
export declare function isComponentSupported(componentName: string): boolean;
export declare function getComponentList(): string[];
export declare function getComponentVersion(): string;
