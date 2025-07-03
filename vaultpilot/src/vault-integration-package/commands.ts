// Plugin commands for VaultPilot vault management
// Copy to your VaultPilot plugin src/ directory

import { Plugin, Notice, Menu } from 'obsidian';
import { EvoAgentXVaultClient } from './api-client';
import { VaultStructureModal, SmartSearchModal, FileOperationsModal } from './modals';

export function registerVaultManagementCommands(plugin: Plugin, client: EvoAgentXVaultClient) {
  
  // Command: Show Vault Structure
  plugin.addCommand({
    id: 'show-vault-structure',
    name: 'Show Vault Structure',
    callback: () => {
      new VaultStructureModal(plugin.app, client).open();
    }
  });

  // Command: Smart Search
  plugin.addCommand({
    id: 'smart-search',
    name: 'Smart Search Vault',
    callback: () => {
      new SmartSearchModal(plugin.app, client).open();
    }
  });

  // Command: File Operations
  plugin.addCommand({
    id: 'file-operations',
    name: 'Batch File Operations',
    callback: () => {
      new FileOperationsModal(plugin.app, client).open();
    }
  });

  // Command: Organize Vault
  plugin.addCommand({
    id: 'organize-vault',
    name: 'Organize Vault with AI',
    callback: async () => {
      const notice = new Notice('Analyzing vault for organization...', 0);
      
      try {
        const response = await client.organizeVault({
          strategy: 'by_tags',
          dry_run: true
        });

        notice.hide();

        if (response.success && response.data) {
          const changes = response.data.changes;
          if (changes.length === 0) {
            new Notice('Your vault is already well organized!');
          } else {
            // Show organization preview modal
            new Notice(`Found ${changes.length} suggested improvements. Opening preview...`);
            // TODO: Open OrganizePreviewModal
          }
        } else {
          new Notice('Failed to analyze vault: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        notice.hide();
        new Notice('Error organizing vault: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  });

  // Command: Vault Analytics
  plugin.addCommand({
    id: 'vault-analytics',
    name: 'Show Vault Analytics',
    callback: async () => {
      const notice = new Notice('Generating vault analytics...', 0);
      
      try {
        const response = await client.getVaultAnalytics();
        notice.hide();

        if (response.success && response.data) {
          const analytics = response.data;
          const summary = `
📊 Vault Analytics:
📁 ${analytics.total_folders} folders, ${analytics.total_files} files
🏷️ ${Object.keys(analytics.tag_usage).length} unique tags
🔗 ${analytics.orphaned_files.length} orphaned files
📋 ${analytics.duplicate_content.length} potential duplicates
          `.trim();
          
          new Notice(summary, 8000);
        } else {
          new Notice('Failed to get analytics: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        notice.hide();
        new Notice('Error getting analytics: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  });
}

// Add ribbon icons
export function addVaultManagementRibbons(plugin: Plugin, client: EvoAgentXVaultClient) {
  
  // Vault Structure ribbon
  plugin.addRibbonIcon('folder-tree', 'Vault Structure', () => {
    new VaultStructureModal(plugin.app, client).open();
  });

  // Smart Search ribbon
  plugin.addRibbonIcon('search', 'Smart Search', () => {
    new SmartSearchModal(plugin.app, client).open();
  });

  // Organization ribbon
  plugin.addRibbonIcon('wand-2', 'Organize Vault', async () => {
    const response = await client.organizeVault({
      strategy: 'by_tags',
      dry_run: true
    });

    if (response.success && response.data) {
      new Notice(`Found ${response.data.changes.length} organization suggestions`);
    }
  });
}

// Add context menu items
export function addVaultManagementContextMenu(plugin: Plugin, client: EvoAgentXVaultClient) {
  
  plugin.registerEvent(
    plugin.app.workspace.on('file-menu', (menu: Menu, file) => {
      
      // Add smart search for this file type
      menu.addItem((item) => {
        item
          .setTitle('Find Similar Files')
          .setIcon('search')
          .onClick(async () => {
            const extension = (file as any).extension || 'md';
            const response = await client.smartSearch({
              query: `type:${extension}`,
              search_type: 'all',
              file_types: [extension],
              max_results: 20
            });

            if (response.success && response.data) {
              new Notice(`Found ${response.data.results.length} similar files`);
              // TODO: Show results in modal
            }
          });
      });

      // Add organization suggestion for this file
      menu.addItem((item) => {
        item
          .setTitle('Suggest Better Location')
          .setIcon('move')
          .onClick(async () => {
            // TODO: Implement single file organization suggestion
            new Notice('Analyzing best location for this file...');
          });
      });
    })
  );
}

// Hotkey suggestions for settings
export const suggestedHotkeys = [
  {
    commandId: 'show-vault-structure',
    defaultHotkey: 'Ctrl+Shift+V',
    description: 'Show vault structure tree'
  },
  {
    commandId: 'smart-search',
    defaultHotkey: 'Ctrl+Shift+F',
    description: 'Open smart search modal'
  },
  {
    commandId: 'organize-vault',
    defaultHotkey: 'Ctrl+Shift+O',
    description: 'Organize vault with AI'
  },
  {
    commandId: 'vault-analytics',
    defaultHotkey: 'Ctrl+Shift+A',
    description: 'Show vault analytics'
  }
];
