# 🔍 Phase 3 Code Integration Guide

## 🎯 Quick Integration Reference

This guide provides specific code examples and integration patterns for Phase 3 development, building on the robust Phase 2 transport infrastructure.

---

## 🏗️ Core Integration Points

### 1. Transport Manager Integration

#### Access Central Transport Management:
```typescript
import { TransportManager } from '../devpipe/TransportManager';

// Get singleton instance
const transportManager = TransportManager.getInstance();

// Access real-time metrics for dashboard
const systemHealth = transportManager.getSystemHealth();
const performanceMetrics = transportManager.getPerformanceMetrics();

// Example: Real-time status component
export class TransportStatusIndicator {
  private updateInterval: NodeJS.Timeout;
  
  constructor(private containerEl: HTMLElement) {
    this.startRealTimeUpdates();
  }
  
  private startRealTimeUpdates() {
    this.updateInterval = setInterval(() => {
      const health = transportManager.getSystemHealth();
      this.updateUI(health);
    }, 1000); // Update every second
  }
  
  private updateUI(health: SystemHealth) {
    const statusEl = this.containerEl.querySelector('.transport-status');
    statusEl.removeClass('healthy', 'degraded', 'unhealthy');
    statusEl.addClass(health.overall.toLowerCase());
    statusEl.textContent = `Transport Status: ${health.overall}`;
  }
}
```

### 2. Enhanced Model Selection Integration

#### Access Enhanced Service Features:
```typescript
import { EnhancedModelSelectionService } from '../services/EnhancedModelSelectionService';

// Initialize enhanced service
const modelService = new EnhancedModelSelectionService();

// Get performance insights for analytics dashboard
const insights = modelService.getPerformanceInsights();
const transportMetrics = modelService.getTransportMetrics();

// Example: Performance analytics component
export class PerformanceAnalyticsPanel {
  constructor(private containerEl: HTMLElement) {
    this.renderAnalytics();
  }
  
  private async renderAnalytics() {
    const insights = await modelService.getPerformanceInsights();
    
    // Render transport performance chart
    this.renderTransportChart(insights.transportPerformance);
    
    // Render error rate trends
    this.renderErrorTrends(insights.errorTrends);
    
    // Render optimization suggestions
    this.renderSuggestions(insights.optimizationSuggestions);
  }
}
```

---

## 🎨 UI Component Patterns

### 1. Onboarding Wizard Implementation

```typescript
import { Modal, Setting } from 'obsidian';
import { TransportManager } from '../devpipe/TransportManager';

export class OnboardingWizard extends Modal {
  private currentStep = 0;
  private totalSteps = 4;
  private detectedCapabilities: EnvironmentCapabilities;
  private recommendedConfig: TransportConfig;
  
  constructor(app: App) {
    super(app);
    this.modalEl.addClass('vaultpilot-onboarding');
  }
  
  async onOpen() {
    // Step 1: Environment detection
    this.detectedCapabilities = await this.detectEnvironment();
    this.renderCurrentStep();
  }
  
  private async detectEnvironment(): Promise<EnvironmentCapabilities> {
    const transportManager = TransportManager.getInstance();
    
    return {
      hasWebSocket: await this.testWebSocketSupport(),
      hasFileSystem: await this.testFileSystemAccess(),
      hasHTTP: await this.testHTTPConnectivity(),
      recommendedTransport: transportManager.getRecommendedTransport()
    };
  }
  
  private renderCurrentStep() {
    const { contentEl } = this;
    contentEl.empty();
    
    // Progress indicator
    this.renderProgressIndicator();
    
    switch (this.currentStep) {
      case 0:
        this.renderWelcomeStep();
        break;
      case 1:
        this.renderEnvironmentStep();
        break;
      case 2:
        this.renderPreferencesStep();
        break;
      case 3:
        this.renderCompletionStep();
        break;
    }
  }
  
  private renderEnvironmentStep() {
    const { contentEl } = this;
    
    contentEl.createEl('h2', { text: 'Environment Analysis' });
    
    // Show detected capabilities
    const capabilitiesEl = contentEl.createDiv('capabilities-grid');
    
    Object.entries(this.detectedCapabilities).forEach(([key, value]) => {
      const capEl = capabilitiesEl.createDiv('capability-item');
      capEl.createEl('span', { text: key, cls: 'capability-name' });
      capEl.createEl('span', { 
        text: value ? '✅ Available' : '❌ Unavailable',
        cls: `capability-status ${value ? 'available' : 'unavailable'}`
      });
    });
    
    // Show recommendations
    this.renderRecommendations();
  }
}
```

### 2. Real-time Dashboard Component

```typescript
export class TransportDashboard {
  private metricsUpdateInterval: NodeJS.Timeout;
  private charts: Map<string, Chart> = new Map();
  
  constructor(private containerEl: HTMLElement) {
    this.initializeDashboard();
    this.startRealTimeUpdates();
  }
  
  private initializeDashboard() {
    const dashboardEl = this.containerEl.createDiv('transport-dashboard');
    
    // Health indicators
    const healthSection = dashboardEl.createDiv('health-section');
    this.renderHealthIndicators(healthSection);
    
    // Performance charts
    const chartsSection = dashboardEl.createDiv('charts-section');
    this.renderPerformanceCharts(chartsSection);
    
    // Transport details
    const detailsSection = dashboardEl.createDiv('details-section');
    this.renderTransportDetails(detailsSection);
  }
  
  private startRealTimeUpdates() {
    this.metricsUpdateInterval = setInterval(async () => {
      const transportManager = TransportManager.getInstance();
      const metrics = transportManager.getPerformanceMetrics();
      
      this.updateHealthIndicators(metrics);
      this.updatePerformanceCharts(metrics);
      this.updateTransportDetails(metrics);
    }, 2000); // Update every 2 seconds
  }
  
  private renderHealthIndicators(containerEl: HTMLElement) {
    const transportManager = TransportManager.getInstance();
    const health = transportManager.getSystemHealth();
    
    const indicatorGrid = containerEl.createDiv('health-indicators');
    
    Object.entries(health.transports).forEach(([name, status]) => {
      const indicator = indicatorGrid.createDiv('health-indicator');
      indicator.addClass(`health-${status.toLowerCase()}`);
      
      indicator.createEl('div', { text: name, cls: 'transport-name' });
      indicator.createEl('div', { text: status, cls: 'health-status' });
      
      // Add pulse animation for active transports
      if (status === 'HEALTHY') {
        indicator.addClass('pulse');
      }
    });
  }
}
```

### 3. Settings Manager with Visual Configuration

```typescript
export class VaultPilotSettingsManager {
  private settings: VaultPilotSettings;
  private transportManager: TransportManager;
  
  constructor(private plugin: VaultPilotPlugin) {
    this.transportManager = TransportManager.getInstance();
    this.settings = plugin.settings;
  }
  
  renderSettings(containerEl: HTMLElement) {
    containerEl.empty();
    
    // Transport configuration section
    this.renderTransportSettings(containerEl);
    
    // Performance tuning section
    this.renderPerformanceSettings(containerEl);
    
    // Advanced options section
    this.renderAdvancedSettings(containerEl);
  }
  
  private renderTransportSettings(containerEl: HTMLElement) {
    const transportSection = containerEl.createDiv('settings-section');
    transportSection.createEl('h3', { text: 'Transport Configuration' });
    
    // Transport priority settings
    new Setting(transportSection)
      .setName('Primary Transport')
      .setDesc('Preferred transport method for communication')
      .addDropdown(dropdown => {
        dropdown
          .addOption('auto', 'Auto-select (Recommended)')
          .addOption('websocket', 'WebSocket')
          .addOption('http', 'HTTP')
          .addOption('filesystem', 'File System')
          .setValue(this.settings.primaryTransport)
          .onChange(async (value) => {
            this.settings.primaryTransport = value;
            await this.plugin.saveSettings();
            this.updateTransportConfiguration();
          });
      });
    
    // Connection timeout settings
    new Setting(transportSection)
      .setName('Connection Timeout')
      .setDesc('Maximum time to wait for transport connection (seconds)')
      .addSlider(slider => {
        slider
          .setLimits(5, 60, 5)
          .setValue(this.settings.connectionTimeout)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.settings.connectionTimeout = value;
            await this.plugin.saveSettings();
            this.updateTransportConfiguration();
          });
      });
  }
  
  private async updateTransportConfiguration() {
    // Apply new settings to transport manager
    await this.transportManager.updateConfiguration({
      primaryTransport: this.settings.primaryTransport,
      connectionTimeout: this.settings.connectionTimeout,
      enableFailover: this.settings.enableFailover,
      healthCheckInterval: this.settings.healthCheckInterval
    });
    
    // Show confirmation
    new Notice('Transport configuration updated successfully');
  }
}
```

---

## 📊 Analytics Integration Patterns

### 1. Performance Metrics Collection

```typescript
export class PerformanceAnalytics {
  private metricsCollector: MetricsCollector;
  
  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.startMetricsCollection();
  }
  
  private startMetricsCollection() {
    const transportManager = TransportManager.getInstance();
    
    // Collect metrics every minute
    setInterval(() => {
      const metrics = transportManager.getPerformanceMetrics();
      this.metricsCollector.record(metrics);
    }, 60000);
  }
  
  generateInsights(): AnalyticsInsights {
    const recentMetrics = this.metricsCollector.getRecentMetrics(24 * 60); // 24 hours
    
    return {
      performanceTrends: this.analyzePerformanceTrends(recentMetrics),
      transportEfficiency: this.analyzeTransportEfficiency(recentMetrics),
      optimizationOpportunities: this.identifyOptimizations(recentMetrics),
      usagePatterns: this.analyzeUsagePatterns(recentMetrics)
    };
  }
  
  private analyzePerformanceTrends(metrics: PerformanceMetrics[]): TrendAnalysis {
    // Analyze response time trends
    const responseTimes = metrics.map(m => m.averageLatency);
    const trend = this.calculateTrend(responseTimes);
    
    return {
      direction: trend > 0 ? 'improving' : trend < 0 ? 'degrading' : 'stable',
      magnitude: Math.abs(trend),
      confidence: this.calculateConfidence(responseTimes),
      recommendations: this.generateTrendRecommendations(trend)
    };
  }
}
```

### 2. Error Tracking and Resolution

```typescript
export class ErrorTrackingSystem {
  private errorHistory: ErrorRecord[] = [];
  
  trackError(error: TransportError, context: ErrorContext) {
    const errorRecord: ErrorRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: error.type,
      transport: context.transport,
      message: error.message,
      stack: error.stack,
      context: context,
      resolution: null
    };
    
    this.errorHistory.push(errorRecord);
    this.analyzeErrorPattern(errorRecord);
  }
  
  getResolutionSuggestions(error: TransportError): ResolutionSuggestion[] {
    const similarErrors = this.findSimilarErrors(error);
    const successfulResolutions = similarErrors
      .filter(e => e.resolution?.success)
      .map(e => e.resolution);
    
    return this.generateSuggestions(error, successfulResolutions);
  }
  
  private generateSuggestions(
    error: TransportError, 
    resolutions: ErrorResolution[]
  ): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = [];
    
    switch (error.type) {
      case 'CONNECTION_TIMEOUT':
        suggestions.push({
          action: 'increase_timeout',
          description: 'Increase connection timeout setting',
          confidence: 0.8,
          automated: true
        });
        break;
        
      case 'TRANSPORT_UNAVAILABLE':
        suggestions.push({
          action: 'switch_transport',
          description: 'Switch to alternative transport method',
          confidence: 0.9,
          automated: true
        });
        break;
    }
    
    return suggestions;
  }
}
```

---

## 🎯 Event System Integration

### 1. Real-time Event Handling

```typescript
export class EventManager {
  private eventBus = new EventEmitter();
  
  constructor() {
    this.setupTransportEventListeners();
  }
  
  private setupTransportEventListeners() {
    const transportManager = TransportManager.getInstance();
    
    // Listen for transport health changes
    transportManager.on('healthChange', (event: HealthChangeEvent) => {
      this.eventBus.emit('transport:health', event);
    });
    
    // Listen for performance threshold breaches
    transportManager.on('performanceAlert', (event: PerformanceAlertEvent) => {
      this.eventBus.emit('performance:alert', event);
    });
    
    // Listen for transport failover events
    transportManager.on('failover', (event: FailoverEvent) => {
      this.eventBus.emit('transport:failover', event);
    });
  }
  
  // UI components can subscribe to events
  onTransportHealthChange(callback: (event: HealthChangeEvent) => void) {
    this.eventBus.on('transport:health', callback);
  }
  
  onPerformanceAlert(callback: (event: PerformanceAlertEvent) => void) {
    this.eventBus.on('performance:alert', callback);
  }
}
```

### 2. User Notification System

```typescript
export class NotificationManager {
  private eventManager: EventManager;
  
  constructor(eventManager: EventManager) {
    this.eventManager = eventManager;
    this.setupNotificationHandlers();
  }
  
  private setupNotificationHandlers() {
    // Handle transport health changes
    this.eventManager.onTransportHealthChange((event) => {
      if (event.previousHealth === 'HEALTHY' && event.currentHealth === 'UNHEALTHY') {
        new Notice('⚠️ Transport connection lost. Attempting failover...', 5000);
      } else if (event.previousHealth === 'UNHEALTHY' && event.currentHealth === 'HEALTHY') {
        new Notice('✅ Transport connection restored', 3000);
      }
    });
    
    // Handle performance alerts
    this.eventManager.onPerformanceAlert((event) => {
      const message = `🐌 Performance degraded: ${event.metric} is ${event.value}ms (threshold: ${event.threshold}ms)`;
      new Notice(message, 8000);
    });
  }
}
```

---

## 🚀 Quick Start Template

### Complete Component Template:

```typescript
import { Component, Modal, Setting, Notice } from 'obsidian';
import { TransportManager } from '../devpipe/TransportManager';
import { EnhancedModelSelectionService } from '../services/EnhancedModelSelectionService';

export class VaultPilotComponent extends Component {
  private transportManager: TransportManager;
  private modelService: EnhancedModelSelectionService;
  private eventManager: EventManager;
  
  constructor(private containerEl: HTMLElement) {
    super();
    this.initializeServices();
  }
  
  private initializeServices() {
    this.transportManager = TransportManager.getInstance();
    this.modelService = new EnhancedModelSelectionService();
    this.eventManager = new EventManager();
  }
  
  onload() {
    this.render();
    this.setupEventListeners();
    this.startRealTimeUpdates();
  }
  
  onunload() {
    this.cleanup();
  }
  
  private render() {
    this.containerEl.empty();
    this.containerEl.addClass('vaultpilot-component');
    
    // Render your component UI here
    this.renderHeader();
    this.renderContent();
    this.renderFooter();
  }
  
  private setupEventListeners() {
    // Setup event listeners for real-time updates
    this.eventManager.onTransportHealthChange((event) => {
      this.handleHealthChange(event);
    });
  }
  
  private startRealTimeUpdates() {
    // Start any real-time update intervals
    this.registerInterval(
      window.setInterval(() => {
        this.updateMetrics();
      }, 2000)
    );
  }
  
  private async updateMetrics() {
    const metrics = this.transportManager.getPerformanceMetrics();
    const health = this.transportManager.getSystemHealth();
    
    // Update UI with new metrics
    this.updateUI(metrics, health);
  }
}
```

This integration guide provides concrete code examples for Phase 3 development, building on the robust Phase 2 infrastructure. All examples are ready to use and follow Obsidian plugin development best practices.
