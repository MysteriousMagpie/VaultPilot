/**
 * VaultPilot Main Panel Types
 * 
 * Types specific to the MainPanel component for performance optimization,
 * caching, and error handling.
 */

import type { WorkspaceMode } from '../../WorkspaceManager';
import type { ModeComponent, ModeContext } from './ModeTypes';

export interface MainPanelState {
  currentMode: WorkspaceMode;
  isLoading: boolean;
  hasErrors: boolean;
  lastError?: Error;
  contextSources: any[];
}

export interface PanelPerformanceMetrics {
  modeSwitchTimes: Map<WorkspaceMode, number>;
  averageSwitchTime: number;
  totalSwitches: number;
  errorCount: number;
  cacheHitRate: number;
  memoryUsage: number;
}

export interface ModeSwitchOptions {
  skipCache?: boolean;
  force?: boolean;
  silent?: boolean;
  preserveScroll?: boolean;
}

export interface PanelCacheEntry {
  element: HTMLElement;
  component: ModeComponent;
  context: ModeContext;
  lastAccess: number;
  size: number;
}

export interface PanelErrorRecovery {
  maxAttempts: number;
  currentAttempts: number;
  lastAttempt: number;
  strategy: 'retry' | 'fallback' | 'graceful';
}

export interface PanelConfiguration {
  enableCache: boolean;
  cacheTimeout: number;
  maxCacheSize: number;
  enableMetrics: boolean;
  errorRecovery: PanelErrorRecovery;
  performance: {
    debounceTime: number;
    maxRenderTime: number;
    enableProfiling: boolean;
  };
}

export interface PanelEventData {
  mode: WorkspaceMode;
  timestamp: number;
  duration?: number;
  success: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}

export type PanelEventType = 
  | 'panel-initialized'
  | 'mode-switch-requested'
  | 'mode-switch-started'
  | 'mode-switch-completed'
  | 'mode-switch-failed'
  | 'cache-hit'
  | 'cache-miss'
  | 'error-recovered'
  | 'performance-warning';

export interface PanelEvent {
  type: PanelEventType;
  data: PanelEventData;
}

// UI-specific types
export interface PanelUIElements {
  header?: HTMLElement;
  content?: HTMLElement;
  actions?: HTMLElement;
  statusBar?: HTMLElement;
}

export interface PanelUIState {
  headerVisible: boolean;
  actionsVisible: boolean;
  statusBarVisible: boolean;
  loading: boolean;
  error: boolean;
}

export interface HeaderActionConfig {
  id: string;
  icon: string;
  label: string;
  tooltip: string;
  enabled: boolean;
  visible: boolean;
  callback: () => void;
  shortcut?: string;
}

export interface StatusIndicator {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  icon?: string;
  timeout?: number;
  persistent?: boolean;
}