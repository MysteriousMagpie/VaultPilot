import { Modal, App, Setting, Notice } from 'obsidian';
import type VaultPilotPlugin from './main';
import { ChatMessage } from './types';

export class ChatModal extends Modal {
  plugin: VaultPilotPlugin;
  private chatContainer!: HTMLElement;
  private inputContainer!: HTMLElement;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private sendButton!: HTMLButtonElement;
  private currentConversationId: string | null = null;
  private messages: ChatMessage[] = [];
  private currentMode: 'ask' | 'agent' = 'ask';
  private modeToggleContainer!: HTMLElement;

  constructor(app: App, plugin: VaultPilotPlugin) {
    super(app);
    this.plugin = plugin;
    this.currentMode = plugin.settings.defaultMode;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vaultpilot-chat-modal');

    // Modal header
    const headerEl = contentEl.createEl('div', { cls: 'vaultpilot-chat-header' });
    headerEl.createEl('h2', { text: '🤖 VaultPilot Chat' });
    
    const toolbarEl = headerEl.createEl('div', { cls: 'vaultpilot-chat-toolbar' });
    
    // Mode toggle
    this.modeToggleContainer = toolbarEl.createEl('div', { cls: 'vaultpilot-mode-toggle' });
    this.createModeToggle();
    
    // Clear chat button
    const clearBtn = toolbarEl.createEl('button', { 
      text: 'Clear Chat',
      cls: 'mod-cta'
    });
    clearBtn.onclick = () => this.clearChat();

    // Agent selector (will be populated when agents are loaded)
    const agentSelect = toolbarEl.createEl('select', { cls: 'vaultpilot-agent-select' });
    agentSelect.createEl('option', { text: 'Auto-select Agent', value: '' });
    this.loadAgents(agentSelect);

    // Chat container
    this.chatContainer = contentEl.createEl('div', { cls: 'vaultpilot-chat-container' });
    
    // Messages area
    this.messagesEl = this.chatContainer.createEl('div', { cls: 'vaultpilot-chat-messages' });
    
    // Input container
    this.inputContainer = this.chatContainer.createEl('div', { cls: 'vaultpilot-chat-input-container' });
    
    this.inputEl = this.inputContainer.createEl('input', {
      type: 'text',
      placeholder: this.getPlaceholderText(),
      cls: 'vaultpilot-chat-input'
    });

    this.sendButton = this.inputContainer.createEl('button', {
      text: 'Send',
      cls: 'mod-cta vaultpilot-send-button'
    });

    // Event listeners
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.sendButton.onclick = () => this.sendMessage();

    // Focus the input
    this.inputEl.focus();

    // Load conversation history
    this.loadConversationHistory();

    // Add styles
    this.addStyles();
  }

  private async loadAgents(selectEl: HTMLSelectElement) {
    try {
      const response = await this.plugin.apiClient.getAgents();
      if (response.success && response.data) {
        response.data.forEach(agent => {
          const option = selectEl.createEl('option', {
            text: agent.name,
            value: agent.id
          });
        });
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  private async loadConversationHistory() {
    // Only try to load conversation history if we have a conversation ID
    if (this.currentConversationId) {
      try {
        const response = await this.plugin.apiClient.getConversationHistory(this.currentConversationId);
        if (response.success && response.data) {
          this.messages = response.data.messages;
          this.renderMessages();
        }
      } catch (error) {
        console.error('Failed to load conversation history:', error);
      }
    }
    // If no conversation ID, start fresh (no history to load)
  }

  private async sendMessage() {
    const message = this.inputEl.value.trim();
    if (!message) return;

    // Disable input while processing
    this.inputEl.disabled = true;
    this.sendButton.disabled = true;
    this.sendButton.textContent = 'Sending...';

    // Add user message to UI
    this.addMessage('user', message);
    this.inputEl.value = '';

    try {
      // Get vault context if available
      const activeFile = this.app.workspace.getActiveFile();
      let vaultContext = '';
      
      if (activeFile) {
        const content = await this.app.vault.read(activeFile);
        vaultContext = `Current file: ${activeFile.name}\n\nContent:\n${content}`;
      }

      // Send to API
      const response = await this.plugin.apiClient.chat({
        message,
        conversation_id: this.currentConversationId || undefined,
        vault_context: vaultContext,
        agent_id: this.getSelectedAgent(),
        mode: this.currentMode
      });

      if (response.success && response.data) {
        this.currentConversationId = response.data.conversation_id;
        this.addMessage('assistant', response.data.response);
      } else {
        this.addMessage('assistant', `Error: ${response.error || 'Failed to get response'}`);
        new Notice(`Chat error: ${response.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addMessage('assistant', `Error: ${errorMsg}`);
      new Notice(`Chat error: ${errorMsg}`);
    } finally {
      // Re-enable input
      this.inputEl.disabled = false;
      this.sendButton.disabled = false;
      this.sendButton.textContent = 'Send';
      this.inputEl.focus();
    }
  }

  private getSelectedAgent(): string | undefined {
    const selectEl = this.contentEl.querySelector('.vaultpilot-agent-select') as HTMLSelectElement;
    return selectEl?.value || undefined;
  }

  private addMessage(role: 'user' | 'assistant', content: string) {
    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date().toISOString()
    };

    this.messages.push(message);
    this.renderMessage(message);
    this.scrollToBottom();
  }

  private renderMessages() {
    this.messagesEl.empty();
    this.messages.forEach(message => this.renderMessage(message));
    this.scrollToBottom();
  }

  private renderMessage(message: ChatMessage) {
    const messageEl = this.messagesEl.createEl('div', {
      cls: `vaultpilot-message vaultpilot-message-${message.role}`
    });

    const roleEl = messageEl.createEl('div', {
      cls: 'vaultpilot-message-role',
      text: message.role === 'user' ? 'You' : 'VaultPilot'
    });

    const contentEl = messageEl.createEl('div', {
      cls: 'vaultpilot-message-content'
    });

    // Simple markdown rendering for basic formatting
    contentEl.innerHTML = this.renderMarkdown(message.content);

    if (message.timestamp) {
      const timeEl = messageEl.createEl('div', {
        cls: 'vaultpilot-message-time',
        text: new Date(message.timestamp).toLocaleTimeString()
      });
    }
  }

  private renderMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private scrollToBottom() {
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private clearChat() {
    this.messages = [];
    this.currentConversationId = null;
    this.messagesEl.empty();
    new Notice('Chat cleared');
  }

  private addStyles() {
    if (!document.getElementById('vaultpilot-chat-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'vaultpilot-chat-styles';
      styleEl.textContent = `
        .vaultpilot-chat-modal {
          width: 600px;
          height: 700px;
        }
        .vaultpilot-chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--background-modifier-border);
        }
        .vaultpilot-chat-toolbar {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .vaultpilot-mode-toggle {
          margin-right: 15px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          padding: 8px;
          background: var(--background-secondary);
        }
        .vaultpilot-mode-description {
          font-size: 0.8em;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .vaultpilot-mode-buttons {
          display: flex;
          gap: 4px;
        }
        .vaultpilot-mode-btn {
          padding: 4px 12px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          background: var(--background-primary);
          color: var(--text-muted);
          font-size: 0.85em;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .vaultpilot-mode-btn:hover {
          background: var(--background-primary-alt);
          color: var(--text-normal);
        }
        .vaultpilot-mode-btn.active {
          background: var(--interactive-accent);
          color: var(--text-on-accent);
          border-color: var(--interactive-accent);
        }
        .vaultpilot-agent-select {
          padding: 4px 8px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          background: var(--background-primary);
          color: var(--text-normal);
        }
        .vaultpilot-chat-container {
          display: flex;
          flex-direction: column;
          height: calc(100% - 80px);
        }
        .vaultpilot-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 8px;
          margin-bottom: 15px;
          background: var(--background-secondary);
        }
        .vaultpilot-message {
          margin-bottom: 15px;
          padding: 10px;
          border-radius: 8px;
        }
        .vaultpilot-message-user {
          background: var(--background-primary-alt);
          margin-left: 20px;
        }
        .vaultpilot-message-assistant {
          background: var(--background-primary);
          margin-right: 20px;
        }
        .vaultpilot-message-role {
          font-weight: bold;
          margin-bottom: 5px;
          color: var(--text-accent);
        }
        .vaultpilot-message-content {
          line-height: 1.4;
          color: var(--text-normal);
          user-select: text;
        }
        .vaultpilot-message-time {
          font-size: 0.8em;
          color: var(--text-muted);
          margin-top: 5px;
        }
        .vaultpilot-chat-input-container {
          display: flex;
          gap: 10px;
        }
        .vaultpilot-chat-input {
          flex: 1;
          padding: 10px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          background: var(--background-primary);
          color: var(--text-normal);
        }
        .vaultpilot-send-button {
          padding: 10px 20px;
        }
        .vaultpilot-mode-toggle {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .vaultpilot-mode-description {
          font-size: 0.9em;
          color: var(--text-muted);
        }
        .vaultpilot-mode-buttons {
          display: flex;
          gap: 10px;
        }
        .vaultpilot-mode-btn {
          flex: 1;
          padding: 8px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          background: var(--background-primary);
          color: var(--text-normal);
          cursor: pointer;
          text-align: center;
        }
        .vaultpilot-mode-btn.active {
          background: var(--accent-color);
          color: var(--background-primary);
          font-weight: bold;
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  private createModeToggle() {
    this.modeToggleContainer.empty();
    
    // Mode description
    const modeDesc = this.modeToggleContainer.createEl('div', { 
      cls: 'vaultpilot-mode-description',
      text: this.getModeDescription()
    });
    
    // Mode buttons
    const modeButtons = this.modeToggleContainer.createEl('div', { cls: 'vaultpilot-mode-buttons' });
    
    const askBtn = modeButtons.createEl('button', {
      text: 'Ask Mode',
      cls: `vaultpilot-mode-btn ${this.currentMode === 'ask' ? 'active' : ''}`
    });
    
    const agentBtn = modeButtons.createEl('button', {
      text: 'Agent Mode', 
      cls: `vaultpilot-mode-btn ${this.currentMode === 'agent' ? 'active' : ''}`
    });
    
    askBtn.onclick = () => this.setMode('ask');
    agentBtn.onclick = () => this.setMode('agent');
  }

  private setMode(mode: 'ask' | 'agent') {
    this.currentMode = mode;
    this.createModeToggle(); // Refresh the toggle UI
    if (this.inputEl) {
      this.inputEl.placeholder = this.getPlaceholderText();
    }
  }

  private getPlaceholderText(): string {
    return this.currentMode === 'ask' 
      ? 'Ask a question...'
      : 'Describe what you want to accomplish...';
  }

  private getModeDescription(): string {
    return this.currentMode === 'ask'
      ? 'Simple Q&A mode for quick questions and explanations'
      : 'Complex workflow mode for structured tasks and automation';
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
