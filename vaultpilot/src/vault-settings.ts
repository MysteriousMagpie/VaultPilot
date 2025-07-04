/**
 * Settings Extensions for VaultPilot Vault Management
 */

import { Setting } from 'obsidian';
import { VaultManagementSettings } from './vault-types';

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
 * Add vault management settings to the settings tab
 */
export function addVaultManagementSettings(containerEl: HTMLElement, plugin: any) {
  // Vault Management Section Header
  containerEl.createEl('h2', { text: 'Vault Management' });
  containerEl.createEl('p', { 
    text: 'Configure AI-powered vault structure analysis and file operations.' 
  });

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
    .setDesc('Default search mode for smart search')
    .addDropdown(dropdown => dropdown
      .addOption('content', 'Content Search')
      .addOption('filename', 'Filename Search')
      .addOption('tags', 'Tag Search')
      .addOption('links', 'Link Search')
      .addOption('comprehensive', 'Comprehensive Search')
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
    .setDesc('Allow file creation, deletion, and modification through the interface')
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
    .setDesc('Show confirmation dialog for file deletion and destructive operations')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.confirmDestructiveOperations ?? true)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.confirmDestructiveOperations = value;
        await plugin.saveSettings();
      }));

  // Auto Backup Before Operations
  new Setting(containerEl)
    .setName('Auto Backup Before Operations')
    .setDesc('Automatically create backups before destructive file operations')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.autoBackupBeforeOperations ?? false)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.autoBackupBeforeOperations = value;
        await plugin.saveSettings();
      }));

  // Batch Operation Timeout
  new Setting(containerEl)
    .setName('Batch Operation Timeout')
    .setDesc('Timeout for batch operations in milliseconds')
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

  // Show Vault Stats
  new Setting(containerEl)
    .setName('Show Vault Statistics')
    .setDesc('Display vault statistics in modals and interfaces')
    .addToggle(toggle => toggle
      .setValue(plugin.settings.vaultManagement?.showVaultStats ?? true)
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.showVaultStats = value;
        await plugin.saveSettings();
      }));

  // Test Connection Button
  new Setting(containerEl)
    .setName('Test Vault Management Connection')
    .setDesc('Test connection to vault management endpoints')
    .addButton(button => button
      .setButtonText('Test Connection')
      .setCta()
      .onClick(async () => {
        if (!plugin.vaultClient) {
          button.setButtonText('Not Available');
          setTimeout(() => button.setButtonText('Test Connection'), 2000);
          return;
        }

        button.setButtonText('Testing...');
        button.setDisabled(true);

        try {
          const result = await plugin.vaultClient.testConnection();
          if (result.success) {
            button.setButtonText('✅ Connected');
          } else {
            button.setButtonText('❌ Failed');
          }
        } catch (error) {
          button.setButtonText('❌ Error');
        }

        button.setDisabled(false);
        setTimeout(() => button.setButtonText('Test Connection'), 3000);
      }));

  // Advanced Settings Section
  containerEl.createEl('h3', { text: 'Advanced Vault Management' });

  // Max Search Results
  new Setting(containerEl)
    .setName('Maximum Search Results')
    .setDesc('Absolute maximum number of search results to fetch from backend')
    .addSlider(slider => slider
      .setLimits(50, 500, 25)
      .setValue(plugin.settings.vaultManagement?.maxSearchResults ?? 100)
      .setDynamicTooltip()
      .onChange(async (value) => {
        if (!plugin.settings.vaultManagement) {
          plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        }
        plugin.settings.vaultManagement.maxSearchResults = value;
        await plugin.saveSettings();
      }));

  // Reset to Defaults Button
  new Setting(containerEl)
    .setName('Reset Vault Management Settings')
    .setDesc('Reset all vault management settings to their default values')
    .addButton(button => button
      .setButtonText('Reset to Defaults')
      .setWarning()
      .onClick(async () => {
        plugin.settings.vaultManagement = { ...DEFAULT_VAULT_MANAGEMENT_SETTINGS };
        await plugin.saveSettings();
        
        // Refresh the settings display
        const settingsTab = plugin.app.setting.activeTab;
        if (settingsTab && settingsTab.display) {
          settingsTab.display();
        }
      }));
}

/**
 * Validate vault management settings
 */
export function validateVaultManagementSettings(settings: VaultManagementSettings): string[] {
  const errors: string[] = [];

  if (settings.searchResultsLimit < 1 || settings.searchResultsLimit > 1000) {
    errors.push('Search results limit must be between 1 and 1000');
  }

  if (settings.maxSearchResults < settings.searchResultsLimit) {
    errors.push('Maximum search results must be greater than or equal to search results limit');
  }

  if (settings.batchOperationTimeout < 1000 || settings.batchOperationTimeout > 300000) {
    errors.push('Batch operation timeout must be between 1 second and 5 minutes');
  }

  const validSearchTypes = ['content', 'filename', 'tags', 'links', 'comprehensive'];
  if (!validSearchTypes.includes(settings.defaultSearchType)) {
    errors.push('Invalid default search type');
  }

  return errors;
}

/**
 * Get vault management settings with defaults
 */
export function getVaultManagementSettings(pluginSettings: any): VaultManagementSettings {
  return {
    ...DEFAULT_VAULT_MANAGEMENT_SETTINGS,
    ...(pluginSettings.vaultManagement || {})
  };
}
