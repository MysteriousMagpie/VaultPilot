/**
 * VaultPilot Context Panel
 * 
 * Manages vault state, context sources, and quick actions within the unified workspace.
 * Provides transparent view into what information the AI is using for responses.
 */

import { Component, TFile, Notice, setIcon } from 'obsidian';
import VaultPilotPlugin from '../../main';
import { WorkspaceManager } from '../WorkspaceManager';
import { VPButton, createButton } from '../../design-system/components/core/Button';

export interface ContextSource {
  id: string;
  type: 'file' | 'selection' | 'vault' | 'external';
  name: string;
  active: boolean;
  confidence: number; // 0-1
  lastUsed: Date;
  size?: number;
  preview?: string;
  metadata?: Record<string, any>;
}

export interface VaultState {
  totalFiles: number;
  totalSize: number;
  health: 'good' | 'warning' | 'error';
  lastSynced: Date;
  activeSources: number;
  recentActivity: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  callback: () => void;
  enabled: boolean;
  shortcut?: string;
}

export class ContextPanel extends Component {
  private plugin: VaultPilotPlugin;
  private workspace: WorkspaceManager;
  private containerEl: HTMLElement;
  
  // State
  private contextSources: Map<string, ContextSource> = new Map();
  private vaultState: VaultState;
  private quickActions: QuickAction[] = [];
  
  // UI Elements
  private headerEl?: HTMLElement;
  private vaultStateEl?: HTMLElement;
  private contextSourcesEl?: HTMLElement;
  private quickActionsEl?: HTMLElement;
  private addContextButton?: VPButton;

  constructor(containerEl: HTMLElement, plugin: VaultPilotPlugin, workspace: WorkspaceManager) {
    super();
    this.containerEl = containerEl;
    this.plugin = plugin;
    this.workspace = workspace;
    this.vaultState = this.getInitialVaultState();
    this.setupQuickActions();
  }

  async onload(): Promise<void> {
    try {
      // Setup container
      this.containerEl.empty();
      this.containerEl.addClass('vp-context-panel');
      this.containerEl.setAttribute('role', 'complementary');
      this.containerEl.setAttribute('aria-label', 'Context and Vault Management');

      // Create panel structure
      this.createPanelHeader();
      this.createVaultStateSection();
      this.createContextSourcesSection();
      this.createQuickActionsSection();

      // Initialize data
      await this.refreshVaultState();
      await this.loadContextSources();

      // Setup event listeners
      this.setupEventListeners();

      // Initial render
      this.render();

      if (this.plugin.settings.debugMode) {
        console.log('ContextPanel loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load ContextPanel:', error);
      throw error;
    }
  }

  private createPanelHeader(): void {
    this.headerEl = this.containerEl.createEl('div', {
      cls: 'vp-context-panel-header',
      attr: { 'role': 'banner' }
    });

    const titleContainer = this.headerEl.createEl('div', { cls: 'vp-panel-title-container' });
    
    const titleEl = titleContainer.createEl('h3', {
      cls: 'vp-panel-title',
      text: 'Context & Vault'
    });

    const actionsContainer = this.headerEl.createEl('div', { cls: 'vp-panel-actions' });
    
    // Add context button
    this.addContextButton = createButton(actionsContainer, {
      variant: 'secondary',
      size: 'xs',
      icon: 'plus',
      ariaLabel: 'Add context source',
      onClick: () => this.showAddContextMenu()
    });

    // Refresh button
    createButton(actionsContainer, {
      variant: 'tertiary',
      size: 'xs',
      icon: 'refresh-cw',
      ariaLabel: 'Refresh vault state',
      onClick: () => this.refreshVaultState()
    });
  }

  private createVaultStateSection(): void {
    const section = this.containerEl.createEl('div', {
      cls: 'vp-context-section vp-vault-state-section'
    });

    const sectionHeader = section.createEl('div', { cls: 'vp-section-header' });
    sectionHeader.createEl('h4', { text: 'Vault State', cls: 'vp-section-title' });
    
    this.vaultStateEl = section.createEl('div', {
      cls: 'vp-vault-state',
      attr: { 'role': 'region', 'aria-label': 'Vault Status' }
    });
  }

  private createContextSourcesSection(): void {
    const section = this.containerEl.createEl('div', {
      cls: 'vp-context-section vp-context-sources-section'
    });

    const sectionHeader = section.createEl('div', { cls: 'vp-section-header' });
    const titleContainer = sectionHeader.createEl('div', { cls: 'vp-section-title-container' });
    titleContainer.createEl('h4', { text: 'Active Context', cls: 'vp-section-title' });
    
    const badge = titleContainer.createEl('span', {
      cls: 'vp-context-count-badge',
      text: '0'
    });

    this.contextSourcesEl = section.createEl('div', {
      cls: 'vp-context-sources',
      attr: { 'role': 'list', 'aria-label': 'Context Sources' }
    });
  }

  private createQuickActionsSection(): void {
    const section = this.containerEl.createEl('div', {
      cls: 'vp-context-section vp-quick-actions-section'
    });

    const sectionHeader = section.createEl('div', { cls: 'vp-section-header' });
    sectionHeader.createEl('h4', { text: 'Quick Actions', cls: 'vp-section-title' });
    
    this.quickActionsEl = section.createEl('div', {
      cls: 'vp-quick-actions',
      attr: { 'role': 'toolbar', 'aria-label': 'Quick Actions' }
    });
  }

  private getInitialVaultState(): VaultState {
    const files = this.plugin.app.vault.getMarkdownFiles();
    return {
      totalFiles: files.length,
      totalSize: 0, // Will be calculated later
      health: 'good',
      lastSynced: new Date(),
      activeSources: 0,
      recentActivity: []
    };
  }

  private setupQuickActions(): void {
    this.quickActions = [
      {
        id: 'add-current-file',
        label: 'Add Current File',
        icon: 'file-plus',
        description: 'Add the currently active file to context',
        callback: () => this.addCurrentFileToContext(),
        enabled: true,
        shortcut: 'Cmd+Shift+A'
      },
      {
        id: 'add-selection',
        label: 'Add Selection',
        icon: 'text-select',
        description: 'Add selected text to context',
        callback: () => this.addSelectionToContext(),
        enabled: false, // Will be enabled when text is selected
        shortcut: 'Cmd+Shift+S'
      },
      {
        id: 'clear-context',
        label: 'Clear All',
        icon: 'trash-2',
        description: 'Remove all context sources',
        callback: () => this.clearAllContext(),
        enabled: true
      },
      {
        id: 'export-context',
        label: 'Export Context',
        icon: 'download',
        description: 'Export current context as markdown',
        callback: () => this.exportContext(),
        enabled: true
      }
    ];
  }

  private setupEventListeners(): void {
    // Listen for file changes
    this.plugin.app.vault.on('create', this.handleVaultChange.bind(this));
    this.plugin.app.vault.on('delete', this.handleVaultChange.bind(this));
    this.plugin.app.vault.on('rename', this.handleVaultChange.bind(this));
    this.plugin.app.vault.on('modify', this.handleVaultChange.bind(this));

    // Listen for active leaf changes
    this.plugin.app.workspace.on('active-leaf-change', this.handleActiveFileChange.bind(this));

    // Listen for selection changes
    this.registerDomEvent(document, 'selectionchange', this.handleSelectionChange.bind(this));

    // Listen for workspace events
    this.workspace.on('mode-changed', this.handleModeChange.bind(this));
  }

  private async refreshVaultState(): Promise<void> {
    try {
      const files = this.plugin.app.vault.getMarkdownFiles();
      let totalSize = 0;

      // Calculate total vault size (sample first 100 files for performance)
      const filesToSample = files.slice(0, 100);
      for (const file of filesToSample) {
        totalSize += file.stat.size;
      }

      // Estimate total size if we sampled
      if (files.length > 100) {
        totalSize = (totalSize / 100) * files.length;
      }

      this.vaultState = {
        totalFiles: files.length,
        totalSize,
        health: this.calculateVaultHealth(files),
        lastSynced: new Date(),
        activeSources: this.contextSources.size,
        recentActivity: this.getRecentActivity()
      };

      this.renderVaultState();
    } catch (error) {
      console.error('Failed to refresh vault state:', error);
      this.vaultState.health = 'error';
      this.renderVaultState();
    }
  }

  private calculateVaultHealth(files: TFile[]): 'good' | 'warning' | 'error' {
    if (files.length === 0) return 'warning';
    if (files.length > 10000) return 'warning'; // Large vault warning
    return 'good';
  }

  private getRecentActivity(): string[] {
    // Get recent file modifications
    const files = this.plugin.app.vault.getMarkdownFiles();
    const recentFiles = files
      .sort((a: TFile, b: TFile) => b.stat.mtime - a.stat.mtime)
      .slice(0, 5)
      .map((file: TFile) => `Modified ${file.basename}`);
    
    return recentFiles;
  }

  private async loadContextSources(): Promise<void> {
    // Load context sources from workspace state or create defaults
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (activeFile) {
      await this.addFileToContext(activeFile);
    }
  }

  private render(): void {
    this.renderVaultState();
    this.renderContextSources();
    this.renderQuickActions();
  }

  private renderVaultState(): void {
    if (!this.vaultStateEl) return;

    this.vaultStateEl.empty();

    // Health indicator
    const healthContainer = this.vaultStateEl.createEl('div', { cls: 'vp-vault-health' });
    const healthIndicator = healthContainer.createEl('div', {
      cls: `vp-health-indicator vp-health-${this.vaultState.health}`,
      attr: { 'aria-label': `Vault health: ${this.vaultState.health}` }
    });
    
    const healthIcon = this.vaultState.health === 'good' ? 'check-circle' : 
                       this.vaultState.health === 'warning' ? 'alert-triangle' : 'x-circle';
    setIcon(healthIndicator, healthIcon);

    healthContainer.createEl('span', { 
      text: `Vault ${this.vaultState.health}`,
      cls: 'vp-health-text'
    });

    // Stats
    const statsContainer = this.vaultStateEl.createEl('div', { cls: 'vp-vault-stats' });
    
    const filesStat = statsContainer.createEl('div', { cls: 'vp-stat' });
    filesStat.createEl('span', { text: this.vaultState.totalFiles.toString(), cls: 'vp-stat-value' });
    filesStat.createEl('span', { text: 'files', cls: 'vp-stat-label' });

    const sizeStat = statsContainer.createEl('div', { cls: 'vp-stat' });
    sizeStat.createEl('span', { 
      text: this.formatBytes(this.vaultState.totalSize), 
      cls: 'vp-stat-value' 
    });
    sizeStat.createEl('span', { text: 'size', cls: 'vp-stat-label' });

    const contextStat = statsContainer.createEl('div', { cls: 'vp-stat' });
    contextStat.createEl('span', { 
      text: this.vaultState.activeSources.toString(), 
      cls: 'vp-stat-value' 
    });
    contextStat.createEl('span', { text: 'active', cls: 'vp-stat-label' });

    // Last synced
    const syncInfo = this.vaultStateEl.createEl('div', { cls: 'vp-sync-info' });
    syncInfo.createEl('span', { 
      text: `Updated ${this.formatRelativeTime(this.vaultState.lastSynced)}`,
      cls: 'vp-sync-text'
    });
  }

  private renderContextSources(): void {
    if (!this.contextSourcesEl) return;

    this.contextSourcesEl.empty();

    // Update badge count
    const badge = this.containerEl.querySelector('.vp-context-count-badge');
    if (badge) {
      badge.textContent = this.contextSources.size.toString();
    }

    if (this.contextSources.size === 0) {
      const emptyState = this.contextSourcesEl.createEl('div', { cls: 'vp-empty-state' });
      emptyState.createEl('p', { 
        text: 'No context sources active',
        cls: 'vp-empty-text'
      });
      
      createButton(emptyState, {
        variant: 'secondary',
        size: 'sm',
        children: 'Add Current File',
        onClick: () => this.addCurrentFileToContext()
      });
      return;
    }

    // Render context sources
    Array.from(this.contextSources.values()).forEach(source => {
      this.renderContextSource(source);
    });
  }

  private renderContextSource(source: ContextSource): void {
    if (!this.contextSourcesEl) return;

    const sourceEl = this.contextSourcesEl.createEl('div', {
      cls: `vp-context-source ${source.active ? 'vp-source-active' : 'vp-source-inactive'}`,
      attr: { 'role': 'listitem', 'data-source-id': source.id }
    });

    // Source header
    const headerEl = sourceEl.createEl('div', { cls: 'vp-source-header' });
    
    const iconEl = headerEl.createEl('div', { cls: 'vp-source-icon' });
    const sourceIcon = source.type === 'file' ? 'file-text' : 
                       source.type === 'selection' ? 'text-select' :
                       source.type === 'vault' ? 'folder' : 'external-link';
    setIcon(iconEl, sourceIcon);

    const infoEl = headerEl.createEl('div', { cls: 'vp-source-info' });
    infoEl.createEl('div', { text: source.name, cls: 'vp-source-name' });
    infoEl.createEl('div', { 
      text: `${source.type} • ${this.formatRelativeTime(source.lastUsed)}`,
      cls: 'vp-source-meta'
    });

    // Toggle button
    const toggleEl = headerEl.createEl('button', {
      cls: `vp-source-toggle ${source.active ? 'vp-toggle-active' : ''}`,
      attr: { 
        'aria-label': `${source.active ? 'Disable' : 'Enable'} ${source.name}`,
        'aria-pressed': source.active ? 'true' : 'false'
      }
    });
    
    toggleEl.addEventListener('click', () => this.toggleContextSource(source.id));

    // Confidence indicator
    if (source.confidence > 0) {
      const confidenceEl = sourceEl.createEl('div', { cls: 'vp-source-confidence' });
      const confidenceLevel = source.confidence > 0.8 ? 'high' : 
                              source.confidence > 0.5 ? 'moderate' : 'low';
      
      confidenceEl.createEl('div', {
        cls: `vp-confidence-bar vp-confidence-${confidenceLevel}`,
        attr: { 'aria-label': `Confidence: ${Math.round(source.confidence * 100)}%` }
      }).style.width = `${source.confidence * 100}%`;
    }

    // Preview (if available)
    if (source.preview) {
      const previewEl = sourceEl.createEl('div', { cls: 'vp-source-preview' });
      previewEl.createEl('p', { text: source.preview });
    }

    // Remove button
    const removeBtn = sourceEl.createEl('button', {
      cls: 'vp-source-remove',
      attr: { 'aria-label': `Remove ${source.name} from context` }
    });
    setIcon(removeBtn, 'x');
    removeBtn.addEventListener('click', () => this.removeContextSource(source.id));
  }

  private renderQuickActions(): void {
    if (!this.quickActionsEl) return;

    this.quickActionsEl.empty();

    this.quickActions.forEach(action => {
      const actionButton = createButton(this.quickActionsEl!, {
        variant: 'tertiary',
        size: 'sm',
        icon: action.icon,
        children: action.label,
        disabled: !action.enabled,
        ariaLabel: action.description,
        onClick: action.callback
      });

      if (action.shortcut) {
        actionButton.getElement().title = `${action.description} (${action.shortcut})`;
      }
    });
  }

  // Event Handlers

  private handleVaultChange(): void {
    // Debounce vault state refresh
    clearTimeout((this as any).vaultRefreshTimeout);
    (this as any).vaultRefreshTimeout = setTimeout(() => {
      this.refreshVaultState();
    }, 1000);
  }

  private handleActiveFileChange(): void {
    this.updateQuickActionStates();
  }

  private handleSelectionChange(): void {
    const hasSelection = (window.getSelection()?.toString().trim().length ?? 0) > 0;
    const selectionAction = this.quickActions.find(a => a.id === 'add-selection');
    if (selectionAction) {
      selectionAction.enabled = hasSelection;
      this.renderQuickActions();
    }
  }

  private handleModeChange(mode: string): void {
    // Update context panel based on mode
    if (this.plugin.settings.debugMode) {
      console.log(`Context panel responding to mode change: ${mode}`);
    }
  }

  // Context Management Methods

  public async addCurrentFileToContext(): Promise<void> {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file to add to context');
      return;
    }

    await this.addFileToContext(activeFile);
  }

  public async addFileToContext(file: TFile): Promise<void> {
    const existingSource = this.contextSources.get(file.path);
    if (existingSource) {
      existingSource.lastUsed = new Date();
      existingSource.active = true;
      this.render();
      return;
    }

    try {
      const content = await this.plugin.app.vault.read(file);
      const source: ContextSource = {
        id: file.path,
        type: 'file',
        name: file.basename,
        active: true,
        confidence: 1.0,
        lastUsed: new Date(),
        size: file.stat.size,
        preview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        metadata: {
          path: file.path,
          extension: file.extension,
          created: new Date(file.stat.ctime),
          modified: new Date(file.stat.mtime)
        }
      };

      this.contextSources.set(source.id, source);
      this.vaultState.activeSources = this.contextSources.size;
      this.render();

      new Notice(`Added ${file.basename} to context`);
    } catch (error) {
      console.error('Failed to add file to context:', error);
      new Notice('Failed to add file to context');
    }
  }

  public async addSelectionToContext(): Promise<void> {
    const selection = window.getSelection()?.toString().trim();
    if (!selection) {
      new Notice('No text selected');
      return;
    }

    const selectionId = `selection-${Date.now()}`;
    const source: ContextSource = {
      id: selectionId,
      type: 'selection',
      name: `Selection (${selection.substring(0, 20)}...)`,
      active: true,
      confidence: 0.9,
      lastUsed: new Date(),
      size: selection.length,
      preview: selection.substring(0, 200) + (selection.length > 200 ? '...' : ''),
      metadata: {
        fullText: selection,
        sourceFile: this.plugin.app.workspace.getActiveFile()?.path
      }
    };

    this.contextSources.set(source.id, source);
    this.vaultState.activeSources = this.contextSources.size;
    this.render();

    new Notice('Added selection to context');
  }

  public toggleContextSource(sourceId: string): void {
    const source = this.contextSources.get(sourceId);
    if (!source) return;

    source.active = !source.active;
    source.lastUsed = new Date();
    this.render();

    new Notice(`${source.active ? 'Enabled' : 'Disabled'} ${source.name}`);
  }

  public removeContextSource(sourceId: string): void {
    const source = this.contextSources.get(sourceId);
    if (!source) return;

    this.contextSources.delete(sourceId);
    this.vaultState.activeSources = this.contextSources.size;
    this.render();

    new Notice(`Removed ${source.name} from context`);
  }

  public clearAllContext(): void {
    const count = this.contextSources.size;
    this.contextSources.clear();
    this.vaultState.activeSources = 0;
    this.render();

    new Notice(`Cleared ${count} context sources`);
  }

  public async exportContext(): Promise<void> {
    if (this.contextSources.size === 0) {
      new Notice('No context to export');
      return;
    }

    try {
      let exportContent = '# VaultPilot Context Export\n\n';
      exportContent += `Generated: ${new Date().toISOString()}\n\n`;

      for (const source of this.contextSources.values()) {
        if (!source.active) continue;

        exportContent += `## ${source.name}\n\n`;
        exportContent += `- **Type**: ${source.type}\n`;
        exportContent += `- **Confidence**: ${Math.round(source.confidence * 100)}%\n`;
        exportContent += `- **Last Used**: ${source.lastUsed.toISOString()}\n\n`;

        if (source.preview) {
          exportContent += `### Preview\n\n\`\`\`\n${source.preview}\n\`\`\`\n\n`;
        }
      }

      const filename = `VaultPilot Context Export ${new Date().toISOString().split('T')[0]}.md`;
      await this.plugin.app.vault.create(filename, exportContent);
      new Notice(`Context exported to ${filename}`);
    } catch (error) {
      console.error('Failed to export context:', error);
      new Notice('Failed to export context');
    }
  }

  private showAddContextMenu(): void {
    // TODO: Implement context menu for adding different types of context
    new Notice('Add context menu - Coming soon!');
  }

  private updateQuickActionStates(): void {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    const addFileAction = this.quickActions.find(a => a.id === 'add-current-file');
    if (addFileAction) {
      addFileAction.enabled = !!activeFile;
    }

    const hasContext = this.contextSources.size > 0;
    const clearAction = this.quickActions.find(a => a.id === 'clear-context');
    const exportAction = this.quickActions.find(a => a.id === 'export-context');
    
    if (clearAction) clearAction.enabled = hasContext;
    if (exportAction) exportAction.enabled = hasContext;

    this.renderQuickActions();
  }

  // Public API

  public getActiveContextSources(): ContextSource[] {
    return Array.from(this.contextSources.values()).filter(source => source.active);
  }

  public getVaultState(): Readonly<VaultState> {
    return { ...this.vaultState };
  }

  public getContextSource(id: string): ContextSource | undefined {
    return this.contextSources.get(id);
  }

  // Utility Methods

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // Component lifecycle
  onunload(): void {
    // Clear timeouts
    clearTimeout((this as any).vaultRefreshTimeout);
    
    // Remove event listeners (handled automatically by Obsidian)
    super.onunload();
  }
}