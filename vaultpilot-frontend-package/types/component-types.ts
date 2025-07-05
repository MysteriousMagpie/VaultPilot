// TypeScript definitions for VaultPilot Frontend Components
// Add these types to your project or extend existing type definitions

import { Modal, ItemView, WorkspaceLeaf, App, Plugin } from 'obsidian';

// Extended Agent interface for UI features
export interface ExtendedAgent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  active: boolean;
  category?: string;
  evolutionLevel?: number;
  performance?: number;
  status?: 'active' | 'learning' | 'idle';
}

// Marketplace types
export interface MarketplaceCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
  description?: string;
}

export interface MarketplaceAgent extends ExtendedAgent {
  author: string;
  version: string;
  downloads: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  screenshots: string[];
  documentation: string;
  price: number;
  featured: boolean;
  lastUpdated: string;
  requirements?: string[];
  permissions?: string[];
}

export interface MarketplaceResponse {
  agents: MarketplaceAgent[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

export interface SearchParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: 'popular' | 'recent' | 'rating' | 'name';
  priceRange?: [number, number];
  tags?: string[];
}

export interface InstallationOptions {
  autoStart: boolean;
  customConfig: Record<string, any>;
  permissions: string[];
  workspace?: string;
}

// Dashboard types
export interface AgentStatus {
  id: string;
  name: string;
  evolutionLevel: number;
  performance: number;
  status: 'active' | 'learning' | 'idle';
  lastUsed: string;
}

export interface PerformanceMetric {
  label: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

export interface Activity {
  type: 'chat' | 'workflow' | 'analysis' | 'evolution';
  description: string;
  timestamp: string;
  agentId?: string;
}

export interface ActivityItem {
  id: string;
  type: 'agent_action' | 'workflow_complete' | 'file_analysis' | 'marketplace_install';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  metadata?: Record<string, any>;
}

// Chat types
export interface ConversationBranch {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  agentId: string;
}

export interface MultiModalAsset {
  type: 'text' | 'image' | 'audio' | 'file';
  content: string | File;
  metadata?: any;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: string;
  agentId?: string;
  assets?: MultiModalAsset[];
}

// Analytics types
export interface AnalyticsData {
  usage: {
    totalSessions: number;
    avgSessionDuration: number;
    totalMessages: number;
    totalAgentInteractions: number;
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
    errorRate: number;
    uptime: number;
  };
  trends: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
    }[];
  };
}

export interface PerformanceData {
  agentId: string;
  metrics: {
    tasksCompleted: number;
    avgExecutionTime: number;
    successRate: number;
    evolutionLevel: number;
    lastActive: string;
  };
  trends: {
    performance: number[];
    usage: number[];
    evolution: number[];
  };
}

// Real-time update types
export interface RealtimeUpdate {
  type: 'agent_status' | 'workflow_progress' | 'marketplace_update' | 'analytics_update';
  data: any;
  timestamp: string;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Plugin settings types
export interface VaultPilotAdvancedSettings {
  backendUrl: string;
  apiKey: string;
  
  // Advanced UI settings
  advancedFeatures: {
    enableEnhancedDashboard: boolean;
    enableMarketplace: boolean;
    enableAnalytics: boolean;
    enableRealtimeUpdates: boolean;
    dashboardRefreshInterval: number;
  };
  
  // Marketplace settings
  marketplace: {
    autoInstallDependencies: boolean;
    allowBetaAgents: boolean;
    maxConcurrentDownloads: number;
    trustedAuthors: string[];
  };
  
  // Analytics settings
  analytics: {
    enableUsageTracking: boolean;
    retentionDays: number;
    shareAnonymousData: boolean;
  };
}

// Component interfaces
export interface VaultPilotComponent {
  render(container: HTMLElement): Promise<void>;
  cleanup(): void;
  refresh?(): Promise<void>;
}

export interface ModalComponent extends Modal {
  app: App;
  plugin: Plugin;
}

export interface ViewComponent extends ItemView {
  plugin: Plugin;
}

// Event types
export interface ComponentEvent {
  type: string;
  data: any;
  timestamp: Date;
}

// UI State types
export interface UIState {
  level: 'basic' | 'intermediate' | 'advanced';
  features: {
    chat: boolean;
    agents: boolean;
    workflows: boolean;
    marketplace: boolean;
    analytics: boolean;
  };
}

export interface ContextState {
  currentFile: any; // TFile
  selectedText: string;
  recentActivity: Activity[];
  activeAgents: ExtendedAgent[];
  availableWorkflows: any[];
}

// Error handling types
export interface ComponentError {
  component: string;
  error: Error;
  timestamp: Date;
  context?: any;
}

// Performance monitoring types
export interface PerformanceMetrics {
  componentLoadTime: number;
  renderTime: number;
  memoryUsage: number;
  apiCallLatency: number;
}

// Theme and styling types
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  accentColor: string;
  borderRadius: number;
  fontFamily: string;
  customCSS?: string;
}

// Export commonly used types as a convenience
export type {
  MarketplaceAgent as Agent,
  ExtendedAgent as UIAgent,
  AnalyticsData as Analytics,
  VaultPilotAdvancedSettings as Settings,
  APIResponse as Response
};
