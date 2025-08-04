/**
 * VaultPilot Chat Mode Component
 * 
 * Extracted from MainPanel.ts - Handles chat interface functionality
 * with context awareness and AI integration.
 */

import { Notice } from 'obsidian';
import { BaseModeComponent } from './BaseModeComponent';
import { createButton } from '../../../design-system/components/core/Button';
import type { 
  ModeAction, 
  ModeContext, 
  ContextSource 
} from '../types';

export class ChatModeComponent extends BaseModeComponent {
  private chatContainer?: HTMLElement;
  private messagesArea?: HTMLElement;
  private chatInput?: HTMLTextAreaElement;
  private messages: Array<{type: 'user' | 'assistant'; content: string; timestamp: Date}> = [];

  constructor() {
    super('chat');
  }

  protected async initialize(): Promise<void> {
    // Any one-time initialization logic
    this.messages = [];
  }

  protected async renderContent(): Promise<void> {
    // Create chat interface
    this.chatContainer = this.container.createEl('div', { cls: 'vp-chat-interface' });
    
    // Render chat components
    this.renderChatHeader();
    this.renderMessagesArea();
    this.renderInputArea();
  }

  protected getModeActions(): ModeAction[] {
    return [
      {
        id: 'clear-chat',
        label: 'Clear Chat',
        icon: 'trash-2',
        callback: () => this.clearChat(),
        enabled: this.messages.length > 0
      },
      {
        id: 'export-chat',
        label: 'Export Chat',
        icon: 'download', 
        callback: () => this.exportChat(),
        enabled: this.messages.length > 0
      },
      {
        id: 'new-conversation',
        label: 'New Conversation',
        icon: 'plus',
        callback: () => this.startNewConversation(),
        enabled: true
      }
    ];
  }

  protected onContextUpdate(sources: ContextSource[]): void {
    // Update context info in chat header
    const contextInfo = this.container.querySelector('.vp-context-summary');
    if (contextInfo) {
      contextInfo.textContent = `Using ${sources.length} context sources`;
    }
  }

  protected onCleanup(): void {
    // Clean up any event listeners or resources
    this.chatContainer = undefined;
    this.messagesArea = undefined;
    this.chatInput = undefined;
  }

  private renderChatHeader(): void {
    if (!this.chatContainer) return;

    const chatHeader = this.chatContainer.createEl('div', { cls: 'vp-chat-header' });
    chatHeader.createEl('h3', { text: 'AI Assistant' });
    
    const contextInfo = chatHeader.createEl('div', { cls: 'vp-chat-context-info' });
    contextInfo.createEl('span', { 
      text: `Using ${this.context.contextSources.length} context sources`,
      cls: 'vp-context-summary'
    });

    // Add context sources details (if any)
    if (this.context.contextSources.length > 0) {
      const sourcesList = contextInfo.createEl('div', { cls: 'vp-context-sources' });
      this.context.contextSources.forEach(source => {
        const sourceEl = sourcesList.createEl('span', {
          cls: `vp-context-source vp-source-${source.type}`,
          text: source.name
        });
        if (source.active) {
          sourceEl.addClass('vp-source-active');
        }
      });
    }
  }

  private renderMessagesArea(): void {
    if (!this.chatContainer) return;

    this.messagesArea = this.chatContainer.createEl('div', { 
      cls: 'vp-chat-messages',
      attr: { 
        'role': 'log', 
        'aria-label': 'Chat Messages',
        'aria-live': 'polite'
      }
    });

    // Render existing messages
    this.messages.forEach(msg => {
      this.addMessageToUI(msg.type, msg.content, msg.timestamp);
    });

    // Show welcome message if no messages
    if (this.messages.length === 0) {
      this.addWelcomeMessage();
    }
  }

  private renderInputArea(): void {
    if (!this.chatContainer) return;

    const inputArea = this.chatContainer.createEl('div', { cls: 'vp-chat-input-area' });
    
    const inputContainer = inputArea.createEl('div', { cls: 'vp-chat-input-container' });
    this.chatInput = inputContainer.createEl('textarea', {
      cls: 'vp-chat-input',
      attr: { 
        placeholder: 'Ask anything about your vault...',
        'aria-label': 'Chat message input',
        rows: '1'
      }
    });

    const sendButton = createButton(inputContainer, {
      variant: 'primary',
      size: 'sm',
      icon: 'send',
      ariaLabel: 'Send message',
      onClick: () => this.sendMessage()
    });

    // Auto-resize textarea
    this.chatInput.addEventListener('input', () => {
      this.chatInput!.style.height = 'auto';
      this.chatInput!.style.height = this.chatInput!.scrollHeight + 'px';
    });

    // Send on Enter (Shift+Enter for new line)
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Focus input on load
    setTimeout(() => this.chatInput?.focus(), 100);
  }

  private addWelcomeMessage(): void {
    const welcomeText = `Welcome! I'm your AI assistant with full context awareness of your vault. 

I can help you with:
• Analyzing your notes and documents
• Finding connections between ideas
• Answering questions about your content
• Generating summaries and insights

Just ask me anything!`;

    this.addMessageToUI('assistant', welcomeText);
  }

  private async sendMessage(): Promise<void> {
    if (!this.chatInput || !this.context.plugin) return;
    
    const message = this.chatInput.value.trim();
    if (!message) return;

    // Clear input and reset height
    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';

    // Add user message to UI
    const userMsg = { type: 'user' as const, content: message, timestamp: new Date() };
    this.messages.push(userMsg);
    this.addMessageToUI('user', message);

    // Show thinking indicator
    const thinkingEl = this.addThinkingIndicator();

    try {
      // Prepare chat request with context
      const contextSummary = this.prepareContextSummary();
      
      const response = await this.context.plugin.apiClient.chat({
        message,
        vault_context: contextSummary,
        mode: 'ask' // Default to ask mode for chat
      });

      // Remove thinking indicator
      thinkingEl.remove();

      if (response.success && response.data) {
        const assistantMsg = { 
          type: 'assistant' as const, 
          content: response.data.response, 
          timestamp: new Date() 
        };
        this.messages.push(assistantMsg);
        this.addMessageToUI('assistant', response.data.response);
      } else {
        this.addMessageToUI('assistant', `Sorry, I encountered an error: ${response.error || 'Unknown error'}`);
      }

    } catch (error) {
      thinkingEl.remove();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.addMessageToUI('assistant', `I'm sorry, but I encountered an error: ${errorMessage}`);
      console.error('Chat error:', error);
    }

    // Scroll to bottom
    this.scrollToBottom();
  }

  private addMessageToUI(type: 'user' | 'assistant', content: string, timestamp?: Date): HTMLElement {
    if (!this.messagesArea) return document.createElement('div');

    const messageEl = this.messagesArea.createEl('div', {
      cls: `vp-chat-message vp-message-${type}`
    });

    const avatarEl = messageEl.createEl('div', { cls: 'vp-message-avatar' });
    avatarEl.textContent = type === 'user' ? '👤' : '🤖';

    const contentEl = messageEl.createEl('div', { cls: 'vp-message-content' });
    
    // Handle markdown-like formatting
    const formattedContent = this.formatMessageContent(content);
    contentEl.innerHTML = formattedContent;

    const timestampEl = messageEl.createEl('div', { cls: 'vp-message-timestamp' });
    timestampEl.textContent = (timestamp || new Date()).toLocaleTimeString();

    // Add animation
    messageEl.style.opacity = '0';
    messageEl.style.transform = 'translateY(20px)';
    setTimeout(() => {
      messageEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      messageEl.style.opacity = '1';
      messageEl.style.transform = 'translateY(0)';
    }, 10);

    return messageEl;
  }

  private addThinkingIndicator(): HTMLElement {
    const thinkingEl = this.addMessageToUI('assistant', '🤔 Thinking...');
    thinkingEl.addClass('vp-thinking-indicator');
    
    // Add typing animation
    const dots = thinkingEl.querySelector('.vp-message-content');
    if (dots) {
      dots.innerHTML = '🤔 <span class="vp-typing-dots">Thinking<span>.</span><span>.</span><span>.</span></span>';
    }
    
    return thinkingEl;
  }

  private formatMessageContent(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private prepareContextSummary(): string {
    const sources = this.context.contextSources;
    if (sources.length === 0) return 'No specific context sources selected.';

    let summary = `Context sources (${sources.length}):\n`;
    sources.forEach(source => {
      summary += `- ${source.type}: ${source.name}`;
      if (source.preview) {
        summary += ` (${source.preview.substring(0, 100)}...)`;
      }
      summary += '\n';
    });

    // Add active file info if available
    if (this.context.activeFile) {
      summary += `\nActive file: ${this.context.activeFile.name}`;
    }

    return summary;
  }

  private scrollToBottom(): void {
    if (this.messagesArea) {
      this.messagesArea.scrollTop = this.messagesArea.scrollHeight;
    }
  }

  private clearChat(): void {
    this.messages = [];
    if (this.messagesArea) {
      this.messagesArea.empty();
      this.addWelcomeMessage();
    }
    new Notice('Chat cleared');
  }

  private async exportChat(): Promise<void> {
    if (this.messages.length === 0) {
      new Notice('No messages to export');
      return;
    }

    try {
      let exportContent = '# Chat Export\n\n';
      exportContent += `Exported: ${new Date().toISOString()}\n\n`;
      
      this.messages.forEach((msg, index) => {
        const role = msg.type === 'user' ? 'You' : 'Assistant';
        const time = msg.timestamp.toLocaleTimeString();
        exportContent += `## ${role} (${time})\n\n${msg.content}\n\n---\n\n`;
      });

      const filename = `chat-export-${new Date().toISOString().split('T')[0]}.md`;
      
      // Create and download file
      const blob = new Blob([exportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      new Notice(`Chat exported as ${filename}`);
    } catch (error) {
      new Notice('Failed to export chat');
      console.error('Export error:', error);
    }
  }

  private startNewConversation(): void {
    this.clearChat();
    this.chatInput?.focus();
  }
}