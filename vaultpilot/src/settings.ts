import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type VaultPilotPlugin from './main';
import { VaultPilotSettings } from './types';

export const DEFAULT_SETTINGS: VaultPilotSettings = {
  backendUrl: 'http://localhost:8000',
  apiKey: '',
  enableWebSocket: true,
  enableCopilot: true,
  enableAutoComplete: true,
  defaultAgent: '',
  chatHistoryLimit: 100,
  debugMode: false
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
      .setDesc('Automatically suggest completions as you type')
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
