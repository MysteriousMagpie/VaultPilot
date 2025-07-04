import { ItemView, WorkspaceLeaf, Notice, MarkdownView, TFolder } from 'obsidian';
import type VaultPilotPlugin from './main';

export const VIEW_TYPE_VAULTPILOT_FULL_TAB = 'vaultpilot-full-tab-view';

export class VaultPilotFullTabView extends ItemView {
  plugin: VaultPilotPlugin;
  private statusEl!: HTMLElement;
  private quickActionsEl!: HTMLElement;
  private vaultStatsEl!: HTMLElement;
  private chatEl!: HTMLElement;
  private workflowEl!: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: VaultPilotPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_VAULTPILOT_FULL_TAB;
  }

  getDisplayText(): string {
    return 'VaultPilot Dashboard';
  }

  getIcon(): string {
    return 'layout-dashboard';
  }

  async onOpen() {
    const container = this.containerEl;
    container.empty();
    container.addClass('vaultpilot-full-tab-view');

    // Force the container to take full height
    container.style.height = '100%';
    container.style.overflow = 'hidden';

    // Create main layout
    const mainLayout = container.createEl('div', { cls: 'vaultpilot-main-layout' });

    // Left sidebar
    const leftSidebar = mainLayout.createEl('div', { cls: 'vaultpilot-left-sidebar' });
    this.createLeftSidebar(leftSidebar);

    // Main content area
    const mainContent = mainLayout.createEl('div', { cls: 'vaultpilot-main-content' });
    this.createMainContent(mainContent);

    // Right sidebar
    const rightSidebar = mainLayout.createEl('div', { cls: 'vaultpilot-right-sidebar' });
    this.createRightSidebar(rightSidebar);

    this.addFullTabStyles();
  }

  private createLeftSidebar(sidebar: HTMLElement) {
    // Header
    const headerEl = sidebar.createEl('div', { cls: 'vaultpilot-sidebar-header' });
    headerEl.createEl('h2', { text: '🤖 VaultPilot' });
    headerEl.createEl('p', { 
      text: 'AI Assistant Dashboard',
      cls: 'vaultpilot-subtitle'
    });

    // Status section
    this.statusEl = sidebar.createEl('div', { cls: 'vaultpilot-status' });
    this.updateStatus();

    // Quick actions
    this.quickActionsEl = sidebar.createEl('div', { cls: 'vaultpilot-quick-actions' });
    this.createQuickActions();

    // Vault stats
    this.vaultStatsEl = sidebar.createEl('div', { cls: 'vaultpilot-vault-stats' });
    this.updateVaultStats();
  }

  private createMainContent(content: HTMLElement) {
    // Tab navigation
    const tabNav = content.createEl('div', { cls: 'vaultpilot-tab-nav' });
    const chatTab = tabNav.createEl('button', { 
      text: '💬 Chat', 
      cls: 'vaultpilot-tab-button active'
    });
    const workflowTab = tabNav.createEl('button', { 
      text: '⚙️ Workflows', 
      cls: 'vaultpilot-tab-button'
    });
    const analyticsTab = tabNav.createEl('button', { 
      text: '📊 Analytics', 
      cls: 'vaultpilot-tab-button'
    });

    // Tab content
    const tabContent = content.createEl('div', { cls: 'vaultpilot-tab-content' });

    // Chat section
    this.chatEl = tabContent.createEl('div', { cls: 'vaultpilot-chat-section active' });
    this.createChatSection(this.chatEl);

    // Workflow section
    this.workflowEl = tabContent.createEl('div', { cls: 'vaultpilot-workflow-section' });
    this.createWorkflowSection(this.workflowEl);

    // Analytics section
    const analyticsEl = tabContent.createEl('div', { cls: 'vaultpilot-analytics-section' });
    this.createAnalyticsSection(analyticsEl);

    // Tab switching
    chatTab.onclick = () => this.switchTab('chat', chatTab);
    workflowTab.onclick = () => this.switchTab('workflow', workflowTab);
    analyticsTab.onclick = () => this.switchTab('analytics', analyticsTab);
  }

  private createRightSidebar(sidebar: HTMLElement) {
    // Recent files
    const recentFilesEl = sidebar.createEl('div', { cls: 'vaultpilot-recent-files' });
    recentFilesEl.createEl('h3', { text: 'Recent Files' });
    this.updateRecentFiles(recentFilesEl);

    // Agent status
    const agentStatusEl = sidebar.createEl('div', { cls: 'vaultpilot-agent-status' });
    agentStatusEl.createEl('h3', { text: 'Agent Status' });
    this.updateAgentStatus(agentStatusEl);

    // Activity feed
    const activityEl = sidebar.createEl('div', { cls: 'vaultpilot-activity-feed' });
    activityEl.createEl('h3', { text: 'Activity Feed' });
    this.createActivityFeed(activityEl);
  }

  private createChatSection(chatEl: HTMLElement) {
    // Chat header
    const chatHeader = chatEl.createEl('div', { cls: 'vaultpilot-chat-header' });
    chatHeader.createEl('h3', { text: 'AI Chat Interface' });

    // Chat history
    const chatHistory = chatEl.createEl('div', { cls: 'vaultpilot-chat-history' });
    chatHistory.createEl('div', { 
      text: 'Welcome! Start a conversation with your AI assistant.',
      cls: 'vaultpilot-chat-welcome'
    });

    // Chat input
    const chatInput = chatEl.createEl('div', { cls: 'vaultpilot-chat-input' });
    const textarea = chatInput.createEl('textarea', { 
      placeholder: 'Type your message here...',
      cls: 'vaultpilot-chat-textarea'
    });
    
    const sendButton = chatInput.createEl('button', { 
      text: 'Send',
      cls: 'vaultpilot-chat-send-button'
    });

    sendButton.onclick = () => {
      const message = textarea.value.trim();
      if (message) {
        this.sendChatMessage(message, chatHistory);
        textarea.value = '';
      }
    };

    // Handle Enter key
    textarea.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
      }
    };
  }

  private createWorkflowSection(workflowEl: HTMLElement) {
    // Workflow header
    const workflowHeader = workflowEl.createEl('div', { cls: 'vaultpilot-workflow-header' });
    workflowHeader.createEl('h3', { text: 'Workflow Management' });

    // Workflow grid container
    const workflowContainer = workflowEl.createEl('div', { cls: 'vaultpilot-workflow-container' });
    const workflowGrid = workflowContainer.createEl('div', { cls: 'vaultpilot-workflow-grid' });

    // Predefined workflows
    const workflows = [
      { name: 'Analyze Vault', icon: '🔍', description: 'Analyze your vault structure and content' },
      { name: 'Generate Summary', icon: '📝', description: 'Create summaries of your notes' },
      { name: 'Link Analysis', icon: '🔗', description: 'Analyze note connections and relationships' },
      { name: 'Tag Management', icon: '🏷️', description: 'Organize and manage your tags' },
      { name: 'Daily Planning', icon: '📅', description: 'Plan your day based on your notes' },
      { name: 'Knowledge Graph', icon: '🕸️', description: 'Visualize your knowledge connections' },
      { name: 'Content Search', icon: '🔎', description: 'Advanced search across your vault' },
      { name: 'Note Templates', icon: '📄', description: 'Create and manage note templates' }
    ];

    workflows.forEach(workflow => {
      const workflowCard = workflowGrid.createEl('div', { cls: 'vaultpilot-workflow-card' });
      workflowCard.createEl('div', { text: workflow.icon, cls: 'vaultpilot-workflow-icon' });
      workflowCard.createEl('h4', { text: workflow.name });
      workflowCard.createEl('p', { text: workflow.description });
      
      const runButton = workflowCard.createEl('button', { 
        text: 'Run',
        cls: 'vaultpilot-workflow-run-button'
      });
      
      runButton.onclick = () => this.runWorkflow(workflow.name);
    });
  }

  private createAnalyticsSection(analyticsEl: HTMLElement) {
    // Analytics header
    const analyticsHeader = analyticsEl.createEl('div', { cls: 'vaultpilot-analytics-header' });
    analyticsHeader.createEl('h3', { text: 'Vault Analytics' });

    // Charts container
    const chartsContainer = analyticsEl.createEl('div', { cls: 'vaultpilot-charts-container' });
    
    // File type distribution
    const fileTypeChart = chartsContainer.createEl('div', { cls: 'vaultpilot-chart-card' });
    fileTypeChart.createEl('h4', { text: 'File Type Distribution' });
    fileTypeChart.createEl('div', { 
      text: 'Chart visualization coming soon...',
      cls: 'vaultpilot-chart-placeholder'
    });

    // Note creation timeline
    const timelineChart = chartsContainer.createEl('div', { cls: 'vaultpilot-chart-card' });
    timelineChart.createEl('h4', { text: 'Note Creation Timeline' });
    timelineChart.createEl('div', { 
      text: 'Timeline visualization coming soon...',
      cls: 'vaultpilot-chart-placeholder'
    });

    // Tag usage
    const tagChart = chartsContainer.createEl('div', { cls: 'vaultpilot-chart-card' });
    tagChart.createEl('h4', { text: 'Tag Usage' });
    tagChart.createEl('div', { 
      text: 'Tag analytics coming soon...',
      cls: 'vaultpilot-chart-placeholder'
    });

    // Word count analysis
    const wordCountChart = chartsContainer.createEl('div', { cls: 'vaultpilot-chart-card' });
    wordCountChart.createEl('h4', { text: 'Word Count Analysis' });
    wordCountChart.createEl('div', { 
      text: 'Word count visualization coming soon...',
      cls: 'vaultpilot-chart-placeholder'
    });

    // Link density
    const linkChart = chartsContainer.createEl('div', { cls: 'vaultpilot-chart-card' });
    linkChart.createEl('h4', { text: 'Link Density' });
    linkChart.createEl('div', { 
      text: 'Link analysis coming soon...',
      cls: 'vaultpilot-chart-placeholder'
    });

    // Activity heatmap
    const activityChart = chartsContainer.createEl('div', { cls: 'vaultpilot-chart-card' });
    activityChart.createEl('h4', { text: 'Activity Heatmap' });
    activityChart.createEl('div', { 
      text: 'Activity heatmap coming soon...',
      cls: 'vaultpilot-chart-placeholder'
    });
  }

  private switchTab(tabName: string, button: HTMLElement) {
    // Remove active class from all tabs
    this.containerEl.querySelectorAll('.vaultpilot-tab-button').forEach(btn => {
      btn.removeClass('active');
    });
    this.containerEl.querySelectorAll('.vaultpilot-chat-section, .vaultpilot-workflow-section, .vaultpilot-analytics-section').forEach(section => {
      section.removeClass('active');
    });

    // Add active class to clicked tab
    button.addClass('active');

    // Show corresponding content
    if (tabName === 'chat') {
      this.chatEl.addClass('active');
    } else if (tabName === 'workflow') {
      this.workflowEl.addClass('active');
    } else if (tabName === 'analytics') {
      this.containerEl.querySelector('.vaultpilot-analytics-section')?.addClass('active');
    }
  }

  private async sendChatMessage(message: string, chatHistory: HTMLElement) {
    // Add user message
    const userMessage = chatHistory.createEl('div', { cls: 'vaultpilot-chat-message user' });
    userMessage.createEl('div', { text: message });

    // Add thinking indicator
    const thinkingMessage = chatHistory.createEl('div', { cls: 'vaultpilot-chat-message assistant thinking' });
    thinkingMessage.createEl('div', { text: 'Thinking...' });

    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
      const response = await this.plugin.apiClient.sendChat({ message, context: null });
      
      // Remove thinking indicator
      thinkingMessage.remove();
      
      if (response.success && response.data) {
        const assistantMessage = chatHistory.createEl('div', { cls: 'vaultpilot-chat-message assistant' });
        assistantMessage.createEl('div', { text: response.data.response });
      } else {
        const errorMessage = chatHistory.createEl('div', { cls: 'vaultpilot-chat-message error' });
        errorMessage.createEl('div', { text: 'Error: Could not get response from AI' });
      }
    } catch (error) {
      // Remove thinking indicator
      thinkingMessage.remove();
      
      const errorMessage = chatHistory.createEl('div', { cls: 'vaultpilot-chat-message error' });
      errorMessage.createEl('div', { text: 'Error: Connection failed' });
    }

    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  private async runWorkflow(workflowName: string) {
    new Notice(`Running workflow: ${workflowName}`);
    
    try {
      // Map workflow names to appropriate actions
      switch (workflowName) {
        case 'Analyze Vault':
          await this.plugin.analyzeVault();
          break;
        case 'Daily Planning':
          await this.plugin.planMyDay();
          break;
        default:
          // For now, show a placeholder
          new Notice(`${workflowName} workflow is coming soon!`);
      }
    } catch (error) {
      new Notice(`Error running workflow: ${workflowName}`);
    }
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

    // Refresh button
    const refreshButton = actionsGrid.createEl('button', {
      text: '🔄 Refresh',
      cls: 'vaultpilot-action-button'
    });
    refreshButton.onclick = () => {
      this.updateStatus();
      this.updateVaultStats();
    };

    // Open sidebar view
    const sidebarButton = actionsGrid.createEl('button', {
      text: '📋 Sidebar View',
      cls: 'vaultpilot-action-button'
    });
    sidebarButton.onclick = () => this.plugin.activateView();

    // Open modal chat
    const modalChatButton = actionsGrid.createEl('button', {
      text: '💬 Modal Chat',
      cls: 'vaultpilot-action-button'
    });
    modalChatButton.onclick = () => this.plugin.openChatModal();

    // Execute workflow
    const workflowButton = actionsGrid.createEl('button', {
      text: '⚙️ Workflows',
      cls: 'vaultpilot-action-button'
    });
    workflowButton.onclick = () => this.plugin.openWorkflowModal();
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
  }

  private updateRecentFiles(container: HTMLElement) {
    const recentFiles = this.app.vault.getMarkdownFiles()
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, 5);

    recentFiles.forEach(file => {
      const fileEl = container.createEl('div', { cls: 'vaultpilot-recent-file' });
      fileEl.createEl('span', { text: file.basename });
      fileEl.onclick = () => {
        this.app.workspace.openLinkText(file.path, '', false);
      };
    });
  }

  private updateAgentStatus(container: HTMLElement) {
    this.loadAgentInfo(container);
  }

  private async loadAgentInfo(container?: HTMLElement) {
    try {
      console.log('VaultPilot: Loading agents in full-tab-view...');
      const response = await this.plugin.apiClient.getAgents();
      console.log('VaultPilot: getAgents response in full-tab-view:', response);
      
      if (response.success && response.data && container) {
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
            console.log('VaultPilot: Found agents array in full-tab-view, using response.data.agents');
          } else if (dataObj.data && Array.isArray(dataObj.data)) {
            // Response format: {data: [...]}
            agents = dataObj.data;
            console.log('VaultPilot: Found nested data in full-tab-view, using response.data.data');
          } else {
            console.warn('VaultPilot: Unexpected response format:', typeof response.data, response.data);
          }
        }
        
        // Display agent information
        const agentCount = agents.length;
        const activeAgents = agents.filter((agent: any) => agent.active).length;
        
        const agentInfo = container.createEl('div', { cls: 'vaultpilot-agent-info' });
        agentInfo.createEl('div', { text: `${activeAgents}/${agentCount} active` });
        
        agents.forEach((agent: any) => {
          const agentEl = agentInfo.createEl('div', { cls: 'vaultpilot-agent-item' });
          agentEl.createEl('span', { text: agent.name });
          agentEl.createEl('span', { 
            text: agent.active ? '🟢' : '🔴',
            cls: 'vaultpilot-agent-status'
          });
        });
      }
    } catch (error) {
      console.error('Failed to load agents in full tab view:', error);
    }
  }

  private createActivityFeed(container: HTMLElement) {
    const activities = [
      { time: 'Just now', activity: 'VaultPilot started' },
      { time: '5 min ago', activity: 'Connection established' },
      { time: '1 hour ago', activity: 'Last vault analysis' }
    ];

    activities.forEach(activity => {
      const activityEl = container.createEl('div', { cls: 'vaultpilot-activity-item' });
      activityEl.createEl('div', { text: activity.activity });
      activityEl.createEl('div', { text: activity.time, cls: 'vaultpilot-activity-time' });
    });
  }

  private addFullTabStyles() {
    if (!document.getElementById('vaultpilot-full-tab-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'vaultpilot-full-tab-styles';
      styleEl.textContent = `
        /* Ensure the full tab view fills available space */
        .workspace-leaf-content[data-type="vaultpilot-full-tab-view"] {
          height: 100%;
        }
        .vaultpilot-full-tab-view {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .vaultpilot-main-layout {
          display: flex;
          flex: 1;
          gap: 1px;
          background: var(--background-modifier-border);
          min-height: 0;
        }
        .vaultpilot-left-sidebar {
          width: 250px;
          background: var(--background-primary);
          padding: 16px;
          overflow-y: auto;
        }
        .vaultpilot-main-content {
          flex: 1;
          background: var(--background-primary);
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .vaultpilot-right-sidebar {
          width: 250px;
          background: var(--background-primary);
          padding: 16px;
          overflow-y: auto;
        }
        .vaultpilot-sidebar-header {
          text-align: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-tab-nav {
          display: flex;
          background: var(--background-secondary);
          border-bottom: 1px solid var(--background-modifier-border);
          flex-shrink: 0;
        }
        .vaultpilot-tab-button {
          flex: 1;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .vaultpilot-tab-button:hover {
          background: var(--background-modifier-hover);
        }
        .vaultpilot-tab-button.active {
          background: var(--background-primary);
          color: var(--text-normal);
          border-bottom: 2px solid var(--interactive-accent);
        }
        .vaultpilot-tab-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .vaultpilot-chat-section,
        .vaultpilot-workflow-section,
        .vaultpilot-analytics-section {
          flex: 1;
          padding: 16px;
          display: none;
          overflow-y: auto;
          box-sizing: border-box;
          min-height: 0;
        }
        .vaultpilot-chat-section.active,
        .vaultpilot-workflow-section.active,
        .vaultpilot-analytics-section.active {
          display: flex;
          flex-direction: column;
        }
        .vaultpilot-chat-history {
          flex: 1;
          overflow-y: auto;
          border: 1px solid var(--background-modifier-border);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          background: var(--background-secondary);
        }
        .vaultpilot-chat-input {
          display: flex;
          gap: 8px;
        }
        .vaultpilot-chat-textarea {
          flex: 1;
          min-height: 60px;
          padding: 8px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          background: var(--background-primary);
          color: var(--text-normal);
          resize: vertical;
        }
        .vaultpilot-chat-send-button {
          padding: 8px 16px;
          background: var(--interactive-accent);
          color: var(--text-on-accent);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          height: fit-content;
          align-self: flex-end;
        }
        .vaultpilot-chat-message {
          margin-bottom: 12px;
          padding: 8px 12px;
          border-radius: 8px;
          max-width: 80%;
        }
        .vaultpilot-chat-message.user {
          background: var(--interactive-accent);
          color: var(--text-on-accent);
          margin-left: auto;
        }
        .vaultpilot-chat-message.assistant {
          background: var(--background-primary);
          border: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-chat-message.thinking {
          opacity: 0.7;
          font-style: italic;
        }
        .vaultpilot-chat-message.error {
          background: var(--background-modifier-error);
          color: var(--text-error);
        }
        .vaultpilot-workflow-section,
        .vaultpilot-analytics-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 0;
        }
        .vaultpilot-workflow-header,
        .vaultpilot-analytics-header {
          flex-shrink: 0;
        }
        .vaultpilot-workflow-container,
        .vaultpilot-charts-container {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
        .vaultpilot-workflow-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          align-content: start;
          padding-bottom: 16px;
        }
        .vaultpilot-workflow-card {
          background: var(--background-secondary);
          border: 1px solid var(--background-modifier-border);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }
        .vaultpilot-workflow-icon {
          font-size: 32px;
          margin-bottom: 8px;
        }
        .vaultpilot-workflow-run-button {
          margin-top: 8px;
          padding: 6px 12px;
          background: var(--interactive-accent);
          color: var(--text-on-accent);
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .vaultpilot-charts-container {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          align-content: start;
          padding-bottom: 16px;
          overflow-y: auto;
          min-height: 0;
        }
        .vaultpilot-chart-card {
          background: var(--background-secondary);
          border: 1px solid var(--background-modifier-border);
          border-radius: 8px;
          padding: 16px;
        }
        .vaultpilot-chart-placeholder {
          text-align: center;
          color: var(--text-muted);
          font-style: italic;
          padding: 40px;
        }
        .vaultpilot-recent-file {
          padding: 4px 8px;
          margin-bottom: 4px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .vaultpilot-recent-file:hover {
          background: var(--background-modifier-hover);
        }
        .vaultpilot-agent-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }
        .vaultpilot-activity-item {
          margin-bottom: 8px;
          padding: 6px 0;
          border-bottom: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-activity-time {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        /* Inherit styles from original view */
        .vaultpilot-status,
        .vaultpilot-quick-actions,
        .vaultpilot-vault-stats {
          margin-bottom: 20px;
        }
        .vaultpilot-status h3,
        .vaultpilot-quick-actions h3,
        .vaultpilot-vault-stats h3 {
          margin-bottom: 12px;
          color: var(--text-normal);
          border-bottom: 1px solid var(--background-modifier-border);
          padding-bottom: 4px;
          font-size: 14px;
        }
        .vaultpilot-status-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .vaultpilot-status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        .vaultpilot-status-indicator {
          font-weight: 500;
          font-size: 11px;
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
          gap: 8px;
        }
        .vaultpilot-action-button {
          padding: 8px 6px;
          background: var(--interactive-normal);
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          color: var(--text-normal);
          cursor: pointer;
          font-size: 11px;
          transition: background-color 0.2s;
        }
        .vaultpilot-action-button:hover {
          background: var(--interactive-hover);
        }
        .vaultpilot-stats-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .vaultpilot-stat-item {
          text-align: center;
          padding: 8px;
          background: var(--background-secondary);
          border-radius: 4px;
          border: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-stat-value {
          font-size: 18px;
          font-weight: bold;
          color: var(--text-accent);
          margin-bottom: 2px;
        }
        .vaultpilot-stat-label {
          font-size: 10px;
          color: var(--text-muted);
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  async onClose() {
    // Clean up any resources
  }
}
