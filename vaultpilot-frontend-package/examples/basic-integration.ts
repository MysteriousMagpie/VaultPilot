// Basic Integration Example for VaultPilot Frontend Components
// This example shows the minimal setup required to integrate the advanced components

import { Plugin, Notice, TFile } from 'obsidian';
import { AdvancedChatModal } from '../components/AdvancedChatModal';
import { AgentMarketplaceModal } from '../components/AgentMarketplaceModal';
import { EnhancedDashboard, VIEW_TYPE_ENHANCED_DASHBOARD } from '../components/EnhancedDashboard';

export default class VaultPilotPlugin extends Plugin {
  
  async onload() {
    // Register enhanced dashboard view
    this.registerView(
      VIEW_TYPE_ENHANCED_DASHBOARD,
      (leaf) => new EnhancedDashboard(leaf, this)
    );

    // Add commands for each component
    this.addCommand({
      id: 'vaultpilot-advanced-chat',
      name: 'Open Advanced AI Chat',
      icon: 'message-square',
      callback: () => {
        new AdvancedChatModal(this.app, this).open();
      }
    });

    this.addCommand({
      id: 'vaultpilot-marketplace',
      name: 'Open Agent Marketplace',
      icon: 'store',
      callback: () => {
        new AgentMarketplaceModal(this.app, this).open();
      }
    });

    this.addCommand({
      id: 'vaultpilot-dashboard',
      name: 'Open Enhanced Dashboard',
      icon: 'layout-dashboard',
      callback: () => {
        this.activateView(VIEW_TYPE_ENHANCED_DASHBOARD);
      }
    });

    // Add ribbon icon with multiple actions
    const ribbonIcon = this.addRibbonIcon('brain', 'VaultPilot', (evt: MouseEvent) => {
      if (evt.shiftKey) {
        // Shift+click opens marketplace
        new AgentMarketplaceModal(this.app, this).open();
      } else if (evt.ctrlKey || evt.metaKey) {
        // Ctrl/Cmd+click opens dashboard
        this.activateView(VIEW_TYPE_ENHANCED_DASHBOARD);
      } else {
        // Default click opens chat
        new AdvancedChatModal(this.app, this).open();
      }
    });

    ribbonIcon.title = 'VaultPilot\n• Click: AI Chat\n• Shift+Click: Marketplace\n• Ctrl+Click: Dashboard';
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
}

// Don't forget to:
// 1. Import the CSS: import '../styles/advanced-components.css';
// 2. Configure your API client for backend communication
// 3. Add error handling and user feedback
// 4. Test all components with your backend
