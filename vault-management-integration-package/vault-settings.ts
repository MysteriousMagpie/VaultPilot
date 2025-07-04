/**
 * Settings Extensions for VaultPilot Vault Management
 * Add these settings to your existing settings interface
 */

import { PluginSettingTab, Setting } from 'obsidian';
import { VaultManagementSettings } from './vault-types';

/**
 * Extend your existing settings interface with vault management options
 */
export interface ExtendedPluginSettings {
  // Your existing settings...
  
  // Vault Management Settings
  vaultManagement: VaultManagementSettings;
}

export const DEFAULT_VAULT_MANAGEMENT_SETTINGS: VaultManagementSettings = {
  enableVaultManagement: true,
  autoSyncVaultStructure: false,
  searchResultsLimit: 50,
  enableSmartSearch: true,
  batchOperationTimeout: 30000,
  showVaultStats: true,
  maxSearchResults: 100,
  defaultSearchType: 'content',
  enableFileOperations: true,
  confirmDestructiveOperations: true,
  autoBackupBeforeOperations: false
};

/**
 * Add these settings to your plugin's settings tab
 * 
 * Usage in your settings tab display() method:
 * addVaultManagementSettings(containerEl, this.plugin);
 */
export function addVaultManagementSettings(containerEl: HTMLElement, plugin: any) {
  // Vault Management Section Header
  containerEl.createEl('h2', { text: 'Vault Management' });

  // Enable Vault Management
  new Setting(containerEl)
    .setName('Enable Vault Management')
    .setDesc('Enable AI-powered vault structure analysis and file operations')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.enableVaultManagement ?? true)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.enableVaultManagement = value;
        await plugin.saveSettings();
        
        if (value) {
          plugin.initializeVaultManagement();
        } else {
          plugin.disableVaultManagement();
        }
      }));

  // Auto Sync Vault Structure
  new Setting(containerEl)
    .setName('Auto Sync Vault Structure')
    .setDesc('Automatically update vault structure analysis when files change')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.autoSyncVaultStructure ?? false)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.autoSyncVaultStructure = value;
        await plugin.saveSettings();
      }));

  // Enable Smart Search
  new Setting(containerEl)
    .setName('Enable Smart Search')
    .setDesc('Use AI-powered search with context and insights')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.enableSmartSearch ?? true)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.enableSmartSearch = value;
        await plugin.saveSettings();
      }));

  // Search Results Limit
  new Setting(containerEl)
    .setName('Search Results Limit')
    .setDesc('Maximum number of search results to display')
    .addSlider(slider => slider
      .setLimits(10, 200, 10)
      .setValue(plugin.settings.vaultManagement?.searchResultsLimit ?? 50)
      .setDynamicTooltip()
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.searchResultsLimit = value;
        await plugin.saveSettings();
      }));

  // Default Search Type
  new Setting(containerEl)
    .setName('Default Search Type')
    .setDesc('Default search type for vault searches')
    .addDropdown(dropdown => dropdown
      .addOptions({
        'content': 'Content',
        'filename': 'Filename',
        'tags': 'Tags',
        'links': 'Links'
      })
      .setValue(plugin.settings.vaultManagement?.defaultSearchType ?? 'content')
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.defaultSearchType = value as any;
        await plugin.saveSettings();
      }));

  // Enable File Operations
  new Setting(containerEl)
    .setName('Enable File Operations')
    .setDesc('Allow vault management to create, modify, and delete files')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.enableFileOperations ?? true)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.enableFileOperations = value;
        await plugin.saveSettings();
      }));

  // Confirm Destructive Operations
  new Setting(containerEl)
    .setName('Confirm Destructive Operations')
    .setDesc('Show confirmation dialog before deleting or moving files')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.confirmDestructiveOperations ?? true)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.confirmDestructiveOperations = value;
        await plugin.saveSettings();
      }));

  // Show Vault Statistics
  new Setting(containerEl)
    .setName('Show Vault Statistics')
    .setDesc('Display vault statistics in the sidebar')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.showVaultStats ?? true)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.showVaultStats = value;
        await plugin.saveSettings();
      }));

  // Batch Operation Timeout
  new Setting(containerEl)
    .setName('Batch Operation Timeout')
    .setDesc('Timeout for batch file operations (in milliseconds)')
    .addText(text => text
      .setPlaceholder('30000')
      .setValue(String(plugin.settings.vaultManagement?.batchOperationTimeout ?? 30000))
      .onChange(async (value) => {
        const timeout = parseInt(value) || 30000;
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.batchOperationTimeout = timeout;
        await plugin.saveSettings();
      }));

  // Auto Backup Before Operations
  new Setting(containerEl)
    .setName('Auto Backup Before Operations')
    .setDesc('Automatically create backups before performing destructive operations')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.autoBackupBeforeOperations ?? false)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.autoBackupBeforeOperations = value;
        await plugin.saveSettings();
      }));

  // Test Connection Button
  new Setting(containerEl)
    .setName('Test Vault Management Connection')
    .setDesc('Test connection to the EvoAgentX vault management API')
    .addButton(button => button
      .setButtonText('Test Connection')
      .onClick(async () => {
        try {
          if (!plugin.vaultClient) {
            throw new Error('Vault management not initialized');
          }
          
          const isConnected = await plugin.vaultClient.testVaultManagementConnection();
          
          if (isConnected) {
            button.setButtonText('✅ Connected');
            setTimeout(() => button.setButtonText('Test Connection'), 2000);
          } else {
            button.setButtonText('❌ Failed');
            setTimeout(() => button.setButtonText('Test Connection'), 2000);
          }
        } catch (error) {
          console.error('Connection test failed:', error);
          button.setButtonText('❌ Error');
          setTimeout(() => button.setButtonText('Test Connection'), 2000);
        }
      }));
}
