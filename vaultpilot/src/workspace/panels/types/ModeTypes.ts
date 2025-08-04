/**
 * VaultPilot Mode System Types
 * 
 * Core interfaces and types for the workspace mode system.
 * Extracted from MainPanel.ts for better maintainability.
 */

import type VaultPilotPlugin from '../../../main';
import type { WorkspaceManager, WorkspaceMode } from '../../WorkspaceManager';
import type { ContextSource } from '../ContextPanel';
import type { TFile } from 'obsidian';

export interface ModeConfig {
  id: WorkspaceMode;
  name: string;
  description: string;
  icon: string;
  component: ModeComponent;
}

export interface ModeComponent {
  render(container: HTMLElement, context: ModeContext): Promise<void>;
  updateContext(sources: ContextSource[]): void;
  cleanup(): void;
  getActions(): ModeAction[];
}

export interface ModeContext {
  plugin: VaultPilotPlugin;
  workspace: WorkspaceManager;
  contextSources: ContextSource[];
  activeFile?: TFile;
  userPreferences: any;
}

export interface ModeAction {
  id: string;
  label: string;
  icon: string;
  callback: () => void;
  shortcut?: string;
  enabled: boolean;
}

export interface ModePerformanceMetrics {
  switchTime: number;
  renderTime: number;
  lastSwitchTimestamp: number;
  errorCount: number;
}

export interface ModeCacheEntry {
  element: HTMLElement;
  lastUpdate: number;
  context: ModeContext;
}

export type ModeEventType = 
  | 'mode-switch-start'
  | 'mode-switch-complete'
  | 'mode-render-start'
  | 'mode-render-complete'
  | 'mode-error'
  | 'context-update';

export interface ModeEvent {
  type: ModeEventType;
  mode: WorkspaceMode;
  timestamp: number;
  data?: any;
  error?: Error;
}

// Base interface for mode-specific components
export interface BaseModeComponent {
  readonly mode: WorkspaceMode;
  readonly container: HTMLElement;
  readonly context: ModeContext;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  render(): Promise<void>;
  destroy(): void;
  
  // State management
  updateContext(sources: ContextSource[]): void;
  getState(): any;
  setState(state: any): void;
  
  // Actions and interactions
  getActions(): ModeAction[];
  handleAction(actionId: string): void;
  
  // Performance and monitoring
  getMetrics(): ModePerformanceMetrics;
  clearMetrics(): void;
}