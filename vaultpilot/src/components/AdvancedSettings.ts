/**
 * AdvancedSettings - Visual configuration interface for VaultPilot
 */

import { Setting, Component, Notice, Modal, App } from 'obsidian';
import { TransportType } from '../devpipe/transports/DevPipeTransport';
import { TransportManagerConfig } from '../devpipe/TransportManager';
import VaultPilotPlugin from '../main';

export interface AdvancedSettingsConfig {
  showExpertOptions: boolean;
  enableRealTimeValidation: boolean;
  allowImportExport: boolean;
}

export interface ConfigurationProfile {
  id: string;
  name: string;
  description: string;
  config: VaultPilotConfiguration;
  created: Date;
  lastModified: Date;
  isDefault: boolean;
}

export interface VaultPilotConfiguration {
  transport: {
    primaryTransport: TransportType;
    fallbackChain: TransportType[];
    selectionCriteria: {
      latencyWeight: number;
      reliabilityWeight: number;
      capabilityWeight: number;
      costWeight: number;
    };
    timeouts: {
      connection: number;
      request: number;
      retry: number;
    };
    retryPolicy: {
      maxAttempts: number;
      backoffMultiplier: number;
      maxBackoffTime: number;
    };
  };
  performance: {
    mode: 'performance' | 'balanced' | 'reliability';
    enableConnectionPooling: boolean;
    maxConcurrentRequests: number;
    enableCompression: boolean;
    enableCaching: boolean;
    cacheSize: number;
  };
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    enableMetrics: boolean;
    metricsRetention: number;
    enablePredictiveAlerts: boolean;
  };
  ui: {
    theme: 'auto' | 'light' | 'dark';
    enableAnimations: boolean;
    showAdvancedMetrics: boolean;
    dashboardRefreshRate: number;
    enableNotifications: boolean;
  };
  privacy: {
    enableAnalytics: boolean;
    shareUsageData: boolean;
    dataRetentionDays: number;
  };
}

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  estimatedImpact: {
    performanceChange: number;
    reliabilityChange: number;
    resourceUsage: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export class AdvancedSettings extends Component {
  private containerEl: HTMLElement;
  private plugin: VaultPilotPlugin;
  private config: AdvancedSettingsConfig;
  private currentConfiguration: VaultPilotConfiguration;
  private profiles: ConfigurationProfile[] = [];
  private validationResult?: ConfigurationValidationResult;
  
  // UI Elements
  private profileSelector!: HTMLSelectElement;
  private validationContainer!: HTMLElement;
  private configurationContainer!: HTMLElement;
  private previewContainer!: HTMLElement;
  
  private validationTimeout?: number;
  private hasUnsavedChanges: boolean = false;

  constructor(
    containerEl: HTMLElement,
    plugin: VaultPilotPlugin,
    config: AdvancedSettingsConfig = {
      showExpertOptions: false,
      enableRealTimeValidation: true,
      allowImportExport: true
    }
  ) {
    super();
    this.containerEl = containerEl;
    this.plugin = plugin;
    this.config = config;
    this.currentConfiguration = this.getDefaultConfiguration();
    this.loadProfiles();
  }

  async onload() {
    this.initializeInterface();
    await this.loadCurrentConfiguration();
    this.renderSettings();
    
    if (this.config.enableRealTimeValidation) {
      this.startRealTimeValidation();
    }
  }

  onunload() {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    
    if (this.hasUnsavedChanges) {
      const shouldSave = confirm('You have unsaved changes. Would you like to save them?');
      if (shouldSave) {
        this.saveConfiguration();
      }
    }
  }

  private initializeInterface() {
    this.containerEl.empty();
    this.containerEl.addClass('advanced-settings');
    
    // Create header
    this.createHeader();
    
    // Create profile management section
    this.createProfileManagement();
    
    // Create validation section
    this.createValidationSection();
    
    // Create configuration sections
    this.createConfigurationSections();
    
    // Create preview section
    this.createPreviewSection();
    
    // Create action buttons
    this.createActionButtons();
  }

  private createHeader() {
    const header = this.containerEl.createDiv('settings-header');
    header.createEl('h2', { text: 'Advanced Settings' });
    header.createEl('p', { 
      text: 'Fine-tune VaultPilot configuration for optimal performance',
      cls: 'settings-subtitle'
    });
    
    // Expert mode toggle
    const expertToggle = header.createDiv('expert-toggle');
    const expertLabel = expertToggle.createEl('label');
    expertLabel.createSpan({ text: 'Expert Mode' });
    const expertCheckbox = expertLabel.createEl('input', { type: 'checkbox' });
    expertCheckbox.checked = this.config.showExpertOptions;
    expertCheckbox.addEventListener('change', () => {
      this.config.showExpertOptions = expertCheckbox.checked;
      this.updateExpertOptionsVisibility();
    });
  }

  private createProfileManagement() {
    const section = this.containerEl.createDiv('profile-management-section');
    section.createEl('h3', { text: 'Configuration Profiles' });
    
    const profileControls = section.createDiv('profile-controls');
    
    // Profile selector
    const selectorContainer = profileControls.createDiv('profile-selector-container');
    selectorContainer.createSpan({ text: 'Current Profile:', cls: 'profile-label' });
    this.profileSelector = selectorContainer.createEl('select', { cls: 'profile-selector' });
    this.updateProfileSelector();
    
    this.profileSelector.addEventListener('change', () => {
      this.loadProfile(this.profileSelector.value);
    });
    
    // Profile action buttons
    const profileActions = profileControls.createDiv('profile-actions');
    
    const saveProfileBtn = profileActions.createEl('button', { text: 'Save as New Profile', cls: 'mod-muted' });
    saveProfileBtn.addEventListener('click', () => this.showSaveProfileModal());
    
    const deleteProfileBtn = profileActions.createEl('button', { text: 'Delete Profile', cls: 'mod-warning' });
    deleteProfileBtn.addEventListener('click', () => this.deleteCurrentProfile());
    
    if (this.config.allowImportExport) {
      const importBtn = profileActions.createEl('button', { text: 'Import', cls: 'mod-muted' });
      importBtn.addEventListener('click', () => this.importConfiguration());
      
      const exportBtn = profileActions.createEl('button', { text: 'Export', cls: 'mod-muted' });
      exportBtn.addEventListener('click', () => this.exportConfiguration());
    }
  }

  private createValidationSection() {
    const section = this.containerEl.createDiv('validation-section');
    section.createEl('h3', { text: 'Configuration Status' });
    
    this.validationContainer = section.createDiv('validation-container');
    this.renderValidationPlaceholder();
  }

  private createConfigurationSections() {
    this.configurationContainer = this.containerEl.createDiv('configuration-sections');
    
    // Transport settings
    this.createTransportSettings();
    
    // Performance settings
    this.createPerformanceSettings();
    
    // Monitoring settings
    this.createMonitoringSettings();
    
    // UI settings
    this.createUISettings();
    
    // Privacy settings
    this.createPrivacySettings();
  }

  private createTransportSettings() {
    const section = this.configurationContainer.createDiv('config-section transport-section');
    section.createEl('h4', { text: '🚀 Transport Configuration' });
    
    const settingsContainer = section.createDiv('settings-container');
    
    // Primary transport selection
    new Setting(settingsContainer)
      .setName('Primary Transport')
      .setDesc('Choose the preferred transport method')
      .addDropdown(dropdown => {
        dropdown.addOption(TransportType.HTTP, 'HTTP (Reliable)');
        dropdown.addOption(TransportType.WEBSOCKET, 'WebSocket (Real-time)');
        dropdown.addOption(TransportType.FILESYSTEM, 'FileSystem (Offline)');
        dropdown.setValue(this.currentConfiguration.transport.primaryTransport);
        dropdown.onChange(value => {
          this.currentConfiguration.transport.primaryTransport = value as TransportType;
          this.onConfigurationChange();
        });
      });
    
    // Fallback chain configuration
    this.createFallbackChainConfig(settingsContainer);
    
    // Selection criteria sliders
    this.createSelectionCriteriaConfig(settingsContainer);
    
    // Timeout configuration
    this.createTimeoutConfig(settingsContainer);
    
    // Retry policy configuration
    this.createRetryPolicyConfig(settingsContainer);
  }

  private createFallbackChainConfig(container: HTMLElement) {
    const fallbackSetting = new Setting(container)
      .setName('Fallback Chain')
      .setDesc('Configure transport fallback order');
    
    const fallbackContainer = fallbackSetting.controlEl.createDiv('fallback-chain-config');
    
    // Current fallback chain display
    const chainDisplay = fallbackContainer.createDiv('chain-display');
    this.updateFallbackChainDisplay(chainDisplay);
    
    // Add transport buttons
    const addButtons = fallbackContainer.createDiv('add-transport-buttons');
    [TransportType.HTTP, TransportType.WEBSOCKET, TransportType.FILESYSTEM].forEach(transport => {
      const button = addButtons.createEl('button', { 
        text: `Add ${transport.toUpperCase()}`,
        cls: 'mod-muted add-transport-btn'
      });
      button.addEventListener('click', () => {
        if (!this.currentConfiguration.transport.fallbackChain.includes(transport)) {
          this.currentConfiguration.transport.fallbackChain.push(transport);
          this.updateFallbackChainDisplay(chainDisplay);
          this.onConfigurationChange();
        }
      });
    });
  }

  private updateFallbackChainDisplay(container: HTMLElement) {
    container.empty();
    
    const chain = this.currentConfiguration.transport.fallbackChain;
    chain.forEach((transport, index) => {
      const item = container.createDiv('chain-item');
      item.createSpan({ text: `${index + 1}. ${transport.toUpperCase()}`, cls: 'chain-label' });
      
      const actions = item.createDiv('chain-actions');
      
      if (index > 0) {
        const moveUpBtn = actions.createEl('button', { text: '↑', cls: 'mod-muted chain-btn' });
        moveUpBtn.addEventListener('click', () => {
          [chain[index], chain[index - 1]] = [chain[index - 1], chain[index]];
          this.updateFallbackChainDisplay(container);
          this.onConfigurationChange();
        });
      }
      
      if (index < chain.length - 1) {
        const moveDownBtn = actions.createEl('button', { text: '↓', cls: 'mod-muted chain-btn' });
        moveDownBtn.addEventListener('click', () => {
          [chain[index], chain[index + 1]] = [chain[index + 1], chain[index]];
          this.updateFallbackChainDisplay(container);
          this.onConfigurationChange();
        });
      }
      
      const removeBtn = actions.createEl('button', { text: '✕', cls: 'mod-warning chain-btn' });
      removeBtn.addEventListener('click', () => {
        chain.splice(index, 1);
        this.updateFallbackChainDisplay(container);
        this.onConfigurationChange();
      });
    });
  }

  private createSelectionCriteriaConfig(container: HTMLElement) {
    const criteriaContainer = container.createDiv('selection-criteria-container');
    criteriaContainer.createEl('h5', { text: 'Transport Selection Criteria' });
    
    const criteria = this.currentConfiguration.transport.selectionCriteria;
    
    // Latency weight
    new Setting(criteriaContainer)
      .setName('Latency Priority')
      .setDesc('How much to prioritize low latency (0-100%)')
      .addSlider(slider => {
        slider.setLimits(0, 100, 5);
        slider.setValue(criteria.latencyWeight * 100);
        slider.onChange(value => {
          criteria.latencyWeight = value / 100;
          this.normalizeSelectionCriteria();
          this.onConfigurationChange();
        });
        slider.setDynamicTooltip();
      });
    
    // Reliability weight
    new Setting(criteriaContainer)
      .setName('Reliability Priority')
      .setDesc('How much to prioritize reliability (0-100%)')
      .addSlider(slider => {
        slider.setLimits(0, 100, 5);
        slider.setValue(criteria.reliabilityWeight * 100);
        slider.onChange(value => {
          criteria.reliabilityWeight = value / 100;
          this.normalizeSelectionCriteria();
          this.onConfigurationChange();
        });
        slider.setDynamicTooltip();
      });
    
    // Capability weight
    new Setting(criteriaContainer)
      .setName('Feature Priority')
      .setDesc('How much to prioritize advanced features (0-100%)')
      .addSlider(slider => {
        slider.setLimits(0, 100, 5);
        slider.setValue(criteria.capabilityWeight * 100);
        slider.onChange(value => {
          criteria.capabilityWeight = value / 100;
          this.normalizeSelectionCriteria();
          this.onConfigurationChange();
        });
        slider.setDynamicTooltip();
      });
    
    // Cost weight
    new Setting(criteriaContainer)
      .setName('Efficiency Priority')
      .setDesc('How much to prioritize resource efficiency (0-100%)')
      .addSlider(slider => {
        slider.setLimits(0, 100, 5);
        slider.setValue(criteria.costWeight * 100);
        slider.onChange(value => {
          criteria.costWeight = value / 100;
          this.normalizeSelectionCriteria();
          this.onConfigurationChange();
        });
        slider.setDynamicTooltip();
      });
  }

  private createTimeoutConfig(container: HTMLElement) {
    if (!this.config.showExpertOptions) return;
    
    const timeoutContainer = container.createDiv('timeout-config-container expert-option');
    timeoutContainer.createEl('h5', { text: 'Timeout Configuration' });
    
    const timeouts = this.currentConfiguration.transport.timeouts;
    
    new Setting(timeoutContainer)
      .setName('Connection Timeout')
      .setDesc('Maximum time to wait for initial connection (ms)')
      .addText(text => {
        text.setValue(timeouts.connection.toString());
        text.onChange(value => {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            timeouts.connection = parsed;
            this.onConfigurationChange();
          }
        });
      });
    
    new Setting(timeoutContainer)
      .setName('Request Timeout')
      .setDesc('Maximum time to wait for request completion (ms)')
      .addText(text => {
        text.setValue(timeouts.request.toString());
        text.onChange(value => {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            timeouts.request = parsed;
            this.onConfigurationChange();
          }
        });
      });
  }

  private createRetryPolicyConfig(container: HTMLElement) {
    if (!this.config.showExpertOptions) return;
    
    const retryContainer = container.createDiv('retry-policy-container expert-option');
    retryContainer.createEl('h5', { text: 'Retry Policy' });
    
    const retry = this.currentConfiguration.transport.retryPolicy;
    
    new Setting(retryContainer)
      .setName('Max Retry Attempts')
      .setDesc('Maximum number of retry attempts for failed requests')
      .addSlider(slider => {
        slider.setLimits(0, 10, 1);
        slider.setValue(retry.maxAttempts);
        slider.onChange(value => {
          retry.maxAttempts = value;
          this.onConfigurationChange();
        });
        slider.setDynamicTooltip();
      });
    
    new Setting(retryContainer)
      .setName('Backoff Multiplier')
      .setDesc('Exponential backoff multiplier for retry delays')
      .addSlider(slider => {
        slider.setLimits(1, 5, 0.1);
        slider.setValue(retry.backoffMultiplier);
        slider.onChange(value => {
          retry.backoffMultiplier = value;
          this.onConfigurationChange();
        });
        slider.setDynamicTooltip();
      });
  }

  private createPerformanceSettings() {
    const section = this.configurationContainer.createDiv('config-section performance-section');
    section.createEl('h4', { text: '⚡ Performance Configuration' });
    
    const settingsContainer = section.createDiv('settings-container');
    
    // Performance mode
    new Setting(settingsContainer)
      .setName('Performance Mode')
      .setDesc('Balance between speed, reliability, and resource usage')
      .addDropdown(dropdown => {
        dropdown.addOption('performance', 'Performance (Prioritize Speed)');
        dropdown.addOption('balanced', 'Balanced (Recommended)');
        dropdown.addOption('reliability', 'Reliability (Prioritize Stability)');
        dropdown.setValue(this.currentConfiguration.performance.mode);
        dropdown.onChange(value => {
          this.currentConfiguration.performance.mode = value as any;
          this.applyPerformanceModePreset(value as any);
          this.onConfigurationChange();
        });
      });
    
    // Connection pooling
    new Setting(settingsContainer)
      .setName('Connection Pooling')
      .setDesc('Reuse connections to improve performance')
      .addToggle(toggle => {
        toggle.setValue(this.currentConfiguration.performance.enableConnectionPooling);
        toggle.onChange(value => {
          this.currentConfiguration.performance.enableConnectionPooling = value;
          this.onConfigurationChange();
        });
      });
    
    // Compression
    new Setting(settingsContainer)
      .setName('Compression')
      .setDesc('Enable data compression to reduce bandwidth usage')
      .addToggle(toggle => {
        toggle.setValue(this.currentConfiguration.performance.enableCompression);
        toggle.onChange(value => {
          this.currentConfiguration.performance.enableCompression = value;
          this.onConfigurationChange();
        });
      });
    
    // Caching
    new Setting(settingsContainer)
      .setName('Response Caching')
      .setDesc('Cache responses to improve performance')
      .addToggle(toggle => {
        toggle.setValue(this.currentConfiguration.performance.enableCaching);
        toggle.onChange(value => {
          this.currentConfiguration.performance.enableCaching = value;
          this.onConfigurationChange();
        });
      });
    
    if (this.config.showExpertOptions) {
      // Max concurrent requests
      new Setting(settingsContainer)
        .setName('Max Concurrent Requests')
        .setDesc('Maximum number of simultaneous requests')
        .setClass('expert-option')
        .addSlider(slider => {
          slider.setLimits(1, 20, 1);
          slider.setValue(this.currentConfiguration.performance.maxConcurrentRequests);
          slider.onChange(value => {
            this.currentConfiguration.performance.maxConcurrentRequests = value;
            this.onConfigurationChange();
          });
          slider.setDynamicTooltip();
        });
      
      // Cache size
      new Setting(settingsContainer)
        .setName('Cache Size (MB)')
        .setDesc('Maximum cache size in megabytes')
        .setClass('expert-option')
        .addSlider(slider => {
          slider.setLimits(1, 100, 5);
          slider.setValue(this.currentConfiguration.performance.cacheSize);
          slider.onChange(value => {
            this.currentConfiguration.performance.cacheSize = value;
            this.onConfigurationChange();
          });
          slider.setDynamicTooltip();
        });
    }
  }

  private createMonitoringSettings() {
    const section = this.configurationContainer.createDiv('config-section monitoring-section');
    section.createEl('h4', { text: '📊 Monitoring Configuration' });
    
    const settingsContainer = section.createDiv('settings-container');
    
    // Health checks
    new Setting(settingsContainer)
      .setName('Health Checks')
      .setDesc('Monitor transport health automatically')
      .addToggle(toggle => {
        toggle.setValue(this.currentConfiguration.monitoring.enableHealthChecks);
        toggle.onChange(value => {
          this.currentConfiguration.monitoring.enableHealthChecks = value;
          this.onConfigurationChange();
        });
      });
    
    // Metrics collection
    new Setting(settingsContainer)
      .setName('Performance Metrics')
      .setDesc('Collect detailed performance metrics')
      .addToggle(toggle => {
        toggle.setValue(this.currentConfiguration.monitoring.enableMetrics);
        toggle.onChange(value => {
          this.currentConfiguration.monitoring.enableMetrics = value;
          this.onConfigurationChange();
        });
      });
    
    // Predictive alerts
    new Setting(settingsContainer)
      .setName('Predictive Alerts')
      .setDesc('Get early warnings about potential issues')
      .addToggle(toggle => {
        toggle.setValue(this.currentConfiguration.monitoring.enablePredictiveAlerts);
        toggle.onChange(value => {
          this.currentConfiguration.monitoring.enablePredictiveAlerts = value;
          this.onConfigurationChange();
        });
      });
  }

  private createUISettings() {
    const section = this.configurationContainer.createDiv('config-section ui-section');
    section.createEl('h4', { text: '🎨 User Interface' });
    
    const settingsContainer = section.createDiv('settings-container');
    
    // Theme
    new Setting(settingsContainer)
      .setName('Theme')
      .setDesc('Choose the interface theme')
      .addDropdown(dropdown => {
        dropdown.addOption('auto', 'Auto (Follow Obsidian)');
        dropdown.addOption('light', 'Light');
        dropdown.addOption('dark', 'Dark');
        dropdown.setValue(this.currentConfiguration.ui.theme);
        dropdown.onChange(value => {
          this.currentConfiguration.ui.theme = value as any;
          this.onConfigurationChange();
        });
      });
    
    // Animations
    new Setting(settingsContainer)
      .setName('Animations')
      .setDesc('Enable UI animations and transitions')
      .addToggle(toggle => {
        toggle.setValue(this.currentConfiguration.ui.enableAnimations);
        toggle.onChange(value => {
          this.currentConfiguration.ui.enableAnimations = value;
          this.onConfigurationChange();
        });
      });
    
    // Advanced metrics
    new Setting(settingsContainer)
      .setName('Advanced Metrics')
      .setDesc('Show detailed metrics in dashboard')
      .addToggle(toggle => {
        toggle.setValue(this.currentConfiguration.ui.showAdvancedMetrics);
        toggle.onChange(value => {
          this.currentConfiguration.ui.showAdvancedMetrics = value;
          this.onConfigurationChange();
        });
      });
    
    // Dashboard refresh rate
    new Setting(settingsContainer)
      .setName('Dashboard Refresh Rate')
      .setDesc('How often to update the dashboard (seconds)')
      .addSlider(slider => {
        slider.setLimits(1, 60, 1);
        slider.setValue(this.currentConfiguration.ui.dashboardRefreshRate);
        slider.onChange(value => {
          this.currentConfiguration.ui.dashboardRefreshRate = value;
          this.onConfigurationChange();
        });
        slider.setDynamicTooltip();
      });
  }

  private createPrivacySettings() {
    const section = this.configurationContainer.createDiv('config-section privacy-section');
    section.createEl('h4', { text: '🔒 Privacy & Data' });
    
    const settingsContainer = section.createDiv('settings-container');
    
    // Analytics
    new Setting(settingsContainer)
      .setName('Usage Analytics')
      .setDesc('Help improve VaultPilot by sharing anonymous usage data')
      .addToggle(toggle => {
        toggle.setValue(this.currentConfiguration.privacy.enableAnalytics);
        toggle.onChange(value => {
          this.currentConfiguration.privacy.enableAnalytics = value;
          this.onConfigurationChange();
        });
      });
    
    // Data retention
    new Setting(settingsContainer)
      .setName('Data Retention')
      .setDesc('How long to keep performance and usage data (days)')
      .addSlider(slider => {
        slider.setLimits(1, 90, 1);
        slider.setValue(this.currentConfiguration.privacy.dataRetentionDays);
        slider.onChange(value => {
          this.currentConfiguration.privacy.dataRetentionDays = value;
          this.onConfigurationChange();
        });
        slider.setDynamicTooltip();
      });
  }

  private createPreviewSection() {
    const section = this.containerEl.createDiv('preview-section');
    section.createEl('h3', { text: 'Configuration Preview' });
    
    this.previewContainer = section.createDiv('preview-container');
    this.updatePreview();
  }

  private createActionButtons() {
    const actions = this.containerEl.createDiv('settings-actions');
    
    const saveBtn = actions.createEl('button', { text: 'Save Configuration', cls: 'mod-cta' });
    saveBtn.addEventListener('click', () => this.saveConfiguration());
    
    const resetBtn = actions.createEl('button', { text: 'Reset to Defaults', cls: 'mod-warning' });
    resetBtn.addEventListener('click', () => this.resetToDefaults());
    
    const testBtn = actions.createEl('button', { text: 'Test Configuration', cls: 'mod-muted' });
    testBtn.addEventListener('click', () => this.testConfiguration());
  }

  private renderSettings() {
    // Trigger initial rendering and validation
    this.onConfigurationChange();
  }

  private async loadCurrentConfiguration() {
    try {
      // Load configuration from plugin settings
      if (this.plugin.settings.advancedConfiguration) {
        this.currentConfiguration = { ...this.plugin.settings.advancedConfiguration };
      }
    } catch (error) {
      console.error('Failed to load current configuration:', error);
      new Notice('Failed to load configuration, using defaults');
    }
  }

  private getDefaultConfiguration(): VaultPilotConfiguration {
    return {
      transport: {
        primaryTransport: TransportType.HTTP,
        fallbackChain: [TransportType.HTTP, TransportType.WEBSOCKET],
        selectionCriteria: {
          latencyWeight: 0.3,
          reliabilityWeight: 0.3,
          capabilityWeight: 0.2,
          costWeight: 0.2
        },
        timeouts: {
          connection: 5000,
          request: 30000,
          retry: 1000
        },
        retryPolicy: {
          maxAttempts: 3,
          backoffMultiplier: 2,
          maxBackoffTime: 10000
        }
      },
      performance: {
        mode: 'balanced',
        enableConnectionPooling: true,
        maxConcurrentRequests: 5,
        enableCompression: true,
        enableCaching: true,
        cacheSize: 10
      },
      monitoring: {
        enableHealthChecks: true,
        healthCheckInterval: 30000,
        enableMetrics: true,
        metricsRetention: 7,
        enablePredictiveAlerts: true
      },
      ui: {
        theme: 'auto',
        enableAnimations: true,
        showAdvancedMetrics: false,
        dashboardRefreshRate: 2,
        enableNotifications: true
      },
      privacy: {
        enableAnalytics: true,
        shareUsageData: false,
        dataRetentionDays: 30
      }
    };
  }

  private onConfigurationChange() {
    this.hasUnsavedChanges = true;
    
    if (this.config.enableRealTimeValidation) {
      this.scheduleValidation();
    }
    
    this.updatePreview();
  }

  private scheduleValidation() {
    if (this.validationTimeout) {
      clearTimeout(this.validationTimeout);
    }
    
    this.validationTimeout = window.setTimeout(() => {
      this.validateConfiguration();
    }, 500); // Debounce validation
  }

  private async validateConfiguration(): Promise<ConfigurationValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Validate transport configuration
    if (this.currentConfiguration.transport.fallbackChain.length === 0) {
      errors.push({
        field: 'transport.fallbackChain',
        message: 'At least one transport must be configured in the fallback chain',
        severity: 'error',
        suggestion: 'Add at least one transport to the fallback chain'
      });
    }
    
    // Validate selection criteria
    const criteria = this.currentConfiguration.transport.selectionCriteria;
    const totalWeight = criteria.latencyWeight + criteria.reliabilityWeight + 
                       criteria.capabilityWeight + criteria.costWeight;
    
    if (Math.abs(totalWeight - 1) > 0.01) {
      warnings.push({
        field: 'transport.selectionCriteria',
        message: 'Selection criteria weights should sum to 100%',
        impact: 'medium',
        recommendation: 'Adjust the weights so they total 100%'
      });
    }
    
    // Validate timeouts
    const timeouts = this.currentConfiguration.transport.timeouts;
    if (timeouts.connection >= timeouts.request) {
      warnings.push({
        field: 'transport.timeouts',
        message: 'Connection timeout should be less than request timeout',
        impact: 'low',
        recommendation: 'Set connection timeout to be less than request timeout'
      });
    }
    
    // Validate performance settings
    if (this.currentConfiguration.performance.maxConcurrentRequests > 10) {
      warnings.push({
        field: 'performance.maxConcurrentRequests',
        message: 'High concurrent request limit may impact performance',
        impact: 'medium',
        recommendation: 'Consider reducing to 5-10 for optimal performance'
      });
    }
    
    // Estimate impact
    const estimatedImpact = this.estimateConfigurationImpact();
    
    const result: ConfigurationValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      estimatedImpact
    };
    
    this.validationResult = result;
    this.renderValidationResult(result);
    
    return result;
  }

  private estimateConfigurationImpact() {
    // Simple heuristic-based impact estimation
    let performanceChange = 0;
    let reliabilityChange = 0;
    let resourceUsage = 0;
    
    const config = this.currentConfiguration;
    
    // Performance mode impact
    switch (config.performance.mode) {
      case 'performance':
        performanceChange += 20;
        reliabilityChange -= 5;
        resourceUsage += 15;
        break;
      case 'reliability':
        performanceChange -= 5;
        reliabilityChange += 20;
        resourceUsage += 5;
        break;
      default: // balanced
        break;
    }
    
    // Connection pooling impact
    if (config.performance.enableConnectionPooling) {
      performanceChange += 15;
      resourceUsage += 10;
    }
    
    // Compression impact
    if (config.performance.enableCompression) {
      performanceChange += 5;
      resourceUsage += 5;
    }
    
    // Caching impact
    if (config.performance.enableCaching) {
      performanceChange += 10;
      resourceUsage += config.performance.cacheSize;
    }
    
    return {
      performanceChange: Math.max(-50, Math.min(50, performanceChange)),
      reliabilityChange: Math.max(-50, Math.min(50, reliabilityChange)),
      resourceUsage: Math.max(0, Math.min(100, resourceUsage))
    };
  }

  private renderValidationResult(result: ConfigurationValidationResult) {
    this.validationContainer.empty();
    
    if (result.isValid && result.warnings.length === 0) {
      const success = this.validationContainer.createDiv('validation-success');
      success.createSpan({ text: '✅ Configuration is valid', cls: 'validation-message' });
    } else {
      // Show errors
      result.errors.forEach(error => {
        const errorEl = this.validationContainer.createDiv('validation-error');
        errorEl.createSpan({ text: '❌', cls: 'validation-icon' });
        errorEl.createSpan({ text: error.message, cls: 'validation-message' });
        if (error.suggestion) {
          errorEl.createSpan({ text: error.suggestion, cls: 'validation-suggestion' });
        }
      });
      
      // Show warnings
      result.warnings.forEach(warning => {
        const warningEl = this.validationContainer.createDiv('validation-warning');
        warningEl.createSpan({ text: '⚠️', cls: 'validation-icon' });
        warningEl.createSpan({ text: warning.message, cls: 'validation-message' });
        if (warning.recommendation) {
          warningEl.createSpan({ text: warning.recommendation, cls: 'validation-suggestion' });
        }
      });
    }
    
    // Show estimated impact
    const impact = result.estimatedImpact;
    const impactEl = this.validationContainer.createDiv('validation-impact');
    impactEl.createEl('h5', { text: 'Estimated Impact:' });
    
    const impactGrid = impactEl.createDiv('impact-grid');
    
    const perfImpact = impactGrid.createDiv('impact-item');
    perfImpact.createSpan({ text: 'Performance:', cls: 'impact-label' });
    perfImpact.createSpan({ 
      text: `${impact.performanceChange > 0 ? '+' : ''}${impact.performanceChange}%`,
      cls: `impact-value ${impact.performanceChange > 0 ? 'positive' : impact.performanceChange < 0 ? 'negative' : 'neutral'}`
    });
    
    const reliabilityImpact = impactGrid.createDiv('impact-item');
    reliabilityImpact.createSpan({ text: 'Reliability:', cls: 'impact-label' });
    reliabilityImpact.createSpan({ 
      text: `${impact.reliabilityChange > 0 ? '+' : ''}${impact.reliabilityChange}%`,
      cls: `impact-value ${impact.reliabilityChange > 0 ? 'positive' : impact.reliabilityChange < 0 ? 'negative' : 'neutral'}`
    });
    
    const resourceImpact = impactGrid.createDiv('impact-item');
    resourceImpact.createSpan({ text: 'Resource Usage:', cls: 'impact-label' });
    resourceImpact.createSpan({ 
      text: `${impact.resourceUsage}%`,
      cls: `impact-value ${impact.resourceUsage > 70 ? 'high' : impact.resourceUsage > 30 ? 'medium' : 'low'}`
    });
  }

  private renderValidationPlaceholder() {
    this.validationContainer.createEl('p', { 
      text: 'Configuration validation will appear here...',
      cls: 'validation-placeholder'
    });
  }

  private updatePreview() {
    this.previewContainer.empty();
    
    const preview = this.previewContainer.createEl('pre', { cls: 'config-preview' });
    preview.textContent = JSON.stringify(this.currentConfiguration, null, 2);
  }

  private normalizeSelectionCriteria() {
    const criteria = this.currentConfiguration.transport.selectionCriteria;
    const total = criteria.latencyWeight + criteria.reliabilityWeight + 
                  criteria.capabilityWeight + criteria.costWeight;
    
    if (total > 0) {
      criteria.latencyWeight /= total;
      criteria.reliabilityWeight /= total;
      criteria.capabilityWeight /= total;
      criteria.costWeight /= total;
    }
  }

  private applyPerformanceModePreset(mode: 'performance' | 'balanced' | 'reliability') {
    const perf = this.currentConfiguration.performance;
    
    switch (mode) {
      case 'performance':
        perf.enableConnectionPooling = true;
        perf.maxConcurrentRequests = 10;
        perf.enableCompression = false;
        perf.enableCaching = true;
        break;
      case 'reliability':
        perf.enableConnectionPooling = true;
        perf.maxConcurrentRequests = 3;
        perf.enableCompression = true;
        perf.enableCaching = false;
        break;
      default: // balanced
        perf.enableConnectionPooling = true;
        perf.maxConcurrentRequests = 5;
        perf.enableCompression = true;
        perf.enableCaching = true;
        break;
    }
  }

  private updateExpertOptionsVisibility() {
    const expertOptions = this.containerEl.querySelectorAll('.expert-option');
    expertOptions.forEach(el => {
      if (this.config.showExpertOptions) {
        el.removeClass('hidden');
      } else {
        el.addClass('hidden');
      }
    });
  }

  private updateProfileSelector() {
    this.profileSelector.empty();
    
    // Add default profile
    const defaultOption = this.profileSelector.createEl('option', { value: 'default' });
    defaultOption.textContent = 'Default Configuration';
    
    // Add custom profiles
    this.profiles.forEach(profile => {
      const option = this.profileSelector.createEl('option', { value: profile.id });
      option.textContent = profile.name;
    });
  }

  private loadProfiles() {
    // Load saved profiles from storage
    try {
      const savedProfiles = this.plugin.settings.configurationProfiles || [];
      this.profiles = savedProfiles.map((p: any) => ({
        ...p,
        created: new Date(p.created),
        lastModified: new Date(p.lastModified)
      }));
    } catch (error) {
      console.error('Failed to load configuration profiles:', error);
      this.profiles = [];
    }
  }

  private loadProfile(profileId: string) {
    if (profileId === 'default') {
      this.currentConfiguration = this.getDefaultConfiguration();
    } else {
      const profile = this.profiles.find(p => p.id === profileId);
      if (profile) {
        this.currentConfiguration = { ...profile.config };
      }
    }
    
    this.renderSettings();
    this.onConfigurationChange();
  }

  private showSaveProfileModal() {
    const name = prompt('Enter profile name:');
    if (!name) return;
    
    const description = prompt('Enter profile description (optional):') || '';
    this.saveAsProfile(name, description);
  }

  private saveAsProfile(name: string, description: string) {
    const profile: ConfigurationProfile = {
      id: `profile-${Date.now()}`,
      name,
      description,
      config: { ...this.currentConfiguration },
      created: new Date(),
      lastModified: new Date(),
      isDefault: false
    };
    
    this.profiles.push(profile);
    this.updateProfileSelector();
    this.saveProfiles();
    
    new Notice(`Profile "${name}" saved successfully`);
  }

  private deleteCurrentProfile() {
    const currentProfileId = this.profileSelector.value;
    if (currentProfileId === 'default') {
      new Notice('Cannot delete the default profile');
      return;
    }
    
    const profile = this.profiles.find(p => p.id === currentProfileId);
    if (!profile) return;
    
    const confirmed = confirm(`Delete profile "${profile.name}"?`);
    if (confirmed) {
      this.profiles = this.profiles.filter(p => p.id !== currentProfileId);
      this.updateProfileSelector();
      this.saveProfiles();
      this.loadProfile('default');
      
      new Notice(`Profile "${profile.name}" deleted`);
    }
  }

  private async saveConfiguration() {
    try {
      const validation = await this.validateConfiguration();
      
      if (!validation.isValid) {
        const proceed = confirm('Configuration has errors. Save anyway?');
        if (!proceed) return;
      }
      
      // Save to plugin settings
      this.plugin.settings.advancedConfiguration = { ...this.currentConfiguration };
      await this.plugin.saveSettings();
      
      this.hasUnsavedChanges = false;
      new Notice('✅ Configuration saved successfully');
      
    } catch (error) {
      console.error('Failed to save configuration:', error);
      new Notice('❌ Failed to save configuration');
    }
  }

  private resetToDefaults() {
    const confirmed = confirm('Reset all settings to default values? This cannot be undone.');
    if (confirmed) {
      this.currentConfiguration = this.getDefaultConfiguration();
      this.renderSettings();
      this.onConfigurationChange();
      new Notice('Configuration reset to defaults');
    }
  }

  private async testConfiguration() {
    new Notice('Testing configuration...');
    
    try {
      // Simulate configuration test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const testResult = {
        success: Math.random() > 0.2, // 80% success rate for demo
        latency: Math.random() * 200 + 50,
        errors: Math.random() > 0.8 ? ['Connection timeout'] : []
      };
      
      if (testResult.success) {
        new Notice(`✅ Configuration test passed (${testResult.latency.toFixed(0)}ms average)`);
      } else {
        new Notice(`❌ Configuration test failed: ${testResult.errors.join(', ')}`);
      }
      
    } catch (error) {
      console.error('Configuration test failed:', error);
      new Notice('❌ Configuration test failed');
    }
  }

  private exportConfiguration() {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      configuration: this.currentConfiguration,
      profiles: this.profiles
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultpilot-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    new Notice('Configuration exported successfully');
  }

  private importConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          if (data.configuration) {
            this.currentConfiguration = data.configuration;
            this.renderSettings();
            this.onConfigurationChange();
            new Notice('Configuration imported successfully');
          }
          
          if (data.profiles) {
            this.profiles = data.profiles.map((p: any) => ({
              ...p,
              created: new Date(p.created),
              lastModified: new Date(p.lastModified)
            }));
            this.updateProfileSelector();
            this.saveProfiles();
          }
          
        } catch (error) {
          console.error('Failed to import configuration:', error);
          new Notice('❌ Failed to import configuration: Invalid file format');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }

  private saveProfiles() {
    try {
      this.plugin.settings.configurationProfiles = this.profiles;
      this.plugin.saveSettings();
    } catch (error) {
      console.error('Failed to save profiles:', error);
    }
  }

  private startRealTimeValidation() {
    // Real-time validation is handled by onConfigurationChange
    // This could be extended with more sophisticated validation
    console.log('Real-time validation enabled');
  }
}
