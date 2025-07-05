// Quick Integration Example for VaultPilot Advanced Components
// Add this to your main.ts file

import { AdvancedChatModal } from './components/AdvancedChatModal';
import { AgentMarketplaceModal } from './components/AgentMarketplaceModal';

// In your onload() method, add these commands:

// Advanced AI Chat with multi-modal support
this.addCommand({
  id: 'vaultpilot-advanced-chat',
  name: 'VaultPilot: Advanced AI Chat',
  icon: 'message-square',
  hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'c' }],
  callback: () => {
    const modal = new AdvancedChatModal(this.app, this);
    modal.open();
  }
});

// Agent Marketplace for discovering and installing AI agents
this.addCommand({
  id: 'vaultpilot-marketplace',
  name: 'VaultPilot: Agent Marketplace',
  icon: 'store',
  hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'm' }],
  callback: () => {
    const modal = new AgentMarketplaceModal(this.app, this);
    modal.open();
  }
});

// Context menu integration for files
this.registerEvent(
  this.app.workspace.on('file-menu', (menu, file) => {
    if (file instanceof TFile && file.extension === 'md') {
      menu.addItem((item) => {
        item
          .setTitle('Chat about this note')
          .setIcon('message-square')
          .onClick(() => {
            const modal = new AdvancedChatModal(this.app, this);
            modal.open();
            // Auto-attach current file context
          });
      });
    }
  })
);

// Editor context menu for text selection
this.registerEvent(
  this.app.workspace.on('editor-menu', (menu, editor, view) => {
    const selection = editor.getSelection();
    if (selection.trim()) {
      menu.addItem((item) => {
        item
          .setTitle('Discuss selection with AI')
          .setIcon('brain')
          .onClick(() => {
            const modal = new AdvancedChatModal(this.app, this);
            modal.open();
            // Auto-attach selected text
          });
      });
    }
  })
);

// Enhanced ribbon icon with multiple actions
const ribbonIcon = this.addRibbonIcon('brain', 'VaultPilot Advanced', (evt: MouseEvent) => {
  if (evt.shiftKey) {
    // Shift+click opens marketplace
    new AgentMarketplaceModal(this.app, this).open();
  } else if (evt.ctrlKey || evt.metaKey) {
    // Ctrl/Cmd+click opens dashboard (if implemented)
    new Notice('Dashboard coming soon!');
  } else {
    // Default click opens advanced chat
    new AdvancedChatModal(this.app, this).open();
  }
});

ribbonIcon.title = 'VaultPilot Advanced\n• Click: AI Chat\n• Shift+Click: Marketplace\n• Ctrl+Click: Dashboard';
