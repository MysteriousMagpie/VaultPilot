// VaultPilot Frontend Components - Main Export File
// Import this file to get all components and types

// Core Components
export { EnhancedDashboard, VIEW_TYPE_ENHANCED_DASHBOARD } from './EnhancedDashboard';
export { AdvancedChatModal } from './AdvancedChatModal';
export { AgentMarketplaceModal } from './AgentMarketplaceModal';

// Component Types
export type {
  ExtendedAgent,
  MarketplaceAgent,
  MarketplaceCategory,
  MarketplaceResponse,
  SearchParams,
  InstallationOptions,
  AgentStatus,
  PerformanceMetric,
  Activity,
  ActivityItem,
  ConversationBranch,
  MultiModalAsset,
  ChatMessage,
  AnalyticsData,
  PerformanceData,
  RealtimeUpdate,
  APIResponse,
  VaultPilotAdvancedSettings,
  VaultPilotComponent,
  ModalComponent,
  ViewComponent,
  ComponentEvent,
  UIState,
  ContextState,
  ComponentError,
  PerformanceMetrics,
  ThemeConfig
} from '../types/component-types';

// Utility functions (if any are added in the future)
export const COMPONENT_VERSION = '1.0.0';
export const SUPPORTED_OBSIDIAN_VERSION = '^1.0.0';

// Component registry for dynamic loading
export const COMPONENT_REGISTRY = {
  'enhanced-dashboard': EnhancedDashboard,
  'advanced-chat-modal': AdvancedChatModal,
  'agent-marketplace-modal': AgentMarketplaceModal
} as const;

// Default configuration
export const DEFAULT_CONFIG = {
  theme: 'auto' as const,
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
export function isComponentSupported(componentName: string): boolean {
  return componentName in COMPONENT_REGISTRY;
}

export function getComponentList(): string[] {
  return Object.keys(COMPONENT_REGISTRY);
}

export function getComponentVersion(): string {
  return COMPONENT_VERSION;
}
