import { Modal, App, Setting, Notice, TFile } from 'obsidian';
import type VaultPilotPlugin from './main';
import { WorkflowRequest, WorkflowResponse, WorkflowProgress } from './types';

export class WorkflowModal extends Modal {
  plugin: VaultPilotPlugin;
  private goalInput!: HTMLTextAreaElement;
  private contextInput!: HTMLTextAreaElement;
  private executeButton!: HTMLButtonElement;
  private progressContainer!: HTMLElement;
  private resultsContainer!: HTMLElement;
  private isExecuting = false;

  constructor(app: App, plugin: VaultPilotPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vaultpilot-workflow-modal');

    // Header
    const headerEl = contentEl.createEl('div', { cls: 'vaultpilot-workflow-header' });
    headerEl.createEl('h2', { text: '⚙️ Workflow Execution' });
    headerEl.createEl('p', { 
      text: 'Define a goal and let VaultPilot create and execute a comprehensive workflow to achieve it.',
      cls: 'vaultpilot-workflow-description'
    });

    // Form
    const formEl = contentEl.createEl('div', { cls: 'vaultpilot-workflow-form' });

    // Goal input
    const goalContainer = formEl.createEl('div', { cls: 'vaultpilot-form-group' });
    goalContainer.createEl('label', { 
      text: 'Goal *',
      cls: 'vaultpilot-form-label'
    });
    this.goalInput = goalContainer.createEl('textarea', {
      placeholder: 'e.g., "Create a comprehensive study plan for machine learning based on my notes"',
      cls: 'vaultpilot-goal-input'
    });

    // Context input
    const contextContainer = formEl.createEl('div', { cls: 'vaultpilot-form-group' });
    contextContainer.createEl('label', { 
      text: 'Additional Context (optional)',
      cls: 'vaultpilot-form-label'
    });
    this.contextInput = contextContainer.createEl('textarea', {
      placeholder: 'Provide any additional context, constraints, or requirements...',
      cls: 'vaultpilot-context-input'
    });

    // Vault content options
    const optionsContainer = formEl.createEl('div', { cls: 'vaultpilot-form-group' });
    optionsContainer.createEl('label', { 
      text: 'Vault Integration',
      cls: 'vaultpilot-form-label'
    });

    const includeActiveFile = optionsContainer.createEl('label', { cls: 'vaultpilot-checkbox-label' });
    const activeFileCheckbox = includeActiveFile.createEl('input', { type: 'checkbox' });
    includeActiveFile.createSpan({ text: 'Include active file content' });

    const includeAllFiles = optionsContainer.createEl('label', { cls: 'vaultpilot-checkbox-label' });
    const allFilesCheckbox = includeAllFiles.createEl('input', { type: 'checkbox' });
    includeAllFiles.createSpan({ text: 'Include all vault files (may take longer)' });

    // Execute button
    this.executeButton = formEl.createEl('button', {
      text: 'Execute Workflow',
      cls: 'mod-cta vaultpilot-execute-button'
    });
    this.executeButton.onclick = () => this.executeWorkflow(activeFileCheckbox.checked, allFilesCheckbox.checked);

    // Progress container
    this.progressContainer = contentEl.createEl('div', { 
      cls: 'vaultpilot-progress-container'
    });
    this.progressContainer.style.display = 'none';

    // Results container
    this.resultsContainer = contentEl.createEl('div', { 
      cls: 'vaultpilot-results-container'
    });
    this.resultsContainer.style.display = 'none';

    // Focus the goal input
    this.goalInput.focus();

    this.addStyles();
  }

  private async executeWorkflow(includeActiveFile: boolean, includeAllFiles: boolean) {
    const goal = this.goalInput.value.trim();
    if (!goal) {
      new Notice('Please enter a goal for the workflow');
      return;
    }

    this.isExecuting = true;
    this.executeButton.disabled = true;
    this.executeButton.textContent = 'Executing...';
    this.progressContainer.style.display = 'block';
    this.resultsContainer.style.display = 'none';

    try {
      // Prepare vault content
      let vaultContent = '';
      
      if (includeActiveFile) {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          const content = await this.app.vault.read(activeFile);
          vaultContent += `=== ${activeFile.name} ===\n${content}\n\n`;
        }
      }

      if (includeAllFiles) {
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files.slice(0, 20)) { // Limit to first 20 files to avoid overwhelming the API
          const content = await this.app.vault.read(file);
          vaultContent += `=== ${file.name} ===\n${content}\n\n`;
        }
      }

      // Create workflow request
      const request: WorkflowRequest = {
        goal,
        context: this.contextInput.value.trim() || undefined,
        vault_content: vaultContent || undefined
      };

      // Setup WebSocket listener for progress updates
      if (this.plugin.isWebSocketConnected()) {
        // Listen for workflow progress updates
        this.setupProgressListener();
      }

      // Execute workflow
      const response = await this.plugin.apiClient!.executeWorkflow(request);

      if (response.success && response.data) {
        await this.displayResults(response.data);
      } else {
        throw new Error(response.error || 'Workflow execution failed');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      new Notice(`Workflow error: ${errorMsg}`);
      this.displayError(errorMsg);
    } finally {
      this.isExecuting = false;
      this.executeButton.disabled = false;
      this.executeButton.textContent = 'Execute Workflow';
    }
  }

  private setupProgressListener() {
    // This would be connected to the WebSocket progress updates
    // For now, we'll simulate progress
    this.displayProgress('Analyzing goal and context...');
    
    setTimeout(() => {
      this.displayProgress('Planning workflow steps...');
    }, 1000);
    
    setTimeout(() => {
      this.displayProgress('Executing workflow...');
    }, 2000);
  }

  private displayProgress(message: string) {
    this.progressContainer.innerHTML = `
      <div class="vaultpilot-progress-item">
        <div class="vaultpilot-progress-spinner"></div>
        <span>${message}</span>
      </div>
    `;
  }

  private async displayResults(workflow: WorkflowResponse) {
    this.progressContainer.style.display = 'none';
    this.resultsContainer.style.display = 'block';

    // Clear previous results
    this.resultsContainer.empty();

    // Header
    const headerEl = this.resultsContainer.createEl('div', { cls: 'vaultpilot-results-header' });
    headerEl.createEl('h3', { text: '✅ Workflow Completed' });
    headerEl.createEl('p', { 
      text: `Execution time: ${workflow.execution_time}s`,
      cls: 'vaultpilot-execution-time'
    });

    // Main result
    const resultEl = this.resultsContainer.createEl('div', { cls: 'vaultpilot-result-content' });
    resultEl.createEl('h4', { text: 'Result' });
    const resultContentEl = resultEl.createEl('div', { cls: 'vaultpilot-result-text' });
    resultContentEl.innerHTML = this.renderMarkdown(workflow.result);

    // Steps taken
    if (workflow.steps_taken && workflow.steps_taken.length > 0) {
      const stepsEl = this.resultsContainer.createEl('div', { cls: 'vaultpilot-steps-container' });
      stepsEl.createEl('h4', { text: 'Steps Taken' });
      const stepsList = stepsEl.createEl('ol', { cls: 'vaultpilot-steps-list' });
      workflow.steps_taken.forEach(step => {
        stepsList.createEl('li', { text: step });
      });
    }

    // Artifacts
    if (workflow.artifacts && workflow.artifacts.length > 0) {
      const artifactsEl = this.resultsContainer.createEl('div', { cls: 'vaultpilot-artifacts-container' });
      artifactsEl.createEl('h4', { text: 'Generated Artifacts' });
      
      workflow.artifacts.forEach((artifact, index) => {
        const artifactEl = artifactsEl.createEl('div', { cls: 'vaultpilot-artifact' });
        artifactEl.createEl('h5', { text: artifact.title });
        artifactEl.createEl('p', { 
          text: `Type: ${artifact.type}`,
          cls: 'vaultpilot-artifact-type'
        });
        
        const saveButton = artifactEl.createEl('button', {
          text: 'Save as Note',
          cls: 'mod-cta'
        });
        saveButton.onclick = () => this.saveArtifactAsNote(artifact, index);
      });
    }

    // Save all button
    const actionsEl = this.resultsContainer.createEl('div', { cls: 'vaultpilot-results-actions' });
    const saveAllButton = actionsEl.createEl('button', {
      text: 'Save Complete Results as Note',
      cls: 'mod-cta'
    });
    saveAllButton.onclick = () => this.saveCompleteResultsAsNote(workflow);
  }

  private async saveArtifactAsNote(artifact: any, index: number) {
    try {
      const filename = `${artifact.title.replace(/[^a-zA-Z0-9\s]/g, '')}.md`;
      const content = `# ${artifact.title}\n\n${artifact.content}`;
      
      await this.app.vault.create(filename, content);
      new Notice(`Artifact saved as ${filename}`);
    } catch (error) {
      new Notice(`Failed to save artifact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async saveCompleteResultsAsNote(workflow: WorkflowResponse) {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `VaultPilot Workflow Results ${timestamp}.md`;
      
      let content = `# VaultPilot Workflow Results\n\n`;
      content += `**Goal:** ${this.goalInput.value}\n\n`;
      content += `**Execution Time:** ${workflow.execution_time}s\n\n`;
      content += `## Result\n\n${workflow.result}\n\n`;
      
      if (workflow.steps_taken && workflow.steps_taken.length > 0) {
        content += `## Steps Taken\n\n`;
        workflow.steps_taken.forEach((step, index) => {
          content += `${index + 1}. ${step}\n`;
        });
        content += '\n';
      }

      if (workflow.artifacts && workflow.artifacts.length > 0) {
        content += `## Generated Artifacts\n\n`;
        workflow.artifacts.forEach(artifact => {
          content += `### ${artifact.title}\n\n${artifact.content}\n\n`;
        });
      }

      await this.app.vault.create(filename, content);
      new Notice(`Complete results saved as ${filename}`);
    } catch (error) {
      new Notice(`Failed to save results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private displayError(message: string) {
    this.progressContainer.style.display = 'none';
    this.resultsContainer.style.display = 'block';
    this.resultsContainer.innerHTML = `
      <div class="vaultpilot-error">
        <h3>❌ Workflow Failed</h3>
        <p>${message}</p>
      </div>
    `;
  }

  private renderMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private addStyles() {
    if (!document.getElementById('vaultpilot-workflow-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'vaultpilot-workflow-styles';
      styleEl.textContent = `
        .vaultpilot-workflow-modal {
          width: 700px;
          max-height: 80vh;
          overflow-y: auto;
        }
        .vaultpilot-workflow-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-workflow-description {
          color: var(--text-muted);
          margin-top: 5px;
        }
        .vaultpilot-form-group {
          margin-bottom: 20px;
        }
        .vaultpilot-form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--text-normal);
        }
        .vaultpilot-goal-input,
        .vaultpilot-context-input {
          width: 100%;
          min-height: 80px;
          padding: 10px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          background: var(--background-primary);
          color: var(--text-normal);
          resize: vertical;
        }
        .vaultpilot-checkbox-label {
          display: block;
          margin-bottom: 8px;
          cursor: pointer;
        }
        .vaultpilot-checkbox-label input {
          margin-right: 8px;
        }
        .vaultpilot-execute-button {
          width: 100%;
          padding: 12px;
          font-size: 16px;
        }
        .vaultpilot-progress-container {
          margin: 20px 0;
          padding: 15px;
          background: var(--background-secondary);
          border-radius: 8px;
          border: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-progress-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .vaultpilot-progress-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--background-modifier-border);
          border-top: 2px solid var(--text-accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .vaultpilot-results-container {
          margin-top: 20px;
        }
        .vaultpilot-results-header {
          margin-bottom: 15px;
        }
        .vaultpilot-execution-time {
          color: var(--text-muted);
          font-size: 0.9em;
        }
        .vaultpilot-result-content {
          margin-bottom: 20px;
          padding: 15px;
          background: var(--background-secondary);
          border-radius: 8px;
          border: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-result-text {
          line-height: 1.5;
          color: var(--text-normal);
        }
        .vaultpilot-steps-container,
        .vaultpilot-artifacts-container {
          margin-bottom: 20px;
        }
        .vaultpilot-steps-list {
          padding-left: 20px;
        }
        .vaultpilot-artifact {
          margin-bottom: 15px;
          padding: 10px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          background: var(--background-primary-alt);
        }
        .vaultpilot-artifact-type {
          color: var(--text-muted);
          font-size: 0.9em;
          margin-bottom: 10px;
        }
        .vaultpilot-results-actions {
          margin-top: 20px;
          text-align: center;
        }
        .vaultpilot-error {
          padding: 20px;
          background: var(--background-primary-alt);
          border: 1px solid var(--color-red);
          border-radius: 8px;
          color: var(--color-red);
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
