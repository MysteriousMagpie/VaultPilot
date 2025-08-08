import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type VaultPilotPlugin from './main';
import { VaultPilotSettings, ModelSelectionSettings } from './types';
import { addVaultManagementSettings, DEFAULT_VAULT_MANAGEMENT_SETTINGS } from './vault-settings';

export const DEFAULT_SETTINGS: VaultPilotSettings = {
  backendUrl: 'http://localhost:8000',
  apiKey: '',
  enableWebSocket: true,
  enableCopilot: true,
  enableAutoComplete: false, // Disabled by default to prevent frequent requests
  defaultAgent: '',
  defaultMode: 'ask',
  chatHistoryLimit: 100,
  debugMode: false,
  showIntentDebug: false,
  vaultManagement: DEFAULT_VAULT_MANAGEMENT_SETTINGS,
  modelSelection: {
    enabled: true,
    devpipePath: '../dev-pipe',
    monitoringInterval: 30000,
    fallbackEnabled: true,
    cacheDuration: 300000,
    retryAttempts: 3,
    timeout: 30000,
    debugMode: false,
    userPreferences: {
      priority: 'balanced',
      maxCostPerRequest: 0.50,
      preferredProviders: [],
      qualityThreshold: 0.7
    }
  },
  // Phase 3 Settings
  onboardingComplete: false,
  performanceMode: 'balanced',
  enableRealTimeUpdates: true,
  enableAnalytics: true,
  // Workspace Manager Settings
  workspaceManager: ({
    enabled: true,
    autoSwitchMode: false,
    defaultMode: 'chat',
    panelSizes: {
      context: 300,
      ai: 300
    }
  } as any)
};

export class VaultPilotSettingTab extends PluginSettingTab {
  plugin: VaultPilotPlugin;

  constructor(app: App, plugin: VaultPilotPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    
    containerEl.createEl('h2', { text: 'VaultPilot Settings' });
    containerEl.createEl('p', { 
      text: 'Configure your connection to EvoAgentX backend and AI features.' 
    });

    // Connection Settings
    containerEl.createEl('h3', { text: 'Connection' });

    new Setting(containerEl)
      .setName('Backend URL')
      .setDesc('URL of EvoAgentX backend server')
      .addText(text =>
        text
          .setPlaceholder('http://localhost:8000')
          .setValue(this.plugin.settings.backendUrl)
          .onChange(async value => {
            this.plugin.settings.backendUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Optional API key for authentication (if required by backend)')
      .addText(text =>
        text
          .setPlaceholder('Enter API key...')
          .setValue(this.plugin.settings.apiKey || '')
          .onChange(async value => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    // Test connection button
    new Setting(containerEl)
      .setName('Connection Test')
      .setDesc('Test connection to EvoAgentX backend')
      .addButton(button =>
        button
          .setButtonText('Test Connection')
          .onClick(async () => {
            await this.testConnection();
          })
      );

    // Feature Settings
    containerEl.createEl('h3', { text: 'Features' });

    new Setting(containerEl)
      .setName('Enable WebSocket')
      .setDesc('Enable real-time communication for live updates and progress tracking')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableWebSocket)
          .onChange(async value => {
            this.plugin.settings.enableWebSocket = value;
            await this.plugin.saveSettings();
            if (value) {
              this.plugin.connectWebSocket();
            } else {
              this.plugin.disconnectWebSocket();
            }
          })
      );

    new Setting(containerEl)
      .setName('Enable Copilot')
      .setDesc('Enable AI-powered text completion and suggestions')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableCopilot)
          .onChange(async value => {
            this.plugin.settings.enableCopilot = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Enable Auto-Complete')
      .setDesc('Automatically suggest completions after sentence endings and new lines (with 10s cooldown)')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.enableAutoComplete)
          .onChange(async value => {
            this.plugin.settings.enableAutoComplete = value;
            await this.plugin.saveSettings();
          })
      );

    // Agent Settings
    containerEl.createEl('h3', { text: 'Agent Configuration' });

    new Setting(containerEl)
      .setName('Default Agent')
      .setDesc('Default agent to use for chat and workflows (leave empty for auto-selection)')
      .addText(text =>
        text
          .setPlaceholder('Agent ID or name...')
          .setValue(this.plugin.settings.defaultAgent || '')
          .onChange(async value => {
            this.plugin.settings.defaultAgent = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Default Chat Mode')
      .setDesc('Default mode for new chat sessions: Ask for simple Q&A, Agent for complex workflows')
      .addDropdown(dropdown =>
        dropdown
          .addOption('ask', 'Ask Mode - Simple Q&A')
          .addOption('agent', 'Agent Mode - Complex Workflows')
          .setValue(this.plugin.settings.defaultMode)
          .onChange(async value => {
            this.plugin.settings.defaultMode = value as 'ask' | 'agent';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Chat History Limit')
      .setDesc('Maximum number of chat messages to keep in history')
      .addSlider(slider =>
        slider
          .setLimits(10, 500, 10)
          .setValue(this.plugin.settings.chatHistoryLimit)
          .setDynamicTooltip()
          .onChange(async value => {
            this.plugin.settings.chatHistoryLimit = value;
            await this.plugin.saveSettings();
          })
      );

    // Advanced Settings
    containerEl.createEl('h3', { text: 'Advanced' });

    new Setting(containerEl)
      .setName('Debug Mode')
      .setDesc('Enable debug logging and additional developer features')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.debugMode)
          .onChange(async value => {
            this.plugin.settings.debugMode = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Show Intent Debug Overlay')
      .setDesc('Display automatic intent detection in chat (Ask vs Agent mode)')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.showIntentDebug)
          .onChange(async value => {
            this.plugin.settings.showIntentDebug = value;
            await this.plugin.saveSettings();
          })
      );

    // Vault Management Settings
    containerEl.createEl('h3', { text: 'Vault Management' });
    addVaultManagementSettings(containerEl, this.plugin);

    // Model Selection Settings
    containerEl.createEl('h3', { text: 'Model Selection' });
    
    new Setting(containerEl)
      .setName('Enable Model Selection')
      .setDesc('Enable intelligent AI model selection based on task type and requirements')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.modelSelection?.enabled ?? true)
          .onChange(async value => {
            if (!this.plugin.settings.modelSelection) {
              this.plugin.settings.modelSelection = DEFAULT_SETTINGS.modelSelection!;
            }
            this.plugin.settings.modelSelection.enabled = value;
            await this.plugin.saveSettings();
            
            if (value) {
              // Initialize model selection service if enabled
              await this.plugin.initializeModelSelection();
            } else {
              // Disconnect model selection service if disabled
              await this.plugin.disconnectModelSelection();
            }
          })
      );

    new Setting(containerEl)
      .setName('DevPipe Path')
      .setDesc('Path to the DevPipe communication directory')
      .addText(text =>
        text
          .setPlaceholder('../dev-pipe')
          .setValue(this.plugin.settings.modelSelection?.devpipePath ?? '../dev-pipe')
          .onChange(async value => {
            if (!this.plugin.settings.modelSelection) {
              this.plugin.settings.modelSelection = DEFAULT_SETTINGS.modelSelection!;
            }
            this.plugin.settings.modelSelection.devpipePath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Priority Mode')
      .setDesc('How to prioritize model selection: performance, cost, or balanced')
      .addDropdown(dropdown =>
        dropdown
          .addOption('performance', 'Performance - Best quality models')
          .addOption('cost', 'Cost - Most economical models')
          .addOption('balanced', 'Balanced - Optimal quality/cost ratio')
          .setValue(this.plugin.settings.modelSelection?.userPreferences.priority ?? 'balanced')
          .onChange(async value => {
            if (!this.plugin.settings.modelSelection) {
              this.plugin.settings.modelSelection = DEFAULT_SETTINGS.modelSelection!;
            }
            this.plugin.settings.modelSelection.userPreferences.priority = value as 'performance' | 'cost' | 'balanced';
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Max Cost Per Request')
      .setDesc('Maximum cost per AI request (in USD)')
      .addSlider(slider =>
        slider
          .setLimits(0.01, 2.00, 0.01)
          .setValue(this.plugin.settings.modelSelection?.userPreferences.maxCostPerRequest ?? 0.50)
          .setDynamicTooltip()
          .onChange(async value => {
            if (!this.plugin.settings.modelSelection) {
              this.plugin.settings.modelSelection = DEFAULT_SETTINGS.modelSelection!;
            }
            this.plugin.settings.modelSelection.userPreferences.maxCostPerRequest = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Model Selection Debug')
      .setDesc('Enable debug logging for model selection decisions')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.modelSelection?.debugMode ?? false)
          .onChange(async value => {
            if (!this.plugin.settings.modelSelection) {
              this.plugin.settings.modelSelection = DEFAULT_SETTINGS.modelSelection!;
            }
            this.plugin.settings.modelSelection.debugMode = value;
            await this.plugin.saveSettings();
          })
      );

    // Help section
    containerEl.createEl('h2', { text: 'Help & Documentation' });

    // Information section
    containerEl.createEl('h3', { text: 'Information' });
    const infoEl = containerEl.createEl('div', { cls: 'setting-item-description' });
    infoEl.innerHTML = `
      <p><strong>VaultPilot v1.0.0</strong></p>
      <p>Comprehensive EvoAgentX integration for Obsidian</p>
      <p>Features: AI Chat, Copilot, Workflows, Vault Analysis, Task Planning</p>
      <p>For help and documentation, visit the GitHub repository.</p>
    `;
  }

  private async testConnection(): Promise<void> {
    const notice = new Notice('Testing connection...', 0);
    
    try {
      let response = await this.plugin.apiClient.healthCheck();
      
      // If the main health check fails with a 400, try the simple check
      if (!response.success && response.error?.includes('400')) {
        console.warn('Main health check failed with 400, trying alternative method');
        const simpleResponse = await this.plugin.apiClient.simpleHealthCheck();
        if (simpleResponse.success && simpleResponse.data) {
          response = {
            success: true,
            data: { status: simpleResponse.data.status, version: 'unknown' }
          };
        }
      }
      
      notice.hide();
      
      if (response.success) {
        new Notice('✅ Connection successful!', 3000);
      } else {
        new Notice(`❌ Connection failed: ${response.error}`, 5000);
      }
    } catch (error) {
      notice.hide();
      new Notice(`❌ Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`, 5000);
    }
  }
}
