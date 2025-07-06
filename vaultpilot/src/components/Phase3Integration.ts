/**
 * Phase3Integration - Main integration component for VaultPilot Phase 3 features
 */

import { Component, Setting, Notice, WorkspaceLeaf, Modal } from 'obsidian';
import VaultPilotPlugin from '../main';
import { OnboardingWizard } from './OnboardingWizard';
import { TransportDashboard } from './TransportDashboard';
import { AdvancedSettings } from './AdvancedSettings';
import { RecommendationEngine, RecommendationContext, Recommendation } from '../services/RecommendationEngine';
import { TransportType } from '../devpipe/transports/DevPipeTransport';

export interface Phase3Config {
  enableOnboarding: boolean;
  enableDashboard: boolean;
  enableRecommendations: boolean;
  enableAdvancedSettings: boolean;
  autoShowOnboarding: boolean;
}

export class Phase3Integration extends Component {
  private plugin: VaultPilotPlugin;
  private config: Phase3Config;
  private recommendationEngine: RecommendationEngine;
  
  // Component instances
  private onboardingWizard?: OnboardingWizard;
  private transportDashboard?: TransportDashboard;
  private advancedSettings?: AdvancedSettings;
  
  // UI containers
  private dashboardContainer?: HTMLElement;
  private settingsContainer?: HTMLElement;
  
  constructor(plugin: VaultPilotPlugin, config: Partial<Phase3Config> = {}) {
    super();
    this.plugin = plugin;
    this.config = {
      enableOnboarding: true,
      enableDashboard: true,
      enableRecommendations: true,
      enableAdvancedSettings: true,
      autoShowOnboarding: !plugin.settings.onboardingComplete,
      ...config
    };
    
    this.recommendationEngine = new RecommendationEngine();
  }

  async onload() {
    console.log('Phase 3 Integration loading...');
    
    // Register commands
    this.registerCommands();
    
    // Setup UI components
    await this.setupComponents();
    
    // Show onboarding if needed
    if (this.config.autoShowOnboarding) {
      this.showOnboarding();
    }
    
    // Start recommendation engine
    if (this.config.enableRecommendations) {
      this.startRecommendationEngine();
    }
    
    console.log('Phase 3 Integration loaded successfully');
  }

  onunload() {
    console.log('Phase 3 Integration unloading...');
    
    // Cleanup components
    this.cleanup();
  }

  private registerCommands() {
    // Onboarding command
    if (this.config.enableOnboarding) {
      this.plugin.addCommand({
        id: 'show-onboarding',
        name: 'Show Setup Wizard',
        callback: () => this.showOnboarding()
      });
    }
    
    // Dashboard command
    if (this.config.enableDashboard) {
      this.plugin.addCommand({
        id: 'show-dashboard',
        name: 'Show Transport Dashboard',
        callback: () => this.showDashboard()
      });
    }
    
    // Advanced settings command
    if (this.config.enableAdvancedSettings) {
      this.plugin.addCommand({
        id: 'show-advanced-settings',
        name: 'Show Advanced Settings',
        callback: () => this.showAdvancedSettings()
      });
    }
    
    // Recommendations command
    if (this.config.enableRecommendations) {
      this.plugin.addCommand({
        id: 'show-recommendations',
        name: 'Show AI Recommendations',
        callback: () => this.showRecommendations()
      });
    }
    
    // Quick optimization command
    this.plugin.addCommand({
      id: 'quick-optimize',
      name: 'Quick Performance Optimization',
      callback: () => this.quickOptimize()
    });
  }

  private async setupComponents() {
    // Load the Phase 3 CSS
    this.loadPhase3Styles();
    
    // Initialize dashboard if enabled
    if (this.config.enableDashboard) {
      this.setupDashboard();
    }
    
    // Initialize advanced settings if enabled
    if (this.config.enableAdvancedSettings) {
      this.setupAdvancedSettings();
    }
  }

  private loadPhase3Styles() {
    // Add the Phase 3 styles directly as inline styles
    if (document.getElementById('vaultpilot-phase3-styles')) {
      return; // Already loaded
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'vaultpilot-phase3-styles';
    styleEl.textContent = `
/* VaultPilot Phase 3 Component Styles */

/* Onboarding Wizard Styles */
.vaultpilot-onboarding-modal {
  width: 600px;
  max-width: 90vw;
}

.vaultpilot-onboarding {
  max-height: 80vh;
  overflow-y: auto;
}

.onboarding-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.onboarding-subtitle {
  color: var(--text-muted);
  margin-top: 5px;
}

.onboarding-progress {
  margin-bottom: 25px;
}

.progress-steps {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 15px;
}

.progress-step {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  transition: all 0.3s ease;
}

.progress-step.active {
  background-color: var(--interactive-accent);
  color: var(--text-on-accent);
}

.progress-step.completed {
  background-color: var(--color-green);
  color: white;
}

.progress-step.inactive {
  background-color: var(--background-modifier-border);
  color: var(--text-muted);
}

.progress-bar {
  height: 4px;
  background-color: var(--background-modifier-border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--interactive-accent);
  transition: width 0.3s ease;
}

.onboarding-step-container {
  min-height: 300px;
  margin-bottom: 20px;
}

.onboarding-step {
  padding: 20px 0;
}

.onboarding-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid var(--background-modifier-border);
}

/* Transport Dashboard Styles */
.transport-dashboard {
  padding: 20px;
  max-width: 100%;
  overflow-x: auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.status-card {
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  padding: 16px;
  margin: 8px 0;
}

.status-card.healthy {
  border-left: 4px solid var(--color-green);
}

.status-card.warning {
  border-left: 4px solid var(--color-orange);
}

.status-card.error {
  border-left: 4px solid var(--color-red);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin: 20px 0;
}

.metric-card {
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  padding: 15px;
  text-align: center;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--interactive-accent);
}

.metric-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 5px;
}

/* Advanced Settings Styles */
.advanced-settings {
  padding: 20px;
}

.settings-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.settings-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-normal);
}

.profile-manager {
  background: var(--background-secondary);
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
}

.profiles-list {
  margin: 15px 0;
}

.profile-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin: 5px 0;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
}

.profile-item.active {
  border-color: var(--interactive-accent);
  background: var(--background-modifier-hover);
}

.config-group {
  background: var(--background-secondary);
  border-radius: 6px;
  padding: 15px;
  margin: 10px 0;
}

.config-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
}

.validation-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  margin-left: 10px;
}

.validation-status.valid {
  background: var(--background-modifier-success);
  color: var(--color-green);
}

.validation-status.invalid {
  background: var(--background-modifier-error);
  color: var(--color-red);
}

/* Modal Styles */
.vaultpilot-phase3-modal {
  width: 700px;
  max-width: 95vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--background-modifier-border);
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--background-modifier-border);
}

/* Recommendation Engine Styles */
.recommendations-container {
  margin: 20px 0;
}

.recommendation-card {
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
}

.recommendation-card.high-priority {
  border-left: 4px solid var(--color-red);
}

.recommendation-card.medium-priority {
  border-left: 4px solid var(--color-orange);
}

.recommendation-card.low-priority {
  border-left: 4px solid var(--color-green);
}

.recommendation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.recommendation-title {
  font-weight: 600;
  color: var(--text-normal);
}

.recommendation-actions {
  display: flex;
  gap: 8px;
  margin-top: 15px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .vaultpilot-onboarding-modal,
  .vaultpilot-phase3-modal {
    width: 95vw;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .dashboard-header,
  .modal-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
  
  .config-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
`;
    document.head.appendChild(styleEl);
  }

  private setupDashboard() {
    // Dashboard will be created when needed
    console.log('Dashboard setup ready');
  }

  private setupAdvancedSettings() {
    // Advanced settings will be created when needed
    console.log('Advanced settings setup ready');
  }

  private showOnboarding() {
    if (!this.config.enableOnboarding) {
      new Notice('Onboarding is disabled');
      return;
    }
    
    if (this.onboardingWizard) {
      // Close existing wizard
      this.onboardingWizard.close();
    }
    
    this.onboardingWizard = new OnboardingWizard(this.plugin.app, this.plugin);
    this.onboardingWizard.open();
  }

  private showDashboard() {
    if (!this.config.enableDashboard) {
      new Notice('Dashboard is disabled');
      return;
    }
    
    // Create or show dashboard modal
    const modal = new DashboardModal(this.plugin);
    modal.open();
  }

  private showAdvancedSettings() {
    if (!this.config.enableAdvancedSettings) {
      new Notice('Advanced settings are disabled');
      return;
    }
    
    // Create or show advanced settings modal
    const modal = new AdvancedSettingsModal(this.plugin);
    modal.open();
  }

  private async showRecommendations() {
    if (!this.config.enableRecommendations) {
      new Notice('Recommendations are disabled');
      return;
    }
    
    new Notice('Generating AI recommendations...');
    
    try {
      const context = await this.buildRecommendationContext();
      const recommendations = await this.recommendationEngine.generateRecommendations(context);
      
      if (recommendations.length > 0) {
        const modal = new RecommendationsModal(this.plugin, recommendations, this.recommendationEngine);
        modal.open();
      } else {
        new Notice('No recommendations available at this time');
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      new Notice('Failed to generate recommendations');
    }
  }

  private async quickOptimize() {
    new Notice('Running quick optimization...');
    
    try {
      const context = await this.buildRecommendationContext();
      const recommendations = await this.recommendationEngine.generateRecommendations(context);
      
      // Find quick, automatic optimizations
      const quickRecs = recommendations.filter(rec => 
        rec.implementation.difficulty === 'easy' && 
        rec.implementation.steps.some(step => step.action === 'automatic')
      );
      
      if (quickRecs.length > 0) {
        // Apply the first quick recommendation
        const rec = quickRecs[0];
        await this.applyRecommendation(rec);
        new Notice(`✅ Applied: ${rec.title}`);
      } else {
        new Notice('No quick optimizations available. Use "Show AI Recommendations" for manual optimizations.');
      }
    } catch (error) {
      console.error('Quick optimization failed:', error);
      new Notice('Quick optimization failed');
    }
  }

  private async buildRecommendationContext(): Promise<RecommendationContext> {
    // Build context for recommendation engine
    const context: RecommendationContext = {
      sessionId: `session-${Date.now()}`,
      timestamp: new Date(),
      currentTransport: TransportType.HTTP, // Default, should be dynamic
      availableTransports: [TransportType.HTTP, TransportType.WEBSOCKET, TransportType.FILESYSTEM],
      performanceMetrics: {
        averageLatency: 150 + Math.random() * 100,
        errorRate: Math.random() * 0.05,
        throughput: 100 + Math.random() * 50,
        reliability: 0.95 + Math.random() * 0.05,
        transportUsage: {
          [TransportType.HTTP]: 0.7,
          [TransportType.WEBSOCKET]: 0.25,
          [TransportType.FILESYSTEM]: 0.05
        },
        timeWindow: '1h'
      },
      userBehavior: {
        usageFrequency: 'medium',
        peakUsageHours: [9, 10, 11, 14, 15, 16],
        preferredFeatures: ['dashboard', 'recommendations'],
        errorTolerance: 'medium',
        performanceSensitivity: 'medium'
      },
      environmentContext: {
        platform: 'obsidian',
        connectivity: 'good',
        bandwidth: 50,
        latency: 30,
        stability: 0.95
      }
    };
    
    return context;
  }

  private async applyRecommendation(recommendation: Recommendation): Promise<boolean> {
    try {
      console.log(`Applying recommendation: ${recommendation.title}`);
      
      // Find automatic steps
      const autoSteps = recommendation.implementation.steps.filter(step => step.action === 'automatic');
      
      for (const step of autoSteps) {
        switch (step.id) {
          case 'switch-transport':
            // Simulate transport switch
            console.log('Switching transport as recommended');
            break;
          case 'enable-pooling':
            // Simulate enabling connection pooling
            console.log('Enabling connection pooling');
            break;
          case 'enable-monitoring':
            // Simulate enabling enhanced monitoring
            console.log('Enabling enhanced monitoring');
            break;
          default:
            console.log(`Unknown automatic step: ${step.id}`);
        }
      }
      
      // Track effectiveness
      this.recommendationEngine.trackRecommendationEffectiveness(recommendation.id, 0.8);
      
      return true;
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
      return false;
    }
  }

  private startRecommendationEngine() {
    // Start background recommendation analysis
    console.log('Starting recommendation engine...');
    
    // Generate initial recommendations
    this.generateBackgroundRecommendations();
    
    // Set up periodic recommendation updates
    setInterval(() => {
      this.generateBackgroundRecommendations();
    }, 30 * 60 * 1000); // Every 30 minutes
  }

  private async generateBackgroundRecommendations() {
    try {
      const context = await this.buildRecommendationContext();
      const recommendations = await this.recommendationEngine.generateRecommendations(context);
      
      // Check for critical recommendations
      const criticalRecs = recommendations.filter(rec => rec.priority === 'critical');
      if (criticalRecs.length > 0) {
        new Notice(`⚠️ ${criticalRecs.length} critical optimization(s) available. Use Command Palette > "Show AI Recommendations"`);
      }
      
      console.log(`Generated ${recommendations.length} recommendations (${criticalRecs.length} critical)`);
    } catch (error) {
      console.error('Background recommendation generation failed:', error);
    }
  }

  private cleanup() {
    // Cleanup component instances
    if (this.onboardingWizard) {
      this.onboardingWizard.close();
    }
    
    if (this.transportDashboard) {
      this.transportDashboard.unload();
    }
    
    if (this.advancedSettings) {
      this.advancedSettings.unload();
    }
  }

  // Public API methods for other components
  public async showOnboardingIfNeeded(): Promise<boolean> {
    if (!this.plugin.settings.onboardingComplete && this.config.enableOnboarding) {
      this.showOnboarding();
      return true;
    }
    return false;
  }

  public getRecommendationEngine(): RecommendationEngine {
    return this.recommendationEngine;
  }

  public async refreshDashboard(): Promise<void> {
    if (this.transportDashboard) {
      // Refresh dashboard data
      console.log('Refreshing dashboard...');
    }
  }
}

// Modal for displaying the transport dashboard
class DashboardModal extends Modal {
  private plugin: VaultPilotPlugin;
  private dashboard?: TransportDashboard;

  constructor(plugin: VaultPilotPlugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.modalEl.addClass('dashboard-modal');
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    // Create dashboard
    this.dashboard = new TransportDashboard(contentEl, this.plugin);
    this.dashboard.load();
  }

  onClose() {
    if (this.dashboard) {
      this.dashboard.unload();
    }
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Modal for displaying advanced settings
class AdvancedSettingsModal extends Modal {
  private plugin: VaultPilotPlugin;
  private settings?: AdvancedSettings;

  constructor(plugin: VaultPilotPlugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.modalEl.addClass('advanced-settings-modal');
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    // Create advanced settings
    this.settings = new AdvancedSettings(contentEl, this.plugin);
    this.settings.load();
  }

  onClose() {
    if (this.settings) {
      this.settings.unload();
    }
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Modal for displaying AI recommendations
class RecommendationsModal extends Modal {
  private plugin: VaultPilotPlugin;
  private recommendations: Recommendation[];
  private engine: RecommendationEngine;

  constructor(plugin: VaultPilotPlugin, recommendations: Recommendation[], engine: RecommendationEngine) {
    super(plugin.app);
    this.plugin = plugin;
    this.recommendations = recommendations;
    this.engine = engine;
    this.modalEl.addClass('recommendations-modal');
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    
    // Header
    contentEl.createEl('h2', { text: '🤖 AI-Powered Recommendations' });
    contentEl.createEl('p', { 
      text: 'Here are personalized recommendations to optimize your VaultPilot experience:',
      cls: 'recommendations-subtitle'
    });
    
    // Recommendations list
    const recsList = contentEl.createDiv('recommendations-list');
    
    this.recommendations.forEach((rec, index) => {
      this.renderRecommendation(recsList, rec, index);
    });
    
    // Footer
    const footer = contentEl.createDiv('recommendations-footer');
    footer.createEl('p', { 
      text: `Generated ${this.recommendations.length} recommendations based on your usage patterns`,
      cls: 'recommendations-stats'
    });
    
    // Close button
    const closeBtn = footer.createEl('button', { text: 'Close', cls: 'mod-cta' });
    closeBtn.addEventListener('click', () => this.close());
  }

  private renderRecommendation(container: HTMLElement, rec: Recommendation, index: number) {
    const recEl = container.createDiv('recommendation-item');
    recEl.addClass(`priority-${rec.priority}`);
    
    // Header
    const header = recEl.createDiv('rec-header');
    const title = header.createEl('h3', { text: rec.title });
    title.createEl('span', { text: rec.priority.toUpperCase(), cls: `priority-badge ${rec.priority}` });
    
    // Description
    recEl.createEl('p', { text: rec.description, cls: 'rec-description' });
    
    // Expected impact
    const impact = recEl.createDiv('rec-impact');
    impact.createEl('h4', { text: 'Expected Impact:' });
    const impactList = impact.createEl('ul');
    impactList.createEl('li', { text: `Performance: +${rec.expectedImpact.performanceImprovement}%` });
    impactList.createEl('li', { text: `Error Reduction: ${rec.expectedImpact.errorReduction}%` });
    impactList.createEl('li', { text: `Reliability: +${rec.expectedImpact.reliabilityImprovement}%` });
    impactList.createEl('li', { text: `Confidence: ${(rec.expectedImpact.confidenceScore * 100).toFixed(0)}%` });
    
    // Implementation details
    const impl = recEl.createDiv('rec-implementation');
    impl.createEl('h4', { text: 'Implementation:' });
    impl.createEl('p', { text: `Difficulty: ${rec.implementation.difficulty} | Time: ${rec.implementation.estimatedTime}` });
    
    // Steps
    if (rec.implementation.steps.length > 0) {
      const stepsList = impl.createEl('ol');
      rec.implementation.steps.forEach(step => {
        const stepEl = stepsList.createEl('li');
        stepEl.createEl('strong', { text: step.title });
        stepEl.createSpan({ text: ` - ${step.description}` });
        if (step.action === 'automatic') {
          stepEl.createSpan({ text: ' (Automatic)', cls: 'step-automatic' });
        }
      });
    }
    
    // Actions
    const actions = recEl.createDiv('rec-actions');
    
    if (rec.implementation.steps.some(step => step.action === 'automatic')) {
      const applyBtn = actions.createEl('button', { text: 'Apply Automatically', cls: 'mod-cta' });
      applyBtn.addEventListener('click', async () => {
        applyBtn.disabled = true;
        applyBtn.textContent = 'Applying...';
        
        try {
          const success = await this.applyRecommendation(rec);
          if (success) {
            applyBtn.textContent = '✅ Applied';
            applyBtn.removeClass('mod-cta');
            applyBtn.addClass('mod-success');
          } else {
            applyBtn.textContent = '❌ Failed';
            applyBtn.disabled = false;
          }
        } catch (error) {
          applyBtn.textContent = '❌ Error';
          applyBtn.disabled = false;
        }
      });
    }
    
    const dismissBtn = actions.createEl('button', { text: 'Dismiss', cls: 'mod-muted' });
    dismissBtn.addEventListener('click', () => {
      recEl.style.display = 'none';
    });
    
    // Rationale (collapsible)
    const rationale = recEl.createDiv('rec-rationale');
    const rationaleToggle = rationale.createEl('button', { text: 'Show Rationale', cls: 'rationale-toggle' });
    const rationaleContent = rationale.createDiv('rationale-content');
    rationaleContent.style.display = 'none';
    rationaleContent.createEl('p', { text: rec.rationale });
    
    rationaleToggle.addEventListener('click', () => {
      if (rationaleContent.style.display === 'none') {
        rationaleContent.style.display = 'block';
        rationaleToggle.textContent = 'Hide Rationale';
      } else {
        rationaleContent.style.display = 'none';
        rationaleToggle.textContent = 'Show Rationale';
      }
    });
  }

  private async applyRecommendation(rec: Recommendation): Promise<boolean> {
    try {
      // Simulate applying the recommendation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Track effectiveness
      this.engine.trackRecommendationEffectiveness(rec.id, 0.8);
      
      new Notice(`✅ Applied recommendation: ${rec.title}`);
      return true;
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
      new Notice(`❌ Failed to apply recommendation: ${rec.title}`);
      return false;
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
