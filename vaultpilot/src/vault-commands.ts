/**
 * Command Definitions for VaultPilot Vault Management
 */

import { Command, Notice, Editor } from 'obsidian';

// Define a type for plugin instance with vault management methods
interface VaultManagementPlugin {
  vaultClient?: any;
  openVaultStructureModal?: () => void;
  openSmartSearchModal?: (query?: string, type?: string) => void;
  openFileOperationsModal?: () => void;
  openVaultOrganizerModal?: () => void;
  openBatchOperationsModal?: () => void;
}

/**
 * Vault Management Commands
 * These will be registered in the main plugin file
 */
export function createVaultManagementCommands(): Command[] {
  return [
    {
      id: 'vaultpilot-vault-structure',
      name: 'View Vault Structure',
      callback: function(this: VaultManagementPlugin) {
        console.log('Opening vault structure modal');
        if (this.openVaultStructureModal) {
          this.openVaultStructureModal();
        } else {
          new Notice('Vault structure feature not available');
        }
      }
    },
    {
      id: 'vaultpilot-smart-search',
      name: 'Smart Vault Search',
      callback: function(this: VaultManagementPlugin) {
        console.log('Opening smart search modal');
        if (this.openSmartSearchModal) {
          this.openSmartSearchModal();
        } else {
          new Notice('Smart search feature not available');
        }
      }
    },
    {
      id: 'vaultpilot-file-operations',
      name: 'File Operations Manager',
      callback: function(this: VaultManagementPlugin) {
        console.log('Opening file operations modal');
        if (this.openFileOperationsModal) {
          this.openFileOperationsModal();
        } else {
          new Notice('File operations feature not available');
        }
      }
    },
    {
      id: 'vaultpilot-organize-vault',
      name: 'AI Vault Organization',
      callback: function(this: VaultManagementPlugin) {
        console.log('Opening vault organizer modal');
        if (this.openVaultOrganizerModal) {
          this.openVaultOrganizerModal();
        } else {
          new Notice('Vault organizer feature not available');
        }
      }
    },
    {
      id: 'vaultpilot-batch-operations',
      name: 'Batch File Operations',
      callback: function(this: VaultManagementPlugin) {
        console.log('Opening batch operations modal');
        if (this.openBatchOperationsModal) {
          this.openBatchOperationsModal();
        } else {
          new Notice('Batch operations feature not available');
        }
      }
    },
    {
      id: 'vaultpilot-quick-search-selection',
      name: 'Quick Search Selected Text',
      editorCallback: function(this: VaultManagementPlugin, editor: Editor) {
        const selection = editor.getSelection();
        if (selection.trim()) {
          console.log('Quick search for:', selection.trim());
          if (this.openSmartSearchModal) {
            this.openSmartSearchModal(selection.trim());
          } else {
            new Notice('Smart search feature not available');
          }
        } else {
          new Notice('Please select text to search for');
        }
      }
    },
    {
      id: 'vaultpilot-vault-health-check',
      name: 'Vault Health Check',
      callback: async function(this: VaultManagementPlugin) {
        try {
          if (!this.vaultClient) {
            new Notice('Vault management not initialized');
            return;
          }
          
          new Notice('Running vault health check...');
          
          // Test basic functionality
          const connectionTest = await this.vaultClient.testConnection();
          if (!connectionTest.success) {
            new Notice(`Health check failed: ${connectionTest.message}`, 5000);
            return;
          }
          
          // Get basic structure to test functionality
          const structure = await this.vaultClient.getVaultStructure({ 
            include_content: false, 
            max_depth: 1 
          });
          
          // Test search functionality
          const searchTest = await this.vaultClient.searchVault({ 
            query: 'test', 
            max_results: 1 
          });
          
          new Notice(`✅ Vault Health Check Passed
📁 ${structure.total_files} files, ${structure.total_folders} folders
🔍 Search: ${searchTest.results.length} results
💾 Size: ${(structure.total_size / 1024 / 1024).toFixed(2)} MB`, 8000);
          
        } catch (error: any) {
          console.error('Vault health check failed:', error);
          new Notice(`❌ Health check failed: ${error.message}`, 5000);
        }
      }
    },
    {
      id: 'vaultpilot-vault-backup',
      name: 'Create Vault Backup',
      callback: async function(this: VaultManagementPlugin) {
        try {
          if (!this.vaultClient) {
            new Notice('Vault management not initialized');
            return;
          }
          
          new Notice('Creating vault backup...');
          
          const backup = await this.vaultClient.backupVault({
            include_settings: true,
            compression: true,
            backup_name: `vaultpilot-backup-${new Date().toISOString().split('T')[0]}`
          });
          
          new Notice(`✅ Backup created successfully
📦 ${backup.files_backed_up} files
💾 Size: ${(backup.backup_size / 1024 / 1024).toFixed(2)} MB
📁 Location: ${backup.backup_path}`, 8000);
          
        } catch (error: any) {
          console.error('Backup failed:', error);
          new Notice(`❌ Backup failed: ${error.message}`, 5000);
        }
      }
    },
    {
      id: 'vaultpilot-search-content',
      name: 'Search Content',
      editorCallback: function(this: VaultManagementPlugin, editor: Editor) {
        const selection = editor.getSelection();
        const query = selection.trim() || 'Enter search query';
        
        if (this.openSmartSearchModal) {
          this.openSmartSearchModal(query, 'content');
        } else {
          new Notice('Smart search feature not available');
        }
      }
    },
    {
      id: 'vaultpilot-search-filenames',
      name: 'Search Filenames',
      callback: function(this: VaultManagementPlugin) {
        if (this.openSmartSearchModal) {
          this.openSmartSearchModal('', 'filename');
        } else {
          new Notice('Smart search feature not available');
        }
      }
    },
    {
      id: 'vaultpilot-recent-files',
      name: 'View Recent Files',
      callback: async function(this: VaultManagementPlugin) {
        try {
          if (!this.vaultClient) {
            new Notice('Vault management not initialized');
            return;
          }
          
          const structure = await this.vaultClient.getVaultStructure({ 
            include_content: false 
          });
          
          if (structure.recent_files.length === 0) {
            new Notice('No recent files found');
            return;
          }
          
          const recentList = structure.recent_files
            .slice(0, 10)
            .map((file: any) => `• ${file.name} (${file.modified})`)
            .join('\n');
          
          new Notice(`📝 Recent Files:\n${recentList}`, 10000);
          
        } catch (error: any) {
          console.error('Failed to get recent files:', error);
          new Notice(`❌ Failed to get recent files: ${error.message}`, 5000);
        }
      }
    }
  ];
}

/**
 * Hotkey definitions for vault management commands
 */
export const VAULT_MANAGEMENT_HOTKEYS: Record<string, string> = {
  'vaultpilot-vault-structure': 'Ctrl+Shift+V',
  'vaultpilot-smart-search': 'Ctrl+Shift+F',
  'vaultpilot-quick-search-selection': 'Ctrl+Shift+S',
  'vaultpilot-file-operations': 'Ctrl+Shift+O',
  'vaultpilot-organize-vault': 'Ctrl+Shift+G',
  'vaultpilot-vault-health-check': 'Ctrl+Shift+H'
};

/**
 * Ribbon icon definitions for commonly used commands
 */
export const VAULT_MANAGEMENT_RIBBON_ICONS = [
  {
    icon: 'folder-tree',
    title: 'Vault Structure',
    commandId: 'vaultpilot-vault-structure'
  },
  {
    icon: 'search',
    title: 'Smart Search',
    commandId: 'vaultpilot-smart-search'
  },
  {
    icon: 'folder-plus',
    title: 'File Operations',
    commandId: 'vaultpilot-file-operations'
  }
];

/**
 * Command menu items for context menus
 */
export const VAULT_MANAGEMENT_MENU_ITEMS = [
  {
    title: 'Analyze Structure',
    commandId: 'vaultpilot-vault-structure',
    section: 'vault-analysis'
  },
  {
    title: 'Smart Search',
    commandId: 'vaultpilot-smart-search',
    section: 'vault-search'
  },
  {
    title: 'File Operations',
    commandId: 'vaultpilot-file-operations',
    section: 'vault-operations'
  },
  {
    title: 'Organize Vault',
    commandId: 'vaultpilot-organize-vault',
    section: 'vault-organization'
  },
  {
    title: 'Health Check',
    commandId: 'vaultpilot-vault-health-check',
    section: 'vault-maintenance'
  },
  {
    title: 'Create Backup',
    commandId: 'vaultpilot-vault-backup',
    section: 'vault-maintenance'
  }
];

/**
 * Helper function to register all vault management commands
 */
export function registerVaultManagementCommands(plugin: any) {
  const commands = createVaultManagementCommands();
  commands.forEach((command: Command) => {
    plugin.addCommand({
      ...command,
      callback: command.callback?.bind(plugin),
      editorCallback: command.editorCallback?.bind(plugin)
    });
  });
  
  // Add hotkeys if defined
  Object.entries(VAULT_MANAGEMENT_HOTKEYS).forEach(([commandId, hotkey]) => {
    const command = plugin.commands?.[commandId];
    if (command) {
      command.hotkeys = [{ modifiers: [], key: hotkey }];
    }
  });
}

/**
 * Helper function to add vault management ribbon icons
 */
export function addVaultManagementRibbonIcons(plugin: any) {
  VAULT_MANAGEMENT_RIBBON_ICONS.forEach(({ icon, title, commandId }) => {
    const ribbonIcon = plugin.addRibbonIcon(icon, title, () => {
      plugin.app.commands.executeCommandById(commandId);
    });
    ribbonIcon.addClass('vaultpilot-vault-management-ribbon');
  });
}
