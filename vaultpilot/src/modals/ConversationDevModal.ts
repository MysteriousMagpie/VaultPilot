/**
 * VaultPilot Enhanced Development Chat Modal
 * 
 * Provides an enhanced chat interface with full development context awareness,
 * dev-pipe transport, and intelligent conversation features.
 */

import { App, Modal, Setting, Notice } from 'obsidian';
import type VaultPilotPlugin from '../main';
import { ConversationDevService } from '../services/ConversationDevService';

export class ConversationDevModal extends Modal {
  private plugin: VaultPilotPlugin;
  private conversationDevService: ConversationDevService;
  private messagesContainer!: HTMLElement;
  private inputContainer!: HTMLElement;
  private statusContainer!: HTMLElement;
  private messages: Array<{ type: 'user' | 'assistant' | 'system'; content: string; timestamp: Date }> = [];
  private currentConversationId?: string;

  constructor(app: App, plugin: VaultPilotPlugin, conversationDevService: ConversationDevService) {
    super(app);
    this.plugin = plugin;
    this.conversationDevService = conversationDevService;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Set modal title and styling
    this.titleEl.setText('Enhanced Development Chat');
    this.modalEl.addClass('vp-conversation-dev-modal');

    // Create header with status and options
    this.createHeader();

    // Create messages area
    this.createMessagesArea();

    // Create input area
    this.createInputArea();

    // Initialize with welcome message
    this.addSystemMessage(
      'Welcome to Enhanced Development Chat! I have full context awareness of your project, ' +
      'including active files, project structure, and development environment. ' +
      'Ask me anything about your code, architecture, or development workflow.'
    );

    // Show current context summary
    this.showContextSummary();
  }

  private createHeader() {
    const headerEl = this.contentEl.createEl('div', { cls: 'vp-dev-chat-header' });

    // Status indicator
    this.statusContainer = headerEl.createEl('div', { cls: 'vp-dev-chat-status' });
    this.updateStatus();

    // Options
    const optionsEl = headerEl.createEl('div', { cls: 'vp-dev-chat-options' });

    new Setting(optionsEl)
      .setName('Conversation Type')
      .setDesc('Set the type of development conversation')
      .addDropdown(dropdown => 
        dropdown
          .addOption('general', 'General Discussion')
          .addOption('code_review', 'Code Review')
          .addOption('debugging', 'Debugging Session')
          .addOption('architecture', 'Architecture Planning')
          .addOption('documentation', 'Documentation Help')
          .setValue('general')
          .onChange(value => {
            this.updateConversationType(value as any);
          })
      );

    // Context refresh button
    const refreshBtn = optionsEl.createEl('button', {
      text: '🔄 Refresh Context',
      cls: 'mod-cta'
    });
    refreshBtn.addEventListener('click', () => this.refreshContext());

    // Insights button
    const insightsBtn = optionsEl.createEl('button', {
      text: '💡 Show Insights',
      cls: 'mod-cta'
    });
    insightsBtn.addEventListener('click', () => this.showInsights());
  }

  private createMessagesArea() {
    this.messagesContainer = this.contentEl.createEl('div', { 
      cls: 'vp-dev-chat-messages'
    });
  }

  private createInputArea() {
    this.inputContainer = this.contentEl.createEl('div', { cls: 'vp-dev-chat-input' });

    const inputWrapper = this.inputContainer.createEl('div', { cls: 'vp-input-wrapper' });
    
    const textarea = inputWrapper.createEl('textarea', {
      placeholder: 'Ask me about your code, architecture, or development workflow...',
      cls: 'vp-chat-input'
    });

    const sendBtn = inputWrapper.createEl('button', {
      text: 'Send',
      cls: 'mod-cta vp-send-btn'
    });

    // Event handlers
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(textarea.value);
        textarea.value = '';
      }
    });

    sendBtn.addEventListener('click', () => {
      this.sendMessage(textarea.value);
      textarea.value = '';
    });

    // Add quick action buttons
    this.createQuickActions();
  }

  private createQuickActions() {
    const actionsEl = this.inputContainer.createEl('div', { cls: 'vp-quick-actions' });
    actionsEl.createEl('span', { text: 'Quick Actions:', cls: 'vp-quick-label' });

    const actions = [
      { text: '🔍 Review Active File', action: 'review-active-file' },
      { text: '🏗️ Analyze Architecture', action: 'analyze-architecture' },
      { text: '🐛 Debug Current Code', action: 'debug-code' },
      { text: '📚 Generate Docs', action: 'generate-docs' },
      { text: '🧪 Suggest Tests', action: 'suggest-tests' }
    ];

    actions.forEach(({ text, action }) => {
      const btn = actionsEl.createEl('button', {
        text,
        cls: 'vp-quick-action-btn'
      });
      btn.addEventListener('click', () => this.executeQuickAction(action));
    });
  }

  private updateStatus() {
    if (!this.statusContainer) return;

    const status = this.conversationDevService.getStatus();
    const isReady = status.initialized && status.contextServiceReady;

    this.statusContainer.empty();
    
    const statusIcon = this.statusContainer.createEl('span', {
      cls: `vp-status-icon ${isReady ? 'ready' : 'not-ready'}`
    });
    statusIcon.textContent = isReady ? '🟢' : '🟡';

    const statusText = this.statusContainer.createEl('span', { cls: 'vp-status-text' });
    statusText.textContent = isReady ? 'Enhanced Dev Chat Ready' : 'Initializing...';

    if (status.devPipeReady) {
      const devPipeIcon = this.statusContainer.createEl('span', {
        cls: 'vp-devpipe-icon',
        text: '🚀'
      });
      devPipeIcon.title = 'DevPipe Transport Active';
    }
  }

  private async showContextSummary() {
    try {
      const insights = await this.conversationDevService.getConversationInsights();
      
      let contextInfo = `📋 **Current Context:**\n`;
      contextInfo += `• Relevance Score: ${Math.round(insights.contextRelevance * 100)}%\n`;
      contextInfo += `• Project Status: ${insights.projectStatus}\n`;
      
      if (insights.suggestedActions.length > 0) {
        contextInfo += `• Suggested Actions: ${insights.suggestedActions.slice(0, 3).join(', ')}`;
      }

      this.addSystemMessage(contextInfo);
    } catch (error) {
      console.error('Failed to show context summary:', error);
    }
  }

  private async sendMessage(message: string) {
    if (!message.trim()) return;

    // Add user message to UI
    this.addMessage('user', message);

    // Show thinking indicator
    const thinkingEl = this.addMessage('assistant', '🤔 Thinking...');

    try {
      // Send via conversation dev service with enhanced context
      const response = await this.conversationDevService.chat(message, {
        conversation_id: this.currentConversationId,
        conversation_type: this.getSelectedConversationType()
      });

      // Remove thinking indicator
      thinkingEl.remove();

      if (response.success && response.data) {
        this.addMessage('assistant', response.data.response);
        this.currentConversationId = response.data.conversation_id;
      } else {
        this.addMessage('assistant', `❌ Error: ${response.error || 'Unknown error'}`);
      }

    } catch (error) {
      thinkingEl.remove();
      this.addMessage('assistant', `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Update status after conversation
    this.updateStatus();
  }

  private async executeQuickAction(action: string) {
    const actionMessages: Record<string, string> = {
      'review-active-file': 'Please review my currently active file and provide feedback on code quality, potential improvements, and best practices.',
      'analyze-architecture': 'Analyze the overall architecture of my project. What patterns do you see? What improvements would you suggest?',
      'debug-code': 'Help me debug any issues in my current code. Look for potential bugs, edge cases, or logic errors.',
      'generate-docs': 'Generate comprehensive documentation for my current file or project. Include usage examples and API documentation.',
      'suggest-tests': 'Suggest test cases for my current code. What edge cases should I test? What testing patterns would work best?'
    };

    const message = actionMessages[action];
    if (message) {
      await this.sendMessage(message);
    }
  }

  private addMessage(type: 'user' | 'assistant' | 'system', content: string): HTMLElement {
    const messageEl = this.messagesContainer.createEl('div', {
      cls: `vp-message vp-message-${type}`
    });

    const avatarEl = messageEl.createEl('div', { cls: 'vp-message-avatar' });
    avatarEl.textContent = type === 'user' ? '👤' : type === 'assistant' ? '🤖' : 'ℹ️';

    const contentEl = messageEl.createEl('div', { cls: 'vp-message-content' });
    
    // Handle markdown-like formatting
    const formattedContent = this.formatMessageContent(content);
    contentEl.innerHTML = formattedContent;

    const timestampEl = messageEl.createEl('div', { cls: 'vp-message-timestamp' });
    timestampEl.textContent = new Date().toLocaleTimeString();

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Store message
    this.messages.push({ type, content, timestamp: new Date() });

    return messageEl;
  }

  private addSystemMessage(content: string): HTMLElement {
    return this.addMessage('system', content);
  }

  private formatMessageContent(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private async refreshContext() {
    this.conversationDevService.clearContextCache();
    this.addSystemMessage('🔄 Context refreshed! I now have the latest information about your project.');
    await this.showContextSummary();
  }

  private async showInsights() {
    try {
      const insights = await this.conversationDevService.getConversationInsights();
      
      let insightsText = '💡 **Development Insights:**\n\n';
      insightsText += `**Context Relevance:** ${Math.round(insights.contextRelevance * 100)}%\n`;
      insightsText += `**Project Status:** ${insights.projectStatus}\n\n`;
      
      if (insights.recommendations.length > 0) {
        insightsText += '**Recommendations:**\n';
        insights.recommendations.forEach(rec => {
          insightsText += `• ${rec}\n`;
        });
        insightsText += '\n';
      }
      
      if (insights.suggestedActions.length > 0) {
        insightsText += '**Suggested Actions:**\n';
        insights.suggestedActions.forEach(action => {
          insightsText += `• ${action}\n`;
        });
      }

      this.addSystemMessage(insightsText);
    } catch (error) {
      this.addSystemMessage('❌ Failed to generate insights. Please try again.');
    }
  }

  private updateConversationType(type: string) {
    this.addSystemMessage(`🔄 Conversation type changed to: ${type.replace('_', ' ')}`);
  }

  private getSelectedConversationType(): 'general' | 'code_review' | 'debugging' | 'architecture' | 'documentation' {
    const dropdown = this.contentEl.querySelector('select') as HTMLSelectElement;
    const value = dropdown?.value || 'general';
    
    // Ensure the value is one of the valid types
    if (['general', 'code_review', 'debugging', 'architecture', 'documentation'].includes(value)) {
      return value as 'general' | 'code_review' | 'debugging' | 'architecture' | 'documentation';
    }
    
    return 'general';
  }

  onClose() {
    // Clean up
    this.contentEl.empty();
  }
}