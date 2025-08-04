import { Modal, App, Setting, Notice } from 'obsidian';
import type VaultPilotPlugin from './main';
import { ChatMessage, Intent, StreamMessage } from './types';
import { getActiveMarkdown } from './vault-utils';

export class ChatModal extends Modal {
  plugin: VaultPilotPlugin;
  private chatContainer!: HTMLElement;
  private inputContainer!: HTMLElement;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private sendButton!: HTMLButtonElement;
  private currentConversationId: string | null = null;
  private messages: ChatMessage[] = [];

  constructor(app: App, plugin: VaultPilotPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vaultpilot-chat-modal');

    // Modal header
    const headerEl = contentEl.createEl('div', { cls: 'vaultpilot-chat-header' });
    headerEl.createEl('h2', { text: '🤖 VaultPilot Chat' });
    
    const toolbarEl = headerEl.createEl('div', { cls: 'vaultpilot-chat-toolbar' });
    
    // Add info about automatic mode detection
    const autoModeInfo = toolbarEl.createEl('div', { 
      cls: 'vaultpilot-auto-mode-info',
      text: '⚡ Automatic mode detection enabled'
    });
    
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
      placeholder: 'Ask a question or describe what you want to accomplish...',
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
      console.log('VaultPilot: Loading agents...');
      const response = await this.plugin.apiClient.getAgents();
      console.log('VaultPilot: getAgents response:', response);
      
      if (response.success && response.data) {
        console.log('VaultPilot: response.data type:', typeof response.data);
        console.log('VaultPilot: response.data content:', response.data);
        
        let agents: any[] = [];
        
        // Check if data is directly an array
        if (Array.isArray(response.data)) {
          agents = response.data;
        } 
        // Check if data has an 'agents' property with an array
        else if (response.data && typeof response.data === 'object') {
          const dataObj = response.data as any;
          if (dataObj.agents && Array.isArray(dataObj.agents)) {
            agents = dataObj.agents;
          } else if (dataObj.data && Array.isArray(dataObj.data)) {
            agents = dataObj.data;
          }
        }
        
        if (agents.length > 0) {
          console.log('VaultPilot: Found', agents.length, 'agents');
          agents.forEach(agent => {
            const option = selectEl.createEl('option', {
              text: agent.name,
              value: agent.id
            });
          });
        } else {
          console.log('VaultPilot: No agents found in response');
          // Add a default option indicating no agents
          const option = selectEl.createEl('option', {
            text: 'No agents available',
            value: ''
          });
          option.disabled = true;
        }
      } else {
        console.error('Failed to load agents: API returned error or no data:', response);
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
      // ── fetch context & intent in parallel ──────────────────────────────
      const [context, intentRes] = await Promise.all([
        getActiveMarkdown(),          // returns string | null
        this.plugin.apiClient.classifyIntent(message)  // POST /intelligence/parse
      ]);

      // build a generic payload; context may be null/empty
      const payload = { message, context };

      // Show intent detection in UI if debug mode is enabled
      if (this.plugin.settings.showIntentDebug) {
        this.showIntentDebug(intentRes.intent);
      }

      let response;
      
      if (intentRes.intent === "agent") {
        response = await this.plugin.apiClient.runWorkflow(payload);     // POST /workflow
        
        if (response.success && response.data) {
          this.addMessage('assistant', `⚙️ Agent Mode (auto-detected)\n\n${response.data.result}`);
        } else {
          this.addMessage('assistant', `Error in agent mode: ${response.error || 'Failed to get response'}`);
        }
        
        if (!response.success) {
          new Notice(`Chat error: ${response.error}`);
        }
      } else {
        // Use streaming for chat responses
        await this.handleStreamingResponse(payload);
      }

      // Warn user if they had context disabled
      if (!context?.length) {
        new Notice("⚠️ No vault content was sent; replies may be generic.");
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

  private async handleStreamingResponse(payload: { message: string; context: string | null }) {
    try {
      // Create a streaming message placeholder
      const streamingMessageEl = this.addStreamingMessage('assistant');
      
      // Start the stream
      const stream = await this.plugin.apiClient.streamChat({
        message: payload.message,
        context: payload.context,
        conversation_id: this.currentConversationId || undefined,
        agent_id: this.getSelectedAgent()
      });

      await this.processStreamingResponse(stream, streamingMessageEl);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.addMessage('assistant', `Error: ${errorMsg}`);
      new Notice(`Streaming error: ${errorMsg}`);
    }
  }

  private addStreamingMessage(role: 'user' | 'assistant'): HTMLElement {
    const messageEl = this.messagesEl.createEl('div', {
      cls: `vaultpilot-message vaultpilot-message-${role} vaultpilot-message-streaming`
    });

    const roleEl = messageEl.createEl('div', {
      cls: 'vaultpilot-message-role',
      text: role === 'user' ? 'You' : 'VaultPilot'
    });

    const contentEl = messageEl.createEl('div', {
      cls: 'vaultpilot-message-content'
    });

    // Add typing indicator
    const typingEl = contentEl.createEl('div', {
      cls: 'vaultpilot-typing-indicator',
      text: 'typing...'
    });

    const timeEl = messageEl.createEl('div', {
      cls: 'vaultpilot-message-time',
      text: new Date().toLocaleTimeString()
    });

    this.scrollToBottom();
    return messageEl;
  }

  private async processStreamingResponse(stream: ReadableStream, messageEl: HTMLElement) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const contentEl = messageEl.querySelector('.vaultpilot-message-content') as HTMLElement;
    
    // Remove typing indicator
    const typingEl = contentEl.querySelector('.vaultpilot-typing-indicator');
    if (typingEl) {
      typingEl.remove();
    }

    let accumulatedContent = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6)) as StreamMessage;
              
              if (data.type === 'chunk' && data.content) {
                accumulatedContent += data.content;
                contentEl.innerHTML = this.renderMarkdown(accumulatedContent);
                this.scrollToBottom();
              } else if (data.type === 'complete') {
                // Update conversation ID if provided
                if (data.conversation_id) {
                  this.currentConversationId = data.conversation_id;
                }
                // Mark message as complete
                messageEl.removeClass('vaultpilot-message-streaming');
                break;
              } else if (data.type === 'error') {
                accumulatedContent += `\n\nError: ${data.error}`;
                contentEl.innerHTML = this.renderMarkdown(accumulatedContent);
                messageEl.removeClass('vaultpilot-message-streaming');
                break;
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming chunk:', parseError);
            }
          }
        }
      }
      
      // Add to messages array
      const message: ChatMessage = {
        role: 'assistant',
        content: accumulatedContent,
        timestamp: new Date().toISOString()
      };
      this.messages.push(message);
      
    } catch (error) {
      console.error('Streaming error:', error);
      contentEl.innerHTML = this.renderMarkdown(`Error during streaming: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      reader.releaseLock();
      messageEl.removeClass('vaultpilot-message-streaming');
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
        .vaultpilot-auto-mode-info {
          margin-right: 15px;
          padding: 8px 12px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          background: var(--background-secondary);
          font-size: 0.85em;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
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
        .vaultpilot-message-streaming {
          border-left: 3px solid var(--color-accent);
          animation: pulse 2s infinite;
        }
        .vaultpilot-typing-indicator {
          color: var(--text-muted);
          font-style: italic;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
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
        .vaultpilot-intent-debug {
          background: var(--background-modifier-success);
          color: var(--text-normal);
          padding: 8px 12px;
          border-radius: 4px;
          margin: 8px 0;
          font-size: 0.85em;
          text-align: center;
          border: 1px solid var(--background-modifier-border-hover);
          animation: fadeInOut 3s ease-in-out;
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  private showIntentDebug(intent: string) {
    // Create a subtle notification showing the detected intent
    const debugEl = this.messagesEl.createEl('div', {
      cls: 'vaultpilot-intent-debug',
      text: `🔍 Intent detected: ${intent === 'agent' ? '⚙️ Agent Mode' : '💬 Ask Mode'}`
    });
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      debugEl.remove();
    }, 3000);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
