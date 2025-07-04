import { ItemView, WorkspaceLeaf, Notice, MarkdownView, TFolder } from 'obsidian';
import type VaultPilotPlugin from './main';

export const VIEW_TYPE_VAULTPILOT = 'vaultpilot-view';

export class VaultPilotView extends ItemView {
  plugin: VaultPilotPlugin;
  private statusEl!: HTMLElement;
  private quickActionsEl!: HTMLElement;
  private vaultStatsEl!: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: VaultPilotPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_VAULTPILOT;
  }

  getDisplayText(): string {
    return 'VaultPilot';
  }

  getIcon(): string {
    return 'bot';
  }

  async onOpen() {
    const container = this.containerEl;
    container.empty();
    container.addClass('vaultpilot-view');

    // Header
    const headerEl = container.createEl('div', { cls: 'vaultpilot-header' });
    headerEl.createEl('h2', { text: '🤖 VaultPilot' });
    headerEl.createEl('p', { 
      text: 'Your AI assistant for Obsidian',
      cls: 'vaultpilot-subtitle'
    });

    // Status section
    this.statusEl = container.createEl('div', { cls: 'vaultpilot-status' });
    this.updateStatus();

    // Quick actions
    this.quickActionsEl = container.createEl('div', { cls: 'vaultpilot-quick-actions' });
    this.createQuickActions();

    // Vault stats
    this.vaultStatsEl = container.createEl('div', { cls: 'vaultpilot-vault-stats' });
    this.updateVaultStats();

    // Recent activities (placeholder for future implementation)
    const activitiesEl = container.createEl('div', { cls: 'vaultpilot-activities' });
    activitiesEl.createEl('h3', { text: 'Recent Activities' });
    activitiesEl.createEl('p', { 
      text: 'Activity tracking coming soon...',
      cls: 'vaultpilot-placeholder'
    });

    this.addStyles();
  }

  private updateStatus() {
    this.statusEl.empty();
    this.statusEl.createEl('h3', { text: 'Connection Status' });

    const statusContainer = this.statusEl.createEl('div', { cls: 'vaultpilot-status-container' });

    // Backend status
    const backendStatus = statusContainer.createEl('div', { cls: 'vaultpilot-status-item' });
    backendStatus.createEl('span', { text: 'Backend: ' });
    const backendIndicator = backendStatus.createEl('span', { 
      cls: 'vaultpilot-status-indicator',
      text: 'Checking...'
    });

    // WebSocket status
    const wsStatus = statusContainer.createEl('div', { cls: 'vaultpilot-status-item' });
    wsStatus.createEl('span', { text: 'WebSocket: ' });
    const wsIndicator = wsStatus.createEl('span', { 
      cls: 'vaultpilot-status-indicator',
      text: this.plugin.isWebSocketConnected() ? '🟢 Connected' : '🔴 Disconnected'
    });

    // Check backend status
    this.checkBackendStatus(backendIndicator);
  }

  private async checkBackendStatus(indicator: HTMLElement) {
    try {
      let response = await this.plugin.apiClient.healthCheck();
      
      // If the main health check fails with a 400, try the simple check
      if (!response.success && response.error?.includes('400')) {
        const simpleResponse = await this.plugin.apiClient.simpleHealthCheck();
        if (simpleResponse.success && simpleResponse.data) {
          response = {
            success: true,
            data: { status: simpleResponse.data.status, version: 'unknown' }
          };
        }
      }
      
      if (response.success) {
        indicator.textContent = '🟢 Connected';
        indicator.className = 'vaultpilot-status-indicator vaultpilot-status-connected';
      } else {
        indicator.textContent = '🔴 Error';
        indicator.className = 'vaultpilot-status-indicator vaultpilot-status-error';
      }
    } catch (error) {
      indicator.textContent = '🔴 Offline';
      indicator.className = 'vaultpilot-status-indicator vaultpilot-status-offline';
    }
  }

  private createQuickActions() {
    this.quickActionsEl.empty();
    this.quickActionsEl.createEl('h3', { text: 'Quick Actions' });

    const actionsGrid = this.quickActionsEl.createEl('div', { cls: 'vaultpilot-actions-grid' });

    // Chat action
    const chatButton = actionsGrid.createEl('button', {
      text: '💬 Open Chat',
      cls: 'vaultpilot-action-button'
    });
    chatButton.onclick = () => this.plugin.openChatModal();

    // Dashboard action (new)
    const dashboardButton = actionsGrid.createEl('button', {
      text: '📊 Open Dashboard',
      cls: 'vaultpilot-action-button'
    });
    dashboardButton.onclick = () => this.plugin.activateFullTabView();

    // Workflow action
    const workflowButton = actionsGrid.createEl('button', {
      text: '⚙️ Execute Workflow',
      cls: 'vaultpilot-action-button'
    });
    workflowButton.onclick = () => this.plugin.openWorkflowModal();

    // Analyze vault action
    const analyzeButton = actionsGrid.createEl('button', {
      text: '🔍 Analyze Vault',
      cls: 'vaultpilot-action-button'
    });
    analyzeButton.onclick = () => this.plugin.analyzeVault();

    // Copilot action
    const copilotButton = actionsGrid.createEl('button', {
      text: '✨ Get Completion',
      cls: 'vaultpilot-action-button'
    });
    copilotButton.onclick = () => {
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        this.plugin.getCopilotCompletion(activeView.editor);
      } else {
        new Notice('No active editor found');
      }
    };

    // Refresh button
    const refreshButton = this.quickActionsEl.createEl('button', {
      text: '🔄 Refresh Status',
      cls: 'vaultpilot-refresh-button'
    });
    refreshButton.onclick = () => {
      this.updateStatus();
      this.updateVaultStats();
    };
  }

  private updateVaultStats() {
    this.vaultStatsEl.empty();
    this.vaultStatsEl.createEl('h3', { text: 'Vault Statistics' });

    const statsContainer = this.vaultStatsEl.createEl('div', { cls: 'vaultpilot-stats-container' });

    // Get vault statistics
    const files = this.app.vault.getFiles();
    const markdownFiles = this.app.vault.getMarkdownFiles();
    
    const stats = [
      { label: 'Total Files', value: files.length.toString() },
      { label: 'Markdown Files', value: markdownFiles.length.toString() },
      { label: 'Folders', value: this.app.vault.getAllLoadedFiles().filter(f => f instanceof TFolder).length.toString() }
    ];

    stats.forEach(stat => {
      const statEl = statsContainer.createEl('div', { cls: 'vaultpilot-stat-item' });
      statEl.createEl('div', { text: stat.value, cls: 'vaultpilot-stat-value' });
      statEl.createEl('div', { text: stat.label, cls: 'vaultpilot-stat-label' });
    });

    // Add agent info if available
    this.loadAgentInfo();
  }

  private async loadAgentInfo() {
    try {
      console.log('VaultPilot: Loading agents in view...');
      const response = await this.plugin.apiClient.getAgents();
      console.log('VaultPilot: getAgents response in view:', response);
      
      if (response.success && response.data) {
        let agents: any[] = [];
        
        // Handle different response formats
        if (Array.isArray(response.data)) {
          // Direct array response
          agents = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // Check for wrapped response formats
          const dataObj = response.data as any;
          if (dataObj.agents && Array.isArray(dataObj.agents)) {
            // Response format: {agents: [...]}
            agents = dataObj.agents;
            console.log('VaultPilot: Found agents array in view, using response.data.agents');
          } else if (dataObj.data && Array.isArray(dataObj.data)) {
            // Response format: {data: [...]}
            agents = dataObj.data;
            console.log('VaultPilot: Found nested data in view, using response.data.data');
          } else {
            console.warn('VaultPilot: Unexpected response format:', typeof response.data, response.data);
          }
        }
        
        // Display agent information
        const agentCount = agents.length;
        const activeAgents = agents.filter((agent: any) => agent.active).length;
        
        const agentStatsEl = this.vaultStatsEl.createEl('div', { cls: 'vaultpilot-agent-stats' });
        agentStatsEl.createEl('h4', { text: 'Available Agents' });
        
        const agentInfo = agentStatsEl.createEl('div', { cls: 'vaultpilot-agent-info' });
        agentInfo.createEl('span', { text: `${activeAgents}/${agentCount} active` });
      }
    } catch (error) {
      console.error('Failed to load agents in view:', error);
    }
  }

  private addStyles() {
    if (!document.getElementById('vaultpilot-view-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'vaultpilot-view-styles';
      styleEl.textContent = `
        .vaultpilot-view {
          padding: 20px;
        }
        .vaultpilot-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-subtitle {
          color: var(--text-muted);
          margin-top: 5px;
        }
        .vaultpilot-status,
        .vaultpilot-quick-actions,
        .vaultpilot-vault-stats,
        .vaultpilot-activities {
          margin-bottom: 25px;
        }
        .vaultpilot-status h3,
        .vaultpilot-quick-actions h3,
        .vaultpilot-vault-stats h3,
        .vaultpilot-activities h3 {
          margin-bottom: 15px;
          color: var(--text-normal);
          border-bottom: 1px solid var(--background-modifier-border);
          padding-bottom: 5px;
        }
        .vaultpilot-status-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .vaultpilot-status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .vaultpilot-status-indicator {
          font-weight: 500;
        }
        .vaultpilot-status-connected {
          color: var(--color-green);
        }
        .vaultpilot-status-error,
        .vaultpilot-status-offline {
          color: var(--color-red);
        }
        .vaultpilot-actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }
        .vaultpilot-action-button {
          padding: 12px 8px;
          background: var(--interactive-normal);
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          color: var(--text-normal);
          cursor: pointer;
          font-size: 13px;
          transition: background-color 0.2s;
        }
        .vaultpilot-action-button:hover {
          background: var(--interactive-hover);
        }
        .vaultpilot-refresh-button {
          width: 100%;
          padding: 8px;
          background: var(--interactive-accent);
          color: var(--text-on-accent);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }
        .vaultpilot-stats-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .vaultpilot-stat-item {
          text-align: center;
          padding: 15px;
          background: var(--background-secondary);
          border-radius: 8px;
          border: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-stat-value {
          font-size: 24px;
          font-weight: bold;
          color: var(--text-accent);
          margin-bottom: 5px;
        }
        .vaultpilot-stat-label {
          font-size: 12px;
          color: var(--text-muted);
        }
        .vaultpilot-agent-stats {
          margin-top: 15px;
          padding: 10px;
          background: var(--background-primary-alt);
          border-radius: 6px;
          border: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-agent-stats h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
        }
        .vaultpilot-agent-info {
          font-size: 12px;
          color: var(--text-muted);
        }
        .vaultpilot-placeholder {
          color: var(--text-muted);
          font-style: italic;
          text-align: center;
          padding: 20px;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  async onClose() {
    // Clean up any resources
  }
}
