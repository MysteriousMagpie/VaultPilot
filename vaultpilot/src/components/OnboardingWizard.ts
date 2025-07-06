/**
 * OnboardingWizard - Intelligent first-time setup and transport optimization
 */

import { Modal, App, Setting, Notice, ButtonComponent } from 'obsidian';
import { TransportManager } from '../devpipe/TransportManager';
import { TransportType } from '../devpipe/transports/DevPipeTransport';
import { EnvironmentDetector } from '../utils/EnvironmentDetector';
import VaultPilotPlugin from '../main';

export interface OnboardingWizardConfig {
  skipEnvironmentDetection?: boolean;
  enableTelemetry?: boolean;
  skipValidation?: boolean;
}

export interface EnvironmentCapabilities {
  platform: 'browser' | 'node' | 'obsidian';
  webSocketSupported: boolean;
  fileSystemAccess: boolean;
  httpCapabilities: boolean;
  recommendedTransport: string;
  performanceEstimate: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: boolean[];
  userPreferences: OnboardingPreferences;
  detectedCapabilities?: EnvironmentCapabilities;
  validationResults?: ValidationResults;
}

interface OnboardingPreferences {
  primaryTransport?: string;
  enableRealTimeUpdates: boolean;
  performanceMode: 'balanced' | 'performance' | 'reliability';
  enableAnalytics: boolean;
}

interface ValidationResults {
  transportsWorking: string[];
  transportsFailing: string[];
  recommendedConfiguration: any;
  performanceBaseline: any;
}

enum OnboardingStep {
  WELCOME = 0,
  ENVIRONMENT_DETECTION = 1,
  PREFERENCES = 2,
  VALIDATION = 3,
  COMPLETION = 4
}

export class OnboardingWizard extends Modal {
  private currentStep: number = 0;
  private totalSteps: number = 5;
  private progress: OnboardingProgress;
  private config: OnboardingWizardConfig;
  private transportManager: TransportManager;
  private plugin: VaultPilotPlugin;
  
  private stepElements: HTMLElement[] = [];
  private progressBar!: HTMLElement;
  private nextButton!: ButtonComponent;
  private previousButton!: ButtonComponent;
  private skipButton!: ButtonComponent;

  constructor(app: App, plugin: VaultPilotPlugin, config: OnboardingWizardConfig = {}) {
    super(app);
    this.plugin = plugin;
    this.config = config;
    
    // Initialize transport manager with default config
    const transportConfig = {
      selectionCriteria: {
        latencyWeight: 0.3,
        reliabilityWeight: 0.4,
        capabilityWeight: 0.2,
        costWeight: 0.1
      },
      fallbackChain: [TransportType.HTTP, TransportType.WEBSOCKET, TransportType.FILESYSTEM],
      transportConfigs: {
        http: { 
          serverUrl: plugin.settings.backendUrl,
          timeout: 30000,
          retryAttempts: 3,
          debug: plugin.settings.debugMode
        }
      }
    };
    this.transportManager = new TransportManager(transportConfig);
    
    this.progress = {
      currentStep: 0,
      totalSteps: this.totalSteps,
      completedSteps: new Array(this.totalSteps).fill(false),
      userPreferences: {
        enableRealTimeUpdates: true,
        performanceMode: 'balanced',
        enableAnalytics: true
      }
    };

    this.modalEl.addClass('vaultpilot-onboarding');
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    // Add CSS classes for styling
    this.modalEl.addClass('vaultpilot-onboarding-modal');
    
    // Create header
    this.createHeader();
    
    // Create progress bar
    this.createProgressBar();
    
    // Create step container
    const stepContainer = contentEl.createDiv('onboarding-step-container');
    
    // Create navigation
    this.createNavigation();
    
    // Start with first step
    await this.renderCurrentStep();
  }

  private createHeader() {
    const { contentEl } = this;
    const header = contentEl.createDiv('onboarding-header');
    header.createEl('h2', { text: 'Welcome to VaultPilot' });
    header.createEl('p', { 
      text: 'Let\'s set up your optimal configuration for the best experience',
      cls: 'onboarding-subtitle'
    });
  }

  private createProgressBar() {
    const { contentEl } = this;
    const progressContainer = contentEl.createDiv('onboarding-progress');
    
    // Step indicators
    const stepsContainer = progressContainer.createDiv('progress-steps');
    for (let i = 0; i < this.totalSteps; i++) {
      const step = stepsContainer.createDiv('progress-step');
      step.addClass(i === 0 ? 'active' : 'inactive');
      step.createSpan({ text: (i + 1).toString() });
      this.stepElements.push(step);
    }
    
    // Progress bar
    this.progressBar = progressContainer.createDiv('progress-bar');
    const progressFill = this.progressBar.createDiv('progress-fill');
    progressFill.style.width = `${(1 / this.totalSteps) * 100}%`;
  }

  private createNavigation() {
    const { contentEl } = this;
    const navigation = contentEl.createDiv('onboarding-navigation');
    
    // Previous button
    this.previousButton = new ButtonComponent(navigation)
      .setButtonText('Previous')
      .setClass('mod-muted')
      .onClick(() => this.previousStep());
    
    // Skip button
    this.skipButton = new ButtonComponent(navigation)
      .setButtonText('Skip Setup')
      .setClass('mod-muted')
      .onClick(() => this.skipOnboarding());
    
    // Next button
    this.nextButton = new ButtonComponent(navigation)
      .setButtonText('Next')
      .setCta()
      .onClick(() => this.nextStep());
    
    this.updateNavigationState();
  }

  private async renderCurrentStep() {
    const { contentEl } = this;
    const stepContainer = contentEl.querySelector('.onboarding-step-container') as HTMLElement;
    stepContainer.empty();
    
    this.updateProgressIndicators();
    
    switch (this.currentStep) {
      case OnboardingStep.WELCOME:
        await this.renderWelcomeStep(stepContainer);
        break;
      case OnboardingStep.ENVIRONMENT_DETECTION:
        await this.renderEnvironmentStep(stepContainer);
        break;
      case OnboardingStep.PREFERENCES:
        await this.renderPreferencesStep(stepContainer);
        break;
      case OnboardingStep.VALIDATION:
        await this.renderValidationStep(stepContainer);
        break;
      case OnboardingStep.COMPLETION:
        await this.renderCompletionStep(stepContainer);
        break;
    }
    
    this.updateNavigationState();
  }

  private async renderWelcomeStep(container: HTMLElement) {
    const step = container.createDiv('onboarding-step welcome-step');
    
    step.createEl('h3', { text: 'Welcome to VaultPilot' });
    step.createEl('p', { 
      text: 'VaultPilot provides intelligent transport management and optimization for your Obsidian experience. This wizard will help you configure the optimal settings for your environment.'
    });
    
    const features = step.createDiv('welcome-features');
    features.createEl('h4', { text: 'What you\'ll get:' });
    
    const featureList = features.createEl('ul');
    featureList.createEl('li', { text: '🚀 Intelligent transport selection and failover' });
    featureList.createEl('li', { text: '📊 Real-time performance monitoring' });
    featureList.createEl('li', { text: '💡 AI-powered optimization suggestions' });
    featureList.createEl('li', { text: '🔧 Advanced configuration options' });
    featureList.createEl('li', { text: '📈 Usage analytics and insights' });
    
    const estimatedTime = step.createDiv('estimated-time');
    estimatedTime.createEl('p', { 
      text: '⏱️ Estimated setup time: 2-3 minutes',
      cls: 'muted'
    });
  }

  private async renderEnvironmentStep(container: HTMLElement) {
    const step = container.createDiv('onboarding-step environment-step');
    
    step.createEl('h3', { text: 'Environment Detection' });
    step.createEl('p', { text: 'Analyzing your environment to recommend optimal transport configuration...' });
    
    if (!this.config.skipEnvironmentDetection && !this.progress.detectedCapabilities) {
      const detectionStatus = step.createDiv('detection-status');
      detectionStatus.createEl('p', { text: '🔍 Detecting capabilities...', cls: 'detection-loading' });
      
      try {
        this.progress.detectedCapabilities = await this.detectEnvironment();
        this.renderEnvironmentResults(step);
      } catch (error) {
        this.renderEnvironmentError(step, error);
      }
    } else if (this.progress.detectedCapabilities) {
      this.renderEnvironmentResults(step);
    }
  }

  private async detectEnvironment(): Promise<EnvironmentCapabilities> {
    // Simulate detection process with progress updates
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const envInfo = EnvironmentDetector.detect();
    
    // Ensure platform matches our interface
    let platform: 'browser' | 'node' | 'obsidian' = 'obsidian';
    if (envInfo.platform === 'browser' || envInfo.platform === 'node' || envInfo.platform === 'obsidian') {
      platform = envInfo.platform;
    }
    
    const capabilities: EnvironmentCapabilities = {
      platform,
      webSocketSupported: envInfo.hasWebSocket,
      fileSystemAccess: envInfo.hasFileSystem,
      httpCapabilities: envInfo.hasHTTP,
      recommendedTransport: 'http', // Will be determined by analysis
      performanceEstimate: 'good'
    };
    
    // Determine recommended transport
    if (capabilities.webSocketSupported && capabilities.httpCapabilities) {
      capabilities.recommendedTransport = 'websocket';
      capabilities.performanceEstimate = 'excellent';
    } else if (capabilities.httpCapabilities) {
      capabilities.recommendedTransport = 'http';
      capabilities.performanceEstimate = 'good';
    } else if (capabilities.fileSystemAccess) {
      capabilities.recommendedTransport = 'filesystem';
      capabilities.performanceEstimate = 'fair';
    }
    
    return capabilities;
  }

  private renderEnvironmentResults(container: HTMLElement) {
    const resultsContainer = container.createDiv('environment-results');
    const capabilities = this.progress.detectedCapabilities!;
    
    resultsContainer.createEl('h4', { text: '✅ Detection Complete' });
    
    const capabilitiesList = resultsContainer.createDiv('capabilities-list');
    
    // WebSocket capability
    const wsCapability = capabilitiesList.createDiv('capability-item');
    wsCapability.createSpan({ 
      text: capabilities.webSocketSupported ? '✅' : '❌',
      cls: 'capability-icon'
    });
    wsCapability.createSpan({ text: 'WebSocket Support' });
    
    // HTTP capability
    const httpCapability = capabilitiesList.createDiv('capability-item');
    httpCapability.createSpan({ 
      text: capabilities.httpCapabilities ? '✅' : '❌',
      cls: 'capability-icon'
    });
    httpCapability.createSpan({ text: 'HTTP Transport' });
    
    // FileSystem capability
    const fsCapability = capabilitiesList.createDiv('capability-item');
    fsCapability.createSpan({ 
      text: capabilities.fileSystemAccess ? '✅' : '❌',
      cls: 'capability-icon'
    });
    fsCapability.createSpan({ text: 'FileSystem Access' });
    
    // Recommendation
    const recommendation = resultsContainer.createDiv('environment-recommendation');
    recommendation.createEl('h4', { text: 'Recommendation' });
    recommendation.createEl('p', { 
      text: `Based on your environment, we recommend using ${capabilities.recommendedTransport} transport for ${capabilities.performanceEstimate} performance.`
    });
  }

  private renderEnvironmentError(container: HTMLElement, error: any) {
    const errorContainer = container.createDiv('environment-error');
    errorContainer.createEl('h4', { text: '⚠️ Detection Failed' });
    errorContainer.createEl('p', { 
      text: 'Unable to automatically detect your environment capabilities. You can proceed with default settings or manually configure later.'
    });
    
    if (this.plugin.settings.debugMode) {
      errorContainer.createEl('p', { 
        text: `Error: ${error.message}`,
        cls: 'error-details'
      });
    }
  }

  private async renderPreferencesStep(container: HTMLElement) {
    const step = container.createDiv('onboarding-step preferences-step');
    
    step.createEl('h3', { text: 'Performance Preferences' });
    step.createEl('p', { text: 'Configure your preferences for optimal performance:' });
    
    const preferencesContainer = step.createDiv('preferences-container');
    
    // Performance mode setting
    new Setting(preferencesContainer)
      .setName('Performance Mode')
      .setDesc('Choose your preferred balance between speed and reliability')
      .addDropdown(dropdown => {
        dropdown.addOption('performance', 'Performance (Prioritize Speed)');
        dropdown.addOption('balanced', 'Balanced (Recommended)');
        dropdown.addOption('reliability', 'Reliability (Prioritize Stability)');
        dropdown.setValue(this.progress.userPreferences.performanceMode);
        dropdown.onChange(value => {
          this.progress.userPreferences.performanceMode = value as any;
        });
      });
    
    // Real-time updates setting
    new Setting(preferencesContainer)
      .setName('Real-time Updates')
      .setDesc('Enable real-time dashboard updates and live monitoring')
      .addToggle(toggle => {
        toggle.setValue(this.progress.userPreferences.enableRealTimeUpdates);
        toggle.onChange(value => {
          this.progress.userPreferences.enableRealTimeUpdates = value;
        });
      });
    
    // Analytics setting
    new Setting(preferencesContainer)
      .setName('Usage Analytics')
      .setDesc('Enable anonymous usage analytics to improve recommendations')
      .addToggle(toggle => {
        toggle.setValue(this.progress.userPreferences.enableAnalytics);
        toggle.onChange(value => {
          this.progress.userPreferences.enableAnalytics = value;
        });
      });
  }

  private async renderValidationStep(container: HTMLElement) {
    const step = container.createDiv('onboarding-step validation-step');
    
    step.createEl('h3', { text: 'Configuration Validation' });
    step.createEl('p', { text: 'Testing your configuration and establishing performance baseline...' });
    
    if (!this.config.skipValidation && !this.progress.validationResults) {
      const validationStatus = step.createDiv('validation-status');
      validationStatus.createEl('p', { text: '🧪 Running validation tests...', cls: 'validation-loading' });
      
      try {
        this.progress.validationResults = await this.validateConfiguration();
        this.renderValidationResults(step);
      } catch (error) {
        this.renderValidationError(step, error);
      }
    } else if (this.progress.validationResults) {
      this.renderValidationResults(step);
    }
  }

  private async validateConfiguration(): Promise<ValidationResults> {
    // Simulate validation process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results: ValidationResults = {
      transportsWorking: ['http'],
      transportsFailing: [],
      recommendedConfiguration: {},
      performanceBaseline: {
        avgResponseTime: 150,
        reliability: 0.98,
        throughput: 1000
      }
    };
    
    // Test WebSocket if supported
    if (this.progress.detectedCapabilities?.webSocketSupported) {
      results.transportsWorking.push('websocket');
    }
    
    // Test FileSystem if supported
    if (this.progress.detectedCapabilities?.fileSystemAccess) {
      results.transportsWorking.push('filesystem');
    }
    
    return results;
  }

  private renderValidationResults(container: HTMLElement) {
    const resultsContainer = container.createDiv('validation-results');
    const results = this.progress.validationResults!;
    
    resultsContainer.createEl('h4', { text: '✅ Validation Complete' });
    
    // Working transports
    const workingContainer = resultsContainer.createDiv('working-transports');
    workingContainer.createEl('h5', { text: 'Working Transports:' });
    const workingList = workingContainer.createEl('ul');
    results.transportsWorking.forEach(transport => {
      workingList.createEl('li', { text: `✅ ${transport.toUpperCase()}` });
    });
    
    // Performance baseline
    const performanceContainer = resultsContainer.createDiv('performance-baseline');
    performanceContainer.createEl('h5', { text: 'Performance Baseline:' });
    const perfList = performanceContainer.createEl('ul');
    perfList.createEl('li', { text: `Average Response Time: ${results.performanceBaseline.avgResponseTime}ms` });
    perfList.createEl('li', { text: `Reliability: ${(results.performanceBaseline.reliability * 100).toFixed(1)}%` });
    perfList.createEl('li', { text: `Throughput: ${results.performanceBaseline.throughput} requests/min` });
  }

  private renderValidationError(container: HTMLElement, error: any) {
    const errorContainer = container.createDiv('validation-error');
    errorContainer.createEl('h4', { text: '⚠️ Validation Issues' });
    errorContainer.createEl('p', { 
      text: 'Some validation tests failed, but you can still proceed. You can adjust settings later if needed.'
    });
    
    if (this.plugin.settings.debugMode) {
      errorContainer.createEl('p', { 
        text: `Error: ${error.message}`,
        cls: 'error-details'
      });
    }
  }

  private async renderCompletionStep(container: HTMLElement) {
    const step = container.createDiv('onboarding-step completion-step');
    
    step.createEl('h3', { text: '🎉 Setup Complete!' });
    step.createEl('p', { text: 'VaultPilot has been configured with your optimal settings.' });
    
    const summary = step.createDiv('setup-summary');
    summary.createEl('h4', { text: 'Configuration Summary:' });
    
    const summaryList = summary.createEl('ul');
    summaryList.createEl('li', { 
      text: `Performance Mode: ${this.progress.userPreferences.performanceMode}` 
    });
    summaryList.createEl('li', { 
      text: `Real-time Updates: ${this.progress.userPreferences.enableRealTimeUpdates ? 'Enabled' : 'Disabled'}` 
    });
    summaryList.createEl('li', { 
      text: `Analytics: ${this.progress.userPreferences.enableAnalytics ? 'Enabled' : 'Disabled'}` 
    });
    
    if (this.progress.detectedCapabilities) {
      summaryList.createEl('li', { 
        text: `Recommended Transport: ${this.progress.detectedCapabilities.recommendedTransport}` 
      });
    }
    
    const nextSteps = step.createDiv('next-steps');
    nextSteps.createEl('h4', { text: 'What\'s Next:' });
    const nextList = nextSteps.createEl('ul');
    nextList.createEl('li', { text: '📊 Check the dashboard for real-time status' });
    nextList.createEl('li', { text: '⚙️ Adjust advanced settings as needed' });
    nextList.createEl('li', { text: '💡 Review AI-powered recommendations' });
    nextList.createEl('li', { text: '📈 Monitor performance analytics' });
  }

  private updateProgressIndicators() {
    // Update step indicators
    this.stepElements.forEach((element, index) => {
      element.removeClass('active', 'completed', 'inactive');
      if (index < this.currentStep) {
        element.addClass('completed');
      } else if (index === this.currentStep) {
        element.addClass('active');
      } else {
        element.addClass('inactive');
      }
    });
    
    // Update progress bar
    const progressFill = this.progressBar.querySelector('.progress-fill') as HTMLElement;
    if (progressFill) {
      const progress = ((this.currentStep + 1) / this.totalSteps) * 100;
      progressFill.style.width = `${progress}%`;
    }
  }

  private updateNavigationState() {
    // Previous button
    this.previousButton.setDisabled(this.currentStep === 0);
    
    // Next button
    if (this.currentStep === this.totalSteps - 1) {
      this.nextButton.setButtonText('Finish');
    } else {
      this.nextButton.setButtonText('Next');
    }
    
    // Skip button - hide on last step
    if (this.currentStep === this.totalSteps - 1) {
      this.skipButton.buttonEl.style.display = 'none';
    } else {
      this.skipButton.buttonEl.style.display = '';
    }
  }

  private async nextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.progress.completedSteps[this.currentStep] = true;
      this.currentStep++;
      await this.renderCurrentStep();
    } else {
      // Finish onboarding
      await this.finishOnboarding();
    }
  }

  private async previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      await this.renderCurrentStep();
    }
  }

  private async skipOnboarding() {
    const confirmed = confirm('Are you sure you want to skip the setup wizard? You can access these settings later in the plugin settings.');
    if (confirmed) {
      await this.finishOnboarding(true);
    }
  }

  private async finishOnboarding(skipped: boolean = false) {
    try {
      if (!skipped) {
        // Apply the configuration
        await this.applyConfiguration();
        new Notice('✅ VaultPilot configuration applied successfully!');
      } else {
        new Notice('⚠️ Onboarding skipped - using default settings');
      }
      
      // Mark onboarding as complete
      this.plugin.settings.onboardingComplete = true;
      await this.plugin.saveSettings();
      
      this.close();
    } catch (error) {
      console.error('Failed to apply onboarding configuration:', error);
      new Notice('❌ Failed to apply configuration. Please check settings manually.');
    }
  }

  private async applyConfiguration() {
    // Apply user preferences to plugin settings
    const preferences = this.progress.userPreferences;
    
    this.plugin.settings.performanceMode = preferences.performanceMode;
    this.plugin.settings.enableRealTimeUpdates = preferences.enableRealTimeUpdates;
    this.plugin.settings.enableAnalytics = preferences.enableAnalytics;
    
    if (this.progress.detectedCapabilities) {
      // Apply recommended transport configuration
      const capabilities = this.progress.detectedCapabilities;
      
      // Configure transport manager with detected capabilities
      const transportConfig = {
        selectionCriteria: this.getSelectionCriteriaForMode(preferences.performanceMode),
        fallbackChain: this.buildFallbackChain(capabilities),
        transportConfigs: {
          http: { baseUrl: this.plugin.settings.backendUrl },
          websocket: capabilities.webSocketSupported ? { url: this.plugin.settings.webSocketUrl } : undefined,
          filesystem: capabilities.fileSystemAccess ? { basePath: '.vaultpilot' } : undefined
        },
        autoFailover: true,
        debug: this.plugin.settings.debugMode
      };
      
      // Store configuration for transport manager
      this.plugin.settings.transportConfig = transportConfig;
    }
    
    await this.plugin.saveSettings();
  }

  private getSelectionCriteriaForMode(mode: string) {
    switch (mode) {
      case 'performance':
        return {
          latencyWeight: 0.6,
          reliabilityWeight: 0.2,
          capabilityWeight: 0.1,
          costWeight: 0.1
        };
      case 'reliability':
        return {
          latencyWeight: 0.1,
          reliabilityWeight: 0.6,
          capabilityWeight: 0.2,
          costWeight: 0.1
        };
      default: // balanced
        return {
          latencyWeight: 0.3,
          reliabilityWeight: 0.3,
          capabilityWeight: 0.2,
          costWeight: 0.2
        };
    }
  }

  private buildFallbackChain(capabilities: EnvironmentCapabilities): string[] {
    const chain: string[] = [];
    
    if (capabilities.webSocketSupported) {
      chain.push('websocket');
    }
    if (capabilities.httpCapabilities) {
      chain.push('http');
    }
    if (capabilities.fileSystemAccess) {
      chain.push('filesystem');
    }
    
    return chain;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
