import { ItemView, WorkspaceLeaf, Notice, MarkdownView, TFolder } from 'obsidian';
import type VaultPilotPlugin from '../main';

export const VIEW_TYPE_ENHANCED_DASHBOARD = 'vaultpilot-enhanced-dashboard';

interface AgentStatus {
  id: string;
  name: string;
  evolutionLevel: number;
  performance: number;
  status: 'active' | 'learning' | 'idle';
  lastUsed: string;
}

interface PerformanceMetric {
  label: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface Activity {
  type: 'chat' | 'workflow' | 'analysis' | 'evolution';
  description: string;
  timestamp: string;
  agentId?: string;
}

export class EnhancedDashboard extends ItemView {
  plugin: VaultPilotPlugin;
  private agentStatusEl!: HTMLElement;
  private performanceEl!: HTMLElement;
  private activityFeedEl!: HTMLElement;
  private marketplaceEl!: HTMLElement;
  private multiModalEl!: HTMLElement;
  private updateInterval: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: VaultPilotPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_ENHANCED_DASHBOARD;
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
    container.addClass('vaultpilot-enhanced-dashboard');

    // Create main grid layout
    const mainGrid = container.createEl('div', { cls: 'dashboard-main-grid' });

    // Header with quick actions
    this.createHeader(mainGrid);

    // Agent status section
    this.createAgentStatusSection(mainGrid);

    // Performance metrics section
    this.createPerformanceSection(mainGrid);

    // Multi-modal content overview
    this.createMultiModalSection(mainGrid);

    // Marketplace recommendations
    this.createMarketplaceSection(mainGrid);

    // Activity feed
    this.createActivityFeedSection(mainGrid);

    // Footer with system status
    this.createFooter(mainGrid);

    // Apply styles
    this.addStyles();

    // Start real-time updates
    this.startRealTimeUpdates();

    // Load initial data
    this.loadDashboardData();
  }

  async onClose() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private createHeader(container: HTMLElement) {
    const header = container.createEl('div', { cls: 'dashboard-header' });
    
    // Title and status
    const titleSection = header.createEl('div', { cls: 'dashboard-title-section' });
    titleSection.createEl('h1', { text: '🤖 VaultPilot Dashboard' });
    
    const statusIndicator = titleSection.createEl('div', { cls: 'status-indicator' });
    statusIndicator.createEl('span', { cls: 'status-dot active' });
    statusIndicator.createEl('span', { text: 'All Systems Operational' });

    // Quick actions
    const quickActions = header.createEl('div', { cls: 'quick-actions' });
    
    const chatBtn = quickActions.createEl('button', { 
      text: '💬 Quick Chat',
      cls: 'dashboard-action-btn primary'
    });
    chatBtn.onclick = () => this.plugin.openChatModal();

    const workflowBtn = quickActions.createEl('button', { 
      text: '⚙️ New Workflow',
      cls: 'dashboard-action-btn secondary'
    });
    workflowBtn.onclick = () => this.plugin.openWorkflowModal();

    const analyzeBtn = quickActions.createEl('button', { 
      text: '🔍 Analyze Vault',
      cls: 'dashboard-action-btn secondary'
    });
    analyzeBtn.onclick = () => this.plugin.analyzeVault();

    const marketplaceBtn = quickActions.createEl('button', { 
      text: '🏪 Marketplace',
      cls: 'dashboard-action-btn secondary'
    });
    marketplaceBtn.onclick = () => this.openMarketplace();
  }

  private createAgentStatusSection(container: HTMLElement) {
    const section = container.createEl('div', { cls: 'dashboard-section agent-status-section' });
    section.createEl('h2', { text: '🧬 Agent Evolution Status' });
    
    this.agentStatusEl = section.createEl('div', { cls: 'agent-status-grid' });
    
    // Placeholder for loading
    this.agentStatusEl.createEl('div', { 
      cls: 'loading-placeholder',
      text: 'Loading agent status...'
    });
  }

  private createPerformanceSection(container: HTMLElement) {
    const section = container.createEl('div', { cls: 'dashboard-section performance-section' });
    section.createEl('h2', { text: '📊 Performance Analytics' });
    
    this.performanceEl = section.createEl('div', { cls: 'performance-metrics-grid' });
    
    // Placeholder for loading
    this.performanceEl.createEl('div', { 
      cls: 'loading-placeholder',
      text: 'Loading performance data...'
    });
  }

  private createMultiModalSection(container: HTMLElement) {
    const section = container.createEl('div', { cls: 'dashboard-section multimodal-section' });
    section.createEl('h2', { text: '🎯 Multi-Modal Content Overview' });
    
    this.multiModalEl = section.createEl('div', { cls: 'multimodal-overview' });
    
    // Content type breakdown
    const contentTypes = this.multiModalEl.createEl('div', { cls: 'content-types' });
    
    const textStats = contentTypes.createEl('div', { cls: 'content-type-card' });
    textStats.createEl('div', { cls: 'content-icon', text: '📝' });
    textStats.createEl('div', { cls: 'content-label', text: 'Text Files' });
    textStats.createEl('div', { cls: 'content-count', text: '---' });

    const imageStats = contentTypes.createEl('div', { cls: 'content-type-card' });
    imageStats.createEl('div', { cls: 'content-icon', text: '🖼️' });
    imageStats.createEl('div', { cls: 'content-label', text: 'Images' });
    imageStats.createEl('div', { cls: 'content-count', text: '---' });

    const audioStats = contentTypes.createEl('div', { cls: 'content-type-card' });
    audioStats.createEl('div', { cls: 'content-icon', text: '🎵' });
    audioStats.createEl('div', { cls: 'content-label', text: 'Audio' });
    audioStats.createEl('div', { cls: 'content-count', text: '---' });

    const dataStats = contentTypes.createEl('div', { cls: 'content-type-card' });
    dataStats.createEl('div', { cls: 'content-icon', text: '📊' });
    dataStats.createEl('div', { cls: 'content-label', text: 'Data Files' });
    dataStats.createEl('div', { cls: 'content-count', text: '---' });

    // Recent multi-modal analysis
    const recentAnalysis = this.multiModalEl.createEl('div', { cls: 'recent-analysis' });
    recentAnalysis.createEl('h3', { text: 'Recent Cross-Modal Insights' });
    recentAnalysis.createEl('div', { 
      cls: 'analysis-placeholder',
      text: 'No recent multi-modal analysis. Try analyzing your vault!'
    });
  }

  private createMarketplaceSection(container: HTMLElement) {
    const section = container.createEl('div', { cls: 'dashboard-section marketplace-section' });
    section.createEl('h2', { text: '🏪 Marketplace Recommendations' });
    
    this.marketplaceEl = section.createEl('div', { cls: 'marketplace-recommendations' });
    
    // Featured agents
    const featured = this.marketplaceEl.createEl('div', { cls: 'featured-agents' });
    featured.createEl('h3', { text: 'Recommended for You' });
    
    const agentCards = featured.createEl('div', { cls: 'agent-cards' });
    
    // Placeholder agent cards
    this.createAgentCard(agentCards, {
      name: 'Research Synthesizer Pro',
      description: 'Advanced research analysis and synthesis',
      rating: 4.8,
      downloads: '15.2k',
      category: 'Research',
      featured: true
    });

    this.createAgentCard(agentCards, {
      name: 'Creative Writing Assistant',
      description: 'Enhanced creative writing with style analysis',
      rating: 4.6,
      downloads: '8.7k',
      category: 'Writing',
      featured: true
    });

    this.createAgentCard(agentCards, {
      name: 'Project Manager AI',
      description: 'Intelligent project planning and tracking',
      rating: 4.9,
      downloads: '12.1k',
      category: 'Productivity',
      featured: true
    });

    // Browse marketplace button
    const browseBtn = this.marketplaceEl.createEl('button', { 
      text: 'Browse All Agents →',
      cls: 'browse-marketplace-btn'
    });
    browseBtn.onclick = () => this.openMarketplace();
  }

  private createActivityFeedSection(container: HTMLElement) {
    const section = container.createEl('div', { cls: 'dashboard-section activity-section' });
    section.createEl('h2', { text: '📈 Recent Activity' });
    
    this.activityFeedEl = section.createEl('div', { cls: 'activity-feed' });
    
    // Placeholder for loading
    this.activityFeedEl.createEl('div', { 
      cls: 'loading-placeholder',
      text: 'Loading activity feed...'
    });
  }

  private createFooter(container: HTMLElement) {
    const footer = container.createEl('div', { cls: 'dashboard-footer' });
    
    const systemInfo = footer.createEl('div', { cls: 'system-info' });
    systemInfo.createEl('span', { text: `VaultPilot v${this.plugin.manifest.version}` });
    systemInfo.createEl('span', { text: '•' });
    systemInfo.createEl('span', { text: 'Backend: EvoAgentX v2.0.0' });
    systemInfo.createEl('span', { text: '•' });
    systemInfo.createEl('span', { text: 'Status: All systems operational' });

    const lastUpdate = footer.createEl('div', { cls: 'last-update' });
    lastUpdate.createEl('span', { text: `Last updated: ${new Date().toLocaleTimeString()}` });
  }

  private createAgentCard(container: HTMLElement, agent: any) {
    const card = container.createEl('div', { cls: 'agent-card' });
    
    const header = card.createEl('div', { cls: 'agent-card-header' });
    header.createEl('h4', { text: agent.name });
    
    if (agent.featured) {
      header.createEl('span', { cls: 'featured-badge', text: '⭐ Featured' });
    }

    card.createEl('p', { text: agent.description, cls: 'agent-description' });

    const stats = card.createEl('div', { cls: 'agent-stats' });
    stats.createEl('span', { text: `⭐ ${agent.rating}` });
    stats.createEl('span', { text: `📥 ${agent.downloads}` });
    stats.createEl('span', { text: agent.category, cls: 'agent-category' });

    const actions = card.createEl('div', { cls: 'agent-actions' });
    const installBtn = actions.createEl('button', { 
      text: 'Install',
      cls: 'install-agent-btn'
    });
    installBtn.onclick = () => this.installAgent(agent);

    const previewBtn = actions.createEl('button', { 
      text: 'Preview',
      cls: 'preview-agent-btn'
    });
    previewBtn.onclick = () => this.previewAgent(agent);
  }

  private async loadDashboardData() {
    try {
      // Load agent status
      await this.loadAgentStatus();
      
      // Load performance metrics
      await this.loadPerformanceMetrics();
      
      // Load activity feed
      await this.loadActivityFeed();
      
      // Load multi-modal content stats
      await this.loadMultiModalStats();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      new Notice('Failed to load dashboard data');
    }
  }

  private async loadAgentStatus() {
    try {
      const response = await this.plugin.apiClient.getAgents();
      if (response.success && response.data) {
        this.renderAgentStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load agent status:', error);
    }
  }

  private renderAgentStatus(agents: any[]) {
    this.agentStatusEl.empty();
    
    if (!agents || agents.length === 0) {
      this.agentStatusEl.createEl('div', { 
        cls: 'no-agents',
        text: 'No agents available. Install some from the marketplace!'
      });
      return;
    }

    agents.forEach(agent => {
      const card = this.agentStatusEl.createEl('div', { cls: 'agent-status-card' });
      
      const header = card.createEl('div', { cls: 'agent-header' });
      header.createEl('h3', { text: agent.name });
      header.createEl('span', { 
        cls: `status-badge ${agent.status || 'idle'}`,
        text: agent.status || 'idle'
      });

      const evolution = card.createEl('div', { cls: 'evolution-info' });
      evolution.createEl('label', { text: 'Evolution Level' });
      const progressBar = evolution.createEl('div', { cls: 'evolution-progress' });
      const progress = progressBar.createEl('div', { 
        cls: 'evolution-fill',
        attr: { style: `width: ${(agent.evolution_level || 1) * 20}%` }
      });
      evolution.createEl('span', { text: `Level ${agent.evolution_level || 1}` });

      const metrics = card.createEl('div', { cls: 'agent-metrics' });
      metrics.createEl('div', { text: `Performance: ${(agent.performance || 0.5) * 100}%` });
      metrics.createEl('div', { text: `Tasks: ${agent.tasks_completed || 0}` });
      metrics.createEl('div', { text: `Last used: ${agent.last_used || 'Never'}` });

      const actions = card.createEl('div', { cls: 'agent-actions' });
      const evolveBtn = actions.createEl('button', { 
        text: 'Evolve',
        cls: 'evolve-btn'
      });
      evolveBtn.onclick = () => this.evolveAgent(agent.id);

      const configureBtn = actions.createEl('button', { 
        text: 'Configure',
        cls: 'configure-btn'
      });
      configureBtn.onclick = () => this.configureAgent(agent.id);
    });
  }

  private async loadPerformanceMetrics() {
    // Simulate performance data loading
    const metrics: PerformanceMetric[] = [
      { label: 'Daily Interactions', value: 47, trend: 'up', change: 15 },
      { label: 'Avg Response Time', value: 1.2, trend: 'down', change: -8 },
      { label: 'Success Rate', value: 94, trend: 'up', change: 3 },
      { label: 'User Satisfaction', value: 4.7, trend: 'stable', change: 0 }
    ];

    this.renderPerformanceMetrics(metrics);
  }

  private renderPerformanceMetrics(metrics: PerformanceMetric[]) {
    this.performanceEl.empty();

    metrics.forEach(metric => {
      const card = this.performanceEl.createEl('div', { cls: 'metric-card' });
      
      const header = card.createEl('div', { cls: 'metric-header' });
      header.createEl('h3', { text: metric.label });
      
      const trendIcon = metric.trend === 'up' ? '📈' : 
                       metric.trend === 'down' ? '📉' : '➡️';
      header.createEl('span', { cls: 'trend-icon', text: trendIcon });

      const value = card.createEl('div', { cls: 'metric-value' });
      value.createEl('span', { text: metric.value.toString(), cls: 'value-number' });
      
      if (metric.change !== 0) {
        const change = value.createEl('span', { cls: 'value-change' });
        const changeText = metric.change > 0 ? `+${metric.change}%` : `${metric.change}%`;
        change.setText(changeText);
        change.addClass(metric.change > 0 ? 'positive' : 'negative');
      }
    });
  }

  private async loadActivityFeed() {
    // Simulate activity data
    const activities: Activity[] = [
      {
        type: 'chat',
        description: 'Analyzed project timeline with Research Agent',
        timestamp: '2 minutes ago',
        agentId: 'research_analyst'
      },
      {
        type: 'evolution',
        description: 'Writing Assistant evolved to Level 3',
        timestamp: '15 minutes ago',
        agentId: 'writing_assistant'
      },
      {
        type: 'workflow',
        description: 'Completed "Create Study Plan" workflow',
        timestamp: '1 hour ago'
      },
      {
        type: 'analysis',
        description: 'Multi-modal analysis of 15 files completed',
        timestamp: '2 hours ago'
      }
    ];

    this.renderActivityFeed(activities);
  }

  private renderActivityFeed(activities: Activity[]) {
    this.activityFeedEl.empty();

    if (activities.length === 0) {
      this.activityFeedEl.createEl('div', { 
        cls: 'no-activity',
        text: 'No recent activity. Start using VaultPilot to see your activity here!'
      });
      return;
    }

    activities.forEach(activity => {
      const item = this.activityFeedEl.createEl('div', { cls: 'activity-item' });
      
      const icon = item.createEl('div', { cls: 'activity-icon' });
      const iconText = activity.type === 'chat' ? '💬' :
                      activity.type === 'evolution' ? '🧬' :
                      activity.type === 'workflow' ? '⚙️' : '🔍';
      icon.setText(iconText);

      const content = item.createEl('div', { cls: 'activity-content' });
      content.createEl('div', { text: activity.description, cls: 'activity-description' });
      content.createEl('div', { text: activity.timestamp, cls: 'activity-timestamp' });
    });
  }

  private async loadMultiModalStats() {
    // This would normally call the backend API
    // For now, we'll simulate the data
    const stats = {
      textFiles: 1247,
      images: 89,
      audio: 12,
      dataFiles: 34
    };

    // Update the content counts
    const textCount = this.multiModalEl.querySelector('.content-type-card:nth-child(1) .content-count');
    const imageCount = this.multiModalEl.querySelector('.content-type-card:nth-child(2) .content-count');
    const audioCount = this.multiModalEl.querySelector('.content-type-card:nth-child(3) .content-count');
    const dataCount = this.multiModalEl.querySelector('.content-type-card:nth-child(4) .content-count');

    if (textCount) textCount.textContent = stats.textFiles.toString();
    if (imageCount) imageCount.textContent = stats.images.toString();
    if (audioCount) audioCount.textContent = stats.audio.toString();
    if (dataCount) dataCount.textContent = stats.dataFiles.toString();
  }

  private startRealTimeUpdates() {
    // Update dashboard every 30 seconds
    this.updateInterval = window.setInterval(() => {
      this.loadDashboardData();
    }, 30000);
  }

  // Action handlers
  private async openMarketplace() {
    new Notice('Opening marketplace...');
    // Implementation would open the marketplace modal
  }

  private async evolveAgent(agentId: string) {
    new Notice(`Evolving agent ${agentId}...`);
    // Implementation would call the evolution API
  }

  private async configureAgent(agentId: string) {
    new Notice(`Configuring agent ${agentId}...`);
    // Implementation would open the agent configuration modal
  }

  private async installAgent(agent: any) {
    new Notice(`Installing ${agent.name}...`);
    // Implementation would install the agent from marketplace
  }

  private async previewAgent(agent: any) {
    new Notice(`Previewing ${agent.name}...`);
    // Implementation would show agent preview modal
  }

  private addStyles() {
    // Add CSS styles for the enhanced dashboard
    const style = document.createElement('style');
    style.textContent = `
      .vaultpilot-enhanced-dashboard {
        height: 100%;
        overflow-y: auto;
        padding: 20px;
        background: var(--background-primary);
      }

      .dashboard-main-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto 1fr auto;
        gap: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .dashboard-header {
        grid-column: 1 / -1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: var(--background-secondary);
        border-radius: 12px;
        border: 1px solid var(--background-modifier-border);
      }

      .dashboard-title-section h1 {
        margin: 0 0 8px 0;
        color: var(--text-normal);
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-muted);
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-green);
      }

      .quick-actions {
        display: flex;
        gap: 12px;
      }

      .dashboard-action-btn {
        padding: 10px 16px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
      }

      .dashboard-action-btn.primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .dashboard-action-btn.secondary {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
      }

      .dashboard-action-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .dashboard-section {
        background: var(--background-secondary);
        border-radius: 12px;
        padding: 20px;
        border: 1px solid var(--background-modifier-border);
      }

      .dashboard-section h2 {
        margin: 0 0 16px 0;
        color: var(--text-normal);
        font-size: 18px;
        font-weight: 600;
      }

      .agent-status-section {
        grid-row: 2;
      }

      .performance-section {
        grid-row: 2;
      }

      .multimodal-section {
        grid-row: 3;
      }

      .marketplace-section {
        grid-row: 3;
      }

      .activity-section {
        grid-column: 1 / -1;
        grid-row: 4;
      }

      .agent-status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }

      .agent-status-card {
        background: var(--background-primary);
        border-radius: 8px;
        padding: 16px;
        border: 1px solid var(--background-modifier-border);
      }

      .agent-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .agent-header h3 {
        margin: 0;
        font-size: 14px;
        color: var(--text-normal);
      }

      .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        text-transform: uppercase;
      }

      .status-badge.active {
        background: var(--color-green-rgb);
        color: var(--color-green);
      }

      .status-badge.learning {
        background: var(--color-orange-rgb);
        color: var(--color-orange);
      }

      .status-badge.idle {
        background: var(--color-base-30);
        color: var(--text-muted);
      }

      .evolution-info {
        margin-bottom: 12px;
      }

      .evolution-info label {
        display: block;
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }

      .evolution-progress {
        width: 100%;
        height: 6px;
        background: var(--background-modifier-border);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 4px;
      }

      .evolution-fill {
        height: 100%;
        background: var(--interactive-accent);
        transition: width 0.3s ease;
      }

      .performance-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .metric-card {
        background: var(--background-primary);
        border-radius: 8px;
        padding: 16px;
        border: 1px solid var(--background-modifier-border);
      }

      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .metric-header h3 {
        margin: 0;
        font-size: 14px;
        color: var(--text-muted);
      }

      .metric-value {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }

      .value-number {
        font-size: 24px;
        font-weight: 600;
        color: var(--text-normal);
      }

      .value-change {
        font-size: 12px;
        font-weight: 500;
      }

      .value-change.positive {
        color: var(--color-green);
      }

      .value-change.negative {
        color: var(--color-red);
      }

      .content-types {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .content-type-card {
        text-align: center;
        padding: 12px;
        background: var(--background-primary);
        border-radius: 8px;
        border: 1px solid var(--background-modifier-border);
      }

      .content-icon {
        font-size: 24px;
        margin-bottom: 8px;
      }

      .content-label {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 4px;
      }

      .content-count {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-normal);
      }

      .agent-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }

      .agent-card {
        background: var(--background-primary);
        border-radius: 8px;
        padding: 16px;
        border: 1px solid var(--background-modifier-border);
      }

      .agent-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .agent-card-header h4 {
        margin: 0;
        font-size: 14px;
        color: var(--text-normal);
      }

      .featured-badge {
        padding: 2px 6px;
        background: var(--color-yellow-rgb);
        color: var(--color-yellow);
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
      }

      .agent-description {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 12px;
      }

      .agent-stats {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: var(--text-muted);
        margin-bottom: 12px;
      }

      .agent-category {
        padding: 2px 6px;
        background: var(--background-modifier-hover);
        border-radius: 4px;
      }

      .agent-actions {
        display: flex;
        gap: 8px;
      }

      .install-agent-btn,
      .preview-agent-btn {
        flex: 1;
        padding: 6px 12px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 11px;
        font-weight: 500;
      }

      .install-agent-btn {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .preview-agent-btn {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
      }

      .browse-marketplace-btn {
        width: 100%;
        padding: 12px;
        background: var(--background-modifier-hover);
        border: none;
        border-radius: 8px;
        color: var(--text-normal);
        cursor: pointer;
        font-weight: 500;
      }

      .activity-feed {
        max-height: 300px;
        overflow-y: auto;
      }

      .activity-item {
        display: flex;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid var(--background-modifier-border);
      }

      .activity-item:last-child {
        border-bottom: none;
      }

      .activity-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .activity-content {
        flex: 1;
      }

      .activity-description {
        font-size: 14px;
        color: var(--text-normal);
        margin-bottom: 4px;
      }

      .activity-timestamp {
        font-size: 12px;
        color: var(--text-muted);
      }

      .dashboard-footer {
        grid-column: 1 / -1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: var(--background-secondary);
        border-radius: 8px;
        border: 1px solid var(--background-modifier-border);
        margin-top: 20px;
      }

      .system-info {
        display: flex;
        gap: 8px;
        font-size: 12px;
        color: var(--text-muted);
      }

      .last-update {
        font-size: 12px;
        color: var(--text-muted);
      }

      .loading-placeholder,
      .no-agents,
      .no-activity,
      .analysis-placeholder {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-muted);
        font-style: italic;
      }

      @media (max-width: 1200px) {
        .dashboard-main-grid {
          grid-template-columns: 1fr;
        }
        
        .dashboard-header {
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }
        
        .quick-actions {
          flex-wrap: wrap;
          justify-content: center;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}
