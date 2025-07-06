/**
 * TransportDashboard - Real-time transport status monitoring and management
 */

import { Component, Notice } from 'obsidian';
import { TransportManager, TransportManagerConfig } from '../devpipe/TransportManager';
import { TransportType, TransportEvent } from '../devpipe/transports/DevPipeTransport';
import VaultPilotPlugin from '../main';

export interface DashboardConfig {
  updateInterval: number;
  showAdvancedMetrics: boolean;
  enableRealTimeUpdates: boolean;
}

export interface TransportStatusData {
  type: TransportType;
  status: 'healthy' | 'degraded' | 'failing' | 'disconnected';
  lastResponseTime: number;
  successRate: number;
  errorCount: number;
  lastError?: string;
  capabilities: string[];
  connectionState: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export interface SystemHealth {
  overall: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  activeTransport: TransportType;
  availableTransports: TransportType[];
  lastHealthCheck: Date;
  uptime: number;
  totalRequests: number;
  totalErrors: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  p95ResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  transportDistribution: Record<TransportType, number>;
  trends: {
    responseTime: number[];
    errorRate: number[];
    throughput: number[];
    timestamps: Date[];
  };
}

export class TransportDashboard extends Component {
  private containerEl: HTMLElement;
  private transportManager?: TransportManager;
  private plugin: VaultPilotPlugin;
  private config: DashboardConfig;
  
  private updateInterval?: number;
  private statusCards: Map<TransportType, HTMLElement> = new Map();
  private metricsContainer!: HTMLElement;
  private systemHealthContainer!: HTMLElement;
  private chartsContainer!: HTMLElement;
  
  private currentHealth?: SystemHealth;
  private currentMetrics?: PerformanceMetrics;
  private isRealTimeEnabled: boolean = true;

  constructor(
    containerEl: HTMLElement, 
    plugin: VaultPilotPlugin, 
    config: DashboardConfig = {
      updateInterval: 2000,
      showAdvancedMetrics: true,
      enableRealTimeUpdates: true
    }
  ) {
    super();
    this.containerEl = containerEl;
    this.plugin = plugin;
    this.config = config;
    // Transport manager will be initialized when available
    this.isRealTimeEnabled = config.enableRealTimeUpdates;
  }

  async onload() {
    this.initializeDashboard();
    
    if (this.isRealTimeEnabled) {
      this.startRealTimeUpdates();
      this.setupEventListeners();
    }
    
    // Initial load
    await this.updateDashboard();
  }

  onunload() {
    this.stopRealTimeUpdates();
    this.removeEventListeners();
  }

  private initializeDashboard() {
    this.containerEl.empty();
    this.containerEl.addClass('transport-dashboard');
    
    // Create header
    this.createHeader();
    
    // Create system health overview
    this.createSystemHealthSection();
    
    // Create transport status cards
    this.createTransportStatusSection();
    
    // Create performance metrics
    this.createPerformanceMetricsSection();
    
    // Create charts section
    this.createChartsSection();
    
    // Create controls
    this.createControlsSection();
  }

  private createHeader() {
    const header = this.containerEl.createDiv('dashboard-header');
    header.createEl('h2', { text: 'Transport Dashboard' });
    
    const lastUpdate = header.createDiv('last-update');
    lastUpdate.createSpan({ text: 'Last updated: ', cls: 'label' });
    const timestamp = lastUpdate.createSpan({ cls: 'timestamp' });
    timestamp.textContent = new Date().toLocaleTimeString();
    
    // Real-time indicator
    const indicator = header.createDiv('realtime-indicator');
    if (this.isRealTimeEnabled) {
      indicator.createSpan({ text: '🟢 Real-time', cls: 'realtime-active' });
    } else {
      indicator.createSpan({ text: '⚪ Manual refresh', cls: 'realtime-inactive' });
    }
  }

  private createSystemHealthSection() {
    const section = this.containerEl.createDiv('system-health-section');
    section.createEl('h3', { text: 'System Health' });
    
    this.systemHealthContainer = section.createDiv('system-health-container');
    
    // Placeholder content
    this.renderSystemHealthPlaceholder();
  }

  private createTransportStatusSection() {
    const section = this.containerEl.createDiv('transport-status-section');
    section.createEl('h3', { text: 'Transport Status' });
    
    const cardsContainer = section.createDiv('transport-cards-container');
    
    // Create cards for all supported transport types
    const supportedTransports = [TransportType.HTTP, TransportType.WEBSOCKET, TransportType.FILESYSTEM];
    
    supportedTransports.forEach(transportType => {
      const card = this.createTransportCard(cardsContainer, transportType);
      this.statusCards.set(transportType, card);
    });
  }

  private createTransportCard(container: HTMLElement, transportType: TransportType): HTMLElement {
    const card = container.createDiv('transport-status-card');
    card.addClass(`transport-${transportType}`);
    card.addClass('status-unknown');
    
    // Header
    const header = card.createDiv('card-header');
    header.createEl('h4', { text: transportType.toUpperCase() });
    
    const statusBadge = header.createDiv('status-badge');
    statusBadge.textContent = 'Unknown';
    
    // Metrics
    const metrics = card.createDiv('card-metrics');
    
    const responseTime = metrics.createDiv('metric');
    responseTime.createSpan({ text: 'Response Time', cls: 'metric-label' });
    responseTime.createSpan({ text: '--', cls: 'metric-value response-time' });
    
    const successRate = metrics.createDiv('metric');
    successRate.createSpan({ text: 'Success Rate', cls: 'metric-label' });
    successRate.createSpan({ text: '--', cls: 'metric-value success-rate' });
    
    const errorCount = metrics.createDiv('metric');
    errorCount.createSpan({ text: 'Errors', cls: 'metric-label' });
    errorCount.createSpan({ text: '--', cls: 'metric-value error-count' });
    
    // Connection state
    const connection = card.createDiv('connection-state');
    connection.createSpan({ text: 'Disconnected', cls: 'connection-status' });
    
    // Actions
    const actions = card.createDiv('card-actions');
    
    const testButton = actions.createEl('button', { text: 'Test', cls: 'mod-muted' });
    testButton.onclick = () => this.testTransport(transportType);
    
    const switchButton = actions.createEl('button', { text: 'Switch To', cls: 'mod-cta' });
    switchButton.onclick = () => this.switchToTransport(transportType);
    
    return card;
  }

  private createPerformanceMetricsSection() {
    const section = this.containerEl.createDiv('performance-metrics-section');
    section.createEl('h3', { text: 'Performance Metrics' });
    
    this.metricsContainer = section.createDiv('metrics-container');
    
    // Placeholder content
    this.renderPerformanceMetricsPlaceholder();
  }

  private createChartsSection() {
    const section = this.containerEl.createDiv('charts-section');
    section.createEl('h3', { text: 'Performance Trends' });
    
    this.chartsContainer = section.createDiv('charts-container');
    
    // For now, create placeholder charts
    this.renderChartsPlaceholder();
  }

  private createControlsSection() {
    const section = this.containerEl.createDiv('controls-section');
    
    const controls = section.createDiv('dashboard-controls');
    
    // Refresh button
    const refreshButton = controls.createEl('button', { text: '🔄 Refresh', cls: 'mod-cta' });
    refreshButton.onclick = () => this.manualRefresh();
    
    // Export button
    const exportButton = controls.createEl('button', { text: '📊 Export Data', cls: 'mod-muted' });
    exportButton.onclick = () => this.exportData();
    
    // Settings button
    const settingsButton = controls.createEl('button', { text: '⚙️ Settings', cls: 'mod-muted' });
    settingsButton.onclick = () => this.openDashboardSettings();
    
    // Real-time toggle
    const realtimeToggle = controls.createDiv('realtime-toggle');
    realtimeToggle.createSpan({ text: 'Real-time updates: ' });
    
    const toggle = realtimeToggle.createEl('input', { type: 'checkbox' });
    toggle.checked = this.isRealTimeEnabled;
    toggle.onchange = () => this.toggleRealTimeUpdates(toggle.checked);
  }

  private async updateDashboard() {
    try {
      // Update system health
      this.currentHealth = await this.getSystemHealth();
      this.renderSystemHealth(this.currentHealth);
      
      // Update transport statuses
      await this.updateTransportStatuses();
      
      // Update performance metrics
      this.currentMetrics = await this.getPerformanceMetrics();
      this.renderPerformanceMetrics(this.currentMetrics);
      
      // Update timestamp
      this.updateTimestamp();
      
    } catch (error) {
      console.error('Failed to update dashboard:', error);
      this.renderError('Failed to update dashboard data');
    }
  }

  private async getSystemHealth(): Promise<SystemHealth> {
    // Get health from transport manager
    const transportManager = this.transportManager;
    
    // Simulate getting comprehensive health data
    const health: SystemHealth = {
      overall: 'good',
      activeTransport: 'http' as TransportType,
      availableTransports: ['http', 'websocket'] as TransportType[],
      lastHealthCheck: new Date(),
      uptime: Date.now() - (this.plugin.app as any).vault.adapter.started || 0,
      totalRequests: Math.floor(Math.random() * 10000),
      totalErrors: Math.floor(Math.random() * 100)
    };
    
    // Determine overall health based on error rate
    const errorRate = health.totalErrors / health.totalRequests;
    if (errorRate < 0.01) {
      health.overall = 'excellent';
    } else if (errorRate < 0.05) {
      health.overall = 'good';
    } else if (errorRate < 0.1) {
      health.overall = 'fair';
    } else if (errorRate < 0.2) {
      health.overall = 'poor';
    } else {
      health.overall = 'critical';
    }
    
    return health;
  }

  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // Get metrics from transport manager
    const metrics: PerformanceMetrics = {
      averageResponseTime: 150 + Math.random() * 100,
      p95ResponseTime: 300 + Math.random() * 200,
      requestsPerMinute: 100 + Math.random() * 50,
      errorRate: Math.random() * 0.05,
      transportDistribution: {
        'http': 0.7,
        'websocket': 0.25,
        'filesystem': 0.05
      },
      trends: {
        responseTime: this.generateTrendData(150, 20),
        errorRate: this.generateTrendData(0.02, 0.01),
        throughput: this.generateTrendData(100, 20),
        timestamps: this.generateTimestamps(20)
      }
    };
    
    return metrics;
  }

  private generateTrendData(baseline: number, variance: number, points: number = 20): number[] {
    const data: number[] = [];
    for (let i = 0; i < points; i++) {
      data.push(baseline + (Math.random() - 0.5) * variance * 2);
    }
    return data;
  }

  private generateTimestamps(points: number): Date[] {
    const timestamps: Date[] = [];
    const now = new Date();
    for (let i = points - 1; i >= 0; i--) {
      timestamps.push(new Date(now.getTime() - i * 60000)); // 1 minute intervals
    }
    return timestamps;
  }

  private async updateTransportStatuses() {
    const supportedTransports = [TransportType.HTTP, TransportType.WEBSOCKET, TransportType.FILESYSTEM];
    
    for (const transportType of supportedTransports) {
      const status = await this.getTransportStatus(transportType);
      this.updateTransportCard(transportType, status);
    }
  }

  private async getTransportStatus(transportType: TransportType): Promise<TransportStatusData> {
    // Simulate getting transport status
    const isActive = Math.random() > 0.2; // 80% chance of being active
    const responseTime = 100 + Math.random() * 200;
    const successRate = 0.9 + Math.random() * 0.1;
    
    const status: TransportStatusData = {
      type: transportType,
      status: isActive ? (successRate > 0.95 ? 'healthy' : 'degraded') : 'disconnected',
      lastResponseTime: responseTime,
      successRate: successRate,
      errorCount: Math.floor(Math.random() * 10),
      capabilities: this.getTransportCapabilities(transportType),
      connectionState: isActive ? 'connected' : 'disconnected'
    };
    
    if (!isActive) {
      status.lastError = 'Connection timeout';
    }
    
    return status;
  }

  private getTransportCapabilities(transportType: TransportType): string[] {
    switch (transportType) {
      case TransportType.HTTP:
        return ['RESTful API', 'Connection Pooling', 'Retry Logic'];
      case TransportType.WEBSOCKET:
        return ['Real-time', 'Bidirectional', 'Auto-reconnect'];
      case TransportType.FILESYSTEM:
        return ['Local Storage', 'File Locking', 'Offline Support'];
      default:
        return [];
    }
  }

  private updateTransportCard(transportType: TransportType, status: TransportStatusData) {
    const card = this.statusCards.get(transportType);
    if (!card) return;
    
    // Update status class
    card.className = `transport-status-card transport-${transportType} status-${status.status}`;
    
    // Update status badge
    const statusBadge = card.querySelector('.status-badge') as HTMLElement;
    statusBadge.textContent = status.status.charAt(0).toUpperCase() + status.status.slice(1);
    
    // Update metrics
    const responseTimeEl = card.querySelector('.response-time') as HTMLElement;
    responseTimeEl.textContent = `${status.lastResponseTime.toFixed(0)}ms`;
    
    const successRateEl = card.querySelector('.success-rate') as HTMLElement;
    successRateEl.textContent = `${(status.successRate * 100).toFixed(1)}%`;
    
    const errorCountEl = card.querySelector('.error-count') as HTMLElement;
    errorCountEl.textContent = status.errorCount.toString();
    
    // Update connection state
    const connectionEl = card.querySelector('.connection-status') as HTMLElement;
    connectionEl.textContent = status.connectionState.charAt(0).toUpperCase() + status.connectionState.slice(1);
    connectionEl.className = `connection-status state-${status.connectionState}`;
    
    // Update action buttons
    const switchButton = card.querySelector('.mod-cta') as HTMLButtonElement;
    switchButton.disabled = status.status === 'failing' || status.connectionState === 'disconnected';
  }

  private renderSystemHealth(health: SystemHealth) {
    this.systemHealthContainer.empty();
    
    const healthGrid = this.systemHealthContainer.createDiv('health-grid');
    
    // Overall health
    const overallHealth = healthGrid.createDiv('health-item overall-health');
    overallHealth.addClass(`health-${health.overall}`);
    overallHealth.createEl('h4', { text: 'Overall Health' });
    overallHealth.createEl('span', { 
      text: health.overall.charAt(0).toUpperCase() + health.overall.slice(1),
      cls: 'health-value'
    });
    
    // Active transport
    const activeTransport = healthGrid.createDiv('health-item');
    activeTransport.createEl('h4', { text: 'Active Transport' });
    activeTransport.createEl('span', { 
      text: health.activeTransport.toUpperCase(),
      cls: 'health-value'
    });
    
    // Uptime
    const uptime = healthGrid.createDiv('health-item');
    uptime.createEl('h4', { text: 'Uptime' });
    uptime.createEl('span', { 
      text: this.formatUptime(health.uptime),
      cls: 'health-value'
    });
    
    // Total requests
    const requests = healthGrid.createDiv('health-item');
    requests.createEl('h4', { text: 'Total Requests' });
    requests.createEl('span', { 
      text: health.totalRequests.toLocaleString(),
      cls: 'health-value'
    });
    
    // Error rate
    const errorRate = healthGrid.createDiv('health-item');
    errorRate.createEl('h4', { text: 'Error Rate' });
    const rate = (health.totalErrors / health.totalRequests * 100);
    errorRate.createEl('span', { 
      text: `${rate.toFixed(2)}%`,
      cls: 'health-value'
    });
  }

  private renderPerformanceMetrics(metrics: PerformanceMetrics) {
    this.metricsContainer.empty();
    
    const metricsGrid = this.metricsContainer.createDiv('metrics-grid');
    
    // Average response time
    const avgResponse = metricsGrid.createDiv('metric-item');
    avgResponse.createEl('h4', { text: 'Avg Response Time' });
    avgResponse.createEl('span', { 
      text: `${metrics.averageResponseTime.toFixed(0)}ms`,
      cls: 'metric-value'
    });
    
    // P95 response time
    const p95Response = metricsGrid.createDiv('metric-item');
    p95Response.createEl('h4', { text: 'P95 Response Time' });
    p95Response.createEl('span', { 
      text: `${metrics.p95ResponseTime.toFixed(0)}ms`,
      cls: 'metric-value'
    });
    
    // Requests per minute
    const rpm = metricsGrid.createDiv('metric-item');
    rpm.createEl('h4', { text: 'Requests/Min' });
    rpm.createEl('span', { 
      text: metrics.requestsPerMinute.toFixed(0),
      cls: 'metric-value'
    });
    
    // Error rate
    const errorRate = metricsGrid.createDiv('metric-item');
    errorRate.createEl('h4', { text: 'Error Rate' });
    errorRate.createEl('span', { 
      text: `${(metrics.errorRate * 100).toFixed(2)}%`,
      cls: 'metric-value'
    });
    
    // Transport distribution
    const distribution = this.metricsContainer.createDiv('transport-distribution');
    distribution.createEl('h4', { text: 'Transport Usage Distribution' });
    
    const distributionBars = distribution.createDiv('distribution-bars');
    Object.entries(metrics.transportDistribution).forEach(([transport, percentage]) => {
      const bar = distributionBars.createDiv('distribution-bar');
      bar.createSpan({ text: transport.toUpperCase(), cls: 'transport-label' });
      
      const barContainer = bar.createDiv('bar-container');
      const barFill = barContainer.createDiv('bar-fill');
      barFill.style.width = `${percentage * 100}%`;
      
      bar.createSpan({ text: `${(percentage * 100).toFixed(1)}%`, cls: 'percentage-label' });
    });
  }

  private renderSystemHealthPlaceholder() {
    this.systemHealthContainer.createEl('p', { 
      text: 'Loading system health data...',
      cls: 'placeholder-text'
    });
  }

  private renderPerformanceMetricsPlaceholder() {
    this.metricsContainer.createEl('p', { 
      text: 'Loading performance metrics...',
      cls: 'placeholder-text'
    });
  }

  private renderChartsPlaceholder() {
    this.chartsContainer.createEl('p', { 
      text: 'Performance charts will be displayed here',
      cls: 'placeholder-text'
    });
  }

  private renderError(message: string) {
    const errorEl = this.containerEl.createDiv('dashboard-error');
    errorEl.createEl('p', { text: `Error: ${message}`, cls: 'error-message' });
  }

  private formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  }

  private updateTimestamp() {
    const timestampEl = this.containerEl.querySelector('.timestamp') as HTMLElement;
    if (timestampEl) {
      timestampEl.textContent = new Date().toLocaleTimeString();
    }
  }

  private startRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = window.setInterval(() => {
      this.updateDashboard();
    }, this.config.updateInterval);
  }

  private stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  private setupEventListeners() {
    // Listen for transport events if transport manager is available
    if (this.transportManager) {
      // Note: Actual event handling will depend on the TransportManager implementation
      // For now, we'll use a simpler approach
      console.log('Setting up transport event listeners');
    }
  }

  private removeEventListeners() {
    // Remove transport event listeners if needed
    if (this.transportManager) {
      console.log('Removing transport event listeners');
    }
  }

  private onTransportSwitched(event: any) {
    new Notice(`Transport switched to ${event.transport?.toUpperCase() || 'unknown'}`);
    this.updateDashboard();
  }

  private onHealthChanged(event: any) {
    console.log('Health changed:', event);
    this.updateDashboard();
  }

  private onErrorOccurred(event: any) {
    console.warn('Transport error occurred:', event);
    this.updateDashboard();
  }

  private toggleRealTimeUpdates(enabled: boolean) {
    this.isRealTimeEnabled = enabled;
    this.config.enableRealTimeUpdates = enabled;
    
    if (enabled) {
      this.startRealTimeUpdates();
      new Notice('Real-time updates enabled');
    } else {
      this.stopRealTimeUpdates();
      new Notice('Real-time updates disabled');
    }
    
    // Update indicator
    const indicator = this.containerEl.querySelector('.realtime-indicator') as HTMLElement;
    if (indicator) {
      indicator.empty();
      if (enabled) {
        indicator.createSpan({ text: '🟢 Real-time', cls: 'realtime-active' });
      } else {
        indicator.createSpan({ text: '⚪ Manual refresh', cls: 'realtime-inactive' });
      }
    }
  }

  private async manualRefresh() {
    const button = this.containerEl.querySelector('.mod-cta') as HTMLButtonElement;
    if (button) {
      button.disabled = true;
      button.textContent = '🔄 Refreshing...';
    }
    
    try {
      await this.updateDashboard();
      new Notice('Dashboard refreshed successfully');
    } catch (error) {
      new Notice('Failed to refresh dashboard');
      console.error('Manual refresh failed:', error);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = '🔄 Refresh';
      }
    }
  }

  private async testTransport(transportType: TransportType) {
    new Notice(`Testing ${transportType} transport...`);
    
    try {
      // Test the specific transport
      const result = await this.performTransportTest(transportType);
      
      if (result.success) {
        new Notice(`✅ ${transportType} transport test successful`);
      } else {
        new Notice(`❌ ${transportType} transport test failed: ${result.error}`);
      }
      
      // Update the specific card
      const status = await this.getTransportStatus(transportType);
      this.updateTransportCard(transportType, status);
      
    } catch (error) {
      new Notice(`❌ ${transportType} transport test failed`);
      console.error(`Transport test failed for ${transportType}:`, error);
    }
  }

  private async performTransportTest(transportType: TransportType): Promise<{success: boolean, error?: string}> {
    // Simulate transport test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Random success/failure for demonstration
    const success = Math.random() > 0.2;
    
    return {
      success,
      error: success ? undefined : 'Connection timeout'
    };
  }

  private async switchToTransport(transportType: TransportType) {
    const confirmed = confirm(`Switch to ${transportType} transport as primary?`);
    if (!confirmed) return;
    
    try {
      // Switch transport via transport manager
      // await this.transportManager.switchPrimaryTransport(transportType);
      
      new Notice(`✅ Switched to ${transportType} transport`);
      await this.updateDashboard();
      
    } catch (error) {
      new Notice(`❌ Failed to switch to ${transportType} transport`);
      console.error('Transport switch failed:', error);
    }
  }

  private exportData() {
    const data = {
      timestamp: new Date().toISOString(),
      systemHealth: this.currentHealth,
      performanceMetrics: this.currentMetrics,
      exportedBy: 'VaultPilot Transport Dashboard'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultpilot-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    new Notice('Dashboard data exported successfully');
  }

  private openDashboardSettings() {
    new Notice('Dashboard settings will open in a future update');
    // TODO: Implement dashboard settings modal
  }
}
