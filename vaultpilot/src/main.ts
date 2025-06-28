import { Plugin, Notice, Editor, MarkdownView, TFile, EditorPosition } from 'obsidian';
import { VaultPilotSettingTab, DEFAULT_SETTINGS } from './settings';
import { VIEW_TYPE_VAULTPILOT, VaultPilotView } from './view';
import { ChatModal } from './chat-modal';
import { WorkflowModal } from './workflow-modal';
import { EvoAgentXClient } from './api-client';
import { VaultPilotSettings, CopilotResponse } from './types';

export default class VaultPilotPlugin extends Plugin {
  settings!: VaultPilotSettings;
  apiClient!: EvoAgentXClient;
  private websocketConnected = false;
  private copilotEnabled = false;

  async onload() {
    await this.loadSettings();

    // Initialize API client
    this.apiClient = new EvoAgentXClient(this.settings.backendUrl, this.settings.apiKey);

    // Test backend connection
    try {
      let response = await this.apiClient.healthCheck();
      
      // If the main health check fails with a 400, try the simple check
      if (!response.success && response.error?.includes('400')) {
        console.warn('Main health check failed with 400, trying alternative method');
        const simpleResponse = await this.apiClient.simpleHealthCheck();
        if (simpleResponse.success && simpleResponse.data) {
          response = {
            success: true,
            data: { status: simpleResponse.data.status, version: 'unknown' }
          };
        }
      }
      
      if (response.success) {
        new Notice('✅ VaultPilot connected to EvoAgentX', 3000);
        // Connect WebSocket if enabled
        if (this.settings.enableWebSocket) {
          this.connectWebSocket();
        }
      } else {
        console.error('Health check failed:', response.error);
        new Notice('⚠️ EvoAgentX backend offline - some features may not work', 5000);
      }
    } catch (error) {
      console.error('Health check error:', error);
      new Notice('⚠️ Cannot connect to EvoAgentX backend', 5000);
    }

    // Register view
    this.registerView(
      VIEW_TYPE_VAULTPILOT,
      (leaf) => new VaultPilotView(leaf, this)
    );

    // Add ribbon icon
    const ribbonIconEl = this.addRibbonIcon('bot', 'VaultPilot', (evt: MouseEvent) => {
      this.openChatModal();
    });
    ribbonIconEl.addClass('vaultpilot-ribbon-class');

    // Register commands
    this.addCommand({
      id: 'open-chat',
      name: 'Open Chat',
      callback: () => this.openChatModal()
    });

    this.addCommand({
      id: 'execute-workflow',
      name: 'Execute Workflow',
      callback: () => this.openWorkflowModal()
    });

    this.addCommand({
      id: 'analyze-vault',
      name: 'Analyze Current Vault',
      callback: () => this.analyzeVault()
    });

    this.addCommand({
      id: 'copilot-complete',
      name: 'Get AI Completion',
      editorCallback: (editor: Editor) => this.getCopilotCompletion(editor)
    });

    this.addCommand({
      id: 'quick-chat',
      name: 'Quick Chat with Selection',
      editorCallback: (editor: Editor) => this.quickChatWithSelection(editor)
    });

    this.addCommand({
      id: 'plan-tasks',
      name: 'Plan Tasks from Note',
      editorCallback: (editor: Editor) => this.planTasksFromNote(editor)
    });

    this.addCommand({
      id: 'open-vaultpilot-view',
      name: 'Open VaultPilot View',
      callback: () => this.activateView()
    });

    // Register editor events for copilot
    if (this.settings.enableCopilot && this.settings.enableAutoComplete) {
      this.registerDomEvent(document, 'keyup', this.handleKeyUp.bind(this));
    }

    // Add settings tab
    this.addSettingTab(new VaultPilotSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VAULTPILOT);
    this.disconnectWebSocket();
  }

  // WebSocket Management
  connectWebSocket() {
    if (this.websocketConnected) return;

    this.apiClient.connectWebSocket({
      onChat: (data) => {
        // Handle real-time chat updates
        console.log('WebSocket chat update:', data);
      },
      onWorkflowProgress: (data) => {
        // Handle workflow progress updates
        new Notice(`Workflow: ${data.step}`, 2000);
      },
      onCopilot: (data) => {
        // Handle copilot suggestions
        this.handleCopilotSuggestion(data);
      },
      onVaultSync: (data) => {
        // Handle vault synchronization
        console.log('Vault sync update:', data);
      },
      onError: (error) => {
        new Notice(`WebSocket error: ${error}`, 5000);
      },
      onConnect: () => {
        this.websocketConnected = true;
        if (this.settings.debugMode) {
          new Notice('WebSocket connected', 2000);
        }
      },
      onDisconnect: () => {
        this.websocketConnected = false;
        if (this.settings.debugMode) {
          new Notice('WebSocket disconnected', 2000);
        }
      }
    });
  }

  disconnectWebSocket() {
    this.apiClient.disconnectWebSocket();
    this.websocketConnected = false;
  }

  isWebSocketConnected(): boolean {
    return this.websocketConnected;
  }

  // Modal Management
  openChatModal() {
    new ChatModal(this.app, this).open();
  }

  openWorkflowModal() {
    new WorkflowModal(this.app, this).open();
  }

  // Command Implementations
  async analyzeVault() {
    const notice = new Notice('Analyzing vault...', 0);
    
    try {
      // Get all markdown files
      const files = this.app.vault.getMarkdownFiles();
      let content = '';
      
      // Include up to 10 files to avoid overwhelming the API
      for (const file of files.slice(0, 10)) {
        const fileContent = await this.app.vault.read(file);
        content += `=== ${file.name} ===\n${fileContent}\n\n`;
      }

      const response = await this.apiClient.analyzeVaultContext({
        content,
        analysis_type: 'insights'
      });

      notice.hide();

      if (response.success && response.data) {
        // Create analysis note
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Vault Analysis ${timestamp}.md`;
        
        let analysisContent = `# Vault Analysis - ${timestamp}\n\n`;
        analysisContent += `## Analysis\n\n${response.data.analysis}\n\n`;
        
        if (response.data.insights && response.data.insights.length > 0) {
          analysisContent += `## Key Insights\n\n`;
          response.data.insights.forEach(insight => {
            analysisContent += `- ${insight}\n`;
          });
          analysisContent += '\n';
        }

        if (response.data.recommendations && response.data.recommendations.length > 0) {
          analysisContent += `## Recommendations\n\n`;
          response.data.recommendations.forEach(rec => {
            analysisContent += `- ${rec}\n`;
          });
        }

        await this.app.vault.create(filename, analysisContent);
        new Notice(`Vault analysis saved as ${filename}`);
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      notice.hide();
      new Notice(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCopilotCompletion(editor: Editor) {
    if (!this.settings.enableCopilot) {
      new Notice('Copilot is disabled in settings');
      return;
    }

    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);
    const textBeforeCursor = currentLine.substring(0, cursor.ch);
    const fullText = editor.getValue();

    try {
      const response = await this.apiClient.getCopilotCompletion({
        text: fullText,
        cursor_position: editor.posToOffset(cursor),
        file_type: 'markdown',
        context: textBeforeCursor
      });

      if (response.success && response.data) {
        // Insert completion at cursor
        editor.replaceRange(response.data.completion, cursor);
        new Notice('Completion inserted', 2000);
      } else {
        new Notice(`Copilot error: ${response.error}`);
      }
    } catch (error) {
      new Notice(`Copilot error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async quickChatWithSelection(editor: Editor) {
    const selection = editor.getSelection();
    if (!selection) {
      new Notice('No text selected');
      return;
    }

    try {
      const response = await this.apiClient.chat({
        message: `Please explain or analyze this text: "${selection}"`,
        vault_context: editor.getValue()
      });

      if (response.success && response.data) {
        // Insert response below selection
        const cursor = editor.getCursor('to');
        const newLine = `\n\n**VaultPilot Analysis:**\n${response.data.response}\n\n`;
        editor.replaceRange(newLine, cursor);
        new Notice('Analysis inserted', 2000);
      } else {
        new Notice(`Chat error: ${response.error}`);
      }
    } catch (error) {
      new Notice(`Chat error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async planTasksFromNote(editor: Editor) {
    const content = editor.getValue();
    const activeFile = this.app.workspace.getActiveFile();
    
    if (!content.trim()) {
      new Notice('No content to analyze');
      return;
    }

    const notice = new Notice('Planning tasks...', 0);

    try {
      const response = await this.apiClient.planTasks({
        goal: `Create a task plan based on this note: ${activeFile?.name || 'Untitled'}`,
        context: content,
        timeframe: '1 week'
      });

      notice.hide();

      if (response.success && response.data) {
        // Create task plan note
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Task Plan - ${activeFile?.basename || 'Untitled'} - ${timestamp}.md`;
        
        let taskContent = `# ${response.data.plan.title}\n\n`;
        taskContent += `${response.data.plan.description}\n\n`;
        taskContent += `**Estimated Duration:** ${response.data.plan.estimated_duration}\n\n`;
        
        if (response.data.plan.tasks && response.data.plan.tasks.length > 0) {
          taskContent += `## Tasks\n\n`;
          response.data.plan.tasks.forEach(task => {
            const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
            taskContent += `${checkbox} **${task.title}** (${task.priority} priority)\n`;
            taskContent += `   ${task.description}\n`;
            taskContent += `   *Estimated time: ${task.estimated_time}*\n\n`;
          });
        }

        if (response.data.milestones && response.data.milestones.length > 0) {
          taskContent += `## Milestones\n\n`;
          response.data.milestones.forEach(milestone => {
            taskContent += `- **${milestone.title}** (${milestone.target_date})\n`;
            taskContent += `  ${milestone.description}\n\n`;
          });
        }

        await this.app.vault.create(filename, taskContent);
        new Notice(`Task plan saved as ${filename}`);
      } else {
        throw new Error(response.error || 'Task planning failed');
      }
    } catch (error) {
      notice.hide();
      new Notice(`Task planning error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_VAULTPILOT);
    if (leaves.length === 0) {
      const rightLeaf = this.app.workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_VAULTPILOT,
          active: true
        });
      }
    } else {
      this.app.workspace.revealLeaf(leaves[0]);
    }
  }

  // Auto-completion handling
  private handleKeyUp(event: KeyboardEvent) {
    if (!this.settings.enableAutoComplete || !this.settings.enableCopilot) return;
    
    const target = event.target as HTMLElement;
    if (!target.classList.contains('cm-content')) return;

    // Debounce auto-completion requests
    clearTimeout((this as any).autoCompleteTimeout);
    (this as any).autoCompleteTimeout = setTimeout(() => {
      this.triggerAutoCompletion();
    }, 1000);
  }

  private async triggerAutoCompletion() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return;

    const editor = activeView.editor;
    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);
    
    // Only trigger if line has some content and cursor is at end
    if (currentLine.trim().length < 3 || cursor.ch !== currentLine.length) return;

    try {
      const response = await this.apiClient.getCopilotCompletion({
        text: editor.getValue(),
        cursor_position: editor.posToOffset(cursor),
        file_type: 'markdown'
      });

      if (response.success && response.data && response.data.suggestions.length > 0) {
        // Show suggestions (for now just show first suggestion)
        if (this.settings.debugMode) {
          new Notice(`Suggestion: ${response.data.suggestions[0]}`, 3000);
        }
      }
    } catch (error) {
      // Silently fail for auto-completion
      if (this.settings.debugMode) {
        console.error('Auto-completion error:', error);
      }
    }
  }

  private handleCopilotSuggestion(data: CopilotResponse) {
    // Handle real-time copilot suggestions from WebSocket
    if (this.settings.debugMode) {
      new Notice(`Live suggestion: ${data.completion}`, 2000);
    }
  }

  // Settings management
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update API client if URL changed
    this.apiClient = new EvoAgentXClient(this.settings.backendUrl, this.settings.apiKey);
    
    // Reconnect WebSocket if settings changed
    if (this.settings.enableWebSocket && !this.websocketConnected) {
      this.connectWebSocket();
    } else if (!this.settings.enableWebSocket && this.websocketConnected) {
      this.disconnectWebSocket();
    }
  }
}
