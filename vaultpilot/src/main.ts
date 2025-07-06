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
import { ModelSelectionService } from './services/ModelSelectionService';
import { EnvironmentDetector } from './utils/EnvironmentDetector';
import { 
  VaultStructureModal, 
  SmartSearchModal, 
  FileOperationsModal
} from './vault-modals';
import { Phase3Integration } from './components/Phase3Integration';
// Enhanced UI Components
import { VaultPilotEnhancementManager } from './vault-management/enhanced-ui-components';
import { KeyboardShortcutHandler, EnhancedCommandsFactory } from './vault-management/enhanced-commands';

export default class VaultPilotPlugin extends Plugin {
  settings!: VaultPilotSettings;
  apiClient!: EvoAgentXClient;
  vaultClient!: VaultManagementClient;
  modelSelectionService?: ModelSelectionService;
  phase3Integration?: Phase3Integration;
  enhancementManager?: VaultPilotEnhancementManager;
  keyboardHandler?: KeyboardShortcutHandler;
  private websocketConnected = false;
  private copilotEnabled = false;

  async onload() {
    await this.loadSettings();

    // Load enhanced UI styles
    this.loadEnhancedUIStyles();

    // Initialize app instance for vault-utils
    setApp(this.app);

    // Initialize API client
    this.apiClient = new EvoAgentXClient(this.settings.backendUrl, this.settings.apiKey);

    // Initialize vault management if enabled
    if (this.settings.vaultManagement?.enableVaultManagement) {
      this.initializeVaultManagement();
    }

    // Initialize model selection if enabled (with error handling)
    if (this.settings.modelSelection?.enabled) {
      // Don't await - initialize in background to avoid blocking plugin load
      this.initializeModelSelection().catch(error => {
        if (this.settings.debugMode) {
          console.warn('Model selection initialization failed during plugin load:', error);
        }
        // Silently fail during plugin initialization
      });
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
      id: 'test-model-selection',
      name: 'Test Smart Model Selection',
      callback: () => this.testModelSelection()
    });

    this.addCommand({
      id: 'show-model-health',
      name: 'Show Model Health Status',
      callback: () => this.showModelHealth()
    });

    this.addCommand({
      id: 'retry-model-selection',
      name: 'Retry Model Selection Initialization',
      callback: () => this.retryModelSelectionManual()
    });

    this.addCommand({
      id: 'check-service-status',
      name: 'Check VaultPilot Service Status',
      callback: () => this.checkServiceStatus()
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

    // Initialize Phase 3 features
    this.initializePhase3();

    // Initialize Enhancement Manager and Keyboard Shortcuts
    this.initializeEnhancementManager();

    // Register editor events for copilot
    if (this.settings.enableCopilot && this.settings.enableAutoComplete) {
      this.registerDomEvent(document, 'keyup', this.handleKeyUp.bind(this));
    }

    // Add settings tab
    this.addSettingTab(new VaultPilotSettingTab(this.app, this));
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VAULTPILOT);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VAULTPILOT_FULL_TAB);
    this.disconnectWebSocket();
    await this.disconnectModelSelection();
    this.disablePhase3();
    this.disableEnhancementManager();
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
    
    // Check if vault management endpoints are available
    this.checkVaultManagementAvailability();
    
    if (this.settings.debugMode) {
      console.log('Vault management initialized');
    }
  }

  async checkVaultManagementAvailability() {
    try {
      // Try a simple test call to see if vault endpoints exist
      const response = await fetch(`${this.settings.backendUrl}/api/obsidian/vault/structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.settings.apiKey && { 'Authorization': `Bearer ${this.settings.apiKey}` })
        },
        body: JSON.stringify({ include_content: false, max_depth: 1 })
      });

      if (response.status === 404) {
        // Endpoint doesn't exist - disable vault management
        this.disableVaultManagement();
        if (this.settings.debugMode) {
          console.log('VaultPilot: Vault management endpoints not available, disabling features');
        }
        return false;
      }
    } catch (error) {
      // Network error or other issue - keep vault management but log warning
      if (this.settings.debugMode) {
        console.log('VaultPilot: Could not check vault management availability:', error);
      }
    }
    return true;
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

  // === PHASE 3 INTEGRATION ===

  initializePhase3() {
    // For now, always initialize Phase 3 features
    try {
      this.phase3Integration = new Phase3Integration(this, {
        autoShowOnboarding: !this.settings.onboardingComplete
      });
      
      // Load the Phase 3 integration
      this.phase3Integration.onload();
      
      if (this.settings.debugMode) {
        console.log('Phase 3 features initialized successfully');
      }

      // Show onboarding for first-time users
      if (!this.settings.onboardingComplete) {
        // Delay onboarding slightly to let plugin fully load
        setTimeout(() => {
          this.phase3Integration?.showOnboardingIfNeeded();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to initialize Phase 3 features:', error);
      if (this.settings.debugMode) {
        new Notice('Phase 3 features failed to initialize - check console for details', 5000);
      }
    }
  }

  disablePhase3() {
    if (this.phase3Integration) {
      this.phase3Integration.onunload();
      this.phase3Integration = undefined;
    }
    if (this.settings.debugMode) {
      console.log('Phase 3 features disabled');
    }
  }

  // === END PHASE 3 INTEGRATION ===

  // === ENHANCEMENT MANAGER INTEGRATION ===

  initializeEnhancementManager() {
    try {
      // Initialize Enhancement Manager
      this.enhancementManager = new VaultPilotEnhancementManager(this);
      
      // Initialize the enhancement manager
      this.enhancementManager.initialize().then(() => {
        if (this.settings.debugMode) {
          console.log('VaultPilot Enhancement Manager initialized successfully');
        }
      }).catch(error => {
        console.error('Failed to initialize Enhancement Manager:', error);
      });

      // Initialize Keyboard Shortcut Handler
      this.keyboardHandler = new KeyboardShortcutHandler(this);
      
      // Register global keyboard event listener
      this.registerDomEvent(document, 'keydown', (event: KeyboardEvent) => {
        if (this.keyboardHandler?.handleKeyDown(event)) {
          // Event was handled by keyboard shortcuts
          return;
        }
      });

      // Register enhanced commands
      const enhancedCommands = EnhancedCommandsFactory.createEnhancedCommands(this);
      enhancedCommands.forEach(command => {
        this.addCommand({
          id: command.id,
          name: command.name,
          callback: command.callback,
          editorCallback: command.editorCallback,
          checkCallback: command.checkCallback
        });
      });

      if (this.settings.debugMode) {
        console.log('Keyboard shortcuts and enhanced commands initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Enhancement Manager:', error);
      if (this.settings.debugMode) {
        new Notice('Enhancement features failed to initialize - check console for details', 5000);
      }
    }
  }

  disableEnhancementManager() {
    if (this.enhancementManager) {
      this.enhancementManager.unload();
      this.enhancementManager = undefined;
    }
    
    if (this.keyboardHandler) {
      this.keyboardHandler = undefined;
    }

    if (this.settings.debugMode) {
      console.log('Enhancement Manager disabled');
    }
  }

  // === END ENHANCEMENT MANAGER INTEGRATION ===

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
    
    // Reinitialize model selection if settings changed
    if (this.settings.modelSelection?.enabled) {
      await this.initializeModelSelection();
    } else {
      await this.disconnectModelSelection();
    }
    
    // Reconnect WebSocket if settings changed
    if (this.settings.enableWebSocket && !this.websocketConnected) {
      this.connectWebSocket();
    } else if (!this.settings.enableWebSocket && this.websocketConnected) {
      this.disconnectWebSocket();
    }
  }

  // Model Selection Management Methods
  async initializeModelSelection(): Promise<void> {
    if (!this.settings.modelSelection?.enabled) {
      if (this.settings.debugMode) {
        console.log('Model selection disabled in settings');
      }
      return;
    }

    try {
      // Validate environment
      const env = EnvironmentDetector.detect();
      if (!env.hasHTTP) {
        throw new Error('HTTP transport not available');
      }

      // Initialize service with error boundary
      this.modelSelectionService = new ModelSelectionService(
        this.settings.backendUrl,
        this.settings.modelSelection.devpipePath,
        {
          monitoring_interval: this.settings.modelSelection.monitoringInterval,
          fallback_enabled: this.settings.modelSelection.fallbackEnabled,
          cache_duration: this.settings.modelSelection.cacheDuration,
          retry_attempts: this.settings.modelSelection.retryAttempts,
          timeout: this.settings.modelSelection.timeout,
          debug_mode: this.settings.modelSelection.debugMode
        }
      );

      await this.modelSelectionService.updatePreferences({
        priority: this.settings.modelSelection.userPreferences.priority,
        max_cost_per_request: this.settings.modelSelection.userPreferences.maxCostPerRequest,
        preferred_providers: this.settings.modelSelection.userPreferences.preferredProviders,
        fallback_enabled: this.settings.modelSelection.fallbackEnabled,
        quality_threshold: this.settings.modelSelection.userPreferences.qualityThreshold,
        timeout_preference: this.settings.modelSelection.timeout
      });

      await this.modelSelectionService.initialize();

      if (this.settings.debugMode) {
        console.log('ModelSelectionService initialized successfully');
      }

      new Notice('🤖 Smart model selection enabled', 3000);

    } catch (error) {
      console.error('Failed to initialize ModelSelectionService:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('not accessible') || error.message.includes('Failed to fetch')) {
          if (this.settings.debugMode) {
            new Notice('⚠️ Model selection service unavailable - using fallback mode', 4000);
          }
          // Don't show error to user in production - just log it
        } else if (error.message.includes('transport not available')) {
          new Notice('⚠️ Model selection not supported in this environment', 5000);
        } else {
          if (this.settings.debugMode) {
            new Notice('⚠️ Model selection initialization failed', 3000);
          }
        }
      }
      
      // Set up retry mechanism
      if (this.settings.modelSelection.retryAttempts > 0) {
        setTimeout(() => {
          this.retryModelSelectionInit(1);
        }, 10000); // Retry after 10 seconds
      }
    }
  }

  private async retryModelSelectionInit(attempt: number): Promise<void> {
    if (attempt > (this.settings.modelSelection?.retryAttempts || 3)) {
      if (this.settings.debugMode) {
        console.log('Model selection initialization retry limit reached');
      }
      return;
    }

    try {
      if (this.settings.debugMode) {
        console.log(`Retrying model selection initialization (attempt ${attempt})`);
      }
      
      await this.initializeModelSelection();
    } catch (error) {
      // Exponential backoff for retries
      const delay = Math.min(30000, 5000 * Math.pow(2, attempt - 1));
      setTimeout(() => {
        this.retryModelSelectionInit(attempt + 1);
      }, delay);
    }
  }

  async checkServiceStatus(): Promise<void> {
    const notice = new Notice('Checking VaultPilot service status...', 0);
    
    try {
      let statusText = '🔍 VaultPilot Service Status:\n\n';
      
      // Check main backend connection
      try {
        const response = await this.apiClient.healthCheck();
        if (response.success) {
          statusText += '✅ Main Backend: Connected\n';
          statusText += `   Server: ${this.settings.backendUrl}\n`;
        } else {
          statusText += '❌ Main Backend: Failed\n';
          statusText += `   Error: ${response.error}\n`;
        }
      } catch (error) {
        statusText += '❌ Main Backend: Connection Error\n';
      }
      
      // Check WebSocket connection
      if (this.isWebSocketConnected()) {
        statusText += '✅ WebSocket: Connected\n';
      } else {
        statusText += '❌ WebSocket: Disconnected\n';
      }
      
      // Check model selection service
      if (this.settings.modelSelection?.enabled) {
        if (this.modelSelectionService && this.modelSelectionService.isConnected()) {
          statusText += '✅ Model Selection: Connected\n';
        } else {
          statusText += '❌ Model Selection: Not Available\n';
          if (!this.modelSelectionService) {
            statusText += '   Reason: Service not initialized\n';
          } else {
            statusText += '   Reason: Service disconnected\n';
          }
        }
      } else {
        statusText += '⚠️ Model Selection: Disabled in settings\n';
      }
      
      // Check vault management
      if (this.settings.vaultManagement?.enableVaultManagement) {
        if (this.vaultClient) {
          statusText += '✅ Vault Management: Enabled\n';
        } else {
          statusText += '❌ Vault Management: Failed to initialize\n';
        }
      } else {
        statusText += '⚠️ Vault Management: Disabled in settings\n';
      }
      
      notice.hide();
      new Notice(statusText, 15000);
      
      if (this.settings.debugMode) {
        console.log('VaultPilot Service Status:', statusText);
      }
      
    } catch (error) {
      notice.hide();
      new Notice(`❌ Failed to check service status: ${error instanceof Error ? error.message : 'Unknown error'}`, 5000);
    }
  }

  async retryModelSelectionManual(): Promise<void> {
    if (this.modelSelectionService && this.modelSelectionService.isConnected()) {
      new Notice('Model selection already connected', 3000);
      return;
    }

    const notice = new Notice('Retrying model selection initialization...', 0);
    
    try {
      await this.initializeModelSelection();
      notice.hide();
      new Notice('✅ Model selection connected successfully', 3000);
    } catch (error) {
      notice.hide();
      new Notice(`❌ Model selection retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 5000);
    }
  }

  async disconnectModelSelection(): Promise<void> {
    if (this.modelSelectionService) {
      try {
        await this.modelSelectionService.disconnect();
        this.modelSelectionService = undefined;
        
        if (this.settings.debugMode) {
          console.log('ModelSelectionService disconnected');
        }
      } catch (error) {
        console.error('Error disconnecting ModelSelectionService:', error);
      }
    }
  }

  async testModelSelection(): Promise<void> {
    if (!this.modelSelectionService) {
      new Notice('❌ Model selection service not initialized', 5000);
      return;
    }

    const notice = new Notice('🤖 Testing model selection...', 0);

    try {
      const tasks = [
        { type: 'text-generation', quality: 'medium' as const },
        { type: 'code-generation', quality: 'high' as const },
        { type: 'chat', quality: 'low' as const },
        { type: 'summarization', quality: 'medium' as const }
      ];

      let results = [];
      for (const task of tasks) {
        try {
          const selection = await this.modelSelectionService.selectForTask(task.type, task.quality);
          results.push(`✅ ${task.type}: ${selection.selected_model.name} ($${selection.estimated_cost.toFixed(4)})`);
        } catch (error) {
          results.push(`❌ ${task.type}: Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      notice.hide();
      const resultText = results.join('\n');
      new Notice(`Model Selection Test Results:\n${resultText}`, 10000);

      if (this.settings.debugMode) {
        console.log('Model selection test results:', results);
      }
    } catch (error) {
      notice.hide();
      new Notice(`❌ Model selection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 5000);
    }
  }

  async showModelHealth(): Promise<void> {
    if (!this.modelSelectionService) {
      new Notice('❌ Model selection service not initialized', 5000);
      return;
    }

    const notice = new Notice('🏥 Checking model health...', 0);

    try {
      const health = await this.modelSelectionService.getModelHealth();
      
      notice.hide();

      if (health.length === 0) {
        new Notice('⚠️ No model health information available', 5000);
        return;
      }

      const healthInfo = health.map(h => {
        const status = h.status === 'healthy' ? '✅' : h.status === 'degraded' ? '⚠️' : '❌';
        return `${status} ${h.model_id}: ${h.status} (${h.response_time}ms, ${h.availability_percentage}%)`;
      }).join('\n');

      new Notice(`Model Health Status:\n${healthInfo}`, 15000);

      if (this.settings.debugMode) {
        console.log('Model health status:', health);
      }
    } catch (error) {
      notice.hide();
      new Notice(`❌ Failed to get model health: ${error instanceof Error ? error.message : 'Unknown error'}`, 5000);
    }
  }

  async getBestModelForTask(taskType: string, quality: 'low' | 'medium' | 'high' = 'medium') {
    // Check if model selection service is available and connected
    if (this.modelSelectionService && this.modelSelectionService.isConnected()) {
      try {
        const selection = await this.modelSelectionService.selectForTask(taskType, quality);
        
        if (this.settings.debugMode) {
          console.log(`Selected model ${selection.selected_model.name} for ${taskType} task`);
        }
        
        return selection;
      } catch (error) {
        if (this.settings.debugMode) {
          console.warn('Model selection failed, using default:', error);
        }
        
        // If enabled, try to reinitialize the service
        if (this.settings.modelSelection?.enabled && !this.modelSelectionService.isConnected()) {
          this.retryModelSelectionInit(1).catch(() => {
            // Silently fail retry
          });
        }
      }
    } else if (this.settings.modelSelection?.enabled && !this.modelSelectionService) {
      // Service not initialized, try to initialize it
      if (this.settings.debugMode) {
        console.log('Model selection service not initialized, attempting initialization...');
      }
      this.initializeModelSelection().catch(() => {
        // Silently fail initialization
      });
    }
    
    return null;
  }

  // === ENHANCED UI STYLES ===

  private loadEnhancedUIStyles() {
    // Load enhanced UI styles for progress indicators and keyboard shortcuts
    const styleId = 'vaultpilot-enhanced-ui-styles';
    
    // Remove existing styles if they exist
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* VaultPilot Enhanced UI Styles */
      @import url("app://obsidian.md/vault-management/enhanced-ui-styles.css");
      
      /* Fallback styles in case import fails */
      .vaultpilot-progress-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
        max-width: 400px;
        font-family: var(--font-interface);
      }
      
      .vaultpilot-progress-item {
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 300px;
        pointer-events: auto;
        animation: slideInRight 0.3s ease-out;
      }
      
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    
    // Add to document head
    document.head.appendChild(style);
    
    if (this.settings.debugMode) {
      console.log('Enhanced UI styles loaded');
    }
  }
}
