/**
 * Modal Classes for VaultPilot Vault Management
 */

import { App, Modal, Setting, Notice } from 'obsidian';
import { VaultManagementClient } from './vault-api-client';
import { 
  VaultStructureResponse, 
  VaultSearchResponse, 
  FileOperationRequest,
  SearchType,
  VaultOrganizationResponse
} from './vault-types';

// === VAULT STRUCTURE MODAL ===

export class VaultStructureModal extends Modal {
  private plugin: any;
  private vaultClient: VaultManagementClient;
  private focusPath?: string;

  constructor(app: App, plugin: any) {
    super(app);
    this.plugin = plugin;
    this.vaultClient = plugin.vaultClient;
  }

  setFocusPath(path: string): this {
    this.focusPath = path;
    return this;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vault-structure-modal');
    
    const headerEl = contentEl.createEl('div', { cls: 'modal-header' });
    headerEl.createEl('h2', { text: 'Vault Structure Analysis' });
    
    const refreshButton = headerEl.createEl('button', { 
      text: '🔄 Refresh',
      cls: 'mod-cta'
    });
    
    // Loading state
    const loadingEl = contentEl.createDiv({ cls: 'vault-loading' });
    loadingEl.setText('🔍 Analyzing vault structure...');

    try {
      const structure = await this.vaultClient.getVaultStructure({
        include_content: false,
        max_depth: 5
      });

      loadingEl.remove();
      this.renderStructure(contentEl, structure);
      
      refreshButton.onclick = () => {
        this.onOpen();
      };
    } catch (error: any) {
      loadingEl.setText('❌ Failed to load vault structure');
      console.error(error);
      
      const retryButton = contentEl.createEl('button', { 
        text: 'Retry',
        cls: 'mod-cta'
      });
      retryButton.onclick = () => this.onOpen();
    }
  }

  private renderStructure(container: HTMLElement, structure: VaultStructureResponse) {
    // Stats overview
    const statsEl = container.createDiv({ cls: 'vault-stats' });
    statsEl.innerHTML = `
      <div class="stat-grid">
        <div class="stat-item">
          <span class="stat-icon">📁</span>
          <span class="stat-label">Files</span>
          <span class="stat-value">${structure.total_files}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">📂</span>
          <span class="stat-label">Folders</span>
          <span class="stat-value">${structure.total_folders}</span>
        </div>
        <div class="stat-item">
          <span class="stat-icon">💾</span>
          <span class="stat-label">Size</span>
          <span class="stat-value">${(structure.total_size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
      </div>
    `;

    // Folder tree
    const treeContainer = container.createDiv({ cls: 'vault-tree-container' });
    treeContainer.createEl('h3', { text: 'Folder Structure' });
    
    const treeEl = treeContainer.createDiv({ cls: 'vault-tree' });
    this.renderFolder(treeEl, structure.structure, 0);

    // Recent files
    if (structure.recent_files.length > 0) {
      const recentContainer = container.createDiv({ cls: 'recent-files-container' });
      recentContainer.createEl('h3', { text: 'Recent Files' });
      
      const recentEl = recentContainer.createDiv({ cls: 'recent-files' });
      structure.recent_files.slice(0, 10).forEach(file => {
        const fileEl = recentEl.createDiv({ cls: 'recent-file' });
        fileEl.innerHTML = `
          <span class="file-icon">📄</span>
          <span class="file-name">${file.name}</span>
          <span class="file-date">${new Date(file.modified).toLocaleDateString()}</span>
        `;
      });
    }

    // Orphaned files
    if (structure.orphaned_files.length > 0) {
      const orphanedContainer = container.createDiv({ cls: 'orphaned-files-container' });
      orphanedContainer.createEl('h3', { text: '⚠️ Orphaned Files' });
      
      const orphanedEl = orphanedContainer.createDiv({ cls: 'orphaned-files' });
      structure.orphaned_files.forEach(file => {
        const orphanEl = orphanedEl.createDiv({ cls: 'orphaned-file' });
        orphanEl.innerHTML = `
          <span class="file-icon">🔗</span>
          <span class="file-path">${file.path}</span>
        `;
      });
    }
  }

  private renderFolder(container: HTMLElement, folder: any, level: number) {
    const folderEl = container.createDiv({ 
      cls: 'folder-item',
      attr: { 'data-level': level.toString() }
    });
    
    folderEl.innerHTML = `
      <span class="folder-toggle">▶</span>
      <span class="folder-icon">📁</span>
      <span class="folder-name">${folder.name}</span>
      <span class="folder-count">(${folder.children.length})</span>
    `;

    // Add children container
    const childrenEl = container.createDiv({ 
      cls: 'folder-children',
      attr: { style: 'display: none;' }
    });

    // Toggle functionality
    const toggleEl = folderEl.querySelector('.folder-toggle') as HTMLElement;
    toggleEl.onclick = () => {
      const isOpen = childrenEl.style.display !== 'none';
      childrenEl.style.display = isOpen ? 'none' : 'block';
      toggleEl.textContent = isOpen ? '▶' : '▼';
    };

    // Render children
    folder.children.forEach((child: any) => {
      if (child.type === 'folder') {
        this.renderFolder(childrenEl, child, level + 1);
      } else {
        const fileEl = childrenEl.createDiv({ 
          cls: 'file-item',
          attr: { 'data-level': (level + 1).toString() }
        });
        fileEl.innerHTML = `
          <span class="file-icon">📄</span>
          <span class="file-name">${child.name}</span>
          <span class="file-size">${(child.size / 1024).toFixed(1)}KB</span>
        `;
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// === SMART SEARCH MODAL ===

export class SmartSearchModal extends Modal {
  private plugin: any;
  private vaultClient: VaultManagementClient;
  private initialQuery?: string;
  private searchType?: SearchType;

  constructor(app: App, plugin: any) {
    super(app);
    this.plugin = plugin;
    this.vaultClient = plugin.vaultClient;
  }

  setInitialQuery(query: string, type?: SearchType): this {
    this.initialQuery = query;
    this.searchType = type;
    return this;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('smart-search-modal');
    
    contentEl.createEl('h2', { text: '🔍 Smart Vault Search' });

    // Search form
    const searchForm = contentEl.createDiv({ cls: 'search-form' });
    
    const queryInput = searchForm.createEl('input', {
      type: 'text',
      placeholder: 'Enter search query...',
      cls: 'search-query-input'
    });
    
    if (this.initialQuery) {
      queryInput.value = this.initialQuery;
    }

    const searchTypeSelect = searchForm.createEl('select', { cls: 'search-type-select' });
    const searchTypes = [
      { value: 'comprehensive', label: 'Comprehensive' },
      { value: 'content', label: 'Content' },
      { value: 'filename', label: 'Filename' },
      { value: 'tags', label: 'Tags' },
      { value: 'links', label: 'Links' }
    ];
    
    searchTypes.forEach(type => {
      const option = searchTypeSelect.createEl('option', { value: type.value });
      option.textContent = type.label;
      if (type.value === (this.searchType || 'comprehensive')) {
        option.selected = true;
      }
    });

    const searchButton = searchForm.createEl('button', { 
      text: 'Search',
      cls: 'mod-cta search-button'
    });

    // Results container
    const resultsContainer = contentEl.createDiv({ cls: 'search-results-container' });

    // Search function
    const performSearch = async () => {
      const query = queryInput.value.trim();
      if (!query) {
        new Notice('Please enter a search query');
        return;
      }

      searchButton.textContent = 'Searching...';
      searchButton.disabled = true;
      resultsContainer.empty();
      
      const loadingEl = resultsContainer.createDiv({ cls: 'search-loading' });
      loadingEl.textContent = '🔍 Searching vault...';

      try {
        const results = await this.vaultClient.searchVault({
          query,
          search_type: searchTypeSelect.value as SearchType,
          max_results: this.plugin.settings.vaultManagement?.searchResultsLimit || 50,
          include_content: true
        });

        loadingEl.remove();
        this.renderSearchResults(resultsContainer, results);
      } catch (error: any) {
        loadingEl.textContent = '❌ Search failed';
        console.error('Search error:', error);
      } finally {
        searchButton.textContent = 'Search';
        searchButton.disabled = false;
      }
    };

    // Event listeners
    searchButton.onclick = performSearch;
    queryInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Auto-search if initial query provided
    if (this.initialQuery) {
      performSearch();
    }

    // Focus input
    queryInput.focus();
  }

  private renderSearchResults(container: HTMLElement, results: VaultSearchResponse) {
    container.createEl('h3', { text: `Search Results (${results.total_found})` });

    if (results.insights) {
      const insightsEl = container.createDiv({ cls: 'search-insights' });
      insightsEl.innerHTML = `
        <div class="insights-header">🧠 AI Insights</div>
        <div class="insights-content">${results.insights}</div>
      `;
    }

    if (results.results.length === 0) {
      container.createDiv({ 
        cls: 'no-results',
        text: 'No results found. Try a different search term or type.' 
      });
      return;
    }

    const resultsList = container.createDiv({ cls: 'search-results-list' });
    
    results.results.forEach(result => {
      const resultEl = resultsList.createDiv({ cls: 'search-result' });
      
      resultEl.innerHTML = `
        <div class="result-header">
          <span class="result-file-name">${result.file_name}</span>
          <span class="result-match-type">${result.match_type}</span>
          <span class="result-score">${(result.score * 100).toFixed(0)}%</span>
        </div>
        <div class="result-path">${result.file_path}</div>
        <div class="result-preview">${result.preview}</div>
        ${result.matches.length > 0 ? `
          <div class="result-matches">
            <strong>Matches:</strong> ${result.matches.join(', ')}
          </div>
        ` : ''}
      `;

      // Click to open file
      resultEl.onclick = () => {
        this.app.workspace.openLinkText(result.file_path, '');
        this.close();
      };
    });

    // Suggested queries
    if (results.suggested_queries && results.suggested_queries.length > 0) {
      const suggestionsEl = container.createDiv({ cls: 'suggested-queries' });
      suggestionsEl.createEl('h4', { text: '💡 Suggested Queries' });
      
      const suggestionsList = suggestionsEl.createDiv({ cls: 'suggestions-list' });
      results.suggested_queries.forEach(suggestion => {
        const suggestionEl = suggestionsList.createEl('button', { 
          text: suggestion,
          cls: 'suggestion-button'
        });
        suggestionEl.onclick = () => {
          const queryInput = this.contentEl.querySelector('.search-query-input') as HTMLInputElement;
          if (queryInput) {
            queryInput.value = suggestion;
            queryInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
          }
        };
      });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// === FILE OPERATIONS MODAL ===

export class FileOperationsModal extends Modal {
  private plugin: any;
  private vaultClient: VaultManagementClient;
  private initialPath?: string;
  private operation?: string;

  constructor(app: App, plugin: any) {
    super(app);
    this.plugin = plugin;
    this.vaultClient = plugin.vaultClient;
  }

  setInitialPath(path: string): this {
    this.initialPath = path;
    return this;
  }

  setOperation(operation: string): this {
    this.operation = operation;
    return this;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('file-operations-modal');
    
    contentEl.createEl('h2', { text: '📁 File Operations Manager' });

    // Operation selection
    new Setting(contentEl)
      .setName('Operation')
      .setDesc('Select the file operation to perform')
      .addDropdown(dropdown => dropdown
        .addOption('create', 'Create File')
        .addOption('update', 'Update File')
        .addOption('delete', 'Delete File')
        .addOption('move', 'Move File')
        .addOption('copy', 'Copy File')
        .setValue(this.operation || 'create')
        .onChange(value => {
          this.operation = value;
          this.updateOperationForm();
        }));

    // Operation form container
    const formContainer = contentEl.createDiv({ cls: 'operation-form' });
    this.updateOperationForm();
  }

  private updateOperationForm() {
    const formContainer = this.contentEl.querySelector('.operation-form') as HTMLElement;
    if (!formContainer) return;
    
    formContainer.empty();

    const operation = this.operation || 'create';
    
    // File path input
    new Setting(formContainer)
      .setName('File Path')
      .setDesc('Path to the file (including filename)')
      .addText(text => text
        .setPlaceholder('path/to/file.md')
        .setValue(this.initialPath || '')
        .onChange(value => this.initialPath = value));

    // Additional inputs based on operation
    if (operation === 'move' || operation === 'copy') {
      new Setting(formContainer)
        .setName('New Path')
        .setDesc('Destination path for the file')
        .addText(text => text
          .setPlaceholder('new/path/to/file.md'));
    }

    if (operation === 'create' || operation === 'update') {
      new Setting(formContainer)
        .setName('Content')
        .setDesc('File content')
        .addTextArea(textarea => {
          textarea.setPlaceholder('Enter file content...');
          if (operation === 'create') {
            textarea.setValue('# New File\n\nContent goes here...');
          }
        });
    }

    // Backup option
    if (operation !== 'create') {
      new Setting(formContainer)
        .setName('Create Backup')
        .setDesc('Create a backup before performing the operation')
        .addToggle(toggle => toggle.setValue(true));
    }

    // Execute button
    new Setting(formContainer)
      .addButton(button => button
        .setButtonText(`Execute ${operation.charAt(0).toUpperCase() + operation.slice(1)}`)
        .setCta()
        .onClick(() => this.executeOperation()));
  }

  private async executeOperation() {
    const operation = this.operation || 'create';
    const pathInput = this.contentEl.querySelector('input[placeholder*="path/to/file"]') as HTMLInputElement;
    const newPathInput = this.contentEl.querySelector('input[placeholder*="new/path"]') as HTMLInputElement;
    const contentTextarea = this.contentEl.querySelector('textarea') as HTMLTextAreaElement;
    const backupToggle = this.contentEl.querySelector('input[type="checkbox"]') as HTMLInputElement;

    if (!pathInput?.value) {
      new Notice('File path is required');
      return;
    }

    const request: FileOperationRequest = {
      operation: operation as any,
      file_path: pathInput.value,
      backup: backupToggle?.checked ?? true
    };

    if (newPathInput?.value) {
      request.new_path = newPathInput.value;
    }

    if (contentTextarea?.value) {
      request.content = contentTextarea.value;
    }

    try {
      new Notice(`Performing ${operation}...`);
      const result = await this.vaultClient.performFileOperation(request);
      
      new Notice(`✅ ${operation} successful: ${result.message}`);
      this.close();
    } catch (error: any) {
      new Notice(`❌ ${operation} failed: ${error.message}`);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
