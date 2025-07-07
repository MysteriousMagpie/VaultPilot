/**
 * VaultPilot Workspace Manager
 * 
 * Central orchestration component for the unified 3-panel workspace architecture.
 * Manages workspace state, panel coordination, and mode switching while preserving
 * all existing VaultPilot functionality.
 */

import { Component, Plugin, WorkspaceLeaf, Events } from 'obsidian';
import VaultPilotPlugin from '../main';
import { ContextPanel } from './panels/ContextPanel';
import { AIPanel } from './panels/AIPanel';
import { MainPanel } from './panels/MainPanel';
import { IntegrationTester, IntegrationTestSuite } from './IntegrationTester';

export type WorkspaceMode = 'chat' | 'workflow' | 'explorer' | 'analytics';

export interface PanelState {
  collapsed: boolean;
  width: number;
  visible: boolean;
}

export interface WorkspaceState {
  mode: WorkspaceMode;
  panels: {
    context: PanelState;
    ai: PanelState;
  };
  preferences: {
    showOnboarding: boolean;
    featureLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    autoCollapsePanels: boolean;
    keyboardShortcutsEnabled: boolean;
  };
  context: {
    activeSourceIds: string[];
    vaultStateVisible: boolean;
    quickActionsEnabled: boolean;
  };
}

export interface WorkspaceEvents {
  'mode-changed': (mode: WorkspaceMode) => void;
  'panel-toggled': (panel: 'context' | 'ai', collapsed: boolean) => void;
  'state-updated': (state: Partial<WorkspaceState>) => void;
  'workspace-ready': () => void;
}

export class WorkspaceManager extends Component {
  private plugin: VaultPilotPlugin;
  private containerEl: HTMLElement;
  private state: WorkspaceState;
  private events: Events = new Events();
  private resizeObserver?: ResizeObserver;
  
  // Panel components
  private contextPanel?: ContextPanel;
  private mainPanel?: MainPanel;
  private aiPanel?: AIPanel;
  
  // Week 8: Integration testing
  private integrationTester?: IntegrationTester;

  constructor(plugin: VaultPilotPlugin, containerEl: HTMLElement) {
    super();
    this.plugin = plugin;
    this.containerEl = containerEl;
    this.state = this.getDefaultState();
  }

  private getDefaultState(): WorkspaceState {
    return {
      mode: 'chat',
      panels: {
        context: { collapsed: false, width: 300, visible: true },
        ai: { collapsed: false, width: 300, visible: true }
      },
      preferences: {
        showOnboarding: true,
        featureLevel: 'beginner',
        autoCollapsePanels: false,
        keyboardShortcutsEnabled: true
      },
      context: {
        activeSourceIds: [],
        vaultStateVisible: true,
        quickActionsEnabled: true
      }
    };
  }

  async onload(): Promise<void> {
    try {
      // Load persisted state
      await this.loadState();
      
      // Create workspace structure
      this.createWorkspaceStructure();
      
      // Initialize panels
      await this.initializePanels();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Setup resize observer for responsive behavior
      this.setupResizeObserver();
      
      // Apply initial state
      await this.applyState();
      
      // Emit ready event
      this.events.trigger('workspace-ready');
      
      console.log('VaultPilot Workspace Manager loaded successfully');
    } catch (error) {
      console.error('Failed to load Workspace Manager:', error);
      throw error;
    }
  }

  private createWorkspaceStructure(): void {
    // Clear container and add workspace class
    this.containerEl.empty();
    this.containerEl.addClass('vp-workspace');
    
    // Create command bar
    const commandBar = this.containerEl.createEl('div', {
      cls: 'vp-command-bar',
      attr: { 'role': 'toolbar', 'aria-label': 'VaultPilot Command Bar' }
    });
    this.createCommandBar(commandBar);
    
    // Create main workspace container
    const workspaceContainer = this.containerEl.createEl('div', {
      cls: 'vp-workspace-container',
      attr: { 'role': 'main' }
    });
    
    // Create three-panel layout
    this.createThreePanelLayout(workspaceContainer);
  }

  private createCommandBar(commandBar: HTMLElement): void {
    // Mode switcher
    const modeSwitcher = commandBar.createEl('div', {
      cls: 'vp-mode-switcher',
      attr: { 'role': 'tablist', 'aria-label': 'Workspace Modes' }
    });
    
    const modes: Array<{ id: WorkspaceMode; label: string; icon: string }> = [
      { id: 'chat', label: 'Chat', icon: 'message-circle' },
      { id: 'workflow', label: 'Workflow', icon: 'workflow' },
      { id: 'explorer', label: 'Explorer', icon: 'folder' },
      { id: 'analytics', label: 'Analytics', icon: 'bar-chart' }
    ];
    
    modes.forEach((mode, index) => {
      const modeButton = modeSwitcher.createEl('button', {
        cls: `vp-mode-button ${this.state.mode === mode.id ? 'vp-mode-active' : ''}`,
        text: mode.label,
        attr: {
          'role': 'tab',
          'aria-selected': this.state.mode === mode.id ? 'true' : 'false',
          'aria-controls': `vp-main-panel-${mode.id}`,
          'data-mode': mode.id,
          'title': `Switch to ${mode.label} mode (Cmd+${index + 1})`
        }
      });
      
      modeButton.addEventListener('click', () => this.switchMode(mode.id));
    });
    
    // Global search and user actions
    const actionBar = commandBar.createEl('div', { cls: 'vp-action-bar' });
    
    const searchContainer = actionBar.createEl('div', { cls: 'vp-search-container' });
    const searchInput = searchContainer.createEl('input', {
      cls: 'vp-global-search',
      attr: {
        type: 'text',
        placeholder: 'Search VaultPilot...',
        'aria-label': 'Global search'
      }
    });
    
    const userActions = actionBar.createEl('div', { cls: 'vp-user-actions' });
    
    // Panel toggle buttons
    const panelToggles = userActions.createEl('div', { cls: 'vp-panel-toggles' });
    
    const contextToggle = panelToggles.createEl('button', {
      cls: 'vp-panel-toggle',
      text: 'Context',
      attr: {
        'aria-label': 'Toggle context panel',
        'aria-pressed': this.state.panels.context.collapsed ? 'false' : 'true'
      }
    });
    contextToggle.addEventListener('click', () => this.togglePanel('context'));
    
    const aiToggle = panelToggles.createEl('button', {
      cls: 'vp-panel-toggle',
      text: 'AI',
      attr: {
        'aria-label': 'Toggle AI panel',
        'aria-pressed': this.state.panels.ai.collapsed ? 'false' : 'true'
      }
    });
    aiToggle.addEventListener('click', () => this.togglePanel('ai'));
  }

  private createThreePanelLayout(container: HTMLElement): void {
    // Context Panel (Left)
    const contextPanelEl = container.createEl('div', {
      cls: `vp-context-panel ${this.state.panels.context.collapsed ? 'vp-panel-collapsed' : ''}`,
      attr: { 'role': 'complementary', 'aria-label': 'Context Panel' }
    });
    contextPanelEl.style.width = `${this.state.panels.context.width}px`;
    
    // Main Panel (Center)
    const mainPanelEl = container.createEl('div', {
      cls: 'vp-main-panel',
      attr: { 'role': 'main', 'aria-label': 'Main Workspace' }
    });
    
    // AI Panel (Right)
    const aiPanelEl = container.createEl('div', {
      cls: `vp-ai-panel ${this.state.panels.ai.collapsed ? 'vp-panel-collapsed' : ''}`,
      attr: { 'role': 'complementary', 'aria-label': 'AI Panel' }
    });
    aiPanelEl.style.width = `${this.state.panels.ai.width}px`;
    
    // Add resize handles
    this.addResizeHandles(container);
  }

  private addResizeHandles(container: HTMLElement): void {
    // Left resize handle (between context and main panels)
    const leftHandle = container.createEl('div', {
      cls: 'vp-resize-handle vp-resize-handle-left',
      attr: { 'aria-label': 'Resize context panel' }
    });
    
    // Right resize handle (between main and AI panels)
    const rightHandle = container.createEl('div', {
      cls: 'vp-resize-handle vp-resize-handle-right',
      attr: { 'aria-label': 'Resize AI panel' }
    });
    
    // Setup drag handlers
    this.setupResizeHandlers(leftHandle, 'context');
    this.setupResizeHandlers(rightHandle, 'ai');
  }

  private setupResizeHandlers(handle: HTMLElement, panel: 'context' | 'ai'): void {
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;
    
    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = this.state.panels[panel].width;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      
      // Add dragging class for visual feedback
      this.containerEl.addClass('vp-workspace-resizing');
    });
    
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = panel === 'context' ? e.clientX - startX : startX - e.clientX;
      const newWidth = Math.max(200, Math.min(500, startWidth + deltaX));
      
      this.updatePanelWidth(panel, newWidth);
    };
    
    const onMouseUp = () => {
      isDragging = false;
      this.containerEl.removeClass('vp-workspace-resizing');
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Save state
      this.saveState();
    };
  }

  private async initializePanels(): Promise<void> {
    const contextPanelEl = this.containerEl.querySelector('.vp-context-panel') as HTMLElement;
    const mainPanelEl = this.containerEl.querySelector('.vp-main-panel') as HTMLElement;
    const aiPanelEl = this.containerEl.querySelector('.vp-ai-panel') as HTMLElement;
    
    // Initialize Context Panel
    if (contextPanelEl) {
      try {
        this.contextPanel = new ContextPanel(contextPanelEl, this.plugin, this);
        await this.contextPanel.onload();
        
        if (this.plugin.settings.debugMode) {
          console.log('ContextPanel initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize ContextPanel:', error);
        // Fallback to placeholder
        contextPanelEl.createEl('div', { 
          cls: 'vp-panel-placeholder',
          text: 'Context Panel - Failed to Load'
        });
      }
    }
    
    // Initialize Main Panel
    if (mainPanelEl) {
      try {
        this.mainPanel = new MainPanel(mainPanelEl, this.plugin, this);
        await this.mainPanel.onload();
        
        if (this.plugin.settings.debugMode) {
          console.log('MainPanel initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize MainPanel:', error);
        // Fallback to placeholder
        this.createMainPanelPlaceholder(mainPanelEl);
      }
    }
    
    // Initialize AI Panel  
    if (aiPanelEl) {
      try {
        this.aiPanel = new AIPanel(aiPanelEl, this.plugin, this);
        await this.aiPanel.onload();
        
        if (this.plugin.settings.debugMode) {
          console.log('AIPanel initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize AIPanel:', error);
        // Fallback to placeholder
        aiPanelEl.createEl('div', { 
          cls: 'vp-panel-placeholder',
          text: 'AI Panel - Failed to Load'
        });
      }
    }
  }

  private createMainPanelPlaceholder(mainPanelEl: HTMLElement): void {
    const modeContent = mainPanelEl.createEl('div', {
      cls: 'vp-main-panel-content',
      attr: { 'data-mode': this.state.mode }
    });
    
    const header = modeContent.createEl('div', { cls: 'vp-main-panel-header' });
    header.createEl('h2', { text: `${this.state.mode.charAt(0).toUpperCase() + this.state.mode.slice(1)} Mode` });
    
    const content = modeContent.createEl('div', { cls: 'vp-main-panel-body' });
    content.createEl('p', { text: `${this.state.mode} functionality will be integrated here.` });
    
    // Add mode-specific placeholders
    switch (this.state.mode) {
      case 'chat':
        content.createEl('div', { cls: 'vp-chat-placeholder', text: 'Chat interface integration pending' });
        break;
      case 'workflow':
        content.createEl('div', { cls: 'vp-workflow-placeholder', text: 'Workflow builder integration pending' });
        break;
      case 'explorer':
        content.createEl('div', { cls: 'vp-explorer-placeholder', text: 'Vault explorer integration pending' });
        break;
      case 'analytics':
        content.createEl('div', { cls: 'vp-analytics-placeholder', text: 'Analytics dashboard integration pending' });
        break;
    }
  }

  private setupEventListeners(): void {
    // Listen for Obsidian workspace changes
    this.plugin.app.workspace.on('layout-change', () => {
      this.handleLayoutChange();
    });
    
    // Listen for theme changes
    this.plugin.app.workspace.on('css-change', () => {
      this.handleThemeChange();
    });
    
    // Listen for vault changes that might affect context
    this.plugin.app.vault.on('create', () => {
      this.events.trigger('vault-changed');
    });
    
    this.plugin.app.vault.on('delete', () => {
      this.events.trigger('vault-changed');
    });
    
    this.plugin.app.vault.on('rename', () => {
      this.events.trigger('vault-changed');
    });
  }

  private setupKeyboardShortcuts(): void {
    if (!this.state.preferences.keyboardShortcutsEnabled) return;
    
    // Mode switching shortcuts (Cmd/Ctrl + 1-4)
    this.plugin.addCommand({
      id: 'switch-to-chat',
      name: 'Switch to Chat Mode',
      hotkeys: [{ modifiers: ['Mod'], key: '1' }],
      callback: () => this.switchMode('chat')
    });
    
    this.plugin.addCommand({
      id: 'switch-to-workflow',
      name: 'Switch to Workflow Mode',
      hotkeys: [{ modifiers: ['Mod'], key: '2' }],
      callback: () => this.switchMode('workflow')
    });
    
    this.plugin.addCommand({
      id: 'switch-to-explorer',
      name: 'Switch to Explorer Mode',
      hotkeys: [{ modifiers: ['Mod'], key: '3' }],
      callback: () => this.switchMode('explorer')
    });
    
    this.plugin.addCommand({
      id: 'switch-to-analytics',
      name: 'Switch to Analytics Mode',
      hotkeys: [{ modifiers: ['Mod'], key: '4' }],
      callback: () => this.switchMode('analytics')
    });
    
    // Panel toggle shortcuts
    this.plugin.addCommand({
      id: 'toggle-context-panel',
      name: 'Toggle Context Panel',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'c' }],
      callback: () => this.togglePanel('context')
    });
    
    this.plugin.addCommand({
      id: 'toggle-ai-panel',
      name: 'Toggle AI Panel',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'a' }],
      callback: () => this.togglePanel('ai')
    });
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.containerEl) {
          this.handleWorkspaceResize();
        }
      }
    });
    
    this.resizeObserver.observe(this.containerEl);
  }

  // Public API Methods

  public async switchMode(mode: WorkspaceMode): Promise<void> {
    if (this.state.mode === mode) return;
    
    const previousMode = this.state.mode;
    this.state.mode = mode;
    
    // Update mode buttons
    this.updateModeButtons();
    
    // Update main panel to new mode
    if (this.mainPanel) {
      await this.mainPanel.switchToMode(mode);
    } else {
      // Fallback: update placeholder content
      await this.updateMainPanelContent();
    }
    
    // Save state
    await this.saveState();
    
    // Emit event
    this.events.trigger('mode-changed', mode);
    
    if (this.plugin.settings.debugMode) {
      console.log(`Switched from ${previousMode} to ${mode} mode`);
    }
  }

  public togglePanel(panel: 'context' | 'ai'): void {
    const isCollapsed = this.state.panels[panel].collapsed;
    this.state.panels[panel].collapsed = !isCollapsed;
    
    // Update DOM
    const panelEl = this.containerEl.querySelector(`.vp-${panel}-panel`) as HTMLElement;
    if (panelEl) {
      panelEl.toggleClass('vp-panel-collapsed', this.state.panels[panel].collapsed);
    }
    
    // Update toggle button
    const toggleButton = this.containerEl.querySelector(
      `.vp-panel-toggle[aria-label*="${panel}"]`
    ) as HTMLButtonElement;
    if (toggleButton) {
      toggleButton.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
    }
    
    // Save state
    this.saveState();
    
    // Emit event
    this.events.trigger('panel-toggled', panel, this.state.panels[panel].collapsed);
  }

  public updatePanelWidth(panel: 'context' | 'ai', width: number): void {
    this.state.panels[panel].width = width;
    
    const panelEl = this.containerEl.querySelector(`.vp-${panel}-panel`) as HTMLElement;
    if (panelEl) {
      panelEl.style.width = `${width}px`;
    }
  }

  public async updateState(newState: Partial<WorkspaceState>): Promise<void> {
    this.state = { ...this.state, ...newState };
    await this.applyState();
    await this.saveState();
    this.events.trigger('state-updated', newState);
  }

  public getState(): Readonly<WorkspaceState> {
    return { ...this.state };
  }

  public updateContextSources(sources: any[]): void {
    // Update main panel with new context sources
    if (this.mainPanel && typeof this.mainPanel.updateContext === 'function') {
      this.mainPanel.updateContext(sources);
    }
    
    // Emit context update event
    this.events.trigger('context-updated', sources);
  }

  public getContextPanel(): ContextPanel | undefined {
    return this.contextPanel;
  }

  public getMainPanel(): MainPanel | undefined {
    return this.mainPanel;
  }

  public getAIPanel(): AIPanel | undefined {
    return this.aiPanel;
  }

  public on<T extends keyof WorkspaceEvents>(event: T, callback: WorkspaceEvents[T]): void {
    this.events.on(event, callback as any);
  }

  public off<T extends keyof WorkspaceEvents>(event: T, callback: WorkspaceEvents[T]): void {
    this.events.off(event, callback as any);
  }

  // Private utility methods

  private updateModeButtons(): void {
    const modeButtons = this.containerEl.querySelectorAll('.vp-mode-button');
    modeButtons.forEach((button) => {
      const mode = button.getAttribute('data-mode');
      const isActive = mode === this.state.mode;
      
      button.toggleClass('vp-mode-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  private async updateMainPanelContent(): Promise<void> {
    const mainPanelEl = this.containerEl.querySelector('.vp-main-panel') as HTMLElement;
    if (mainPanelEl) {
      // Clear existing content
      mainPanelEl.empty();
      
      // Create new content for current mode
      this.createMainPanelPlaceholder(mainPanelEl);
    }
  }

  private async applyState(): Promise<void> {
    // Apply panel states
    Object.entries(this.state.panels).forEach(([panelName, panelState]) => {
      const panelEl = this.containerEl.querySelector(`.vp-${panelName}-panel`) as HTMLElement;
      if (panelEl) {
        panelEl.toggleClass('vp-panel-collapsed', panelState.collapsed);
        panelEl.style.width = `${panelState.width}px`;
      }
    });
    
    // Update mode
    this.updateModeButtons();
    await this.updateMainPanelContent();
  }

  private async loadState(): Promise<void> {
    try {
      const savedState = await this.plugin.loadData();
      if (savedState?.workspaceState) {
        this.state = { ...this.state, ...savedState.workspaceState };
      }
    } catch (error) {
      console.warn('Failed to load workspace state, using defaults:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      const pluginData = await this.plugin.loadData() || {};
      pluginData.workspaceState = this.state;
      await this.plugin.saveData(pluginData);
    } catch (error) {
      console.error('Failed to save workspace state:', error);
    }
  }

  private handleLayoutChange(): void {
    // Respond to Obsidian layout changes
    this.handleWorkspaceResize();
  }

  private handleThemeChange(): void {
    // Respond to theme changes by ensuring proper CSS class application
    this.containerEl.addClass('vp-workspace');
  }

  private handleWorkspaceResize(): void {
    // Handle responsive behavior for mobile/small screens
    const containerWidth = this.containerEl.clientWidth;
    
    if (containerWidth < 768) {
      // Mobile mode: auto-collapse panels
      if (this.state.preferences.autoCollapsePanels) {
        this.state.panels.context.collapsed = true;
        this.state.panels.ai.collapsed = true;
        this.applyState();
      }
    }
  }

  // Week 8: Integration testing methods

  /**
   * Initialize integration tester
   */
  private initializeIntegrationTester(): void {
    if (!this.integrationTester) {
      this.integrationTester = new IntegrationTester(this.plugin, this);
      this.addChild(this.integrationTester);
    }
  }

  /**
   * Run full integration test suite
   */
  async runIntegrationTests(): Promise<IntegrationTestSuite> {
    this.initializeIntegrationTester();
    
    if (!this.integrationTester) {
      throw new Error('Integration tester not initialized');
    }
    
    return await this.integrationTester.runFullTestSuite();
  }

  /**
   * Export integration test results
   */
  async exportTestResults(): Promise<void> {
    if (!this.integrationTester) {
      throw new Error('No test results available. Run tests first.');
    }
    
    await this.integrationTester.exportTestResults();
  }

  /**
   * Get workspace container for testing
   */
  public getWorkspaceContainer(): HTMLElement {
    return this.containerEl;
  }


  // Component lifecycle
  onunload(): void {
    // Clean up panel components
    if (this.contextPanel) {
      this.contextPanel.onunload();
      this.contextPanel = undefined;
    }
    
    if (this.mainPanel) {
      this.mainPanel.onunload();
      this.mainPanel = undefined;
    }
    
    if (this.aiPanel) {
      this.aiPanel.onunload();
      this.aiPanel = undefined;
    }
    
    // Clean up observers
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    // Clean up event listeners
    this.events.offref(this);
    
    // Save final state
    this.saveState().catch(console.error);
    
    super.onunload();
  }
}