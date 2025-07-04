/**
 * Command Definitions for VaultPilot Vault Management
 * Drop this file into your VaultPilot plugin src/ directory
 */

import { Command, Notice, TFile, TFolder } from 'obsidian';
import { VaultStructureResponse, VaultFolderInfo } from './vault-types';

/**
 * Vault Management Commands
 * Add these to your plugin's command registration
 * 
 * Usage in your main.ts:
 * 
 * onload() {
 *   // Register vault management commands
 *   VAULT_MANAGEMENT_COMMANDS.forEach(command => {
 *     this.addCommand({
 *       ...command,
 *       callback: command.callback?.bind(this),
 *       editorCallback: command.editorCallback?.bind(this)
 *     });
 *   });
 * }
 */
export const VAULT_MANAGEMENT_COMMANDS: Command[] = [
  {
    id: 'vaultpilot-vault-structure',
    name: 'View Vault Structure',
    callback: function() {
      // Open VaultStructureModal - you'll create this
      // new VaultStructureModal(this.app, this).open();
      console.log('Opening vault structure modal');
    }
  },
  {
    id: 'vaultpilot-smart-search',
    name: 'Smart Vault Search',
    callback: function() {
      // Open SmartSearchModal - you'll create this
      // new SmartSearchModal(this.app, this).open();
      console.log('Opening smart search modal');
    }
  },
  {
    id: 'vaultpilot-file-operations',
    name: 'File Operations Manager',
    callback: function() {
      // Open FileOperationsModal - you'll create this
      // new FileOperationsModal(this.app, this).open();
      console.log('Opening file operations modal');
    }
  },
  {
    id: 'vaultpilot-organize-vault',
    name: 'AI Vault Organization',
    callback: function() {
      // Open VaultOrganizerModal - you'll create this
      // new VaultOrganizerModal(this.app, this).open();
      console.log('Opening vault organizer modal');
    }
  },
  {
    id: 'vaultpilot-batch-operations',
    name: 'Batch File Operations',
    callback: function() {
      // Open BatchOperationsModal - you'll create this
      // new BatchOperationsModal(this.app, this).open();
      console.log('Opening batch operations modal');
    }
  },
  {
    id: 'vaultpilot-quick-search-selection',
    name: 'Quick Search Selected Text',
    editorCallback: function(editor) {
      const selection = editor.getSelection();
      if (selection.trim()) {
        // const modal = new SmartSearchModal(this.app, this);
        // modal.setInitialQuery(selection.trim());
        // modal.open();
        console.log('Quick search for:', selection.trim());
      } else {
        new Notice('Please select text to search for');
      }
    }
  },
  {
    id: 'vaultpilot-vault-health-check',
    name: 'Vault Health Check',
    callback: async function() {
      try {
        // Assuming you have a vaultClient property
        if (!this.vaultClient) {
          new Notice('Vault management not initialized');
          return;
        }
        
        const structure = await this.vaultClient.getVaultStructure({ include_content: false });
        const searchTest = await this.vaultClient.searchVault({ query: 'test', max_results: 1 });
        
        const healthReport = `# Vault Health Check - ${new Date().toLocaleString()}

## Structure Analysis
- **Total Files**: ${structure.total_files}
- **Total Folders**: ${structure.total_folders}
- **Total Size**: ${(structure.total_size / 1024 / 1024).toFixed(2)} MB
- **Orphaned Files**: ${structure.orphaned_files.length}

## Search Performance
- **Search Response Time**: ${searchTest.search_time.toFixed(2)}s
- **Search Results**: ${searchTest.total_results} found

## Recommendations
${structure.orphaned_files.length > 0 ? '- Consider linking or organizing orphaned files' : '- No orphaned files found ✓'}
${structure.total_files > 1000 ? '- Large vault detected - consider folder organization' : '- Vault size is manageable ✓'}
${searchTest.search_time > 1 ? '- Search performance could be improved' : '- Search performance is good ✓'}

## Connection Status
- **Backend Connection**: ✓ Connected
- **Vault Management**: ✓ Available
- **Features**: Structure Analysis, Search, File Operations, Organization
`;

        const fileName = `Vault Health Check - ${new Date().toISOString().split('T')[0]}.md`;
        await this.vaultClient.createFile(fileName, healthReport);
        
        // Open the health report
        const file = this.app.vault.getAbstractFileByPath(fileName);
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf().openFile(file);
        }
        
        new Notice('Vault health check completed');
      } catch (error) {
        new Notice('Health check failed - check backend connection');
        console.error(error);
      }
    }
  },
  {
    id: 'vaultpilot-backup-vault',
    name: 'Create Vault Backup',
    callback: async function() {
      try {
        if (!this.vaultClient) {
          new Notice('Vault management not initialized');
          return;
        }
        
        const backupName = `vault-backup-${Date.now()}`;
        const result = await this.vaultClient.createVaultBackup({
          backup_name: backupName,
          include_settings: true,
          compress: true
        });
        
        if (result.success) {
          new Notice(`Backup created: ${result.backup_path}`);
        } else {
          new Notice('Backup creation failed');
        }
      } catch (error) {
        new Notice('Backup feature not available');
        console.error(error);
      }
    }
  }
];

// === RIBBON ICONS ===

export const VAULT_MANAGEMENT_RIBBON_ICONS = [
  {
    icon: 'folder-tree',
    title: 'View Vault Structure',
    callback: 'vaultpilot-vault-structure'
  },
  {
    icon: 'search',
    title: 'Smart Search',
    callback: 'vaultpilot-smart-search'
  },
  {
    icon: 'settings',
    title: 'File Operations',
    callback: 'vaultpilot-file-operations'
  }
];

// === HOTKEYS ===

export const VAULT_MANAGEMENT_HOTKEYS = {
  'vaultpilot-smart-search': {
    modifiers: ['Mod', 'Shift'] as any,
    key: 'F'
  },
  'vaultpilot-vault-structure': {
    modifiers: ['Mod', 'Shift'] as any,
    key: 'T'
  },
  'vaultpilot-quick-search-selection': {
    modifiers: ['Mod', 'Alt'] as any,
    key: 'F'
  }
};

// === HELPER FUNCTIONS ===

export function generateFolderAnalysis(structure: VaultStructureResponse, focusPath: string): string {
  return `# Folder Analysis: ${focusPath || 'Root'}

Generated on: ${new Date().toLocaleString()}

## Overview
- **Total Files**: ${structure.total_files}
- **Total Folders**: ${structure.total_folders}
- **Total Size**: ${(structure.total_size / 1024).toFixed(2)} KB

## Structure
${renderFolderStructure(structure.structure, focusPath)}

## Recent Activity
${structure.recent_files.slice(0, 5).map(file => 
  `- **${file.name}** (${file.modified}) - ${file.size} bytes`
).join('\n')}

## Recommendations
- Consider organizing files by topic or date
- Check for duplicate or similar files
- Review file naming conventions
- Link related content for better discoverability

---
*Generated by VaultPilot Vault Management*`;
}

function renderFolderStructure(folder: VaultFolderInfo, focusPath: string, level = 0): string {
  const indent = '  '.repeat(level);
  let result = `${indent}- 📁 **${folder.name}**\n`;
  
  folder.children.forEach(child => {
    if (child.type === 'folder') {
      result += renderFolderStructure(child as VaultFolderInfo, focusPath, level + 1);
    } else {
      const file = child as any;
      result += `${indent}  - 📄 ${file.name} (${file.size} bytes)\n`;
    }
  });
  
  return result;
}
