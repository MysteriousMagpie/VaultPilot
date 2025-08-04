/**
 * VaultPilot Conversation Insights Modal
 * 
 * Displays detailed insights about the current development context,
 * conversation patterns, and development recommendations.
 */

import { App, Modal } from 'obsidian';

export interface ConversationInsights {
  contextRelevance: number;
  suggestedActions: string[];
  projectStatus: string;
  recommendations: string[];
}

export class ConversationInsightsModal extends Modal {
  private insights: ConversationInsights;

  constructor(app: App, insights: ConversationInsights) {
    super(app);
    this.insights = insights;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Set modal title and styling
    this.titleEl.setText('Development Conversation Insights');
    this.modalEl.addClass('vp-insights-modal');

    // Create main content
    this.createInsightsContent();
  }

  private createInsightsContent() {
    const { contentEl } = this;

    // Context Relevance Section
    const relevanceSection = contentEl.createEl('div', { cls: 'vp-insights-section' });
    relevanceSection.createEl('h3', { text: '🎯 Context Relevance' });
    
    const relevanceContainer = relevanceSection.createEl('div', { cls: 'vp-relevance-container' });
    this.createRelevanceBar(relevanceContainer);
    
    const relevanceText = relevanceContainer.createEl('p', { cls: 'vp-relevance-text' });
    const percentage = Math.round(this.insights.contextRelevance * 100);
    relevanceText.textContent = `Your development context is ${percentage}% relevant for AI assistance.`;
    
    if (percentage >= 80) {
      relevanceText.innerHTML += '<br><span class="vp-relevance-good">🟢 Excellent context awareness!</span>';
    } else if (percentage >= 60) {
      relevanceText.innerHTML += '<br><span class="vp-relevance-medium">🟡 Good context available.</span>';
    } else {
      relevanceText.innerHTML += '<br><span class="vp-relevance-low">🔴 Consider adding more context (open files, make selections).</span>';
    }

    // Project Status Section
    const statusSection = contentEl.createEl('div', { cls: 'vp-insights-section' });
    statusSection.createEl('h3', { text: '📊 Project Status' });
    
    const statusCard = statusSection.createEl('div', { cls: 'vp-status-card' });
    statusCard.createEl('div', { 
      text: this.insights.projectStatus,
      cls: 'vp-status-text'
    });

    // Suggested Actions Section
    if (this.insights.suggestedActions.length > 0) {
      const actionsSection = contentEl.createEl('div', { cls: 'vp-insights-section' });
      actionsSection.createEl('h3', { text: '⚡ Suggested Actions' });
      
      const actionsList = actionsSection.createEl('ul', { cls: 'vp-actions-list' });
      this.insights.suggestedActions.forEach(action => {
        const listItem = actionsList.createEl('li', { cls: 'vp-action-item' });
        listItem.textContent = action;
      });
    }

    // Recommendations Section
    if (this.insights.recommendations.length > 0) {
      const recommendationsSection = contentEl.createEl('div', { cls: 'vp-insights-section' });
      recommendationsSection.createEl('h3', { text: '💡 Development Recommendations' });
      
      const recommendationsList = recommendationsSection.createEl('ul', { cls: 'vp-recommendations-list' });
      this.insights.recommendations.forEach(recommendation => {
        const listItem = recommendationsList.createEl('li', { cls: 'vp-recommendation-item' });
        listItem.textContent = recommendation;
      });
    }

    // Tips Section
    const tipsSection = contentEl.createEl('div', { cls: 'vp-insights-section' });
    tipsSection.createEl('h3', { text: '💭 Pro Tips' });
    
    const tipsList = tipsSection.createEl('ul', { cls: 'vp-tips-list' });
    const tips = [
      'Select code before asking questions for more targeted assistance',
      'Open relevant files to provide better context for architectural discussions',
      'Use the "Enhanced Development Chat" for context-aware conversations',
      'Enable DevPipe transport for faster, more intelligent responses',
      'Regular context refresh keeps insights current with your work'
    ];
    
    tips.forEach(tip => {
      const listItem = tipsList.createEl('li', { cls: 'vp-tip-item' });
      listItem.textContent = tip;
    });

    // Action Buttons
    this.createActionButtons();
  }

  private createRelevanceBar(container: HTMLElement) {
    const barContainer = container.createEl('div', { cls: 'vp-relevance-bar-container' });
    
    const barBackground = barContainer.createEl('div', { cls: 'vp-relevance-bar-bg' });
    const barFill = barBackground.createEl('div', { cls: 'vp-relevance-bar-fill' });
    
    const percentage = this.insights.contextRelevance * 100;
    barFill.style.width = `${percentage}%`;
    
    // Color coding
    if (percentage >= 80) {
      barFill.style.backgroundColor = '#4ade80'; // green
    } else if (percentage >= 60) {
      barFill.style.backgroundColor = '#fbbf24'; // yellow
    } else {
      barFill.style.backgroundColor = '#f87171'; // red
    }
    
    const percentageLabel = barContainer.createEl('div', { 
      cls: 'vp-percentage-label',
      text: `${Math.round(percentage)}%`
    });
  }

  private createActionButtons() {
    const buttonsContainer = this.contentEl.createEl('div', { cls: 'vp-insights-buttons' });
    
    const enhancedChatBtn = buttonsContainer.createEl('button', {
      text: '💬 Start Enhanced Chat',
      cls: 'mod-cta'
    });
    enhancedChatBtn.addEventListener('click', () => {
      this.close();
      // Trigger enhanced chat command
      (this.app as any).commands.executeCommandById('vaultpilot:dev-chat-enhanced');
    });
    
    const refreshBtn = buttonsContainer.createEl('button', {
      text: '🔄 Refresh Insights',
      cls: 'mod-muted'
    });
    refreshBtn.addEventListener('click', () => {
      this.close();
      // Trigger insights refresh
      (this.app as any).commands.executeCommandById('vaultpilot:conversation-insights');
    });
    
    const closeBtn = buttonsContainer.createEl('button', {
      text: 'Close',
      cls: 'mod-muted'
    });
    closeBtn.addEventListener('click', () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}