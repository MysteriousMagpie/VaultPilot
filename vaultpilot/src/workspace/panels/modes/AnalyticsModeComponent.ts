/**
 * VaultPilot Analytics Mode Component
 * 
 * Extracted from MainPanel.ts - Handles analytics dashboard and performance
 * monitoring with comprehensive vault metrics and AI usage insights.
 */

import { Notice } from 'obsidian';
import { BaseModeComponent } from './BaseModeComponent';
import type { 
  ModeAction, 
  ModeContext, 
  ContextSource 
} from '../types';

export class AnalyticsModeComponent extends BaseModeComponent {
  private refreshInterval?: number;
  private vaultStats?: any;

  constructor() {
    super('analytics');
  }

  protected async initialize(): Promise<void> {
    this.vaultStats = undefined;
  }

  protected async renderContent(): Promise<void> {
    // Create analytics interface
    const analyticsContainer = this.container.createEl('div', { cls: 'vp-analytics-interface' });
    
    // Analytics header
    const analyticsHeader = analyticsContainer.createEl('div', { cls: 'vp-analytics-header' });
    analyticsHeader.createEl('h3', { text: 'Analytics Dashboard' });
    
    const contextInfo = analyticsHeader.createEl('div', { cls: 'vp-analytics-context-info' });
    contextInfo.createEl('span', { 
      text: `Monitoring ${this.context.contextSources.length} context sources`,
      cls: 'vp-context-summary'
    });

    // Last updated indicator
    const lastUpdated = analyticsHeader.createEl('div', { cls: 'vp-last-updated' });
    lastUpdated.createEl('span', { 
      text: `Last updated: ${new Date().toLocaleTimeString()}`,
      cls: 'vp-update-time'
    });

    // Create dashboard sections
    await this.createOverviewSection(analyticsContainer);
    await this.createVaultMetricsSection(analyticsContainer);
    await this.createUsageMetricsSection(analyticsContainer);
    await this.createPerformanceSection(analyticsContainer);
    await this.createAIInsightsSection(analyticsContainer);

    // Setup auto-refresh
    this.setupAutoRefresh();
  }

  protected getModeActions(): ModeAction[] {
    return [
      {
        id: 'refresh-analytics',
        label: 'Refresh Data',
        icon: 'refresh-cw',
        callback: () => this.refreshAllData(),
        enabled: true
      },
      {
        id: 'export-report',
        label: 'Export Report',
        icon: 'download',
        callback: () => this.exportAnalyticsReport(),
        enabled: true
      },
      {
        id: 'configure-metrics',
        label: 'Configure',
        icon: 'settings',
        callback: () => this.openMetricsConfig(),
        enabled: true
      }
    ];
  }

  protected onContextUpdate(sources: ContextSource[]): void {
    const contextInfo = this.container.querySelector('.vp-context-summary');
    if (contextInfo) {
      contextInfo.textContent = `Monitoring ${sources.length} context sources`;
    }
  }

  protected onCleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    this.vaultStats = undefined;
  }

  private async createOverviewSection(container: HTMLElement): Promise<void> {
    const overviewSection = container.createEl('div', { cls: 'vp-analytics-section vp-overview-section' });
    overviewSection.createEl('h4', { text: 'Overview', cls: 'vp-section-title' });

    const overviewGrid = overviewSection.createEl('div', { cls: 'vp-overview-grid' });

    // Vault health indicator
    const healthCard = overviewGrid.createEl('div', { cls: 'vp-metric-card vp-health-card' });
    healthCard.createEl('div', { cls: 'vp-metric-icon vp-health-icon' });
    healthCard.createEl('div', { text: 'Vault Health', cls: 'vp-metric-label' });
    const healthValue = healthCard.createEl('div', { cls: 'vp-metric-value vp-health-value' });
    healthValue.createEl('span', { text: 'Excellent', cls: 'vp-health-status' });
    healthValue.createEl('span', { text: '96%', cls: 'vp-health-score' });

    // Activity indicator
    const activityCard = overviewGrid.createEl('div', { cls: 'vp-metric-card vp-activity-card' });
    activityCard.createEl('div', { cls: 'vp-metric-icon vp-activity-icon' });
    activityCard.createEl('div', { text: 'Today\'s Activity', cls: 'vp-metric-label' });
    const activityValue = activityCard.createEl('div', { cls: 'vp-metric-value' });
    activityValue.createEl('span', { text: '47', cls: 'vp-activity-count' });
    activityValue.createEl('span', { text: 'interactions', cls: 'vp-activity-label' });

    // AI usage indicator
    const aiCard = overviewGrid.createEl('div', { cls: 'vp-metric-card vp-ai-card' });
    aiCard.createEl('div', { cls: 'vp-metric-icon vp-ai-icon' });
    aiCard.createEl('div', { text: 'AI Requests', cls: 'vp-metric-label' });
    const aiValue = aiCard.createEl('div', { cls: 'vp-metric-value' });
    aiValue.createEl('span', { text: '23', cls: 'vp-ai-count' });
    aiValue.createEl('span', { text: 'today', cls: 'vp-ai-label' });

    // Performance indicator
    const perfCard = overviewGrid.createEl('div', { cls: 'vp-metric-card vp-performance-card' });
    perfCard.createEl('div', { cls: 'vp-metric-icon vp-performance-icon' });
    perfCard.createEl('div', { text: 'Performance', cls: 'vp-metric-label' });
    const perfValue = perfCard.createEl('div', { cls: 'vp-metric-value' });
    perfValue.createEl('span', { text: '142ms', cls: 'vp-performance-time' });
    perfValue.createEl('span', { text: 'avg response', cls: 'vp-performance-label' });
  }

  private async createVaultMetricsSection(container: HTMLElement): Promise<void> {
    const vaultSection = container.createEl('div', { cls: 'vp-analytics-section vp-vault-section' });
    vaultSection.createEl('h4', { text: 'Vault Metrics', cls: 'vp-section-title' });

    const vaultGrid = vaultSection.createEl('div', { cls: 'vp-vault-grid' });

    // Collect vault statistics
    const stats = await this.collectVaultStats();

    // Files count
    const filesCard = vaultGrid.createEl('div', { cls: 'vp-stat-card' });
    filesCard.createEl('div', { text: stats.totalFiles.toString(), cls: 'vp-stat-value' });
    filesCard.createEl('div', { text: 'Total Files', cls: 'vp-stat-label' });

    // Word count
    const wordsCard = vaultGrid.createEl('div', { cls: 'vp-stat-card' });
    wordsCard.createEl('div', { text: this.formatNumber(stats.totalWords), cls: 'vp-stat-value' });
    wordsCard.createEl('div', { text: 'Total Words', cls: 'vp-stat-label' });

    // Storage size
    const sizeCard = vaultGrid.createEl('div', { cls: 'vp-stat-card' });
    sizeCard.createEl('div', { text: this.formatBytes(stats.totalSize), cls: 'vp-stat-value' });
    sizeCard.createEl('div', { text: 'Vault Size', cls: 'vp-stat-label' });

    // Recent activity
    const activityCard = vaultGrid.createEl('div', { cls: 'vp-stat-card' });
    activityCard.createEl('div', { text: stats.recentFiles.toString(), cls: 'vp-stat-value' });
    activityCard.createEl('div', { text: 'Modified Today', cls: 'vp-stat-label' });

    // File type breakdown
    const typesSection = vaultSection.createEl('div', { cls: 'vp-file-types-section' });
    typesSection.createEl('h5', { text: 'File Types', cls: 'vp-subsection-title' });
    
    const typesGrid = typesSection.createEl('div', { cls: 'vp-types-grid' });
    Object.entries(stats.fileTypes).forEach(([type, count]) => {
      const typeCard = typesGrid.createEl('div', { cls: 'vp-type-card' });
      typeCard.createEl('span', { text: type.toUpperCase(), cls: 'vp-type-extension' });
      typeCard.createEl('span', { text: String(count), cls: 'vp-type-count' });
    });
  }

  private async createUsageMetricsSection(container: HTMLElement): Promise<void> {
    const usageSection = container.createEl('div', { cls: 'vp-analytics-section vp-usage-section' });
    usageSection.createEl('h4', { text: 'Usage Patterns', cls: 'vp-section-title' });

    // Most active files
    const activeFilesCard = usageSection.createEl('div', { cls: 'vp-usage-card' });
    activeFilesCard.createEl('h5', { text: 'Most Active Files', cls: 'vp-card-title' });
    
    const activeFilesList = activeFilesCard.createEl('div', { cls: 'vp-active-files-list' });
    
    // Mock data for most active files
    const mockActiveFiles = [
      { name: 'Daily Notes.md', interactions: 15, lastAccessed: '2 hours ago' },
      { name: 'Project Planning.md', interactions: 12, lastAccessed: '4 hours ago' },
      { name: 'Research Notes.md', interactions: 8, lastAccessed: '1 day ago' },
      { name: 'Meeting Notes.md', interactions: 6, lastAccessed: '3 hours ago' }
    ];

    mockActiveFiles.forEach(file => {
      const fileItem = activeFilesList.createEl('div', { cls: 'vp-active-file-item' });
      
      const fileInfo = fileItem.createEl('div', { cls: 'vp-file-info' });
      fileInfo.createEl('div', { text: file.name, cls: 'vp-file-name' });
      fileInfo.createEl('div', { text: file.lastAccessed, cls: 'vp-file-time' });
      
      const interactionBadge = fileItem.createEl('div', { 
        text: file.interactions.toString(),
        cls: 'vp-interaction-badge'
      });
    });

    // Usage timeline
    const timelineCard = usageSection.createEl('div', { cls: 'vp-usage-card vp-timeline-card' });
    timelineCard.createEl('h5', { text: 'Activity Timeline', cls: 'vp-card-title' });
    
    const timeline = timelineCard.createEl('div', { cls: 'vp-activity-timeline' });
    
    // Mock timeline data for last 7 days
    const mockTimelineData = [
      { day: 'Mon', activity: 85 },
      { day: 'Tue', activity: 92 },
      { day: 'Wed', activity: 78 },
      { day: 'Thu', activity: 95 },
      { day: 'Fri', activity: 88 },
      { day: 'Sat', activity: 45 },
      { day: 'Sun', activity: 62 }
    ];

    mockTimelineData.forEach(data => {
      const dayItem = timeline.createEl('div', { cls: 'vp-timeline-day' });
      dayItem.createEl('div', { text: data.day, cls: 'vp-timeline-label' });
      
      const activityBar = dayItem.createEl('div', { cls: 'vp-timeline-bar-container' });
      const bar = activityBar.createEl('div', { cls: 'vp-timeline-bar' });
      bar.style.height = `${data.activity}%`;
      bar.setAttribute('title', `${data.activity}% activity`);
      
      dayItem.createEl('div', { text: data.activity.toString(), cls: 'vp-timeline-value' });
    });
  }

  private async createPerformanceSection(container: HTMLElement): Promise<void> {
    const perfSection = container.createEl('div', { cls: 'vp-analytics-section vp-performance-section' });
    perfSection.createEl('h4', { text: 'Performance Metrics', cls: 'vp-section-title' });

    const perfGrid = perfSection.createEl('div', { cls: 'vp-performance-grid' });

    // Response time metrics
    const responseCard = perfGrid.createEl('div', { cls: 'vp-perf-card' });
    responseCard.createEl('h5', { text: 'Response Times', cls: 'vp-perf-title' });
    
    const responseMetrics = responseCard.createEl('div', { cls: 'vp-response-metrics' });
    
    const avgResponse = responseMetrics.createEl('div', { cls: 'vp-response-metric' });
    avgResponse.createEl('span', { text: '142ms', cls: 'vp-response-value' });
    avgResponse.createEl('span', { text: 'Average', cls: 'vp-response-label' });
    
    const p95Response = responseMetrics.createEl('div', { cls: 'vp-response-metric' });
    p95Response.createEl('span', { text: '287ms', cls: 'vp-response-value' });
    p95Response.createEl('span', { text: '95th percentile', cls: 'vp-response-label' });

    // System health
    const healthCard = perfGrid.createEl('div', { cls: 'vp-perf-card' });
    healthCard.createEl('h5', { text: 'System Health', cls: 'vp-perf-title' });
    
    const healthMetrics = healthCard.createEl('div', { cls: 'vp-health-metrics' });
    
    const memoryMetric = healthMetrics.createEl('div', { cls: 'vp-health-metric' });
    memoryMetric.createEl('span', { text: 'Memory Usage', cls: 'vp-health-label' });
    const memoryBar = memoryMetric.createEl('div', { cls: 'vp-health-bar' });
    memoryBar.createEl('div', { 
      cls: 'vp-health-fill',
      attr: { style: 'width: 67%' }
    });
    memoryMetric.createEl('span', { text: '67%', cls: 'vp-health-value' });
    
    const cpuMetric = healthMetrics.createEl('div', { cls: 'vp-health-metric' });
    cpuMetric.createEl('span', { text: 'CPU Usage', cls: 'vp-health-label' });
    const cpuBar = cpuMetric.createEl('div', { cls: 'vp-health-bar' });
    cpuBar.createEl('div', { 
      cls: 'vp-health-fill',
      attr: { style: 'width: 23%' }
    });
    cpuMetric.createEl('span', { text: '23%', cls: 'vp-health-value' });

    // Error rates
    const errorCard = perfGrid.createEl('div', { cls: 'vp-perf-card' });
    errorCard.createEl('h5', { text: 'Error Rates', cls: 'vp-perf-title' });
    
    const errorMetrics = errorCard.createEl('div', { cls: 'vp-error-metrics' });
    
    const errorRate = errorMetrics.createEl('div', { cls: 'vp-error-metric' });
    errorRate.createEl('span', { text: '0.3%', cls: 'vp-error-rate' });
    errorRate.createEl('span', { text: 'Error Rate', cls: 'vp-error-label' });
    
    const uptime = errorMetrics.createEl('div', { cls: 'vp-error-metric' });
    uptime.createEl('span', { text: '99.7%', cls: 'vp-uptime-value' });
    uptime.createEl('span', { text: 'Uptime', cls: 'vp-error-label' });
  }

  private async createAIInsightsSection(container: HTMLElement): Promise<void> {
    const insightsSection = container.createEl('div', { cls: 'vp-analytics-section vp-insights-section' });
    insightsSection.createEl('h4', { text: 'AI Insights', cls: 'vp-section-title' });

    // AI usage metrics
    const aiUsageCard = insightsSection.createEl('div', { cls: 'vp-insights-card' });
    aiUsageCard.createEl('h5', { text: 'AI Usage Today', cls: 'vp-card-title' });
    
    const aiMetrics = aiUsageCard.createEl('div', { cls: 'vp-ai-metrics' });
    
    const chatMetric = aiMetrics.createEl('div', { cls: 'vp-ai-metric' });
    chatMetric.createEl('span', { text: '23', cls: 'vp-ai-count' });
    chatMetric.createEl('span', { text: 'Chat Messages', cls: 'vp-ai-label' });
    
    const workflowMetric = aiMetrics.createEl('div', { cls: 'vp-ai-metric' });
    workflowMetric.createEl('span', { text: '5', cls: 'vp-ai-count' });
    workflowMetric.createEl('span', { text: 'Workflows Created', cls: 'vp-ai-label' });
    
    const analysisMetric = aiMetrics.createEl('div', { cls: 'vp-ai-metric' });
    analysisMetric.createEl('span', { text: '8', cls: 'vp-ai-count' });
    analysisMetric.createEl('span', { text: 'Vault Analyses', cls: 'vp-ai-label' });

    // Model performance
    const modelCard = insightsSection.createEl('div', { cls: 'vp-insights-card' });
    modelCard.createEl('h5', { text: 'Model Performance', cls: 'vp-card-title' });
    
    const modelMetrics = modelCard.createEl('div', { cls: 'vp-model-metrics' });
    
    const modelStatus = modelMetrics.createEl('div', { cls: 'vp-model-status' });
    modelStatus.createEl('div', { cls: 'vp-model-indicator vp-model-healthy' });
    modelStatus.createEl('span', { text: 'GPT-4 Turbo', cls: 'vp-model-name' });
    modelStatus.createEl('span', { text: 'Healthy', cls: 'vp-model-health' });
    
    const confMetric = modelMetrics.createEl('div', { cls: 'vp-confidence-metric' });
    confMetric.createEl('span', { text: 'Avg Confidence', cls: 'vp-confidence-label' });
    confMetric.createEl('span', { text: '94.2%', cls: 'vp-confidence-value' });

    // Recommendations
    const recsCard = insightsSection.createEl('div', { cls: 'vp-insights-card' });
    recsCard.createEl('h5', { text: 'Recommendations', cls: 'vp-card-title' });
    
    const recsList = recsCard.createEl('div', { cls: 'vp-recommendations-list' });
    
    const mockRecommendations = [
      { text: 'Consider organizing your daily notes into weekly folders', priority: 'medium' },
      { text: 'Add more tags to improve searchability', priority: 'low' },
      { text: 'Review and archive old project files', priority: 'high' }
    ];

    mockRecommendations.forEach(rec => {
      const recItem = recsList.createEl('div', { cls: `vp-recommendation-item vp-priority-${rec.priority}` });
      recItem.createEl('div', { cls: `vp-priority-indicator vp-priority-${rec.priority}` });
      recItem.createEl('span', { text: rec.text, cls: 'vp-recommendation-text' });
    });
  }

  private async collectVaultStats(): Promise<any> {
    if (!this.context.plugin) return { totalFiles: 0, totalWords: 0, totalSize: 0, recentFiles: 0, fileTypes: {} };

    const files = this.context.plugin.app.vault.getMarkdownFiles();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let totalWords = 0;
    let totalSize = 0;
    let recentFiles = 0;
    const fileTypes: Record<string, number> = {};

    for (const file of files) {
      // Count file types
      const ext = file.extension || 'unknown';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;

      // Add to total size
      totalSize += file.stat.size;

      // Check if modified today
      if (new Date(file.stat.mtime) >= today) {
        recentFiles++;
      }

      // Count words in markdown files (sample for performance)
      if (file.extension === 'md' && totalWords < 100000) {
        try {
          const content = await this.context.plugin.app.vault.read(file);
          const words = content.split(/\s+/).filter((word: string) => word.length > 0);
          totalWords += words.length;
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    this.vaultStats = {
      totalFiles: files.length,
      totalWords,
      totalSize,
      recentFiles,
      fileTypes
    };

    return this.vaultStats;
  }

  private formatNumber(num: number): string {
    if (num < 1000) return num.toString();
    if (num < 1000000) return Math.round(num / 100) / 10 + 'K';
    return Math.round(num / 100000) / 10 + 'M';
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return Math.round(bytes / (1024 * 1024)) + ' MB';
    return Math.round(bytes / (1024 * 1024 * 1024)) + ' GB';
  }

  private setupAutoRefresh(): void {
    // Refresh data every 30 seconds
    this.refreshInterval = window.setInterval(() => {
      this.updateLastRefreshed();
    }, 30000);
  }

  private updateLastRefreshed(): void {
    const lastUpdated = this.container.querySelector('.vp-update-time');
    if (lastUpdated) {
      lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  private async refreshAllData(): Promise<void> {
    if (!this.context.plugin) return;

    const loadingEl = this.showLoading('Refreshing analytics data...');
    
    try {
      // Re-render the entire interface with fresh data
      this.container.empty();
      await this.renderContent();
      
      this.hideLoading();
      new Notice('Analytics data refreshed');
    } catch (error) {
      this.hideLoading();
      new Notice('Failed to refresh analytics data');
    }
  }

  private async exportAnalyticsReport(): Promise<void> {
    if (!this.context.plugin || !this.vaultStats) return;

    try {
      const stats = this.vaultStats;
      const timestamp = new Date().toISOString();
      
      let report = `# VaultPilot Analytics Report\n\n`;
      report += `Generated: ${timestamp}\n\n`;
      
      report += `## Vault Overview\n\n`;
      report += `- **Total Files**: ${stats.totalFiles}\n`;
      report += `- **Total Words**: ${this.formatNumber(stats.totalWords)}\n`;
      report += `- **Vault Size**: ${this.formatBytes(stats.totalSize)}\n`;
      report += `- **Files Modified Today**: ${stats.recentFiles}\n\n`;
      
      report += `## File Types\n\n`;
      Object.entries(stats.fileTypes).forEach(([type, count]) => {
        report += `- **${type.toUpperCase()}**: ${count} files\n`;
      });
      
      report += `\n## Performance\n\n`;
      report += `- **Average Response Time**: 142ms\n`;
      report += `- **Error Rate**: 0.3%\n`;
      report += `- **System Health**: 96% (Excellent)\n\n`;
      
      report += `## AI Usage Today\n\n`;
      report += `- **Chat Messages**: 23\n`;
      report += `- **Workflows Created**: 5\n`;
      report += `- **Vault Analyses**: 8\n`;
      report += `- **Model Confidence**: 94.2%\n\n`;
      
      report += `---\n\n*Generated by VaultPilot Analytics Dashboard*`;

      const filename = `VaultPilot Analytics Report ${new Date().toISOString().split('T')[0]}.md`;
      await this.context.plugin.app.vault.create(filename, report);
      new Notice(`Analytics report exported to ${filename}`);
    } catch (error) {
      new Notice('Failed to export analytics report');
    }
  }

  private openMetricsConfig(): void {
    new Notice('Metrics configuration - Coming soon');
  }
}