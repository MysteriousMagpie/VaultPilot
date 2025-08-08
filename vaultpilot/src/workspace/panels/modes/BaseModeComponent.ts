/**
 * VaultPilot Base Mode Component
 * 
 * Abstract base class for all mode components providing common functionality
 * for performance monitoring, error handling, and lifecycle management.
 */

import { Component } from 'obsidian';
import type { 
  ModeComponent, 
  ModeContext, 
  ModeAction, 
  WorkspaceMode,
  ContextSource,
  ModePerformanceMetrics
} from '../types';

export abstract class BaseModeComponent extends Component implements ModeComponent {
  protected context!: ModeContext;
  protected container!: HTMLElement;
  protected mode: WorkspaceMode;
  
  // Performance tracking
  protected metrics: ModePerformanceMetrics = {
    switchTime: 0,
    renderTime: 0,
    lastSwitchTimestamp: 0,
    errorCount: 0
  };
  
  // State management
  protected isInitialized = false;
  protected isRendering = false;
  protected lastError?: Error;

  constructor(mode: WorkspaceMode) {
    super();
    this.mode = mode;
  }

  async render(container: HTMLElement, context: ModeContext): Promise<void> {
    const startTime = performance.now();
    this.isRendering = true;
    
    try {
      this.container = container;
      this.context = context;
      
      // Initialize if first time
      if (!this.isInitialized) {
        await this.initialize();
        this.isInitialized = true;
      }
      
      // Clear container
      container.empty();
      container.addClass(`vp-mode-${this.mode}`);
      container.setAttribute('data-mode', this.mode);
      
      // Render mode-specific content
      await this.renderContent();
      
      // Update metrics
      this.metrics.renderTime = performance.now() - startTime;
      this.metrics.lastSwitchTimestamp = Date.now();
      
    } catch (error) {
      this.metrics.errorCount++;
      this.lastError = error as Error;
      await this.renderError(error as Error);
      throw error;
    } finally {
      this.isRendering = false;
    }
  }

  updateContext(sources: ContextSource[]): void {
    if (!this.isInitialized) return;
    
    try {
      this.context.contextSources = sources;
      this.onContextUpdate(sources);
    } catch (error) {
      console.error(`Error updating context for ${this.mode} mode:`, error);
      this.metrics.errorCount++;
    }
  }

  cleanup(): void {
    try {
      this.onCleanup();
      this.container?.empty();
      this.isInitialized = false;
    } catch (error) {
      console.error(`Error cleaning up ${this.mode} mode:`, error);
    }
  }

  getActions(): ModeAction[] {
    try {
      return this.getModeActions();
    } catch (error) {
      console.error(`Error getting actions for ${this.mode} mode:`, error);
      return [];
    }
  }

  // Performance and monitoring
  getMetrics(): ModePerformanceMetrics {
    return { ...this.metrics };
  }

  clearMetrics(): void {
    this.metrics = {
      switchTime: 0,
      renderTime: 0,
      lastSwitchTimestamp: 0,
      errorCount: 0
    };
  }

  getLastError(): Error | undefined {
    return this.lastError;
  }

  isReady(): boolean {
    return this.isInitialized && !this.isRendering;
  }

  // Abstract methods for subclasses to implement
  protected abstract initialize(): Promise<void>;
  protected abstract renderContent(): Promise<void>;
  protected abstract getModeActions(): ModeAction[];
  protected abstract onContextUpdate(sources: ContextSource[]): void;
  protected abstract onCleanup(): void;

  // Optional hooks for subclasses
  protected async renderError(error: Error): Promise<void> {
    const errorEl = this.container.createEl('div', {
      cls: 'vp-mode-error',
      attr: { role: 'alert' }
    });
    
    errorEl.createEl('h3', { text: `${this.mode} Mode Error` });
    errorEl.createEl('p', { text: error.message });
    
    const retryBtn = errorEl.createEl('button', {
      text: 'Retry',
      cls: 'mod-cta'
    });
    
    retryBtn.addEventListener('click', async () => {
      try {
        await this.render(this.container, this.context);
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    });
  }

  // Utility methods for subclasses
  protected createSection(title: string, className?: string): HTMLElement {
    const section = this.container.createEl('section', {
      cls: className ? `vp-mode-section ${className}` : 'vp-mode-section'
    });
    
    if (title) {
      section.createEl('h2', { text: title, cls: 'vp-section-title' });
    }
    
    return section;
  }

  protected createActionButton(
    container: HTMLElement,
    action: ModeAction
  ): HTMLElement {
    const button = container.createEl('button', {
      text: action.label,
      cls: 'vp-action-button',
      attr: {
        'data-action': action.id,
        'title': action.shortcut ? `${action.label} (${action.shortcut})` : action.label
      }
    });
    
    if (action.icon) {
      button.addClass(`vp-icon-${action.icon}`);
    }
    
    button.disabled = !action.enabled;
    button.addEventListener('click', action.callback);
    
    return button;
  }

  protected showLoading(message = 'Loading...'): HTMLElement {
    const loadingEl = this.container.createEl('div', {
      cls: 'vp-mode-loading',
      attr: { 'aria-live': 'polite' }
    });
    
    loadingEl.createEl('div', { cls: 'vp-loading-spinner' });
    loadingEl.createEl('p', { text: message });
    
    return loadingEl;
  }

  protected hideLoading(): void {
    const loadingEl = this.container.querySelector('.vp-mode-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
  }
}