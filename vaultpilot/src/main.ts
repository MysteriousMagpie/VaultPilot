import { Plugin, Notice, Editor, MarkdownView, TFile, EditorPosition, request } from 'obsidian';
import { VaultPilotSettingTab, DEFAULT_SETTINGS } from './settings';
import { VIEW_TYPE_VAULTPILOT, VaultPilotView } from './view';
import { VIEW_TYPE_VAULTPILOT_FULL_TAB, VaultPilotFullTabView } from './full-tab-view';
import { ChatModal } from './chat-modal';
import { WorkflowModal } from './workflow-modal';
import { EvoAgentXClient } from './api-client';
import { VaultPilotSettings, CopilotResponse } from './types';
import { fetchSchedule, injectSchedule, validateScheduleMarkdown, findScheduleSection, findPlanSection } from './planner';
import { planMyDayDebugger } from './plan-my-day-debug';
import { setApp } from './vault-utils';
import { VaultManagementClient } from './vault-api-client';
import { createVaultManagementCommands } from './vault-commands';
import { 
  VaultStructureModal, 
  SmartSearchModal, 
  FileOperationsModal
} from './vault-modals';

export default class VaultPilotPlugin extends Plugin {
  settings!: VaultPilotSettings;
  apiClient!: EvoAgentXClient;
  vaultClient!: VaultManagementClient;
  private websocketConnected = false;
  private copilotEnabled = false;

  async onload() {
    await this.loadSettings();

    // Initialize app instance for vault-utils
    setApp(this.app);

    // Initialize API client
    this.apiClient = new EvoAgentXClient(this.settings.backendUrl, this.settings.apiKey);

    // Initialize vault management if enabled
    if (this.settings.vaultManagement?.enableVaultManagement) {
      this.initializeVaultManagement();
    }

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

    // Register views
    this.registerView(
      VIEW_TYPE_VAULTPILOT,
      (leaf) => new VaultPilotView(leaf, this)
    );
    
    this.registerView(
      VIEW_TYPE_VAULTPILOT_FULL_TAB,
      (leaf) => new VaultPilotFullTabView(leaf, this)
    );

    // Add ribbon icon
    const ribbonIconEl = this.addRibbonIcon('bot', 'VaultPilot', (evt: MouseEvent) => {
      if (evt.ctrlKey || evt.metaKey) {
        // Open full tab view on Ctrl/Cmd + click
        this.activateFullTabView();
      } else {
        // Default action: open chat modal
        this.openChatModal();
      }
    });
    ribbonIconEl.addClass('vaultpilot-ribbon-class');
    ribbonIconEl.title = 'VaultPilot (Ctrl+click for Dashboard)';

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
      id: 'plan-my-day',
      name: 'Plan My Day',
      callback: () => this.planMyDay()
    });

    this.addCommand({
      id: 'plan-my-day-debug',
      name: 'Plan My Day - Debug Connection',
      callback: () => this.debugPlanMyDay()
    });

    this.addCommand({
      id: 'open-vaultpilot-view',
      name: 'Open VaultPilot View',
      callback: () => this.activateView()
    });

    this.addCommand({
      id: 'open-vaultpilot-full-tab',
      name: 'Open VaultPilot Dashboard',
      callback: () => this.activateFullTabView()
    });

    // Register vault management commands
    this.registerVaultManagementCommands();

    // Register editor events for copilot
    if (this.settings.enableCopilot && this.settings.enableAutoComplete) {
      this.registerDomEvent(document, 'keyup', this.handleKeyUp.bind(this));
    }

    // Add settings tab
    this.addSettingTab(new VaultPilotSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VAULTPILOT);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VAULTPILOT_FULL_TAB);
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
      onIntentDebug: (debug) => {
        // Handle intent debug info (only in debug mode)
        if (this.settings.showIntentDebug && this.settings.debugMode) {
          console.log('Intent debug:', debug);
        }
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

    // Client-side validation to prevent 422 errors
    if (!fullText || fullText.trim().length === 0) {
      new Notice('Cannot complete empty text');
      return;
    }

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
          response.data.plan.tasks.forEach((task: any) => {
            const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
            taskContent += `${checkbox} **${task.title}** (${task.priority} priority)\n`;
            taskContent += `   ${task.description}\n`;
            taskContent += `   *Estimated time: ${task.estimated_time}*\n\n`;
          });
        }

        if (response.data.milestones && response.data.milestones.length > 0) {
          taskContent += `## Milestones\n\n`;
          response.data.milestones.forEach((milestone: any) => {
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

  async planMyDay() {
    console.log('🚀 [Plan My Day] Command started');
    
    const activeFile = this.app.workspace.getActiveFile();
    
    if (!activeFile) {
      console.warn('⚠️ [Plan My Day] No active file found');
      new Notice('No active note—open today\'s daily note first.');
      return;
    }

    console.log('📁 [Plan My Day] Active file:', {
      name: activeFile.name,
      path: activeFile.path,
      extension: activeFile.extension
    });

    const notice = new Notice('Planning your day with AI...', 0);

    try {
      console.log('📖 [Plan My Day] Reading file content...');
      
      // Read the entire file content
      const fileText = await this.app.vault.read(activeFile);
      
      console.log('📝 [Plan My Day] File content read:', {
        length: fileText.length,
        hasContent: fileText.trim().length > 0,
        firstLine: fileText.split('\n')[0],
        lineCount: fileText.split('\n').length
      });

      console.log('🔍 [Plan My Day] Checking API client...');
      console.log('🔗 [Plan My Day] API client status:', {
        exists: !!this.apiClient,
        type: typeof this.apiClient,
        isConnected: this.apiClient ? 'available' : 'not available'
      });

      if (!this.apiClient) {
        const error = 'API client not initialized. Check VaultPilot settings and connection.';
        console.error('❌ [Plan My Day] Error:', error);
        throw new Error(error);
      }
      
      console.log('📤 [Plan My Day] Fetching schedule from EvoAgentX...');
      
      // Fetch schedule from EvoAgentX instead of localhost:3000
      const { scheduleMarkdown, headline } = await fetchSchedule(fileText, this.apiClient);

      console.log('📋 [Plan My Day] Schedule received:', {
        markdownLength: scheduleMarkdown.length,
        headline: headline,
        firstLine: scheduleMarkdown.split('\n')[0]
      });

      console.log('✅ [Plan My Day] Validating schedule...');
      
      // Validate the returned schedule
      if (!validateScheduleMarkdown(scheduleMarkdown)) {
        const error = 'Invalid schedule data received from API';
        console.error('❌ [Plan My Day] Validation failed:', {
          scheduleMarkdown: scheduleMarkdown.substring(0, 200),
          length: scheduleMarkdown.length
        });
        throw new Error(error);
      }

      console.log('📝 [Plan My Day] Injecting schedule into note...');
      
      // Check if note already has a plan section (comment wrapper) or schedule section
      const existingPlanSection = findPlanSection(fileText);
      const existingScheduleSection = findScheduleSection(fileText);
      
      console.log('🔍 [Plan My Day] Existing sections:', {
        hasPlanWrapper: !!existingPlanSection,
        hasScheduleSection: !!existingScheduleSection,
        planContent: existingPlanSection?.[2]?.substring(0, 50),
        scheduleHeading: existingScheduleSection?.[1]?.substring(0, 50)
      });

      // Inject the schedule into the note
      const updatedText = injectSchedule(fileText, scheduleMarkdown);

      console.log('💾 [Plan My Day] Updating file...', {
        originalLength: fileText.length,
        updatedLength: updatedText.length,
        changed: fileText !== updatedText
      });

      // Update the file
      await this.app.vault.modify(activeFile, updatedText);

      console.log('✅ [Plan My Day] File updated successfully');

      // Hide the progress notice
      notice.hide();

      // Show success notice
      const successMessage = headline ? `${headline} ✅` : 'Schedule inserted ✅';
      console.log('🎉 [Plan My Day] Success:', successMessage);
      new Notice(successMessage);

    } catch (error) {
      console.error('❌ [Plan My Day] Operation failed:', error);
      console.error('🔍 [Plan My Day] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        type: typeof error,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      
      notice.hide();
      
      // Handle different types of errors from EvoAgentX
      if (error instanceof Error) {
        const errorMessage = error.message;
        console.log('🔍 [Plan My Day] Analyzing error message:', errorMessage);
        
        if (errorMessage.includes('API client not initialized')) {
          console.error('❌ [Plan My Day] API client not initialized');
          new Notice('Planning error: VaultPilot not connected to EvoAgentX. Check settings and restart plugin.');
        } else if (errorMessage.includes('does not have planTasks method')) {
          console.error('❌ [Plan My Day] API client missing planTasks method');
          new Notice('Planning error: EvoAgentX API client outdated. Please update VaultPilot plugin.');
        } else if (errorMessage.includes('JSON') || errorMessage.includes('Invalid schedule data')) {
          console.error('❌ [Plan My Day] Invalid response format');
          new Notice('Planning error: Invalid response format from EvoAgentX');
        } else if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
          console.error('❌ [Plan My Day] Network error');
          new Notice('Planning error: Unable to connect to EvoAgentX server. Check your connection and server status.');
        } else if (errorMessage.includes('Failed to generate schedule') || errorMessage.includes('Schedule fetch failed')) {
          console.error('❌ [Plan My Day] Schedule generation failed');
          new Notice('Planning error: EvoAgentX task planning failed. Check server logs for details.');
        } else if (errorMessage.includes('No data in API response')) {
          console.error('❌ [Plan My Day] Empty API response');
          new Notice('Planning error: EvoAgentX returned empty response. Try again or check server status.');
        } else {
          console.error('❌ [Plan My Day] Unhandled error');
          new Notice(`Planning error: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`);
        }
      } else {
        console.error('❌ [Plan My Day] Non-Error object thrown');
        new Notice('Planning error: Unknown error occurred with EvoAgentX');
      }
      
      // Always log the full error for debugging
      console.log('🔍 [Plan My Day] Full error log completed');
    }
  }

  async debugPlanMyDay() {
    console.log('🔍 [Plan My Day Debug] Starting comprehensive debug...');
    planMyDayDebugger.clearLogs();
    
    const notice = new Notice('Running Plan My Day diagnostics...', 0);

    try {
      // Test 1: Check active file
      const activeFile = this.app.workspace.getActiveFile();
      planMyDayDebugger.log('📁 Active file check', {
        hasActiveFile: !!activeFile,
        fileName: activeFile?.name,
        fileExtension: activeFile?.extension
      });

      // Test 2: Analyze API client
      const apiAnalysis = planMyDayDebugger.analyzeApiClient(this.apiClient);
      planMyDayDebugger.log('🔗 API client analysis', apiAnalysis);

      // Test 3: Test EvoAgentX connection
      if (this.apiClient) {
        const connectionTest = await planMyDayDebugger.testConnection(this.apiClient);
        planMyDayDebugger.log('🌐 Connection test result', connectionTest);

        // Test 4: Test task planning functionality
        if (connectionTest.success) {
          const planningTest = await planMyDayDebugger.testTaskPlanning(
            this.apiClient, 
            'Test note with some tasks:\n- Write code\n- Test functionality\n- Review results'
          );
          planMyDayDebugger.log('📋 Task planning test result', planningTest);
        }
      }

      // Test 5: Check settings
      planMyDayDebugger.log('⚙️ Plugin settings', {
        backendUrl: this.settings.backendUrl,
        hasApiKey: !!this.settings.apiKey,
        debugMode: this.settings.debugMode
      });

      notice.hide();

      // Show results in a modal or console
      const logs = planMyDayDebugger.getLogs();
      console.log('🔍 [Plan My Day Debug] Complete diagnostic log:', logs);
      
      const logSummary = logs.slice(-5).join('\n'); // Last 5 entries
      new Notice(`Debug complete! Check console for full logs.\n\nLast entries:\n${logSummary}`, 10000);

      // Create a debug file if active file exists
      if (activeFile) {
        const debugContent = `# Plan My Day Debug Report\n\nGenerated: ${new Date().toISOString()}\n\n## Diagnostic Results\n\n\`\`\`\n${planMyDayDebugger.exportLogs()}\n\`\`\``;
        await this.app.vault.create(`Plan My Day Debug - ${Date.now()}.md`, debugContent);
        new Notice('Debug report saved as new note!');
      }

    } catch (error) {
      notice.hide();
      planMyDayDebugger.error('Debug process failed', error);
      new Notice(`Debug failed: ${error instanceof Error ? error.message : String(error)}`);
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

  async activateFullTabView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_VAULTPILOT_FULL_TAB);
    if (leaves.length === 0) {
      // Create a new tab in the main workspace
      const newLeaf = this.app.workspace.getLeaf('tab');
      if (newLeaf) {
        await newLeaf.setViewState({
          type: VIEW_TYPE_VAULTPILOT_FULL_TAB,
          active: true
        });
      }
    } else {
      this.app.workspace.revealLeaf(leaves[0]);
    }
  }

  // === VAULT MANAGEMENT METHODS ===

  initializeVaultManagement() {
    if (!this.settings.vaultManagement?.enableVaultManagement) return;
    
    this.vaultClient = new VaultManagementClient(
      this.settings.backendUrl,
      this.settings.apiKey
    );
    
    if (this.settings.debugMode) {
      console.log('Vault management initialized');
    }
  }

  disableVaultManagement() {
    this.vaultClient = null as any;
    if (this.settings.debugMode) {
      console.log('Vault management disabled');
    }
  }

  registerVaultManagementCommands() {
    const commands = createVaultManagementCommands();
    commands.forEach(command => {
      this.addCommand({
        ...command,
        callback: command.callback?.bind(this),
        editorCallback: command.editorCallback?.bind(this)
      });
    });
  }

  // Modal opening methods for vault management
  openVaultStructureModal() {
    if (!this.vaultClient) {
      new Notice('Vault management not available');
      return;
    }
    new VaultStructureModal(this.app, this).open();
  }

  openSmartSearchModal(query?: string, type?: string) {
    if (!this.vaultClient) {
      new Notice('Vault management not available');
      return;
    }
    const modal = new SmartSearchModal(this.app, this);
    if (query) modal.setInitialQuery(query, type as any);
    modal.open();
  }

  openFileOperationsModal(path?: string, operation?: string) {
    if (!this.vaultClient) {
      new Notice('Vault management not available');
      return;
    }
    const modal = new FileOperationsModal(this.app, this);
    if (path) modal.setInitialPath(path);
    if (operation) modal.setOperation(operation);
    modal.open();
  }

  openVaultOrganizerModal() {
    new Notice('Vault organizer modal not yet implemented');
  }

  openBatchOperationsModal() {
    new Notice('Batch operations modal not yet implemented');
  }

  // === END VAULT MANAGEMENT METHODS ===

  // Auto-completion handling
  private handleKeyUp(event: KeyboardEvent) {
    if (!this.settings.enableAutoComplete || !this.settings.enableCopilot) return;
    
    const target = event.target as HTMLElement;
    if (!target.classList.contains('cm-content')) return;

    // Only trigger on specific keys and conditions
    if (!this.shouldTriggerAutoComplete(event)) return;

    // Debounce auto-completion requests with longer delay
    clearTimeout((this as any).autoCompleteTimeout);
    (this as any).autoCompleteTimeout = setTimeout(() => {
      this.triggerAutoCompletion();
    }, 3000); // Increased to 3 seconds
  }

  private shouldTriggerAutoComplete(event: KeyboardEvent): boolean {
    // Don't trigger on navigation or modifier keys
    const nonTriggerKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape'];
    if (nonTriggerKeys.indexOf(event.key) !== -1) {
      return false;
    }

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return false;

    const editor = activeView.editor;
    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);
    
    // Only trigger at the end of a line
    if (cursor.ch !== currentLine.length) return false;
    
    // Check for sentence-ending triggers
    const triggerChars = ['.', '!', '?', ':', '\n'];
    const lastChar = currentLine.slice(-1);
    
    // Trigger after sentence endings with space
    if (triggerChars.indexOf(lastChar) !== -1 && event.key === ' ') {
      return true;
    }
    
    // Trigger after Enter key (new line)
    if (event.key === 'Enter' && currentLine.trim().length > 10) {
      return true;
    }
    
    return false;
  }

  private async triggerAutoCompletion() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return;

    const editor = activeView.editor;
    const cursor = editor.getCursor();
    const currentLine = editor.getLine(cursor.line);
    const fullText = editor.getValue();
    
    // More restrictive conditions for auto-completion
    if (currentLine.trim().length < 10 || cursor.ch !== currentLine.length) return;
    
    // Prevent 422 errors from empty text
    if (!fullText || fullText.trim().length === 0) return;

    // Add cooldown to prevent too frequent requests
    const now = Date.now();
    const lastRequest = (this as any).lastAutoCompleteRequest || 0;
    if (now - lastRequest < 10000) return; // 10 second cooldown
    
    (this as any).lastAutoCompleteRequest = now;

    try {
      const response = await this.apiClient.getCopilotCompletion({
        text: fullText,
        cursor_position: editor.posToOffset(cursor),
        file_type: 'markdown'
      });

      if (response.success && response.data && response.data.suggestions.length > 0) {
        // Show suggestions (for now just show first suggestion)
        if (this.settings.debugMode) {
          new Notice(`Auto-suggestion: ${response.data.suggestions[0]}`, 3000);
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
    
    // Reinitialize vault management if settings changed
    if (this.settings.vaultManagement?.enableVaultManagement) {
      this.initializeVaultManagement();
    } else {
      this.disableVaultManagement();
    }
    
    // Reconnect WebSocket if settings changed
    if (this.settings.enableWebSocket && !this.websocketConnected) {
      this.connectWebSocket();
    } else if (!this.settings.enableWebSocket && this.websocketConnected) {
      this.disconnectWebSocket();
    }
  }
}
