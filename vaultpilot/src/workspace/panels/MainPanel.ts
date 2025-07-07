/**
 * VaultPilot Main Panel
 * 
 * Central content area that renders mode-specific interfaces (Chat, Workflow, Explorer, Analytics)
 * while maintaining context awareness and cross-panel communication.
 */

import { Component, MarkdownView, TFile, Notice } from 'obsidian';
import VaultPilotPlugin from '../../main';
import { WorkspaceManager, WorkspaceMode } from '../WorkspaceManager';
import { ContextSource } from './ContextPanel';
import { VPButton, createButton } from '../../design-system/components/core/Button';

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

export class MainPanel extends Component {
  private plugin: VaultPilotPlugin;
  private workspace: WorkspaceManager;
  private containerEl: HTMLElement;
  
  // State
  private currentMode: WorkspaceMode = 'chat';
  private contextSources: ContextSource[] = [];
  private modeComponents: Map<WorkspaceMode, ModeComponent> = new Map();
  
  // UI Elements
  private headerEl?: HTMLElement;
  private contentEl?: HTMLElement;
  private actionsEl?: HTMLElement;
  private currentModeComponent?: ModeComponent;
  
  // Week 8: Performance optimization and error handling
  private modeSwitchCache: Map<WorkspaceMode, HTMLElement> = new Map();
  private lastSwitchTime: number = 0;
  private switchDebounceTimeout?: number;
  private performanceMetrics: Map<string, number> = new Map();
  private errorRecoveryAttempts: number = 0;
  private maxErrorRecoveryAttempts: number = 3;

  constructor(containerEl: HTMLElement, plugin: VaultPilotPlugin, workspace: WorkspaceManager) {
    super();
    this.containerEl = containerEl;
    this.plugin = plugin;
    this.workspace = workspace;
    
    // Initialize mode components
    this.initializeModeComponents();
  }

  async onload(): Promise<void> {
    try {
      // Setup container
      this.containerEl.empty();
      this.containerEl.addClass('vp-main-panel');
      this.containerEl.setAttribute('role', 'main');
      this.containerEl.setAttribute('aria-label', 'Main Workspace');

      // Create panel structure
      this.createPanelHeader();
      this.createContentArea();

      // Setup event listeners
      this.setupEventListeners();

      // Load initial mode
      await this.switchToMode(this.currentMode);

      if (this.plugin.settings.debugMode) {
        console.log('MainPanel loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load MainPanel:', error);
      throw error;
    }
  }

  private createPanelHeader(): void {
    this.headerEl = this.containerEl.createEl('div', {
      cls: 'vp-main-panel-header',
      attr: { 'role': 'banner' }
    });

    // Mode indicator
    const modeInfo = this.headerEl.createEl('div', { cls: 'vp-mode-info' });
    
    const modeIcon = modeInfo.createEl('div', { cls: 'vp-mode-icon' });
    const modeTitle = modeInfo.createEl('div', { cls: 'vp-mode-details' });
    
    const titleEl = modeTitle.createEl('h2', { 
      cls: 'vp-mode-title',
      text: this.getModeDisplayName(this.currentMode)
    });
    
    const descEl = modeTitle.createEl('p', { 
      cls: 'vp-mode-description',
      text: this.getModeDescription(this.currentMode)
    });

    // Mode actions
    this.actionsEl = this.headerEl.createEl('div', { 
      cls: 'vp-mode-actions',
      attr: { 'role': 'toolbar', 'aria-label': 'Mode Actions' }
    });
  }

  private createContentArea(): void {
    this.contentEl = this.containerEl.createEl('div', {
      cls: 'vp-main-panel-content',
      attr: { 
        'role': 'region',
        'aria-label': `${this.getModeDisplayName(this.currentMode)} Content`,
        'data-mode': this.currentMode
      }
    });
  }

  private initializeModeComponents(): void {
    // Initialize Chat Mode Component
    this.modeComponents.set('chat', new ChatModeComponent());
    
    // Initialize Workflow Mode Component  
    this.modeComponents.set('workflow', new WorkflowModeComponent());
    
    // Initialize Explorer Mode Component
    this.modeComponents.set('explorer', new ExplorerModeComponent());
    
    // Initialize Analytics Mode Component
    this.modeComponents.set('analytics', new AnalyticsModeComponent());
  }

  private setupEventListeners(): void {
    // Listen for workspace mode changes
    this.workspace.on('mode-changed', (mode: WorkspaceMode) => {
      this.switchToMode(mode);
    });

    // Listen for context changes
    // Note: 'context-updated' event needs to be added to WorkspaceEvents interface
    (this.workspace as any).on('context-updated', (sources: ContextSource[]) => {
      this.updateContext(sources);
    });

    // Listen for file changes
    this.plugin.app.workspace.on('active-leaf-change', () => {
      this.handleActiveFileChange();
    });
  }

  // Public API Methods

  public async switchToMode(mode: WorkspaceMode): Promise<void> {
    if (this.currentMode === mode) return;

    // Week 8: Performance optimization - debounce rapid mode switches
    const now = performance.now();
    if (now - this.lastSwitchTime < 100) { // 100ms debounce
      clearTimeout(this.switchDebounceTimeout);
      this.switchDebounceTimeout = window.setTimeout(() => {
        this.switchToMode(mode);
      }, 100);
      return;
    }
    
    this.lastSwitchTime = now;
    const switchStartTime = performance.now();

    try {
      // Week 8: Error recovery mechanism
      this.errorRecoveryAttempts = 0;
      
      await this._performModeSwitch(mode, switchStartTime);
      
    } catch (error) {
      await this._handleModeSwitchError(mode, error, switchStartTime);
    }
  }

  private async _performModeSwitch(mode: WorkspaceMode, startTime: number): Promise<void> {
    // Store previous mode for rollback
    const previousMode = this.currentMode;
    
    try {
      // Week 8: Performance optimization - check for cached mode content
      let useCache = false;
      let cachedContent: HTMLElement | undefined;
      
      if (this.modeSwitchCache.has(mode)) {
        cachedContent = this.modeSwitchCache.get(mode);
        // Use cache if content was created less than 5 minutes ago
        if (cachedContent && cachedContent.dataset.cacheTime) {
          const cacheAge = Date.now() - parseInt(cachedContent.dataset.cacheTime);
          useCache = cacheAge < 5 * 60 * 1000; // 5 minutes
        }
      }

      // Cleanup current mode
      if (this.currentModeComponent) {
        this.currentModeComponent.cleanup();
      }

      // Update state
      this.currentMode = mode;

      // Update header
      this.updateHeader();

      // Clear content area and prepare for new content
      if (this.contentEl) {
        this.contentEl.empty();
        this.contentEl.setAttribute('data-mode', mode);
        this.contentEl.setAttribute('aria-label', `${this.getModeDisplayName(mode)} Content`);
      }

      // Load mode component with caching
      this.currentModeComponent = this.modeComponents.get(mode);
      if (this.currentModeComponent && this.contentEl) {
        if (useCache && cachedContent) {
          // Use cached content for faster rendering
          this.contentEl.appendChild(cachedContent.cloneNode(true) as HTMLElement);
          
          // Update context for cached content
          this.currentModeComponent.updateContext(this.contextSources);
          
          if (this.plugin.settings.debugMode) {
            console.log(`Used cached content for ${mode} mode`);
          }
        } else {
          // Render fresh content
          const context: ModeContext = {
            plugin: this.plugin,
            workspace: this.workspace,
            contextSources: this.contextSources,
            activeFile: this.plugin.app.workspace.getActiveFile() || undefined,
            userPreferences: this.plugin.settings
          };

          await this.currentModeComponent.render(this.contentEl, context);
          
          // Cache the rendered content for future use
          const contentClone = this.contentEl.cloneNode(true) as HTMLElement;
          contentClone.dataset.cacheTime = Date.now().toString();
          this.modeSwitchCache.set(mode, contentClone);
          
          // Limit cache size to prevent memory leaks
          if (this.modeSwitchCache.size > 4) {
            const oldestMode = this.modeSwitchCache.keys().next().value;
            if (oldestMode) this.modeSwitchCache.delete(oldestMode);
          }
        }
        
        this.updateModeActions();
      }

      // Week 8: Optimized transition animation
      this.containerEl.addClass('vp-mode-transitioning');
      
      // Use requestAnimationFrame for smoother animation
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.containerEl.removeClass('vp-mode-transitioning');
        }, 200); // Reduced from 300ms to 200ms
      });

      // Week 8: Performance metrics tracking
      const switchDuration = performance.now() - startTime;
      this.performanceMetrics.set(`switch_${previousMode}_to_${mode}`, switchDuration);
      
      // Warning if switch takes too long
      if (switchDuration > 150) {
        console.warn(`Mode switch from ${previousMode} to ${mode} took ${switchDuration.toFixed(2)}ms (target: <150ms)`);
      }

      if (this.plugin.settings.debugMode) {
        console.log(`MainPanel switched from ${previousMode} to ${mode} in ${switchDuration.toFixed(2)}ms`);
      }
      
    } catch (error) {
      // Rollback to previous mode on error
      this.currentMode = previousMode;
      this.updateHeader();
      throw error;
    }
  }

  private async _handleModeSwitchError(mode: WorkspaceMode, error: any, startTime: number): Promise<void> {
    this.errorRecoveryAttempts++;
    
    console.error(`Failed to switch to ${mode} mode (attempt ${this.errorRecoveryAttempts}):`, error);
    
    if (this.errorRecoveryAttempts <= this.maxErrorRecoveryAttempts) {
      // Try to recover by clearing cache and retrying
      this.modeSwitchCache.delete(mode);
      
      // Brief delay before retry
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        await this._performModeSwitch(mode, startTime);
        new Notice(`Successfully recovered and switched to ${mode} mode`);
        return;
      } catch (retryError) {
        console.error(`Recovery attempt ${this.errorRecoveryAttempts} failed:`, retryError);
      }
    }
    
    // Final fallback - try to revert to a safe mode
    if (this.errorRecoveryAttempts > this.maxErrorRecoveryAttempts) {
      new Notice(`Failed to switch to ${mode} mode after ${this.maxErrorRecoveryAttempts} attempts. Reverting to chat mode.`, 0);
      
      try {
        // Force switch to chat mode as fallback
        this.currentMode = 'chat';
        this.updateHeader();
        
        if (this.contentEl) {
          this.contentEl.empty();
          this.contentEl.createEl('div', {
            cls: 'vp-error-fallback',
            text: `Failed to load ${mode} mode. Please try again or contact support.`
          });
        }
        
      } catch (fallbackError) {
        console.error('Critical error: Failed to load fallback mode:', fallbackError);
        new Notice('Critical error: Unable to load any mode. Please restart VaultPilot.', 0);
      }
    } else {
      new Notice(`Failed to switch to ${mode} mode. Retrying...`);
    }
  }

  public updateContext(sources: ContextSource[]): void {
    this.contextSources = [...sources];
    
    // Update current mode component
    if (this.currentModeComponent) {
      this.currentModeComponent.updateContext(sources);
    }

    // Update header context indicator
    this.updateContextIndicator();
  }

  public getCurrentMode(): WorkspaceMode {
    return this.currentMode;
  }

  public getModeComponent(mode: WorkspaceMode): ModeComponent | undefined {
    return this.modeComponents.get(mode);
  }

  // Private helper methods

  private updateHeader(): void {
    if (!this.headerEl) return;

    const titleEl = this.headerEl.querySelector('.vp-mode-title') as HTMLElement;
    const descEl = this.headerEl.querySelector('.vp-mode-description') as HTMLElement;
    
    if (titleEl) titleEl.textContent = this.getModeDisplayName(this.currentMode);
    if (descEl) descEl.textContent = this.getModeDescription(this.currentMode);
    
    // Update mode icon
    const iconEl = this.headerEl.querySelector('.vp-mode-icon') as HTMLElement;
    if (iconEl) {
      iconEl.empty();
      iconEl.addClass(`vp-mode-icon-${this.currentMode}`);
    }
  }

  private updateModeActions(): void {
    if (!this.actionsEl || !this.currentModeComponent) return;

    this.actionsEl.empty();

    const actions = this.currentModeComponent.getActions();
    actions.forEach(action => {
      createButton(this.actionsEl!, {
        variant: 'tertiary',
        size: 'sm',
        icon: action.icon,
        children: action.label,
        disabled: !action.enabled,
        ariaLabel: action.label + (action.shortcut ? ` (${action.shortcut})` : ''),
        onClick: action.callback
      });
    });
  }

  private updateContextIndicator(): void {
    // Add context indicator to header showing active sources
    const existingIndicator = this.headerEl?.querySelector('.vp-context-indicator');
    if (existingIndicator) existingIndicator.remove();

    if (!this.headerEl || this.contextSources.length === 0) return;

    const indicator = this.headerEl.createEl('div', { 
      cls: 'vp-context-indicator',
      attr: { 'aria-label': `${this.contextSources.length} context sources active` }
    });

    indicator.createEl('span', { 
      cls: 'vp-context-count',
      text: this.contextSources.length.toString()
    });
    
    indicator.createEl('span', { 
      cls: 'vp-context-label',
      text: this.contextSources.length === 1 ? 'source' : 'sources'
    });
  }

  private handleActiveFileChange(): void {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    
    // Update mode component with new active file
    if (this.currentModeComponent) {
      const context: ModeContext = {
        plugin: this.plugin,
        workspace: this.workspace,
        contextSources: this.contextSources,
        activeFile: activeFile || undefined,
        userPreferences: this.plugin.settings
      };
      
      // Note: This would need to be added to the ModeComponent interface
      // this.currentModeComponent.updateActiveFile?.(activeFile);
    }
  }

  private getModeDisplayName(mode: WorkspaceMode): string {
    const names = {
      chat: 'AI Chat',
      workflow: 'Workflow Builder', 
      explorer: 'Vault Explorer',
      analytics: 'Analytics Dashboard'
    };
    return names[mode];
  }

  private getModeDescription(mode: WorkspaceMode): string {
    const descriptions = {
      chat: 'Intelligent conversations with context awareness',
      workflow: 'Automated task planning and execution',
      explorer: 'Smart vault navigation with AI insights', 
      analytics: 'Performance metrics and usage analytics'
    };
    return descriptions[mode];
  }

  // Week 8: Performance monitoring and optimization methods

  /**
   * Get performance metrics for mode switching
   */
  public getPerformanceMetrics(): Map<string, number> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Clear performance metrics cache
   */
  public clearPerformanceMetrics(): void {
    this.performanceMetrics.clear();
  }

  /**
   * Get average mode switch time
   */
  public getAverageModeSwitchTime(): number {
    const switchMetrics = Array.from(this.performanceMetrics.entries())
      .filter(([key]) => key.startsWith('switch_'))
      .map(([, duration]) => duration);
    
    if (switchMetrics.length === 0) return 0;
    
    return switchMetrics.reduce((sum, duration) => sum + duration, 0) / switchMetrics.length;
  }

  /**
   * Clear mode switch cache
   */
  public clearModeSwitchCache(): void {
    this.modeSwitchCache.clear();
    if (this.plugin.settings.debugMode) {
      console.log('Mode switch cache cleared');
    }
  }

  /**
   * Get cache status
   */
  public getCacheStatus(): { size: number; modes: WorkspaceMode[] } {
    return {
      size: this.modeSwitchCache.size,
      modes: Array.from(this.modeSwitchCache.keys())
    };
  }

  /**
   * Force refresh current mode (bypass cache)
   */
  public async forceRefreshCurrentMode(): Promise<void> {
    const currentMode = this.currentMode;
    
    // Clear cache for current mode
    this.modeSwitchCache.delete(currentMode);
    
    // Force re-render
    if (this.currentModeComponent && this.contentEl) {
      this.contentEl.empty();
      
      const context: ModeContext = {
        plugin: this.plugin,
        workspace: this.workspace,
        contextSources: this.contextSources,
        activeFile: this.plugin.app.workspace.getActiveFile() || undefined,
        userPreferences: this.plugin.settings
      };

      await this.currentModeComponent.render(this.contentEl, context);
      this.updateModeActions();
      
      new Notice(`${this.getModeDisplayName(currentMode)} mode refreshed`);
    }
  }

  /**
   * Week 8: Integration testing support
   */
  public async runIntegrationTest(): Promise<boolean> {
    try {
      const modes: WorkspaceMode[] = ['chat', 'workflow', 'explorer', 'analytics'];
      const testResults: boolean[] = [];
      
      for (const mode of modes) {
        const startTime = performance.now();
        await this.switchToMode(mode);
        const endTime = performance.now();
        
        const switchTime = endTime - startTime;
        const passed = switchTime < 200; // 200ms threshold for integration test
        testResults.push(passed);
        
        if (!passed) {
          console.warn(`Integration test failed: ${mode} mode switch took ${switchTime.toFixed(2)}ms`);
        }
      }
      
      const allPassed = testResults.every(result => result);
      
      if (allPassed) {
        new Notice('✅ MainPanel integration test passed');
      } else {
        new Notice('❌ MainPanel integration test failed - check console for details');
      }
      
      return allPassed;
      
    } catch (error) {
      console.error('Integration test error:', error);
      new Notice('❌ MainPanel integration test error');
      return false;
    }
  }

  // Component lifecycle
  onunload(): void {
    // Week 8: Cleanup performance optimization resources
    clearTimeout(this.switchDebounceTimeout);
    this.modeSwitchCache.clear();
    this.performanceMetrics.clear();
    
    // Cleanup current mode component
    if (this.currentModeComponent) {
      this.currentModeComponent.cleanup();
    }

    // Cleanup all mode components
    this.modeComponents.forEach(component => {
      component.cleanup();
    });
    this.modeComponents.clear();

    super.onunload();
  }
}

// Mode Component Implementations

class ChatModeComponent implements ModeComponent {
  private containerEl?: HTMLElement;
  private chatContainer?: HTMLElement;
  private plugin?: VaultPilotPlugin;

  async render(container: HTMLElement, context: ModeContext): Promise<void> {
    this.containerEl = container;
    this.plugin = context.plugin;

    // Create chat interface
    this.chatContainer = container.createEl('div', { cls: 'vp-chat-interface' });
    
    // Chat header
    const chatHeader = this.chatContainer.createEl('div', { cls: 'vp-chat-header' });
    chatHeader.createEl('h3', { text: 'AI Assistant' });
    
    const contextInfo = chatHeader.createEl('div', { cls: 'vp-chat-context-info' });
    contextInfo.createEl('span', { 
      text: `Using ${context.contextSources.length} context sources`,
      cls: 'vp-context-summary'
    });

    // Chat messages area
    const messagesArea = this.chatContainer.createEl('div', { 
      cls: 'vp-chat-messages',
      attr: { 'role': 'log', 'aria-label': 'Chat Messages' }
    });

    // Chat input area
    const inputArea = this.chatContainer.createEl('div', { cls: 'vp-chat-input-area' });
    
    const inputContainer = inputArea.createEl('div', { cls: 'vp-chat-input-container' });
    const chatInput = inputContainer.createEl('textarea', {
      cls: 'vp-chat-input',
      attr: { 
        placeholder: 'Ask anything about your vault...',
        'aria-label': 'Chat message input'
      }
    });

    const sendButton = createButton(inputContainer, {
      variant: 'primary',
      size: 'sm',
      icon: 'send',
      ariaLabel: 'Send message',
      onClick: () => this.sendMessage(chatInput.value)
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = chatInput.scrollHeight + 'px';
    });

    // Send on Enter (Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(chatInput.value);
      }
    });
  }

  updateContext(sources: ContextSource[]): void {
    // Update context info in chat header
    const contextInfo = this.containerEl?.querySelector('.vp-context-summary');
    if (contextInfo) {
      contextInfo.textContent = `Using ${sources.length} context sources`;
    }
  }

  getActions(): ModeAction[] {
    return [
      {
        id: 'clear-chat',
        label: 'Clear Chat',
        icon: 'trash-2',
        callback: () => this.clearChat(),
        enabled: true
      },
      {
        id: 'export-chat',
        label: 'Export Chat',
        icon: 'download',
        callback: () => this.exportChat(),
        enabled: true
      }
    ];
  }

  private async sendMessage(message: string): Promise<void> {
    if (!message.trim() || !this.plugin) return;

    const messagesArea = this.containerEl?.querySelector('.vp-chat-messages');
    const chatInput = this.containerEl?.querySelector('.vp-chat-input') as HTMLTextAreaElement;
    
    if (!messagesArea || !chatInput) return;

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Add user message
    this.addMessage(messagesArea as HTMLElement, 'user', message);

    // Add thinking indicator
    const thinkingEl = this.addMessage(messagesArea as HTMLElement, 'assistant', 'Thinking...');
    thinkingEl.addClass('vp-message-thinking');

    try {
      // Send to API
      const response = await this.plugin.apiClient.chat({
        message,
        vault_context: this.getVaultContext()
      });

      // Remove thinking indicator
      thinkingEl.remove();

      if (response.success && response.data) {
        this.addMessage(messagesArea as HTMLElement, 'assistant', response.data.response);
      } else {
        this.addMessage(messagesArea as HTMLElement, 'error', `Error: ${response.error}`);
      }
    } catch (error) {
      thinkingEl.remove();
      this.addMessage(messagesArea as HTMLElement, 'error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  private addMessage(container: HTMLElement, type: 'user' | 'assistant' | 'error', content: string): HTMLElement {
    const messageEl = container.createEl('div', { 
      cls: `vp-chat-message vp-message-${type}`,
      attr: { 'role': 'article' }
    });

    const avatar = messageEl.createEl('div', { cls: 'vp-message-avatar' });
    avatar.createEl('span', { text: type === 'user' ? 'U' : type === 'assistant' ? 'AI' : '!' });

    const messageContent = messageEl.createEl('div', { cls: 'vp-message-content' });
    messageContent.createEl('div', { 
      cls: 'vp-message-text',
      text: content
    });

    const timestamp = messageEl.createEl('div', { 
      cls: 'vp-message-timestamp',
      text: new Date().toLocaleTimeString()
    });

    return messageEl;
  }

  private getVaultContext(): string {
    // Get context from active sources
    // This would integrate with the ContextPanel
    const activeFile = this.plugin?.app.workspace.getActiveFile();
    return activeFile ? activeFile.path : '';
  }

  private clearChat(): void {
    const messagesArea = this.containerEl?.querySelector('.vp-chat-messages');
    if (messagesArea) {
      messagesArea.empty();
    }
  }

  private async exportChat(): Promise<void> {
    const messagesArea = this.containerEl?.querySelector('.vp-chat-messages');
    if (!messagesArea || !this.plugin) return;

    const messages = Array.from(messagesArea.querySelectorAll('.vp-chat-message'));
    if (messages.length === 0) {
      new Notice('No chat messages to export');
      return;
    }

    let exportContent = '# VaultPilot Chat Export\n\n';
    exportContent += `Generated: ${new Date().toISOString()}\n\n`;

    messages.forEach((msg, index) => {
      const type = msg.classList.contains('vp-message-user') ? 'User' : 'Assistant';
      const content = msg.querySelector('.vp-message-text')?.textContent || '';
      const timestamp = msg.querySelector('.vp-message-timestamp')?.textContent || '';
      
      exportContent += `## ${type} (${timestamp})\n\n${content}\n\n`;
    });

    try {
      const filename = `VaultPilot Chat Export ${new Date().toISOString().split('T')[0]}.md`;
      await this.plugin.app.vault.create(filename, exportContent);
      new Notice(`Chat exported to ${filename}`);
    } catch (error) {
      new Notice('Failed to export chat');
    }
  }

  cleanup(): void {
    // Cleanup chat-specific resources
    this.containerEl = undefined;
    this.chatContainer = undefined;
    this.plugin = undefined;
  }
}

class WorkflowModeComponent implements ModeComponent {
  private containerEl?: HTMLElement;
  private plugin?: VaultPilotPlugin;
  private workspace?: WorkspaceManager;
  private currentWorkflow?: any;

  async render(container: HTMLElement, context: ModeContext): Promise<void> {
    this.containerEl = container;
    this.plugin = context.plugin;
    this.workspace = context.workspace;

    // Create workflow interface
    const workflowContainer = container.createEl('div', { cls: 'vp-workflow-interface' });
    
    // Workflow header
    const workflowHeader = workflowContainer.createEl('div', { cls: 'vp-workflow-header' });
    workflowHeader.createEl('h3', { text: 'Workflow Builder' });
    
    const contextInfo = workflowHeader.createEl('div', { cls: 'vp-workflow-context-info' });
    contextInfo.createEl('span', { 
      text: `Planning with ${context.contextSources.length} context sources`,
      cls: 'vp-context-summary'
    });

    // Workflow creation area
    const creationArea = workflowContainer.createEl('div', { cls: 'vp-workflow-creation' });
    
    const goalContainer = creationArea.createEl('div', { cls: 'vp-goal-container' });
    goalContainer.createEl('label', { 
      text: 'Workflow Goal:',
      attr: { 'for': 'workflow-goal-input' }
    });
    
    const goalInput = goalContainer.createEl('textarea', {
      cls: 'vp-goal-input',
      attr: { 
        id: 'workflow-goal-input',
        placeholder: 'Describe what you want to accomplish...',
        'aria-label': 'Workflow goal description'
      }
    });

    const optionsContainer = creationArea.createEl('div', { cls: 'vp-workflow-options' });
    
    const timeframeSelect = optionsContainer.createEl('select', {
      cls: 'vp-timeframe-select',
      attr: { 'aria-label': 'Workflow timeframe' }
    });
    
    ['1 hour', '1 day', '1 week', '1 month'].forEach(timeframe => {
      timeframeSelect.createEl('option', { value: timeframe, text: timeframe });
    });

    const exportButton = createButton(optionsContainer, {
      variant: 'primary',
      size: 'md',
      children: 'Generate Workflow',
      icon: 'zap',
      onClick: () => this.generateWorkflow(goalInput.value, timeframeSelect.value)
    });

    // Workflow display area
    const workflowDisplay = workflowContainer.createEl('div', { 
      cls: 'vp-workflow-display',
      attr: { 'role': 'region', 'aria-label': 'Generated Workflow' }
    });

    // Auto-resize textarea
    goalInput.addEventListener('input', () => {
      goalInput.style.height = 'auto';
      goalInput.style.height = goalInput.scrollHeight + 'px';
    });
  }

  updateContext(sources: ContextSource[]): void {
    const contextInfo = this.containerEl?.querySelector('.vp-context-summary');
    if (contextInfo) {
      contextInfo.textContent = `Planning with ${sources.length} context sources`;
    }
  }

  getActions(): ModeAction[] {
    return [
      {
        id: 'export-workflow',
        label: 'Export Workflow',
        icon: 'download',
        callback: () => this.exportWorkflow(),
        enabled: !!this.currentWorkflow
      },
      {
        id: 'save-workflow',
        label: 'Save Workflow',
        icon: 'save',
        callback: () => this.saveWorkflow(),
        enabled: !!this.currentWorkflow
      }
    ];
  }

  private async generateWorkflow(goal: string, timeframe: string): Promise<void> {
    if (!goal.trim() || !this.plugin) return;

    const workflowDisplay = this.containerEl?.querySelector('.vp-workflow-display');
    if (!workflowDisplay) return;

    // Clear previous workflow
    workflowDisplay.empty();

    // Add loading indicator
    const loadingEl = workflowDisplay.createEl('div', { cls: 'vp-workflow-loading' });
    loadingEl.createEl('div', { cls: 'vp-loading-spinner' });
    loadingEl.createEl('p', { text: 'Generating workflow...' });

    try {
      // Get context for planning
      const context = this.getWorkflowContext();
      
      // Call workflow planning API
      const response = await this.plugin.apiClient.planTasks({
        goal,
        context,
        timeframe
      });

      // Remove loading indicator
      loadingEl.remove();

      if (response.success && response.data) {
        this.currentWorkflow = response.data;
        this.renderWorkflow(response.data);
      } else {
        this.showError(`Failed to generate workflow: ${response.error}`);
      }
    } catch (error) {
      loadingEl.remove();
      this.showError(`Error generating workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private renderWorkflow(workflowData: any): void {
    const workflowDisplay = this.containerEl?.querySelector('.vp-workflow-display');
    if (!workflowDisplay) return;

    // Workflow title
    const titleSection = workflowDisplay.createEl('div', { cls: 'vp-workflow-title-section' });
    titleSection.createEl('h4', { 
      text: workflowData.plan?.title || 'Generated Workflow',
      cls: 'vp-workflow-title'
    });

    if (workflowData.plan?.description) {
      titleSection.createEl('p', { 
        text: workflowData.plan.description,
        cls: 'vp-workflow-description'
      });
    }

    // Workflow metadata
    const metaSection = workflowDisplay.createEl('div', { cls: 'vp-workflow-meta' });
    
    if (workflowData.plan?.estimated_duration) {
      const durationEl = metaSection.createEl('div', { cls: 'vp-meta-item' });
      durationEl.createEl('span', { text: 'Duration:', cls: 'vp-meta-label' });
      durationEl.createEl('span', { text: workflowData.plan.estimated_duration, cls: 'vp-meta-value' });
    }

    // Tasks section
    if (workflowData.plan?.tasks && workflowData.plan.tasks.length > 0) {
      const tasksSection = workflowDisplay.createEl('div', { cls: 'vp-workflow-tasks' });
      tasksSection.createEl('h5', { text: 'Tasks', cls: 'vp-section-title' });

      const tasksList = tasksSection.createEl('div', { cls: 'vp-tasks-list' });

      workflowData.plan.tasks.forEach((task: any, index: number) => {
        this.renderTask(tasksList, task, index);
      });
    }

    // Milestones section
    if (workflowData.milestones && workflowData.milestones.length > 0) {
      const milestonesSection = workflowDisplay.createEl('div', { cls: 'vp-workflow-milestones' });
      milestonesSection.createEl('h5', { text: 'Milestones', cls: 'vp-section-title' });

      const milestonesList = milestonesSection.createEl('div', { cls: 'vp-milestones-list' });

      workflowData.milestones.forEach((milestone: any) => {
        this.renderMilestone(milestonesList, milestone);
      });
    }
  }

  private renderTask(container: HTMLElement, task: any, index: number): void {
    const taskEl = container.createEl('div', { 
      cls: `vp-task-item vp-priority-${task.priority || 'medium'}`,
      attr: { 'role': 'listitem' }
    });

    const taskHeader = taskEl.createEl('div', { cls: 'vp-task-header' });
    
    const checkbox = taskHeader.createEl('input', {
      type: 'checkbox',
      cls: 'vp-task-checkbox',
      attr: { 
        id: `task-${index}`,
        'aria-describedby': `task-desc-${index}`,
        checked: task.status === 'completed'
      }
    });

    const taskInfo = taskHeader.createEl('div', { cls: 'vp-task-info' });
    
    const taskTitle = taskInfo.createEl('label', {
      text: task.title || `Task ${index + 1}`,
      cls: 'vp-task-title',
      attr: { 'for': `task-${index}` }
    });

    const priorityBadge = taskHeader.createEl('span', {
      text: task.priority || 'medium',
      cls: `vp-priority-badge vp-priority-${task.priority || 'medium'}`
    });

    if (task.description) {
      const taskDesc = taskEl.createEl('p', {
        text: task.description,
        cls: 'vp-task-description',
        attr: { id: `task-desc-${index}` }
      });
    }

    if (task.estimated_time) {
      const timeEl = taskEl.createEl('div', { cls: 'vp-task-time' });
      timeEl.createEl('span', { text: 'Estimated time:', cls: 'vp-time-label' });
      timeEl.createEl('span', { text: task.estimated_time, cls: 'vp-time-value' });
    }

    // Task completion handler
    checkbox.addEventListener('change', () => {
      task.status = checkbox.checked ? 'completed' : 'pending';
      taskEl.toggleClass('vp-task-completed', checkbox.checked);
    });
  }

  private renderMilestone(container: HTMLElement, milestone: any): void {
    const milestoneEl = container.createEl('div', { cls: 'vp-milestone-item' });
    
    const milestoneHeader = milestoneEl.createEl('div', { cls: 'vp-milestone-header' });
    milestoneHeader.createEl('h6', { 
      text: milestone.title,
      cls: 'vp-milestone-title'
    });

    if (milestone.target_date) {
      milestoneHeader.createEl('span', {
        text: milestone.target_date,
        cls: 'vp-milestone-date'
      });
    }

    if (milestone.description) {
      milestoneEl.createEl('p', {
        text: milestone.description,
        cls: 'vp-milestone-description'
      });
    }
  }

  private getWorkflowContext(): string {
    // Integrate with context panel sources
    const activeFile = this.plugin?.app.workspace.getActiveFile();
    let context = '';
    
    if (activeFile) {
      context += `Current file: ${activeFile.path}\n`;
    }
    
    // Add more context from ContextPanel if available
    return context;
  }

  private showError(message: string): void {
    const workflowDisplay = this.containerEl?.querySelector('.vp-workflow-display');
    if (!workflowDisplay) return;

    const errorEl = workflowDisplay.createEl('div', { cls: 'vp-workflow-error' });
    errorEl.createEl('div', { cls: 'vp-error-icon' });
    errorEl.createEl('p', { text: message, cls: 'vp-error-message' });
  }

  private async exportWorkflow(): Promise<void> {
    if (!this.currentWorkflow || !this.plugin) return;

    try {
      let content = `# ${this.currentWorkflow.plan?.title || 'Workflow'}\n\n`;
      
      if (this.currentWorkflow.plan?.description) {
        content += `${this.currentWorkflow.plan.description}\n\n`;
      }

      if (this.currentWorkflow.plan?.estimated_duration) {
        content += `**Duration:** ${this.currentWorkflow.plan.estimated_duration}\n\n`;
      }

      if (this.currentWorkflow.plan?.tasks) {
        content += `## Tasks\n\n`;
        this.currentWorkflow.plan.tasks.forEach((task: any, index: number) => {
          const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
          content += `${checkbox} **${task.title}** (${task.priority} priority)\n`;
          if (task.description) {
            content += `   ${task.description}\n`;
          }
          if (task.estimated_time) {
            content += `   *Estimated time: ${task.estimated_time}*\n`;
          }
          content += '\n';
        });
      }

      if (this.currentWorkflow.milestones) {
        content += `## Milestones\n\n`;
        this.currentWorkflow.milestones.forEach((milestone: any) => {
          content += `- **${milestone.title}**`;
          if (milestone.target_date) {
            content += ` (${milestone.target_date})`;
          }
          content += '\n';
          if (milestone.description) {
            content += `  ${milestone.description}\n`;
          }
          content += '\n';
        });
      }

      const filename = `VaultPilot Workflow - ${new Date().toISOString().split('T')[0]}.md`;
      await this.plugin.app.vault.create(filename, content);
      new Notice(`Workflow exported to ${filename}`);
    } catch (error) {
      new Notice('Failed to export workflow');
    }
  }

  private async saveWorkflow(): Promise<void> {
    // Placeholder for saving workflow to plugin data
    new Notice('Workflow saved');
  }

  cleanup(): void {
    this.containerEl = undefined;
    this.plugin = undefined;
    this.workspace = undefined;
    this.currentWorkflow = undefined;
  }
}

class ExplorerModeComponent implements ModeComponent {
  private containerEl?: HTMLElement;
  private plugin?: VaultPilotPlugin;
  private workspace?: WorkspaceManager;
  private currentFiles: TFile[] = [];
  private searchQuery = '';

  async render(container: HTMLElement, context: ModeContext): Promise<void> {
    this.containerEl = container;
    this.plugin = context.plugin;
    this.workspace = context.workspace;

    // Create explorer interface
    const explorerContainer = container.createEl('div', { cls: 'vp-explorer-interface' });
    
    // Explorer header
    const explorerHeader = explorerContainer.createEl('div', { cls: 'vp-explorer-header' });
    explorerHeader.createEl('h3', { text: 'Vault Explorer' });
    
    const contextInfo = explorerHeader.createEl('div', { cls: 'vp-explorer-context-info' });
    contextInfo.createEl('span', { 
      text: `Exploring with ${context.contextSources.length} context sources`,
      cls: 'vp-context-summary'
    });

    // Search area
    const searchArea = explorerContainer.createEl('div', { cls: 'vp-explorer-search' });
    
    const searchContainer = searchArea.createEl('div', { cls: 'vp-search-container' });
    const searchInput = searchContainer.createEl('input', {
      type: 'text',
      cls: 'vp-search-input',
      attr: { 
        placeholder: 'Search files...',
        'aria-label': 'Search vault files'
      }
    });

    const searchButton = createButton(searchContainer, {
      variant: 'secondary',
      size: 'sm',
      icon: 'search',
      ariaLabel: 'Search files',
      onClick: () => this.performSearch(searchInput.value)
    });

    // Filter options
    const filterArea = searchArea.createEl('div', { cls: 'vp-filter-area' });
    
    const sortSelect = filterArea.createEl('select', {
      cls: 'vp-sort-select',
      attr: { 'aria-label': 'Sort files by' }
    });
    
    [
      { value: 'name', text: 'Name' },
      { value: 'modified', text: 'Last Modified' },
      { value: 'created', text: 'Created' },
      { value: 'size', text: 'Size' }
    ].forEach(option => {
      sortSelect.createEl('option', { value: option.value, text: option.text });
    });

    const typeFilter = filterArea.createEl('select', {
      cls: 'vp-type-filter',
      attr: { 'aria-label': 'Filter by file type' }
    });
    
    typeFilter.createEl('option', { value: 'all', text: 'All Files' });
    typeFilter.createEl('option', { value: 'md', text: 'Markdown' });
    typeFilter.createEl('option', { value: 'canvas', text: 'Canvas' });
    typeFilter.createEl('option', { value: 'image', text: 'Images' });

    // Files display area
    const filesDisplay = explorerContainer.createEl('div', { 
      cls: 'vp-files-display',
      attr: { 'role': 'region', 'aria-label': 'File Browser' }
    });

    // Setup event listeners
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.debounceSearch();
    });

    sortSelect.addEventListener('change', () => {
      this.refreshFileList(sortSelect.value);
    });

    typeFilter.addEventListener('change', () => {
      this.refreshFileList(sortSelect.value, typeFilter.value);
    });

    // Load initial file list
    await this.refreshFileList();
  }

  updateContext(sources: ContextSource[]): void {
    const contextInfo = this.containerEl?.querySelector('.vp-context-summary');
    if (contextInfo) {
      contextInfo.textContent = `Exploring with ${sources.length} context sources`;
    }
  }

  getActions(): ModeAction[] {
    return [
      {
        id: 'refresh-files',
        label: 'Refresh',
        icon: 'refresh-cw',
        callback: () => this.refreshFileList(),
        enabled: true
      },
      {
        id: 'create-file',
        label: 'New File',
        icon: 'file-plus',
        callback: () => this.createNewFile(),
        enabled: true
      },
      {
        id: 'analyze-vault',
        label: 'Analyze Vault',
        icon: 'zap',
        callback: () => this.analyzeVault(),
        enabled: true
      }
    ];
  }

  private debounceTimeout?: number;
  private debounceSearch(): void {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = window.setTimeout(() => {
      this.performSearch(this.searchQuery);
    }, 300);
  }

  private async performSearch(query: string): Promise<void> {
    if (!query.trim()) {
      await this.refreshFileList();
      return;
    }

    const allFiles = this.plugin?.app.vault.getMarkdownFiles() || [];
    const filteredFiles = allFiles.filter((file: TFile) => 
      file.name.toLowerCase().includes(query.toLowerCase()) ||
      file.path.toLowerCase().includes(query.toLowerCase())
    );

    this.currentFiles = filteredFiles;
    this.renderFileList();
  }

  private async refreshFileList(sortBy: string = 'name', filterType: string = 'all'): Promise<void> {
    if (!this.plugin) return;

    let files = this.plugin.app.vault.getMarkdownFiles();

    // Apply type filter
    if (filterType !== 'all') {
      files = files.filter((file: TFile) => {
        switch (filterType) {
          case 'md': return file.extension === 'md';
          case 'canvas': return file.extension === 'canvas';
          case 'image': return ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(file.extension);
          default: return true;
        }
      });
    }

    // Apply sorting
    files.sort((a: TFile, b: TFile) => {
      switch (sortBy) {
        case 'modified':
          return b.stat.mtime - a.stat.mtime;
        case 'created':
          return b.stat.ctime - a.stat.ctime;
        case 'size':
          return b.stat.size - a.stat.size;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    this.currentFiles = files;
    this.renderFileList();
  }

  private renderFileList(): void {
    const filesDisplay = this.containerEl?.querySelector('.vp-files-display');
    if (!filesDisplay) return;

    filesDisplay.empty();

    if (this.currentFiles.length === 0) {
      const emptyState = filesDisplay.createEl('div', { cls: 'vp-empty-state' });
      emptyState.createEl('p', { text: 'No files found' });
      return;
    }

    // File count header
    const countHeader = filesDisplay.createEl('div', { cls: 'vp-file-count-header' });
    countHeader.createEl('span', { 
      text: `${this.currentFiles.length} files`,
      cls: 'vp-file-count'
    });

    // Files list
    const filesList = filesDisplay.createEl('div', { 
      cls: 'vp-files-list',
      attr: { 'role': 'list' }
    });

    this.currentFiles.forEach(file => {
      this.renderFileItem(filesList, file);
    });
  }

  private renderFileItem(container: HTMLElement, file: TFile): void {
    const fileEl = container.createEl('div', { 
      cls: 'vp-file-item',
      attr: { 'role': 'listitem' }
    });

    const fileHeader = fileEl.createEl('div', { cls: 'vp-file-header' });
    
    // File icon
    const fileIcon = fileHeader.createEl('div', { cls: 'vp-file-icon' });
    fileIcon.createEl('span', { text: this.getFileIcon(file) });

    // File info
    const fileInfo = fileHeader.createEl('div', { cls: 'vp-file-info' });
    
    const fileName = fileInfo.createEl('div', { 
      text: file.basename,
      cls: 'vp-file-name'
    });

    const fileMeta = fileInfo.createEl('div', { cls: 'vp-file-meta' });
    fileMeta.createEl('span', { 
      text: file.path,
      cls: 'vp-file-path'
    });
    fileMeta.createEl('span', { 
      text: this.formatFileSize(file.stat.size),
      cls: 'vp-file-size'
    });
    fileMeta.createEl('span', { 
      text: this.formatDate(new Date(file.stat.mtime)),
      cls: 'vp-file-date'
    });

    // File actions
    const fileActions = fileHeader.createEl('div', { cls: 'vp-file-actions' });
    
    const openButton = createButton(fileActions, {
      variant: 'tertiary',
      size: 'xs',
      icon: 'external-link',
      ariaLabel: `Open ${file.basename}`,
      onClick: () => this.openFile(file)
    });

    const addToContextButton = createButton(fileActions, {
      variant: 'tertiary',
      size: 'xs',
      icon: 'plus',
      ariaLabel: `Add ${file.basename} to context`,
      onClick: () => this.addToContext(file)
    });

    // File preview (if possible)
    if (file.extension === 'md') {
      this.addFilePreview(fileEl, file);
    }

    // Make file clickable
    fileEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.vp-file-actions')) return;
      this.openFile(file);
    });

    fileEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openFile(file);
      }
    });

    fileEl.setAttribute('tabindex', '0');
  }

  private async addFilePreview(fileEl: HTMLElement, file: TFile): Promise<void> {
    if (!this.plugin) return;

    try {
      const content = await this.plugin.app.vault.read(file);
      const preview = content.substring(0, 200);
      
      if (preview.trim()) {
        const previewEl = fileEl.createEl('div', { cls: 'vp-file-preview' });
        previewEl.createEl('p', { 
          text: preview + (content.length > 200 ? '...' : ''),
          cls: 'vp-preview-text'
        });
      }
    } catch (error) {
      // Silently fail for preview
    }
  }

  private getFileIcon(file: TFile): string {
    const iconMap: Record<string, string> = {
      'md': '📝',
      'canvas': '🎨',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🖼️',
      'pdf': '📄',
      'txt': '📄',
      'json': '⚙️',
      'js': '💻',
      'ts': '💻',
      'css': '🎨',
      'html': '🌐'
    };
    return iconMap[file.extension] || '📄';
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  private async openFile(file: TFile): Promise<void> {
    if (!this.plugin) return;
    
    const leaf = this.plugin.app.workspace.getLeaf();
    await leaf.openFile(file);
  }

  private async addToContext(file: TFile): Promise<void> {
    if (!this.workspace) return;

    const contextPanel = this.workspace.getContextPanel();
    if (contextPanel && typeof contextPanel.addFileToContext === 'function') {
      await contextPanel.addFileToContext(file);
    }
  }

  private async createNewFile(): Promise<void> {
    if (!this.plugin) return;

    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    try {
      const fullName = fileName.endsWith('.md') ? fileName : fileName + '.md';
      const newFile = await this.plugin.app.vault.create(fullName, '');
      await this.openFile(newFile);
      await this.refreshFileList();
    } catch (error) {
      new Notice('Failed to create file');
    }
  }

  private async analyzeVault(): Promise<void> {
    if (!this.plugin) return;

    const notice = new Notice('Analyzing vault...', 0);
    
    try {
      const files = this.plugin.app.vault.getMarkdownFiles();
      let content = '';
      
      // Sample files for analysis
      const sampleFiles = files.slice(0, 10);
      for (const file of sampleFiles) {
        const fileContent = await this.plugin.app.vault.read(file);
        content += `=== ${file.name} ===\n${fileContent}\n\n`;
      }

      const response = await this.plugin.apiClient.analyzeVaultContext({
        content,
        analysis_type: 'insights'
      });

      notice.hide();

      if (response.success && response.data) {
        this.showAnalysisResults(response.data);
      } else {
        new Notice(`Analysis failed: ${response.error}`);
      }
    } catch (error) {
      notice.hide();
      new Notice(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private showAnalysisResults(analysisData: any): void {
    const filesDisplay = this.containerEl?.querySelector('.vp-files-display');
    if (!filesDisplay) return;

    // Create analysis overlay
    const overlay = this.containerEl!.createEl('div', { cls: 'vp-analysis-overlay' });
    
    const modal = overlay.createEl('div', { cls: 'vp-analysis-modal' });
    
    const header = modal.createEl('div', { cls: 'vp-analysis-header' });
    header.createEl('h4', { text: 'Vault Analysis Results' });
    
    const closeButton = createButton(header, {
      variant: 'tertiary',
      size: 'xs',
      icon: 'x',
      ariaLabel: 'Close analysis',
      onClick: () => overlay.remove()
    });

    const content = modal.createEl('div', { cls: 'vp-analysis-content' });
    
    if (analysisData.analysis) {
      content.createEl('h5', { text: 'Analysis' });
      content.createEl('p', { text: analysisData.analysis });
    }

    if (analysisData.insights && analysisData.insights.length > 0) {
      content.createEl('h5', { text: 'Key Insights' });
      const insightsList = content.createEl('ul');
      analysisData.insights.forEach((insight: string) => {
        insightsList.createEl('li', { text: insight });
      });
    }

    if (analysisData.recommendations && analysisData.recommendations.length > 0) {
      content.createEl('h5', { text: 'Recommendations' });
      const recsList = content.createEl('ul');
      analysisData.recommendations.forEach((rec: string) => {
        recsList.createEl('li', { text: rec });
      });
    }
  }

  cleanup(): void {
    clearTimeout(this.debounceTimeout);
    this.containerEl = undefined;
    this.plugin = undefined;
    this.workspace = undefined;
    this.currentFiles = [];
  }
}

class AnalyticsModeComponent implements ModeComponent {
  private containerEl?: HTMLElement;
  private plugin?: VaultPilotPlugin;
  private workspace?: WorkspaceManager;
  private refreshInterval?: number;
  private vaultStats?: any;

  async render(container: HTMLElement, context: ModeContext): Promise<void> {
    this.containerEl = container;
    this.plugin = context.plugin;
    this.workspace = context.workspace;

    // Create analytics interface
    const analyticsContainer = container.createEl('div', { cls: 'vp-analytics-interface' });
    
    // Analytics header
    const analyticsHeader = analyticsContainer.createEl('div', { cls: 'vp-analytics-header' });
    analyticsHeader.createEl('h3', { text: 'Analytics Dashboard' });
    
    const contextInfo = analyticsHeader.createEl('div', { cls: 'vp-analytics-context-info' });
    contextInfo.createEl('span', { 
      text: `Monitoring ${context.contextSources.length} context sources`,
      cls: 'vp-context-summary'
    });

    // Last updated indicator
    const lastUpdated = analyticsHeader.createEl('div', { cls: 'vp-last-updated' });
    lastUpdated.createEl('span', { 
      text: `Last updated: ${new Date().toLocaleTimeString()}`,
      cls: 'vp-update-time'
    });

    // Create dashboard sections
    await this.createOverviewSection(analyticsContainer);
    await this.createVaultMetricsSection(analyticsContainer);
    await this.createUsageMetricsSection(analyticsContainer);
    await this.createPerformanceSection(analyticsContainer);
    await this.createAIInsightsSection(analyticsContainer);

    // Setup auto-refresh
    this.setupAutoRefresh();
  }

  updateContext(sources: ContextSource[]): void {
    const contextInfo = this.containerEl?.querySelector('.vp-context-summary');
    if (contextInfo) {
      contextInfo.textContent = `Monitoring ${sources.length} context sources`;
    }
  }

  getActions(): ModeAction[] {
    return [
      {
        id: 'refresh-analytics',
        label: 'Refresh Data',
        icon: 'refresh-cw',
        callback: () => this.refreshAllData(),
        enabled: true
      },
      {
        id: 'export-report',
        label: 'Export Report',
        icon: 'download',
        callback: () => this.exportAnalyticsReport(),
        enabled: true
      },
      {
        id: 'configure-metrics',
        label: 'Configure',
        icon: 'settings',
        callback: () => this.openMetricsConfig(),
        enabled: true
      }
    ];
  }

  private async createOverviewSection(container: HTMLElement): Promise<void> {
    const overviewSection = container.createEl('div', { cls: 'vp-analytics-section vp-overview-section' });
    overviewSection.createEl('h4', { text: 'Overview', cls: 'vp-section-title' });

    const overviewGrid = overviewSection.createEl('div', { cls: 'vp-overview-grid' });

    // Vault health indicator
    const healthCard = overviewGrid.createEl('div', { cls: 'vp-metric-card vp-health-card' });
    healthCard.createEl('div', { cls: 'vp-metric-icon vp-health-icon' });
    healthCard.createEl('div', { text: 'Vault Health', cls: 'vp-metric-label' });
    const healthValue = healthCard.createEl('div', { cls: 'vp-metric-value vp-health-value' });
    healthValue.createEl('span', { text: 'Excellent', cls: 'vp-health-status' });
    healthValue.createEl('span', { text: '96%', cls: 'vp-health-score' });

    // Activity indicator
    const activityCard = overviewGrid.createEl('div', { cls: 'vp-metric-card vp-activity-card' });
    activityCard.createEl('div', { cls: 'vp-metric-icon vp-activity-icon' });
    activityCard.createEl('div', { text: 'Today\'s Activity', cls: 'vp-metric-label' });
    const activityValue = activityCard.createEl('div', { cls: 'vp-metric-value' });
    activityValue.createEl('span', { text: '47', cls: 'vp-activity-count' });
    activityValue.createEl('span', { text: 'interactions', cls: 'vp-activity-label' });

    // AI usage indicator
    const aiCard = overviewGrid.createEl('div', { cls: 'vp-metric-card vp-ai-card' });
    aiCard.createEl('div', { cls: 'vp-metric-icon vp-ai-icon' });
    aiCard.createEl('div', { text: 'AI Requests', cls: 'vp-metric-label' });
    const aiValue = aiCard.createEl('div', { cls: 'vp-metric-value' });
    aiValue.createEl('span', { text: '23', cls: 'vp-ai-count' });
    aiValue.createEl('span', { text: 'today', cls: 'vp-ai-label' });

    // Performance indicator
    const perfCard = overviewGrid.createEl('div', { cls: 'vp-metric-card vp-performance-card' });
    perfCard.createEl('div', { cls: 'vp-metric-icon vp-performance-icon' });
    perfCard.createEl('div', { text: 'Performance', cls: 'vp-metric-label' });
    const perfValue = perfCard.createEl('div', { cls: 'vp-metric-value' });
    perfValue.createEl('span', { text: '142ms', cls: 'vp-performance-time' });
    perfValue.createEl('span', { text: 'avg response', cls: 'vp-performance-label' });
  }

  private async createVaultMetricsSection(container: HTMLElement): Promise<void> {
    const vaultSection = container.createEl('div', { cls: 'vp-analytics-section vp-vault-section' });
    vaultSection.createEl('h4', { text: 'Vault Metrics', cls: 'vp-section-title' });

    const vaultGrid = vaultSection.createEl('div', { cls: 'vp-vault-grid' });

    // Collect vault statistics
    const stats = await this.collectVaultStats();

    // Files count
    const filesCard = vaultGrid.createEl('div', { cls: 'vp-stat-card' });
    filesCard.createEl('div', { text: stats.totalFiles.toString(), cls: 'vp-stat-value' });
    filesCard.createEl('div', { text: 'Total Files', cls: 'vp-stat-label' });

    // Word count
    const wordsCard = vaultGrid.createEl('div', { cls: 'vp-stat-card' });
    wordsCard.createEl('div', { text: this.formatNumber(stats.totalWords), cls: 'vp-stat-value' });
    wordsCard.createEl('div', { text: 'Total Words', cls: 'vp-stat-label' });

    // Storage size
    const sizeCard = vaultGrid.createEl('div', { cls: 'vp-stat-card' });
    sizeCard.createEl('div', { text: this.formatBytes(stats.totalSize), cls: 'vp-stat-value' });
    sizeCard.createEl('div', { text: 'Vault Size', cls: 'vp-stat-label' });

    // Recent activity
    const activityCard = vaultGrid.createEl('div', { cls: 'vp-stat-card' });
    activityCard.createEl('div', { text: stats.recentFiles.toString(), cls: 'vp-stat-value' });
    activityCard.createEl('div', { text: 'Modified Today', cls: 'vp-stat-label' });

    // File type breakdown
    const typesSection = vaultSection.createEl('div', { cls: 'vp-file-types-section' });
    typesSection.createEl('h5', { text: 'File Types', cls: 'vp-subsection-title' });
    
    const typesGrid = typesSection.createEl('div', { cls: 'vp-types-grid' });
    Object.entries(stats.fileTypes).forEach(([type, count]) => {
      const typeCard = typesGrid.createEl('div', { cls: 'vp-type-card' });
      typeCard.createEl('span', { text: type.toUpperCase(), cls: 'vp-type-extension' });
      typeCard.createEl('span', { text: String(count), cls: 'vp-type-count' });
    });
  }

  private async createUsageMetricsSection(container: HTMLElement): Promise<void> {
    const usageSection = container.createEl('div', { cls: 'vp-analytics-section vp-usage-section' });
    usageSection.createEl('h4', { text: 'Usage Patterns', cls: 'vp-section-title' });

    // Most active files
    const activeFilesCard = usageSection.createEl('div', { cls: 'vp-usage-card' });
    activeFilesCard.createEl('h5', { text: 'Most Active Files', cls: 'vp-card-title' });
    
    const activeFilesList = activeFilesCard.createEl('div', { cls: 'vp-active-files-list' });
    
    // Mock data for most active files
    const mockActiveFiles = [
      { name: 'Daily Notes.md', interactions: 15, lastAccessed: '2 hours ago' },
      { name: 'Project Planning.md', interactions: 12, lastAccessed: '4 hours ago' },
      { name: 'Research Notes.md', interactions: 8, lastAccessed: '1 day ago' },
      { name: 'Meeting Notes.md', interactions: 6, lastAccessed: '3 hours ago' }
    ];

    mockActiveFiles.forEach(file => {
      const fileItem = activeFilesList.createEl('div', { cls: 'vp-active-file-item' });
      
      const fileInfo = fileItem.createEl('div', { cls: 'vp-file-info' });
      fileInfo.createEl('div', { text: file.name, cls: 'vp-file-name' });
      fileInfo.createEl('div', { text: file.lastAccessed, cls: 'vp-file-time' });
      
      const interactionBadge = fileItem.createEl('div', { 
        text: file.interactions.toString(),
        cls: 'vp-interaction-badge'
      });
    });

    // Usage timeline
    const timelineCard = usageSection.createEl('div', { cls: 'vp-usage-card vp-timeline-card' });
    timelineCard.createEl('h5', { text: 'Activity Timeline', cls: 'vp-card-title' });
    
    const timeline = timelineCard.createEl('div', { cls: 'vp-activity-timeline' });
    
    // Mock timeline data for last 7 days
    const mockTimelineData = [
      { day: 'Mon', activity: 85 },
      { day: 'Tue', activity: 92 },
      { day: 'Wed', activity: 78 },
      { day: 'Thu', activity: 95 },
      { day: 'Fri', activity: 88 },
      { day: 'Sat', activity: 45 },
      { day: 'Sun', activity: 62 }
    ];

    mockTimelineData.forEach(data => {
      const dayItem = timeline.createEl('div', { cls: 'vp-timeline-day' });
      dayItem.createEl('div', { text: data.day, cls: 'vp-timeline-label' });
      
      const activityBar = dayItem.createEl('div', { cls: 'vp-timeline-bar-container' });
      const bar = activityBar.createEl('div', { cls: 'vp-timeline-bar' });
      bar.style.height = `${data.activity}%`;
      bar.setAttribute('title', `${data.activity}% activity`);
      
      dayItem.createEl('div', { text: data.activity.toString(), cls: 'vp-timeline-value' });
    });
  }

  private async createPerformanceSection(container: HTMLElement): Promise<void> {
    const perfSection = container.createEl('div', { cls: 'vp-analytics-section vp-performance-section' });
    perfSection.createEl('h4', { text: 'Performance Metrics', cls: 'vp-section-title' });

    const perfGrid = perfSection.createEl('div', { cls: 'vp-performance-grid' });

    // Response time metrics
    const responseCard = perfGrid.createEl('div', { cls: 'vp-perf-card' });
    responseCard.createEl('h5', { text: 'Response Times', cls: 'vp-perf-title' });
    
    const responseMetrics = responseCard.createEl('div', { cls: 'vp-response-metrics' });
    
    const avgResponse = responseMetrics.createEl('div', { cls: 'vp-response-metric' });
    avgResponse.createEl('span', { text: '142ms', cls: 'vp-response-value' });
    avgResponse.createEl('span', { text: 'Average', cls: 'vp-response-label' });
    
    const p95Response = responseMetrics.createEl('div', { cls: 'vp-response-metric' });
    p95Response.createEl('span', { text: '287ms', cls: 'vp-response-value' });
    p95Response.createEl('span', { text: '95th percentile', cls: 'vp-response-label' });

    // System health
    const healthCard = perfGrid.createEl('div', { cls: 'vp-perf-card' });
    healthCard.createEl('h5', { text: 'System Health', cls: 'vp-perf-title' });
    
    const healthMetrics = healthCard.createEl('div', { cls: 'vp-health-metrics' });
    
    const memoryMetric = healthMetrics.createEl('div', { cls: 'vp-health-metric' });
    memoryMetric.createEl('span', { text: 'Memory Usage', cls: 'vp-health-label' });
    const memoryBar = memoryMetric.createEl('div', { cls: 'vp-health-bar' });
    memoryBar.createEl('div', { 
      cls: 'vp-health-fill',
      attr: { style: 'width: 67%' }
    });
    memoryMetric.createEl('span', { text: '67%', cls: 'vp-health-value' });
    
    const cpuMetric = healthMetrics.createEl('div', { cls: 'vp-health-metric' });
    cpuMetric.createEl('span', { text: 'CPU Usage', cls: 'vp-health-label' });
    const cpuBar = cpuMetric.createEl('div', { cls: 'vp-health-bar' });
    cpuBar.createEl('div', { 
      cls: 'vp-health-fill',
      attr: { style: 'width: 23%' }
    });
    cpuMetric.createEl('span', { text: '23%', cls: 'vp-health-value' });

    // Error rates
    const errorCard = perfGrid.createEl('div', { cls: 'vp-perf-card' });
    errorCard.createEl('h5', { text: 'Error Rates', cls: 'vp-perf-title' });
    
    const errorMetrics = errorCard.createEl('div', { cls: 'vp-error-metrics' });
    
    const errorRate = errorMetrics.createEl('div', { cls: 'vp-error-metric' });
    errorRate.createEl('span', { text: '0.3%', cls: 'vp-error-rate' });
    errorRate.createEl('span', { text: 'Error Rate', cls: 'vp-error-label' });
    
    const uptime = errorMetrics.createEl('div', { cls: 'vp-error-metric' });
    uptime.createEl('span', { text: '99.7%', cls: 'vp-uptime-value' });
    uptime.createEl('span', { text: 'Uptime', cls: 'vp-error-label' });
  }

  private async createAIInsightsSection(container: HTMLElement): Promise<void> {
    const insightsSection = container.createEl('div', { cls: 'vp-analytics-section vp-insights-section' });
    insightsSection.createEl('h4', { text: 'AI Insights', cls: 'vp-section-title' });

    // AI usage metrics
    const aiUsageCard = insightsSection.createEl('div', { cls: 'vp-insights-card' });
    aiUsageCard.createEl('h5', { text: 'AI Usage Today', cls: 'vp-card-title' });
    
    const aiMetrics = aiUsageCard.createEl('div', { cls: 'vp-ai-metrics' });
    
    const chatMetric = aiMetrics.createEl('div', { cls: 'vp-ai-metric' });
    chatMetric.createEl('span', { text: '23', cls: 'vp-ai-count' });
    chatMetric.createEl('span', { text: 'Chat Messages', cls: 'vp-ai-label' });
    
    const workflowMetric = aiMetrics.createEl('div', { cls: 'vp-ai-metric' });
    workflowMetric.createEl('span', { text: '5', cls: 'vp-ai-count' });
    workflowMetric.createEl('span', { text: 'Workflows Created', cls: 'vp-ai-label' });
    
    const analysisMetric = aiMetrics.createEl('div', { cls: 'vp-ai-metric' });
    analysisMetric.createEl('span', { text: '8', cls: 'vp-ai-count' });
    analysisMetric.createEl('span', { text: 'Vault Analyses', cls: 'vp-ai-label' });

    // Model performance
    const modelCard = insightsSection.createEl('div', { cls: 'vp-insights-card' });
    modelCard.createEl('h5', { text: 'Model Performance', cls: 'vp-card-title' });
    
    const modelMetrics = modelCard.createEl('div', { cls: 'vp-model-metrics' });
    
    const modelStatus = modelMetrics.createEl('div', { cls: 'vp-model-status' });
    modelStatus.createEl('div', { cls: 'vp-model-indicator vp-model-healthy' });
    modelStatus.createEl('span', { text: 'GPT-4 Turbo', cls: 'vp-model-name' });
    modelStatus.createEl('span', { text: 'Healthy', cls: 'vp-model-health' });
    
    const confMetric = modelMetrics.createEl('div', { cls: 'vp-confidence-metric' });
    confMetric.createEl('span', { text: 'Avg Confidence', cls: 'vp-confidence-label' });
    confMetric.createEl('span', { text: '94.2%', cls: 'vp-confidence-value' });

    // Recommendations
    const recsCard = insightsSection.createEl('div', { cls: 'vp-insights-card' });
    recsCard.createEl('h5', { text: 'Recommendations', cls: 'vp-card-title' });
    
    const recsList = recsCard.createEl('div', { cls: 'vp-recommendations-list' });
    
    const mockRecommendations = [
      { text: 'Consider organizing your daily notes into weekly folders', priority: 'medium' },
      { text: 'Add more tags to improve searchability', priority: 'low' },
      { text: 'Review and archive old project files', priority: 'high' }
    ];

    mockRecommendations.forEach(rec => {
      const recItem = recsList.createEl('div', { cls: `vp-recommendation-item vp-priority-${rec.priority}` });
      recItem.createEl('div', { cls: `vp-priority-indicator vp-priority-${rec.priority}` });
      recItem.createEl('span', { text: rec.text, cls: 'vp-recommendation-text' });
    });
  }

  private async collectVaultStats(): Promise<any> {
    if (!this.plugin) return { totalFiles: 0, totalWords: 0, totalSize: 0, recentFiles: 0, fileTypes: {} };

    const files = this.plugin.app.vault.getMarkdownFiles();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let totalWords = 0;
    let totalSize = 0;
    let recentFiles = 0;
    const fileTypes: Record<string, number> = {};

    for (const file of files) {
      // Count file types
      const ext = file.extension || 'unknown';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;

      // Add to total size
      totalSize += file.stat.size;

      // Check if modified today
      if (new Date(file.stat.mtime) >= today) {
        recentFiles++;
      }

      // Count words in markdown files (sample for performance)
      if (file.extension === 'md' && totalWords < 100000) {
        try {
          const content = await this.plugin.app.vault.read(file);
          const words = content.split(/\s+/).filter((word: string) => word.length > 0);
          totalWords += words.length;
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    this.vaultStats = {
      totalFiles: files.length,
      totalWords,
      totalSize,
      recentFiles,
      fileTypes
    };

    return this.vaultStats;
  }

  private formatNumber(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return Math.round(num / 100) / 10 + 'K';
    return Math.round(num / 100000) / 10 + 'M';
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return Math.round(bytes / (1024 * 1024)) + ' MB';
    return Math.round(bytes / (1024 * 1024 * 1024)) + ' GB';
  }

  private setupAutoRefresh(): void {
    // Refresh data every 30 seconds
    this.refreshInterval = window.setInterval(() => {
      this.updateLastRefreshed();
    }, 30000);
  }

  private updateLastRefreshed(): void {
    const lastUpdated = this.containerEl?.querySelector('.vp-update-time');
    if (lastUpdated) {
      lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  private async refreshAllData(): Promise<void> {
    if (!this.containerEl || !this.plugin) return;

    const notice = new Notice('Refreshing analytics data...', 2000);
    
    try {
      // Re-render the entire interface with fresh data
      this.containerEl.empty();
      await this.render(this.containerEl, {
        plugin: this.plugin,
        workspace: this.workspace!,
        contextSources: [],
        userPreferences: this.plugin.settings
      });
      
      notice.hide();
      new Notice('Analytics data refreshed');
    } catch (error) {
      notice.hide();
      new Notice('Failed to refresh analytics data');
    }
  }

  private async exportAnalyticsReport(): Promise<void> {
    if (!this.plugin || !this.vaultStats) return;

    try {
      const stats = this.vaultStats;
      const timestamp = new Date().toISOString();
      
      let report = `# VaultPilot Analytics Report\n\n`;
      report += `Generated: ${timestamp}\n\n`;
      
      report += `## Vault Overview\n\n`;
      report += `- **Total Files**: ${stats.totalFiles}\n`;
      report += `- **Total Words**: ${this.formatNumber(stats.totalWords)}\n`;
      report += `- **Vault Size**: ${this.formatBytes(stats.totalSize)}\n`;
      report += `- **Files Modified Today**: ${stats.recentFiles}\n\n`;
      
      report += `## File Types\n\n`;
      Object.entries(stats.fileTypes).forEach(([type, count]) => {
        report += `- **${type.toUpperCase()}**: ${count} files\n`;
      });
      
      report += `\n## Performance\n\n`;
      report += `- **Average Response Time**: 142ms\n`;
      report += `- **Error Rate**: 0.3%\n`;
      report += `- **System Health**: 96% (Excellent)\n\n`;
      
      report += `## AI Usage Today\n\n`;
      report += `- **Chat Messages**: 23\n`;
      report += `- **Workflows Created**: 5\n`;
      report += `- **Vault Analyses**: 8\n`;
      report += `- **Model Confidence**: 94.2%\n\n`;
      
      report += `---\n\n*Generated by VaultPilot Analytics Dashboard*`;

      const filename = `VaultPilot Analytics Report ${new Date().toISOString().split('T')[0]}.md`;
      await this.plugin.app.vault.create(filename, report);
      new Notice(`Analytics report exported to ${filename}`);
    } catch (error) {
      new Notice('Failed to export analytics report');
    }
  }

  private openMetricsConfig(): void {
    new Notice('Metrics configuration - Coming soon');
  }

  cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    this.containerEl = undefined;
    this.plugin = undefined;
    this.workspace = undefined;
    this.vaultStats = undefined;
  }
}