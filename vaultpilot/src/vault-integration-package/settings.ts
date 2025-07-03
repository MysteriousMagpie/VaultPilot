// Settings extension for VaultPilot vault management
// Copy to your VaultPilot plugin src/ directory

import { PluginSettingTab, Setting, Notice } from 'obsidian';
import { EvoAgentXVaultClient } from './api-client';

export interface VaultManagementSettings {
  evoagentxUrl: string;
  apiKey?: string;
  enableVaultManagement: boolean;
  autoBackup: boolean;
  maxSearchResults: number;
  defaultOrganizationStrategy: 'by_tags' | 'by_type' | 'by_date' | 'by_size';
}

export const DEFAULT_VAULT_SETTINGS: VaultManagementSettings = {
  evoagentxUrl: 'http://localhost:8000',
  apiKey: '',
  enableVaultManagement: true,
  autoBackup: true,
  maxSearchResults: 50,
  defaultOrganizationStrategy: 'by_tags'
};

export function addVaultManagementSettings(
  settingTab: PluginSettingTab,
  settings: VaultManagementSettings,
  saveSettings: () => Promise<void>,
  client: EvoAgentXVaultClient
) {
  
  // Section header
  settingTab.containerEl.createEl('h2', { text: 'Vault Management (EvoAgentX)' });

  // Connection settings
  new Setting(settingTab.containerEl)
    .setName('EvoAgentX URL')
    .setDesc('URL of your EvoAgentX backend server')
    .addText(text => text
      .setPlaceholder('http://localhost:8000')
      .setValue(settings.evoagentxUrl)
      .onChange(async (value) => {
        settings.evoagentxUrl = value;
        client.updateConfig(value, settings.apiKey);
        await saveSettings();
      }));

  new Setting(settingTab.containerEl)
    .setName('API Key')
    .setDesc('Optional API key for authentication')
    .addText(text => text
      .setPlaceholder('your-api-key')
      .setValue(settings.apiKey || '')
      .onChange(async (value) => {
        settings.apiKey = value || undefined;
        client.updateConfig(settings.evoagentxUrl, settings.apiKey);
        await saveSettings();
      }));

  // Test connection
  new Setting(settingTab.containerEl)
    .setName('Test Connection')
    .setDesc('Verify connection to EvoAgentX backend')
    .addButton(button => button
      .setButtonText('Test')
      .onClick(async () => {
        const notice = new Notice('Testing connection...', 0);
        
        try {
          const isConnected = await client.testConnection();
          notice.hide();
          
          if (isConnected) {
            new Notice('✅ Connection successful!', 3000);
          } else {
            new Notice('❌ Connection failed. Check URL and ensure EvoAgentX is running.', 5000);
          }
        } catch (error) {
          notice.hide();
          new Notice('❌ Connection error: Unable to reach server', 5000);
        }
      }));

  // Feature toggle
  new Setting(settingTab.containerEl)
    .setName('Enable Vault Management')
    .setDesc('Enable EvoAgentX vault management features')
    .addToggle(toggle => toggle
      .setValue(settings.enableVaultManagement)
      .onChange(async (value) => {
        settings.enableVaultManagement = value;
        await saveSettings();
      }));

  // Search settings
  new Setting(settingTab.containerEl)
    .setName('Max Search Results')
    .setDesc('Maximum number of results to return from smart search')
    .addSlider(slider => slider
      .setLimits(10, 200, 10)
      .setValue(settings.maxSearchResults)
      .setDynamicTooltip()
      .onChange(async (value) => {
        settings.maxSearchResults = value;
        await saveSettings();
      }));

  // Organization settings
  new Setting(settingTab.containerEl)
    .setName('Default Organization Strategy')
    .setDesc('Default strategy for AI vault organization')
    .addDropdown(dropdown => dropdown
      .addOption('by_tags', 'By Tags')
      .addOption('by_type', 'By File Type')
      .addOption('by_date', 'By Date')
      .addOption('by_size', 'By Size')
      .setValue(settings.defaultOrganizationStrategy)
      .onChange(async (value) => {
        settings.defaultOrganizationStrategy = value as any;
        await saveSettings();
      }));

  // Backup settings
  new Setting(settingTab.containerEl)
    .setName('Auto Backup')
    .setDesc('Automatically create backups before batch operations')
    .addToggle(toggle => toggle
      .setValue(settings.autoBackup)
      .onChange(async (value) => {
        settings.autoBackup = value;
        await saveSettings();
      }));

  // Vault analytics section
  settingTab.containerEl.createEl('h3', { text: 'Quick Actions' });

  new Setting(settingTab.containerEl)
    .setName('Get Vault Analytics')
    .setDesc('View current vault statistics and insights')
    .addButton(button => button
      .setButtonText('View Analytics')
      .onClick(async () => {
        if (!settings.enableVaultManagement) {
          new Notice('Vault management is disabled');
          return;
        }

        const notice = new Notice('Loading analytics...', 0);
        
        try {
          const response = await client.getVaultAnalytics();
          notice.hide();

          if (response.success && response.data) {
            const analytics = response.data;
            const summary = `
📊 Vault Analytics:
📁 ${analytics.total_folders} folders
📄 ${analytics.total_files} files
🏷️ ${Object.keys(analytics.tag_usage).length} unique tags
🔗 ${analytics.orphaned_files.length} orphaned files
📋 ${analytics.duplicate_content.length} potential duplicates

Top file types:
${Object.entries(analytics.file_types)
  .sort(([,a]: [string, any], [,b]: [string, any]) => b - a)
  .slice(0, 5)
  .map(([type, count]: [string, any]) => `  ${type}: ${count}`)
  .join('\n')}
            `.trim();
            
            new Notice(summary, 10000);
          } else {
            new Notice('Failed to get analytics: ' + (response.error || 'Unknown error'));
          }
        } catch (error) {
          notice.hide();
          new Notice('Error getting analytics. Check connection.');
        }
      }));

  new Setting(settingTab.containerEl)
    .setName('Quick Organization Preview')
    .setDesc('Preview AI organization suggestions for your vault')
    .addButton(button => button
      .setButtonText('Preview')
      .onClick(async () => {
        if (!settings.enableVaultManagement) {
          new Notice('Vault management is disabled');
          return;
        }

        const notice = new Notice('Analyzing vault...', 0);
        
        try {
          const response = await client.organizeVault({
            strategy: settings.defaultOrganizationStrategy,
            dry_run: true
          });
          notice.hide();

          if (response.success && response.data) {
            const changes = response.data.changes;
            
            if (changes.length === 0) {
              new Notice('🎉 Your vault is already well organized!');
            } else {
              new Notice(`📋 Found ${changes.length} organization suggestions. Check command palette for "Organize Vault" to see details.`, 5000);
            }
          } else {
            new Notice('Failed to analyze vault: ' + (response.error || 'Unknown error'));
          }
        } catch (error) {
          notice.hide();
          new Notice('Error analyzing vault. Check connection.');
        }
      }));

  // Advanced settings section
  settingTab.containerEl.createEl('h3', { text: 'Advanced' });

  new Setting(settingTab.containerEl)
    .setName('Debug Mode')
    .setDesc('Enable detailed logging for troubleshooting')
    .addToggle(toggle => toggle
      .setValue(false) // TODO: Add to settings interface if needed
      .onChange(async (value) => {
        // TODO: Implement debug mode if needed
        console.log('Debug mode:', value);
      }));

  // Help text
  const helpEl = settingTab.containerEl.createEl('div', { cls: 'vault-management-help' });
  helpEl.createEl('h4', { text: 'Getting Started' });
  helpEl.createEl('p', { text: '1. Ensure EvoAgentX backend is running on the configured URL' });
  helpEl.createEl('p', { text: '2. Test the connection using the "Test Connection" button' });
  helpEl.createEl('p', { text: '3. Use Ctrl+P to access vault management commands' });
  helpEl.createEl('p', { text: '4. Check the ribbon for quick access to vault features' });
  
  const linkEl = helpEl.createEl('p');
  linkEl.createEl('a', { 
    text: 'EvoAgentX Documentation',
    href: 'https://github.com/EvoAgentX/EvoAgentX',
    attr: { target: '_blank' }
  });
}
