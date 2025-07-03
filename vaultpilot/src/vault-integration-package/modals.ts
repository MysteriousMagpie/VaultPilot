// Modal components for VaultPilot vault management
// Copy to your VaultPilot plugin src/ directory
// Note: These are basic modal templates - customize styling and behavior as needed

import { App, Modal, Setting, Notice } from 'obsidian';
import { EvoAgentXVaultClient } from './api-client';
import { VaultStructureNode, SmartSearchRequest, FileOperation } from './types';

export class VaultStructureModal extends Modal {
  private client: EvoAgentXVaultClient;

  constructor(app: App, client: EvoAgentXVaultClient) {
    super(app);
    this.client = client;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Vault Structure' });

    const loadingEl = contentEl.createEl('div', { text: 'Loading vault structure...' });

    this.loadVaultStructure(loadingEl);
  }

  private async loadVaultStructure(loadingEl: HTMLElement) {
    try {
      const response = await this.client.getVaultStructure();
      
      if (response.success && response.data) {
        loadingEl.remove();
        this.renderStructure(response.data.structure);
        
        // Add summary
        const summaryEl = this.contentEl.createEl('div', { cls: 'vault-summary' });
        summaryEl.createEl('p', { 
          text: `📁 ${response.data.total_folders} folders, 📄 ${response.data.total_files} files`
        });
        summaryEl.createEl('p', { 
          text: `💾 Total size: ${this.formatBytes(response.data.vault_size)}`
        });
      } else {
        loadingEl.textContent = 'Error loading vault structure: ' + (response.error || 'Unknown error');
      }
    } catch (error) {
      loadingEl.textContent = 'Failed to connect to EvoAgentX backend';
    }
  }

  private renderStructure(node: VaultStructureNode, container?: HTMLElement, level = 0) {
    const parentEl = container || this.contentEl;
    
    const nodeEl = parentEl.createEl('div', { 
      cls: `structure-node level-${level}`,
      attr: { style: `padding-left: ${level * 20}px` }
    });

    const icon = node.type === 'folder' ? '📁' : '📄';
    const nameEl = nodeEl.createEl('span', { text: `${icon} ${node.name}` });
    
    if (node.type === 'file' && node.size) {
      nameEl.createEl('small', { 
        text: ` (${this.formatBytes(node.size)})`,
        cls: 'file-size'
      });
    }

    // Add click handler for files
    if (node.type === 'file') {
      nameEl.classList.add('clickable');
      nameEl.onclick = () => {
        this.app.workspace.openLinkText(node.path, '');
        this.close();
      };
    }

    // Render children for folders
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        this.renderStructure(child, parentEl, level + 1);
      });
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export class SmartSearchModal extends Modal {
  private client: EvoAgentXVaultClient;

  constructor(app: App, client: EvoAgentXVaultClient) {
    super(app);
    this.client = client;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Smart Vault Search' });

    // Search form
    const formEl = contentEl.createEl('form');
    
    let queryInput: HTMLInputElement;
    let searchTypeSelect: HTMLSelectElement;
    let fileTypesInput: HTMLInputElement;

    new Setting(formEl)
      .setName('Search Query')
      .setDesc('Enter your search terms')
      .addText(text => {
        queryInput = text.inputEl;
        text.setPlaceholder('Search for content, tags, or properties...');
      });

    new Setting(formEl)
      .setName('Search Type')
      .addDropdown(dropdown => {
        searchTypeSelect = dropdown.selectEl;
        dropdown
          .addOption('all', 'All (content, tags, properties)')
          .addOption('content', 'Content only')
          .addOption('tags', 'Tags only')
          .addOption('properties', 'Properties only')
          .setValue('all');
      });

    new Setting(formEl)
      .setName('File Types')
      .setDesc('Comma-separated list (e.g., md,txt,pdf)')
      .addText(text => {
        fileTypesInput = text.inputEl;
        text.setPlaceholder('md,txt,pdf (leave empty for all types)');
      });

    new Setting(formEl)
      .addButton(btn => {
        btn
          .setButtonText('Search')
          .setCta()
          .onClick(() => this.performSearch(queryInput, searchTypeSelect, fileTypesInput));
      });

    // Results container
    contentEl.createEl('div', { cls: 'search-results', attr: { id: 'search-results' } });
  }

  private async performSearch(
    queryInput: HTMLInputElement,
    searchTypeSelect: HTMLSelectElement,
    fileTypesInput: HTMLInputElement
  ) {
    const query = queryInput.value.trim();
    if (!query) {
      new Notice('Please enter a search query');
      return;
    }

    const resultsEl = this.contentEl.querySelector('#search-results') as HTMLElement;
    resultsEl.innerHTML = '<div>Searching...</div>';

    const fileTypes = fileTypesInput.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const searchRequest: SmartSearchRequest = {
      query,
      search_type: searchTypeSelect.value as any,
      file_types: fileTypes.length > 0 ? fileTypes : undefined,
      max_results: 50,
      include_content: true
    };

    try {
      const response = await this.client.smartSearch(searchRequest);

      if (response.success && response.data) {
        const results = response.data.results;
        resultsEl.innerHTML = '';

        if (results.length === 0) {
          resultsEl.createEl('div', { text: 'No results found' });
          return;
        }

        // Results header
        resultsEl.createEl('h3', { 
          text: `Found ${results.length} results (${response.data.search_time.toFixed(2)}s)`
        });

        // Render results
        results.forEach(result => {
          const resultEl = resultsEl.createEl('div', { cls: 'search-result' });
          
          const titleEl = resultEl.createEl('h4', { cls: 'result-title clickable' });
          titleEl.textContent = result.title;
          titleEl.onclick = () => {
            this.app.workspace.openLinkText(result.file_path, '');
            this.close();
          };

          if (result.content_snippet) {
            resultEl.createEl('p', { 
              text: result.content_snippet,
              cls: 'result-snippet'
            });
          }

          if (result.tags.length > 0) {
            const tagsEl = resultEl.createEl('div', { cls: 'result-tags' });
            result.tags.forEach(tag => {
              tagsEl.createEl('span', { text: `#${tag}`, cls: 'tag' });
            });
          }

          resultEl.createEl('small', { 
            text: `Score: ${result.score.toFixed(2)} • Modified: ${new Date(result.modified).toLocaleDateString()}`,
            cls: 'result-meta'
          });
        });
      } else {
        resultsEl.innerHTML = `<div>Search failed: ${response.error || 'Unknown error'}</div>`;
      }
    } catch (error) {
      resultsEl.innerHTML = '<div>Failed to connect to search service</div>';
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

export class FileOperationsModal extends Modal {
  private client: EvoAgentXVaultClient;
  private operations: FileOperation[] = [];

  constructor(app: App, client: EvoAgentXVaultClient) {
    super(app);
    this.client = client;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Batch File Operations' });

    // Operations builder
    this.renderOperationsBuilder();
    
    // Operations list
    this.renderOperationsList();

    // Execute button
    new Setting(contentEl)
      .addButton(btn => {
        btn
          .setButtonText('Execute Operations')
          .setCta()
          .onClick(() => this.executeOperations());
      });
  }

  private renderOperationsBuilder() {
    const builderEl = this.contentEl.createEl('div', { cls: 'operations-builder' });
    builderEl.createEl('h3', { text: 'Add Operation' });

    let operationSelect: HTMLSelectElement;
    let sourceInput: HTMLInputElement;
    let targetInput: HTMLInputElement;
    let contentInput: HTMLTextAreaElement;

    new Setting(builderEl)
      .setName('Operation Type')
      .addDropdown(dropdown => {
        operationSelect = dropdown.selectEl;
        dropdown
          .addOption('create', 'Create File/Folder')
          .addOption('delete', 'Delete')
          .addOption('move', 'Move')
          .addOption('rename', 'Rename')
          .addOption('copy', 'Copy');
      });

    new Setting(builderEl)
      .setName('Source Path')
      .addText(text => {
        sourceInput = text.inputEl;
        text.setPlaceholder('path/to/file.md');
      });

    new Setting(builderEl)
      .setName('Target Path')
      .setDesc('Required for move, rename, copy operations')
      .addText(text => {
        targetInput = text.inputEl;
        text.setPlaceholder('new/path/to/file.md');
      });

    new Setting(builderEl)
      .setName('Content')
      .setDesc('For create operations')
      .addTextArea(text => {
        contentInput = text.inputEl;
        text.setPlaceholder('File content...');
      });

    new Setting(builderEl)
      .addButton(btn => {
        btn
          .setButtonText('Add Operation')
          .onClick(() => {
            const operation: FileOperation = {
              operation: operationSelect.value as any,
              source_path: sourceInput.value.trim(),
              target_path: targetInput.value.trim() || undefined,
              content: contentInput.value || undefined
            };

            if (!operation.source_path) {
              new Notice('Source path is required');
              return;
            }

            this.operations.push(operation);
            this.renderOperationsList();
            
            // Clear inputs
            sourceInput.value = '';
            targetInput.value = '';
            contentInput.value = '';
          });
      });
  }

  private renderOperationsList() {
    const existingList = this.contentEl.querySelector('.operations-list');
    if (existingList) {
      existingList.remove();
    }

    const listEl = this.contentEl.createEl('div', { cls: 'operations-list' });
    listEl.createEl('h3', { text: `Queued Operations (${this.operations.length})` });

    if (this.operations.length === 0) {
      listEl.createEl('p', { text: 'No operations queued' });
      return;
    }

    this.operations.forEach((op, index) => {
      const opEl = listEl.createEl('div', { cls: 'operation-item' });
      
      const description = this.getOperationDescription(op);
      opEl.createEl('span', { text: description });
      
      const removeBtn = opEl.createEl('button', { text: '✕', cls: 'remove-btn' });
      removeBtn.onclick = () => {
        this.operations.splice(index, 1);
        this.renderOperationsList();
      };
    });
  }

  private getOperationDescription(op: FileOperation): string {
    switch (op.operation) {
      case 'create':
        return `Create: ${op.source_path}`;
      case 'delete':
        return `Delete: ${op.source_path}`;
      case 'move':
        return `Move: ${op.source_path} → ${op.target_path}`;
      case 'rename':
        return `Rename: ${op.source_path} → ${op.target_path}`;
      case 'copy':
        return `Copy: ${op.source_path} → ${op.target_path}`;
      default:
        return `${op.operation}: ${op.source_path}`;
    }
  }

  private async executeOperations() {
    if (this.operations.length === 0) {
      new Notice('No operations to execute');
      return;
    }

    const notice = new Notice('Executing operations...', 0);

    try {
      const response = await this.client.performBatchOperations({
        operations: this.operations,
        create_backup: true
      });

      notice.hide();

      if (response.success && response.data) {
        const results = response.data.results;
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        new Notice(`Operations completed: ${successful} successful, ${failed} failed`);
        
        if (failed > 0) {
          console.warn('Failed operations:', results.filter(r => !r.success));
        }

        this.operations = [];
        this.renderOperationsList();
      } else {
        new Notice('Operations failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      notice.hide();
      new Notice('Failed to execute operations');
      console.error('Batch operations error:', error);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
