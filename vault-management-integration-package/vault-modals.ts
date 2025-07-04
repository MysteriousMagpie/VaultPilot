/**
 * Modal Templates for VaultPilot Vault Management
 * Create these modal files in your VaultPilot plugin src/modals/ directory
 */

import { App, Modal, Setting, Notice } from 'obsidian';
import { VaultManagementClient } from '../vault-api-client';
import { 
  VaultStructureResponse, 
  VaultSearchResponse, 
  FileOperationRequest,
  SearchType,
  VaultModalProps 
} from '../vault-types';

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
    contentEl.createEl('h2', { text: 'Vault Structure Analysis' });

    // Loading state
    const loadingEl = contentEl.createDiv({ cls: 'vault-loading' });
    loadingEl.setText('Loading vault structure...');

    try {
      const structure = await this.vaultClient.getVaultStructure({
        include_content: false,
        max_depth: 5
      });

      loadingEl.remove();
      this.renderStructure(contentEl, structure);
    } catch (error) {
      loadingEl.setText('Failed to load vault structure');
      console.error(error);
    }
  }

  private renderStructure(container: HTMLElement, structure: VaultStructureResponse) {
    // Stats overview
    const statsEl = container.createDiv({ cls: 'vault-stats' });
    statsEl.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Files:</span>
        <span class="stat-value">${structure.total_files}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Folders:</span>
        <span class="stat-value">${structure.total_folders}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Size:</span>
        <span class="stat-value">${(structure.total_size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
    `;

    // Folder tree
    const treeEl = container.createDiv({ cls: 'vault-tree' });
    this.renderFolder(treeEl, structure.structure, 0);

    // Orphaned files
    if (structure.orphaned_files.length > 0) {
      const orphanedEl = container.createDiv({ cls: 'orphaned-files' });
      orphanedEl.createEl('h3', { text: 'Orphaned Files' });
      structure.orphaned_files.forEach(file => {
        orphanedEl.createDiv({ text: file.path, cls: 'orphaned-file' });
      });
    }
  }

  private renderFolder(container: HTMLElement, folder: any, level: number) {
    const folderEl = container.createDiv({ 
      cls: 'folder-item',
      attr: { 'data-level': level.toString() }
    });
    
    folderEl.innerHTML = `
      <span class="folder-icon">📁</span>
      <span class="folder-name">${folder.name}</span>
      <span class="folder-count">(${folder.children.length})</span>
    `;

    folder.children.forEach((child: any) => {
      if (child.type === 'folder') {
        this.renderFolder(container, child, level + 1);
      } else {
        const fileEl = container.createDiv({ 
          cls: 'file-item',
          attr: { 'data-level': (level + 1).toString() }
        });
        fileEl.innerHTML = `
          <span class="file-icon">📄</span>
          <span class="file-name">${child.name}</span>
          <span class="file-size">${child.size} bytes</span>
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
  private searchInput: HTMLInputElement;
  private resultsContainer: HTMLElement;
  private initialQuery?: string;

  constructor(app: App, plugin: any) {
    super(app);
    this.plugin = plugin;
    this.vaultClient = plugin.vaultClient;
  }

  setInitialQuery(query: string): this {
    this.initialQuery = query;
    return this;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Smart Vault Search' });

    // Search form
    const searchForm = contentEl.createDiv({ cls: 'search-form' });
    
    this.searchInput = searchForm.createEl('input', {
      type: 'text',
      placeholder: 'Search your vault...',
      cls: 'search-input'
    });

    if (this.initialQuery) {
      this.searchInput.value = this.initialQuery;
    }

    const searchButton = searchForm.createEl('button', { 
      text: 'Search',
      cls: 'search-button'
    });

    // Search type selector
    const typeSelector = searchForm.createEl('select', { cls: 'search-type' });
    ['content', 'filename', 'tags', 'links'].forEach(type => {
      typeSelector.createEl('option', { value: type, text: type });
    });

    // Results container
    this.resultsContainer = contentEl.createDiv({ cls: 'search-results' });

    // Event handlers
    searchButton.onclick = () => this.performSearch();
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    // Auto-search if initial query provided
    if (this.initialQuery) {
      this.performSearch();
    }

    this.searchInput.focus();
  }

  private async performSearch() {
    const query = this.searchInput.value.trim();
    if (!query) return;

    this.resultsContainer.empty();
    const loadingEl = this.resultsContainer.createDiv({ text: 'Searching...', cls: 'loading' });

    try {
      const results = await this.vaultClient.searchVault({
        query,
        search_type: 'content' as SearchType,
        max_results: 50
      });

      loadingEl.remove();
      this.renderResults(results);
    } catch (error) {
      loadingEl.setText('Search failed');
      console.error(error);
    }
  }

  private renderResults(results: VaultSearchResponse) {
    if (results.results.length === 0) {
      this.resultsContainer.createDiv({ text: 'No results found', cls: 'no-results' });
      return;
    }

    const header = this.resultsContainer.createDiv({ cls: 'results-header' });
    header.innerHTML = `
      Found ${results.total_results} results in ${results.search_time.toFixed(2)}s
    `;

    results.results.forEach(result => {
      const resultEl = this.resultsContainer.createDiv({ cls: 'search-result' });
      resultEl.innerHTML = `
        <div class="result-title">${result.file_name}</div>
        <div class="result-path">${result.file_path}</div>
        <div class="result-snippet">${result.snippet}</div>
        <div class="result-score">Relevance: ${(result.relevance_score * 100).toFixed(1)}%</div>
      `;

      resultEl.onclick = () => {
        // Open the file
        const file = this.app.vault.getAbstractFileByPath(result.file_path);
        if (file) {
          this.app.workspace.getLeaf().openFile(file);
          this.close();
        }
      };
    });
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

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'File Operations' });

    // Operation selector
    const operationSelect = contentEl.createEl('select', { cls: 'operation-select' });
    ['create', 'update', 'delete', 'move', 'copy'].forEach(op => {
      const option = operationSelect.createEl('option', { value: op, text: op });
      if (op === this.operation) {
        option.selected = true;
      }
    });

    // File path input
    new Setting(contentEl)
      .setName('File Path')
      .setDesc('Path to the file')
      .addText(text => {
        text.setPlaceholder('folder/filename.md');
        if (this.initialPath) {
          text.setValue(this.initialPath);
        }
      });

    // Content textarea (for create/update operations)
    const contentTextarea = contentEl.createEl('textarea', {
      placeholder: 'File content...',
      cls: 'file-content'
    });

    // Execute button
    const executeButton = contentEl.createEl('button', {
      text: 'Execute Operation',
      cls: 'execute-button'
    });

    executeButton.onclick = async () => {
      const operation = operationSelect.value;
      const filePath = (contentEl.querySelector('.setting-item input') as HTMLInputElement)?.value;
      const content = contentTextarea.value;

      if (!filePath) {
        new Notice('Please enter a file path');
        return;
      }

      try {
        executeButton.disabled = true;
        executeButton.textContent = 'Executing...';

        const request: FileOperationRequest = {
          operation: operation as any,
          file_path: filePath,
          content: content || undefined,
          create_missing_folders: true
        };

        const result = await this.vaultClient.performFileOperation(request);
        
        if (result.success) {
          new Notice(`Operation completed: ${result.message}`);
          this.close();
        } else {
          new Notice(`Operation failed: ${result.message}`);
        }
      } catch (error) {
        new Notice('Operation failed');
        console.error(error);
      } finally {
        executeButton.disabled = false;
        executeButton.textContent = 'Execute Operation';
      }
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// === BATCH OPERATIONS MODAL ===

export class BatchOperationsModal extends Modal {
  private plugin: any;
  private vaultClient: VaultManagementClient;
  private operations: FileOperationRequest[] = [];

  constructor(app: App, plugin: any) {
    super(app);
    this.plugin = plugin;
    this.vaultClient = plugin.vaultClient;
  }

  setTargetFolder(folderPath: string): this {
    // Pre-populate with operations for the target folder
    return this;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Batch File Operations' });

    // Operations list
    const operationsList = contentEl.createDiv({ cls: 'operations-list' });
    this.renderOperationsList(operationsList);

    // Add operation button
    const addButton = contentEl.createEl('button', {
      text: 'Add Operation',
      cls: 'add-operation-button'
    });

    addButton.onclick = () => {
      this.operations.push({
        operation: 'create',
        file_path: '',
        content: ''
      });
      this.renderOperationsList(operationsList);
    };

    // Execute all button
    const executeButton = contentEl.createEl('button', {
      text: 'Execute All Operations',
      cls: 'execute-all-button'
    });

    executeButton.onclick = () => this.executeAllOperations();
  }

  private renderOperationsList(container: HTMLElement) {
    container.empty();
    
    this.operations.forEach((op, index) => {
      const opEl = container.createDiv({ cls: 'operation-item' });
      
      opEl.innerHTML = `
        <select class="op-type">
          <option value="create" ${op.operation === 'create' ? 'selected' : ''}>Create</option>
          <option value="update" ${op.operation === 'update' ? 'selected' : ''}>Update</option>
          <option value="delete" ${op.operation === 'delete' ? 'selected' : ''}>Delete</option>
          <option value="move" ${op.operation === 'move' ? 'selected' : ''}>Move</option>
          <option value="copy" ${op.operation === 'copy' ? 'selected' : ''}>Copy</option>
        </select>
        <input type="text" class="op-path" placeholder="File path" value="${op.file_path}">
        <button class="remove-op">Remove</button>
      `;

      // Event handlers
      const typeSelect = opEl.querySelector('.op-type') as HTMLSelectElement;
      const pathInput = opEl.querySelector('.op-path') as HTMLInputElement;
      const removeButton = opEl.querySelector('.remove-op') as HTMLButtonElement;

      typeSelect.onchange = () => {
        this.operations[index].operation = typeSelect.value as any;
      };

      pathInput.oninput = () => {
        this.operations[index].file_path = pathInput.value;
      };

      removeButton.onclick = () => {
        this.operations.splice(index, 1);
        this.renderOperationsList(container);
      };
    });
  }

  private async executeAllOperations() {
    if (this.operations.length === 0) {
      new Notice('No operations to execute');
      return;
    }

    try {
      const result = await this.vaultClient.performBatchFileOperations({
        operations: this.operations,
        continue_on_error: true
      });

      new Notice(`Batch completed: ${result.completed_operations} successful, ${result.failed_operations} failed`);
      
      if (result.errors.length > 0) {
        console.error('Batch operation errors:', result.errors);
      }

      this.close();
    } catch (error) {
      new Notice('Batch operation failed');
      console.error(error);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// === VAULT ORGANIZER MODAL ===

export class VaultOrganizerModal extends Modal {
  private plugin: any;
  private vaultClient: VaultManagementClient;

  constructor(app: App, plugin: any) {
    super(app);
    this.plugin = plugin;
    this.vaultClient = plugin.vaultClient;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'AI Vault Organization' });

    // Goal input
    new Setting(contentEl)
      .setName('Organization Goal')
      .setDesc('Describe how you want to organize your vault')
      .addTextArea(text => {
        text.setPlaceholder('e.g., Organize notes by topic, create better folder structure...');
        text.inputEl.rows = 4;
      });

    // Dry run toggle
    new Setting(contentEl)
      .setName('Dry Run')
      .setDesc('Preview changes without executing them')
      .addToggle(toggle => toggle.setValue(true));

    // Generate plan button
    const generateButton = contentEl.createEl('button', {
      text: 'Generate Organization Plan',
      cls: 'generate-plan-button'
    });

    generateButton.onclick = () => this.generatePlan();

    // Results area
    const resultsEl = contentEl.createDiv({ cls: 'organization-results' });
  }

  private async generatePlan() {
    const goalTextarea = this.contentEl.querySelector('textarea') as HTMLTextAreaElement;
    const goal = goalTextarea.value.trim();
    
    if (!goal) {
      new Notice('Please enter an organization goal');
      return;
    }

    const resultsEl = this.contentEl.querySelector('.organization-results') as HTMLElement;
    resultsEl.empty();
    resultsEl.createDiv({ text: 'Generating organization plan...', cls: 'loading' });

    try {
      const result = await this.vaultClient.organizeVault({
        organization_goal: goal,
        dry_run: true
      });

      resultsEl.empty();
      
      const planEl = resultsEl.createDiv({ cls: 'organization-plan' });
      planEl.innerHTML = `
        <h3>Organization Plan</h3>
        <div class="plan-description">${result.reorganization_plan}</div>
        <h4>Estimated Changes: ${result.estimated_changes_count}</h4>
      `;

      if (result.execution_steps && result.execution_steps.length > 0) {
        const stepsEl = planEl.createDiv({ cls: 'execution-steps' });
        stepsEl.createEl('h4', { text: 'Execution Steps:' });
        const stepsList = stepsEl.createEl('ol');
        result.execution_steps.forEach(step => {
          stepsList.createEl('li', { text: step });
        });
      }

    } catch (error) {
      resultsEl.empty();
      resultsEl.createDiv({ text: 'Failed to generate organization plan', cls: 'error' });
      console.error(error);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
