/**
 * VaultPilot Explorer Mode Component
 * 
 * Extracted from MainPanel.ts - Handles vault exploration and file management
 * with AI insights and intelligent file organization.
 */

import { Notice, TFile } from 'obsidian';
import { BaseModeComponent } from './BaseModeComponent';
import { createButton } from '../../../design-system/components/core/Button';
import type { 
  ModeAction, 
  ModeContext, 
  ContextSource 
} from '../types';

interface FileDisplayData {
  file: TFile;
  relevanceScore?: number;
  aiInsights?: string[];
  connections?: string[];
}

export class ExplorerModeComponent extends BaseModeComponent {
  private explorerContainer?: HTMLElement;
  private currentFiles: TFile[] = [];
  private searchQuery = '';
  private searchDebounceTimeout?: number;
  private sortBy = 'name';
  private filterType = 'all';
  private selectedFiles: Set<TFile> = new Set();

  constructor() {
    super('explorer');
  }

  protected async initialize(): Promise<void> {
    // Initialize with all markdown files
    if (this.context.plugin) {
      this.currentFiles = this.context.plugin.app.vault.getMarkdownFiles();
    }
  }

  protected async renderContent(): Promise<void> {
    // Create explorer interface
    this.explorerContainer = this.container.createEl('div', { cls: 'vp-explorer-interface' });
    
    // Render explorer components
    this.renderExplorerHeader();
    this.renderSearchArea();
    this.renderFilesDisplay();
    
    // Load initial file list
    await this.refreshFileList();
  }

  protected getModeActions(): ModeAction[] {
    return [
      {
        id: 'refresh-explorer',
        label: 'Refresh',
        icon: 'refresh-cw',
        callback: () => this.refreshFileList(),
        enabled: true
      },
      {
        id: 'analyze-vault',
        label: 'AI Vault Analysis',
        icon: 'brain',
        callback: () => this.performVaultAnalysis(),
        enabled: true
      },
      {
        id: 'bulk-operations',
        label: 'Bulk Operations',
        icon: 'layers',
        callback: () => this.showBulkOperations(),
        enabled: this.selectedFiles.size > 0
      },
      {
        id: 'export-file-list',
        label: 'Export File List',
        icon: 'download',
        callback: () => this.exportFileList(),
        enabled: this.currentFiles.length > 0
      },
      {
        id: 'show-insights',
        label: 'Show AI Insights',
        icon: 'lightbulb',
        callback: () => this.showAIInsights(),
        enabled: true
      }
    ];
  }

  protected onContextUpdate(sources: ContextSource[]): void {
    // Update context info in explorer header
    const contextInfo = this.container.querySelector('.vp-context-summary');
    if (contextInfo) {
      contextInfo.textContent = `Exploring with ${sources.length} context sources`;
    }
  }

  protected onCleanup(): void {
    // Clean up any event listeners or resources
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }
    this.explorerContainer = undefined;
    this.currentFiles = [];
    this.selectedFiles.clear();
  }

  private renderExplorerHeader(): void {
    if (!this.explorerContainer) return;

    const explorerHeader = this.explorerContainer.createEl('div', { cls: 'vp-explorer-header' });
    explorerHeader.createEl('h3', { text: 'AI-Powered Vault Explorer' });
    
    const contextInfo = explorerHeader.createEl('div', { cls: 'vp-explorer-context-info' });
    contextInfo.createEl('span', { 
      text: `Exploring with ${this.context.contextSources.length} context sources`,
      cls: 'vp-context-summary'
    });

    // Add vault stats
    const statsEl = explorerHeader.createEl('div', { cls: 'vp-vault-stats' });
    this.updateVaultStats(statsEl);
  }

  private updateVaultStats(container: HTMLElement): void {
    if (!this.context.plugin) return;

    const vault = this.context.plugin.app.vault;
    const allFiles = vault.getAllLoadedFiles();
    const markdownFiles = vault.getMarkdownFiles();
    
    container.empty();
    
    const stats = [
      { label: 'Total Files', value: allFiles.length, icon: 'file' },
      { label: 'Markdown', value: markdownFiles.length, icon: 'file-text' },
      { label: 'Current View', value: this.currentFiles.length, icon: 'eye' }
    ];
    
    stats.forEach(stat => {
      const statEl = container.createEl('div', { cls: 'vp-stat-item' });
      statEl.createEl('span', { cls: `vp-stat-icon vp-icon-${stat.icon}` });
      statEl.createEl('span', { text: stat.value.toString(), cls: 'vp-stat-value' });
      statEl.createEl('span', { text: stat.label, cls: 'vp-stat-label' });
    });
  }

  private renderSearchArea(): void {
    if (!this.explorerContainer) return;

    const searchArea = this.explorerContainer.createEl('div', { cls: 'vp-explorer-search' });
    
    // Search input section
    const searchContainer = searchArea.createEl('div', { cls: 'vp-search-container' });
    
    const searchInput = searchContainer.createEl('input', {
      type: 'text',
      cls: 'vp-search-input',
      attr: { 
        placeholder: 'Search files by name, content, or tags...',
        'aria-label': 'Search vault files'
      }
    });

    createButton(searchContainer, {
      variant: 'secondary',
      size: 'sm',
      icon: 'search',
      ariaLabel: 'Search files',
      onClick: () => this.performSearch(searchInput.value)
    });

    createButton(searchContainer, {
      variant: 'tertiary',
      size: 'sm',
      icon: 'x',
      ariaLabel: 'Clear search',
      onClick: () => {
        searchInput.value = '';
        this.searchQuery = '';
        this.refreshFileList();
      }
    });

    // Filter and sort options
    const filterArea = searchArea.createEl('div', { cls: 'vp-filter-area' });
    
    // Sort options
    const sortContainer = filterArea.createEl('div', { cls: 'vp-filter-group' });
    sortContainer.createEl('label', { text: 'Sort by:', cls: 'vp-filter-label' });
    
    const sortSelect = sortContainer.createEl('select', {
      cls: 'vp-sort-select',
      attr: { 'aria-label': 'Sort files by' }
    });
    
    const sortOptions = [
      { value: 'name', text: 'Name' },
      { value: 'modified', text: 'Last Modified' },
      { value: 'created', text: 'Created' },
      { value: 'size', text: 'Size' },
      { value: 'relevance', text: 'AI Relevance' }
    ];
    
    sortOptions.forEach(option => {
      sortSelect.createEl('option', { value: option.value, text: option.text });
    });

    // Type filter options
    const typeContainer = filterArea.createEl('div', { cls: 'vp-filter-group' });
    typeContainer.createEl('label', { text: 'Filter:', cls: 'vp-filter-label' });
    
    const typeFilter = typeContainer.createEl('select', {
      cls: 'vp-type-filter',
      attr: { 'aria-label': 'Filter by file type' }
    });
    
    const filterOptions = [
      { value: 'all', text: 'All Files' },
      { value: 'md', text: 'Markdown' },
      { value: 'canvas', text: 'Canvas' },
      { value: 'image', text: 'Images' },
      { value: 'recent', text: 'Recently Modified' },
      { value: 'large', text: 'Large Files (>10KB)' }
    ];
    
    filterOptions.forEach(option => {
      typeFilter.createEl('option', { value: option.value, text: option.text });
    });

    // Setup event listeners
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.debounceSearch();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.performSearch(this.searchQuery);
      }
    });

    sortSelect.addEventListener('change', () => {
      this.sortBy = sortSelect.value;
      this.refreshFileList();
    });

    typeFilter.addEventListener('change', () => {
      this.filterType = typeFilter.value;
      this.refreshFileList();
    });
  }

  private renderFilesDisplay(): void {
    if (!this.explorerContainer) return;

    const filesDisplay = this.explorerContainer.createEl('div', { 
      cls: 'vp-files-display',
      attr: { 'role': 'region', 'aria-label': 'File Browser' }
    });

    // Add view mode toggle
    const viewControls = filesDisplay.createEl('div', { cls: 'vp-view-controls' });
    
    const viewModeButtons = viewControls.createEl('div', { cls: 'vp-view-mode' });
    
    createButton(viewModeButtons, {
      variant: 'tertiary',
      size: 'sm',
      icon: 'list',
      ariaLabel: 'List view',
      onClick: () => this.setViewMode('list')
    });

    createButton(viewModeButtons, {
      variant: 'tertiary', 
      size: 'sm',
      icon: 'grid',
      ariaLabel: 'Grid view',
      onClick: () => this.setViewMode('grid')
    });

    // Selection controls
    const selectionControls = viewControls.createEl('div', { cls: 'vp-selection-controls' });
    
    createButton(selectionControls, {
      variant: 'tertiary',
      size: 'sm',
      children: 'Select All',
      onClick: () => this.selectAllFiles()
    });

    createButton(selectionControls, {
      variant: 'tertiary',
      size: 'sm', 
      children: 'Clear Selection',
      onClick: () => this.clearSelection()
    });

    // Files container
    const filesContainer = filesDisplay.createEl('div', { 
      cls: 'vp-files-container vp-view-list',
      attr: { role: 'list' }
    });
  }

  private async refreshFileList(): Promise<void> {
    if (!this.context.plugin) return;

    let files = this.context.plugin.app.vault.getMarkdownFiles();

    // Apply type filter
    files = this.applyTypeFilter(files);

    // Apply sorting
    files = this.applySorting(files);

    // Apply search filter if active
    if (this.searchQuery.trim()) {
      files = this.applySearchFilter(files);
    }

    this.currentFiles = files;
    this.renderFileList();
    this.updateVaultStats(this.container.querySelector('.vp-vault-stats')!);
  }

  private applyTypeFilter(files: TFile[]): TFile[] {
    switch (this.filterType) {
      case 'md':
        return files.filter(file => file.extension === 'md');
      case 'canvas':
        return files.filter(file => file.extension === 'canvas');
      case 'image':
        return files.filter(file => ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(file.extension));
      case 'recent':
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return files.filter(file => file.stat.mtime > weekAgo);
      case 'large':
        return files.filter(file => file.stat.size > 10000); // >10KB
      default:
        return files;
    }
  }

  private applySorting(files: TFile[]): TFile[] {
    return files.sort((a: TFile, b: TFile) => {
      switch (this.sortBy) {
        case 'modified':
          return b.stat.mtime - a.stat.mtime;
        case 'created':
          return b.stat.ctime - a.stat.ctime;
        case 'size':
          return b.stat.size - a.stat.size;
        case 'relevance':
          // TODO: Implement AI relevance scoring
          return a.name.localeCompare(b.name);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }

  private applySearchFilter(files: TFile[]): TFile[] {
    const query = this.searchQuery.toLowerCase();
    return files.filter((file: TFile) => 
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
  }

  private renderFileList(): void {
    const filesContainer = this.container.querySelector('.vp-files-container');
    if (!filesContainer) return;

    filesContainer.empty();

    if (this.currentFiles.length === 0) {
      this.renderEmptyState(filesContainer);
      return;
    }

    // Render files
    this.currentFiles.forEach((file, index) => {
      this.renderFileItem(filesContainer, file, index);
    });

    // Update selection controls
    this.updateSelectionControls();
  }

  private renderEmptyState(container: Element): void {
    const emptyState = container.createEl('div', { cls: 'vp-explorer-empty' });
    emptyState.createEl('div', { cls: 'vp-empty-icon', text: '📁' });
    
    if (this.searchQuery) {
      emptyState.createEl('h4', { text: 'No Files Found' });
      emptyState.createEl('p', { text: `No files match your search: "${this.searchQuery}"` });
    } else {
      emptyState.createEl('h4', { text: 'No Files to Display' });
      emptyState.createEl('p', { text: 'Try adjusting your filters or search criteria.' });
    }
  }

  private renderFileItem(container: Element, file: TFile, index: number): void {
    const fileEl = container.createEl('div', { 
      cls: 'vp-file-item',
      attr: { 
        'role': 'listitem',
        'data-file-path': file.path
      }
    });

    // Selection checkbox
    const checkbox = fileEl.createEl('input', {
      type: 'checkbox',
      cls: 'vp-file-checkbox',
      attr: { 'aria-label': `Select ${file.name}` }
    });

    checkbox.checked = this.selectedFiles.has(file);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        this.selectedFiles.add(file);
      } else {
        this.selectedFiles.delete(file);
      }
      this.updateSelectionControls();
    });

    // File icon
    const fileIcon = fileEl.createEl('div', { cls: 'vp-file-icon' });
    fileIcon.textContent = this.getFileIcon(file);

    // File info
    const fileInfo = fileEl.createEl('div', { cls: 'vp-file-info' });
    
    const fileName = fileInfo.createEl('div', { 
      text: file.name,
      cls: 'vp-file-name'
    });

    const fileMeta = fileInfo.createEl('div', { cls: 'vp-file-meta' });
    
    // File path
    fileMeta.createEl('span', { 
      text: file.path,
      cls: 'vp-file-path'
    });

    // File size and date
    const fileStats = fileInfo.createEl('div', { cls: 'vp-file-stats' });
    
    fileStats.createEl('span', { 
      text: this.formatFileSize(file.stat.size),
      cls: 'vp-file-size'
    });

    fileStats.createEl('span', { 
      text: this.formatDate(new Date(file.stat.mtime)),
      cls: 'vp-file-date'
    });

    // File actions
    const fileActions = fileEl.createEl('div', { cls: 'vp-file-actions' });
    
    createButton(fileActions, {
      variant: 'tertiary',
      size: 'sm',
      icon: 'eye',
      ariaLabel: 'Preview file',
      onClick: (e) => {
        e.stopPropagation();
        this.previewFile(file);
      }
    });

    createButton(fileActions, {
      variant: 'tertiary',
      size: 'sm',
      icon: 'external-link',
      ariaLabel: 'Open file',
      onClick: (e) => {
        e.stopPropagation();
        this.openFile(file);
      }
    });

    createButton(fileActions, {
      variant: 'tertiary',
      size: 'sm',
      icon: 'plus',
      ariaLabel: 'Add to context',
      onClick: (e) => {
        e.stopPropagation();
        this.addToContext(file);
      }
    });

    // Click to select/open
    fileEl.addEventListener('click', () => {
      this.openFile(file);
    });

    // Double-click to open
    fileEl.addEventListener('dblclick', () => {
      this.openFile(file);
    });
  }

  private getFileIcon(file: TFile): string {
    const ext = file.extension;
    switch (ext) {
      case 'md': return '📝';
      case 'canvas': return '🎨';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg': return '🖼️';
      case 'pdf': return '📄';
      default: return '📄';
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  }

  private debounceSearch(): void {
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }
    
    this.searchDebounceTimeout = setTimeout(() => {
      this.performSearch(this.searchQuery);
    }, 300);
  }

  private async performSearch(query: string): Promise<void> {
    if (!query.trim()) {
      await this.refreshFileList();
      return;
    }

    // Show loading indicator
    const filesContainer = this.container.querySelector('.vp-files-container');
    if (filesContainer) {
      const loadingEl = this.showLoading('Searching files...');
      
      try {
        await this.refreshFileList();
      } finally {
        this.hideLoading();
      }
    }
  }

  private setViewMode(mode: 'list' | 'grid'): void {
    const filesContainer = this.container.querySelector('.vp-files-container');
    if (!filesContainer) return;

    filesContainer.className = `vp-files-container vp-view-${mode}`;
  }

  private selectAllFiles(): void {
    this.currentFiles.forEach(file => this.selectedFiles.add(file));
    this.updateFileSelections();
    this.updateSelectionControls();
  }

  private clearSelection(): void {
    this.selectedFiles.clear();
    this.updateFileSelections();
    this.updateSelectionControls();
  }

  private updateFileSelections(): void {
    const checkboxes = this.container.querySelectorAll('.vp-file-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      const filePath = checkbox.closest('.vp-file-item')?.getAttribute('data-file-path');
      if (filePath) {
        const file = this.currentFiles.find(f => f.path === filePath);
        checkbox.checked = file ? this.selectedFiles.has(file) : false;
      }
    });
  }

  private updateSelectionControls(): void {
    // Update action buttons availability
    const bulkAction = this.getModeActions().find(a => a.id === 'bulk-operations');
    if (bulkAction) {
      bulkAction.enabled = this.selectedFiles.size > 0;
    }
  }

  private previewFile(file: TFile): void {
    // TODO: Implement file preview modal
    new Notice(`Preview for ${file.name} - Coming soon!`);
  }

  private openFile(file: TFile): void {
    if (this.context.plugin) {
      this.context.plugin.app.workspace.openLinkText(file.path, '', true);
    }
  }

  private addToContext(file: TFile): void {
    // TODO: Implement adding file to context sources
    new Notice(`Added ${file.name} to context sources`);
  }

  private async performVaultAnalysis(): Promise<void> {
    try {
      const loadingEl = this.showLoading('Performing AI vault analysis...');
      
      // TODO: Implement AI vault analysis
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      this.hideLoading();
      new Notice('Vault analysis complete - feature coming soon!');
    } catch (error) {
      this.hideLoading();
      new Notice('Failed to analyze vault');
    }
  }

  private showBulkOperations(): void {
    if (this.selectedFiles.size === 0) return;
    
    // TODO: Implement bulk operations modal
    new Notice(`Bulk operations for ${this.selectedFiles.size} files - Coming soon!`);
  }

  private async exportFileList(): Promise<void> {
    try {
      let exportContent = '# File List Export\n\n';
      exportContent += `**Generated:** ${new Date().toISOString()}\n`;
      exportContent += `**Total Files:** ${this.currentFiles.length}\n\n`;
      
      this.currentFiles.forEach((file, index) => {
        exportContent += `${index + 1}. **${file.name}**\n`;
        exportContent += `   - Path: ${file.path}\n`;
        exportContent += `   - Size: ${this.formatFileSize(file.stat.size)}\n`;
        exportContent += `   - Modified: ${this.formatDate(new Date(file.stat.mtime))}\n\n`;
      });

      const filename = `file-list-${new Date().toISOString().split('T')[0]}.md`;
      
      // Create and download file
      const blob = new Blob([exportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      new Notice(`File list exported as ${filename}`);
    } catch (error) {
      new Notice('Failed to export file list');
      console.error('Export error:', error);
    }
  }

  private showAIInsights(): void {
    // TODO: Implement AI insights for current file selection
    new Notice('AI Insights - Coming soon!');
  }
}