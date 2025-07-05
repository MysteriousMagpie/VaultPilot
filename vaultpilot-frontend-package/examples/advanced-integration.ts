// Advanced Integration Example for VaultPilot Frontend Components
// This example shows full-featured integration with error handling, settings, and real-time updates

import { Plugin, Notice, TFile, MarkdownView, WorkspaceLeaf } from 'obsidian';
import { AdvancedChatModal } from '../components/AdvancedChatModal';
import { AgentMarketplaceModal } from '../components/AgentMarketplaceModal';
import { EnhancedDashboard, VIEW_TYPE_ENHANCED_DASHBOARD } from '../components/EnhancedDashboard';

interface VaultPilotSettings {
  backendUrl: string;
  apiKey: string;
  enableAdvancedFeatures: boolean;
  enableRealTimeUpdates: boolean;
}

const DEFAULT_SETTINGS: VaultPilotSettings = {
  backendUrl: 'http://localhost:8000',
  apiKey: '',
  enableAdvancedFeatures: true,
  enableRealTimeUpdates: true
};

export default class VaultPilotAdvancedPlugin extends Plugin {
  settings!: VaultPilotSettings;
  private websocket: WebSocket | null = null;

  async onload() {
    await this.loadSettings();

    // Import CSS styles
    this.addStyle();

    // Register views
    this.registerAdvancedViews();

    // Add commands
    this.addAdvancedCommands();

    // Add UI elements
    this.addAdvancedUI();

    // Setup context menus
    this.setupContextMenus();

    // Initialize real-time updates
    if (this.settings.enableRealTimeUpdates) {
      this.connectWebSocket();
    }

    // Show welcome message
    new Notice('VaultPilot Advanced Features Loaded! 🚀');
  }

  async onunload() {
    if (this.websocket) {
      this.websocket.close();
    }
  }

  private registerAdvancedViews() {
    this.registerView(
      VIEW_TYPE_ENHANCED_DASHBOARD,
      (leaf: WorkspaceLeaf) => new EnhancedDashboard(leaf, this)
    );
  }

  private addAdvancedCommands() {
    // Advanced Chat with hotkey
    this.addCommand({
      id: 'vaultpilot-advanced-chat',
      name: 'Advanced AI Chat',
      icon: 'message-square',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'c' }],
      callback: () => {
        try {
          new AdvancedChatModal(this.app, this).open();
        } catch (error) {
          console.error('Failed to open advanced chat:', error);
          new Notice('Failed to open advanced chat. Please check your settings.');
        }
      }
    });

    // Agent Marketplace
    this.addCommand({
      id: 'vaultpilot-marketplace',
      name: 'Agent Marketplace',
      icon: 'store',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'm' }],
      callback: () => {
        try {
          new AgentMarketplaceModal(this.app, this).open();
        } catch (error) {
          console.error('Failed to open marketplace:', error);
          new Notice('Failed to open marketplace. Please check your backend connection.');
        }
      }
    });

    // Enhanced Dashboard
    this.addCommand({
      id: 'vaultpilot-dashboard',
      name: 'Enhanced Dashboard',
      icon: 'layout-dashboard',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'd' }],
      callback: () => {
        this.activateView(VIEW_TYPE_ENHANCED_DASHBOARD);
      }
    });

    // Quick chat with current file
    this.addCommand({
      id: 'vaultpilot-chat-current-file',
      name: 'Chat about current file',
      icon: 'file-text',
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          if (!checking) {
            const modal = new AdvancedChatModal(this.app, this);
            modal.open();
            // Auto-attach current file
          }
          return true;
        }
        return false;
      }
    });
  }

  private addAdvancedUI() {
    // Enhanced ribbon icon with tooltip and multiple actions
    const ribbonIcon = this.addRibbonIcon('brain', 'VaultPilot Advanced', (evt: MouseEvent) => {
      if (evt.shiftKey) {
        new AgentMarketplaceModal(this.app, this).open();
      } else if (evt.ctrlKey || evt.metaKey) {
        this.activateView(VIEW_TYPE_ENHANCED_DASHBOARD);
      } else {
        new AdvancedChatModal(this.app, this).open();
      }
    });

    ribbonIcon.title = 'VaultPilot Advanced\n• Click: AI Chat\n• Shift+Click: Marketplace\n• Ctrl+Click: Dashboard';

    // Status bar item for connection status
    const statusBarItem = this.addStatusBarItem();
    statusBarItem.setText('🤖 VaultPilot');
    statusBarItem.title = 'VaultPilot Status';
    statusBarItem.addClass('vaultpilot-status');

    // Update status based on backend connection
    this.updateConnectionStatus(statusBarItem);
  }

  private setupContextMenus() {
    // File context menu
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile) {
          menu.addItem((item) => {
            item
              .setTitle('Analyze with VaultPilot')
              .setIcon('brain')
              .onClick(() => {
                const modal = new AdvancedChatModal(this.app, this);
                modal.open();
                // Auto-attach file for analysis
              });
          });

          if (file.extension === 'md') {
            menu.addItem((item) => {
              item
                .setTitle('Enhance writing')
                .setIcon('edit')
                .onClick(() => {
                  // Open chat with writing enhancement context
                  new Notice('Opening writing enhancement...');
                });
            });
          }
        }
      })
    );

    // Editor context menu
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, view) => {
        const selection = editor.getSelection();
        if (selection.trim()) {
          menu.addItem((item) => {
            item
              .setTitle('Discuss selection with AI')
              .setIcon('message-square')
              .onClick(() => {
                const modal = new AdvancedChatModal(this.app, this);
                modal.open();
                // Auto-attach selection
              });
          });

          menu.addItem((item) => {
            item
              .setTitle('Improve selected text')
              .setIcon('wand')
              .onClick(() => {
                // Implement text improvement
                new Notice('Text improvement coming soon!');
              });
          });
        }
      })
    );
  }

  private connectWebSocket() {
    if (!this.settings.backendUrl) return;

    try {
      const wsUrl = this.settings.backendUrl.replace('http', 'ws') + '/ws';
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('VaultPilot WebSocket connected');
        new Notice('Real-time updates enabled ✅');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeUpdate(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('VaultPilot WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (this.settings.enableRealTimeUpdates) {
            this.connectWebSocket();
          }
        }, 5000);
      };

      this.websocket.onerror = (error) => {
        console.error('VaultPilot WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  private handleRealtimeUpdate(data: any) {
    // Handle different types of real-time updates
    switch (data.type) {
      case 'agent_status':
        // Update agent status in dashboard
        console.log('Agent status update:', data);
        break;
      case 'workflow_progress':
        // Update workflow progress
        console.log('Workflow progress:', data);
        break;
      case 'marketplace_update':
        // Refresh marketplace if open
        console.log('Marketplace update:', data);
        break;
      default:
        console.log('Unknown update type:', data);
    }
  }

  private async updateConnectionStatus(statusBarItem: HTMLElement) {
    try {
      // Check backend connection
      const response = await fetch(`${this.settings.backendUrl}/health`);
      if (response.ok) {
        statusBarItem.setText('🤖 VaultPilot ✅');
        statusBarItem.title = 'VaultPilot Connected';
      } else {
        statusBarItem.setText('🤖 VaultPilot ⚠️');
        statusBarItem.title = 'VaultPilot Backend Issues';
      }
    } catch (error) {
      statusBarItem.setText('🤖 VaultPilot ❌');
      statusBarItem.title = 'VaultPilot Offline';
    }
  }

  private addStyle() {
    // Import CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .vaultpilot-status {
        cursor: pointer;
      }
      
      .vaultpilot-status:hover {
        background-color: var(--background-modifier-hover);
      }
    `;
    document.head.appendChild(style);
  }

  async activateView(viewType: string) {
    const { workspace } = this.app;
    
    let leaf = workspace.getLeavesOfType(viewType)[0];
    
    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: viewType, active: true });
    }
    
    workspace.revealLeaf(leaf);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// Usage Notes:
// 1. Make sure to have '../styles/advanced-components.css' imported
// 2. Configure backend URL and API key in settings
// 3. Test all components with your backend
// 4. Customize error handling for your specific needs
// 5. Add settings tab for user configuration
