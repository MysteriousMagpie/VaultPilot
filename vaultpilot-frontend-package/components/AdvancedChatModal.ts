import { Modal, App, Setting, Notice, TFile, MarkdownView } from 'obsidian';
import type VaultPilotPlugin from '../main';
import { ChatMessage, Intent, Agent } from '../types';
import { getActiveMarkdown } from '../vault-utils';

// Extended agent interface for UI features
interface ExtendedAgent extends Agent {
  category?: string;
  evolutionLevel?: number;
  performance?: number;
  status?: 'active' | 'learning' | 'idle';
}

interface AgentApiResponse {
  data: ExtendedAgent[] | { agents: ExtendedAgent[] };
  status?: string;
  message?: string;
}

interface ConversationBranch {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  agentId: string;
}

interface MultiModalAsset {
  type: 'text' | 'image' | 'audio' | 'file';
  content: string | File;
  metadata?: any;
}

export class AdvancedChatModal extends Modal {
  plugin: VaultPilotPlugin;
  private chatContainer!: HTMLElement;
  private inputContainer!: HTMLElement;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private sendButton!: HTMLButtonElement;
  private agentSelectorEl!: HTMLSelectElement;
  private conversationBranchesEl!: HTMLElement;
  private multiModalInputEl!: HTMLElement;
  private contextPanel!: HTMLElement;
  
  private currentConversationId: string | null = null;
  private messages: ChatMessage[] = [];
  private availableAgents: ExtendedAgent[] = [];
  private conversationBranches: ConversationBranch[] = [];
  private multiModalAssets: MultiModalAsset[] = [];
  private isStreaming = false;

  constructor(app: App, plugin: VaultPilotPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('vaultpilot-advanced-chat-modal');

    // Create main layout
    const mainLayout = contentEl.createEl('div', { cls: 'chat-main-layout' });

    // Left sidebar for conversation management
    const leftSidebar = mainLayout.createEl('div', { cls: 'chat-left-sidebar' });
    this.createConversationSidebar(leftSidebar);

    // Main chat area
    const chatArea = mainLayout.createEl('div', { cls: 'chat-main-area' });
    this.createChatArea(chatArea);

    // Right sidebar for context and tools
    const rightSidebar = mainLayout.createEl('div', { cls: 'chat-right-sidebar' });
    this.createContextSidebar(rightSidebar);

    // Load initial data
    this.loadAgents();
    this.loadConversationHistory();

    // Apply styles
    this.addStyles();

    // Focus input
    setTimeout(() => this.inputEl.focus(), 100);
  }

  private createConversationSidebar(container: HTMLElement) {
    // Header
    const header = container.createEl('div', { cls: 'sidebar-header' });
    header.createEl('h3', { text: 'Conversations' });
    
    const newChatBtn = header.createEl('button', { 
      text: '+ New Chat',
      cls: 'new-chat-btn'
    });
    newChatBtn.onclick = () => this.startNewConversation();

    // Conversation branches
    this.conversationBranchesEl = container.createEl('div', { cls: 'conversation-branches' });
    
    // Recent conversations placeholder
    this.conversationBranchesEl.createEl('div', { 
      cls: 'conversation-placeholder',
      text: 'No recent conversations'
    });

    // Agent evolution status
    const evolutionSection = container.createEl('div', { cls: 'evolution-section' });
    evolutionSection.createEl('h4', { text: 'Agent Evolution' });
    
    const evolutionList = evolutionSection.createEl('div', { cls: 'evolution-list' });
    evolutionList.createEl('div', { 
      cls: 'evolution-placeholder',
      text: 'Loading agent status...'
    });
  }

  private createChatArea(container: HTMLElement) {
    // Chat header with agent selector
    const chatHeader = container.createEl('div', { cls: 'chat-header' });
    
    const titleSection = chatHeader.createEl('div', { cls: 'chat-title-section' });
    titleSection.createEl('h2', { text: '🤖 VaultPilot Advanced Chat' });
    
    const statusIndicator = titleSection.createEl('div', { cls: 'chat-status' });
    statusIndicator.createEl('span', { cls: 'status-dot online' });
    statusIndicator.createEl('span', { text: 'Connected to EvoAgentX' });

    // Agent selector with evolution info
    const agentSection = chatHeader.createEl('div', { cls: 'agent-section' });
    agentSection.createEl('label', { text: 'Select Agent:' });
    
    this.agentSelectorEl = agentSection.createEl('select', { cls: 'agent-selector' });
    this.agentSelectorEl.createEl('option', { text: 'Auto-select Agent', value: '' });
    
    const agentInfo = agentSection.createEl('div', { cls: 'agent-info' });
    agentInfo.style.display = 'none';

    this.agentSelectorEl.onchange = () => this.onAgentChange();

    // Toolbar
    const toolbar = chatHeader.createEl('div', { cls: 'chat-toolbar' });
    
    const clearBtn = toolbar.createEl('button', { 
      text: 'Clear Chat',
      cls: 'toolbar-btn'
    });
    clearBtn.onclick = () => this.clearChat();

    const exportBtn = toolbar.createEl('button', { 
      text: 'Export',
      cls: 'toolbar-btn'
    });
    exportBtn.onclick = () => this.exportConversation();

    const settingsBtn = toolbar.createEl('button', { 
      text: '⚙️',
      cls: 'toolbar-btn settings-btn'
    });
    settingsBtn.onclick = () => this.openChatSettings();

    // Messages container
    this.chatContainer = container.createEl('div', { cls: 'chat-container' });
    this.messagesEl = this.chatContainer.createEl('div', { cls: 'chat-messages' });

    // Multi-modal input area
    this.createMultiModalInput(container);

    // Input container
    this.createInputArea(container);
  }

  private createContextSidebar(container: HTMLElement) {
    // Context panel
    const contextHeader = container.createEl('div', { cls: 'sidebar-header' });
    contextHeader.createEl('h3', { text: 'Context & Tools' });

    this.contextPanel = container.createEl('div', { cls: 'context-panel' });

    // Vault context section
    const vaultContext = this.contextPanel.createEl('div', { cls: 'context-section' });
    vaultContext.createEl('h4', { text: 'Vault Context' });
    
    const contextInfo = vaultContext.createEl('div', { cls: 'context-info' });
    contextInfo.createEl('div', { text: 'Current file: None selected' });
    contextInfo.createEl('div', { text: 'Selection: None' });
    contextInfo.createEl('div', { text: 'Related files: 0' });

    // Multi-modal assets
    const assetsSection = this.contextPanel.createEl('div', { cls: 'context-section' });
    assetsSection.createEl('h4', { text: 'Attached Assets' });
    
    const assetsList = assetsSection.createEl('div', { cls: 'assets-list' });
    assetsList.createEl('div', { 
      cls: 'assets-placeholder',
      text: 'No assets attached'
    });

    // Quick actions
    const actionsSection = this.contextPanel.createEl('div', { cls: 'context-section' });
    actionsSection.createEl('h4', { text: 'Quick Actions' });
    
    const actionsList = actionsSection.createEl('div', { cls: 'actions-list' });
    
    const analyzeBtn = actionsList.createEl('button', { 
      text: '🔍 Analyze Vault',
      cls: 'action-btn'
    });
    analyzeBtn.onclick = () => this.analyzeVault();

    const workflowBtn = actionsList.createEl('button', { 
      text: '⚙️ Start Workflow',
      cls: 'action-btn'
    });
    workflowBtn.onclick = () => this.startWorkflow();

    const planBtn = actionsList.createEl('button', { 
      text: '📋 Plan Tasks',
      cls: 'action-btn'
    });
    planBtn.onclick = () => this.planTasks();

    const marketplaceBtn = actionsList.createEl('button', { 
      text: '🏪 Browse Agents',
      cls: 'action-btn'
    });
    marketplaceBtn.onclick = () => this.openMarketplace();

    // Agent performance
    const performanceSection = this.contextPanel.createEl('div', { cls: 'context-section' });
    performanceSection.createEl('h4', { text: 'Agent Performance' });
    
    const performanceChart = performanceSection.createEl('div', { cls: 'performance-chart' });
    performanceChart.createEl('div', { 
      cls: 'chart-placeholder',
      text: 'Performance data will appear here'
    });
  }

  private createMultiModalInput(container: HTMLElement) {
    this.multiModalInputEl = container.createEl('div', { cls: 'multimodal-input' });
    
    const header = this.multiModalInputEl.createEl('div', { cls: 'multimodal-header' });
    header.createEl('span', { text: 'Attachments:' });
    
    const attachButtons = header.createEl('div', { cls: 'attach-buttons' });
    
    const imageBtn = attachButtons.createEl('button', { 
      text: '🖼️ Image',
      cls: 'attach-btn'
    });
    imageBtn.onclick = () => this.attachImage();

    const fileBtn = attachButtons.createEl('button', { 
      text: '📁 File',
      cls: 'attach-btn'
    });
    fileBtn.onclick = () => this.attachFile();

    const audioBtn = attachButtons.createEl('button', { 
      text: '🎵 Audio',
      cls: 'attach-btn'
    });
    audioBtn.onclick = () => this.attachAudio();

    const selectionBtn = attachButtons.createEl('button', { 
      text: '📝 Selection',
      cls: 'attach-btn'
    });
    selectionBtn.onclick = () => this.attachSelection();

    const assetsList = this.multiModalInputEl.createEl('div', { cls: 'attached-assets' });
    this.multiModalInputEl.style.display = 'none'; // Hidden by default
  }

  private createInputArea(container: HTMLElement) {
    this.inputContainer = container.createEl('div', { cls: 'chat-input-container' });
    
    // Input with enhanced features
    const inputWrapper = this.inputContainer.createEl('div', { cls: 'input-wrapper' });
    
    this.inputEl = inputWrapper.createEl('textarea', {
      placeholder: 'Ask a question, request analysis, or describe a workflow...',
      cls: 'chat-input-enhanced'
    });
    this.inputEl.rows = 1;

    // Auto-resize textarea
    this.inputEl.addEventListener('input', () => this.autoResizeInput());

    // Send button with enhanced states
    this.sendButton = inputWrapper.createEl('button', {
      cls: 'send-button-enhanced'
    });
    this.updateSendButton();

    // Input controls
    const inputControls = this.inputContainer.createEl('div', { cls: 'input-controls' });
    
    const modeSelector = inputControls.createEl('select', { cls: 'mode-selector' });
    modeSelector.createEl('option', { text: 'Smart Mode', value: 'smart' });
    modeSelector.createEl('option', { text: 'Chat Mode', value: 'chat' });
    modeSelector.createEl('option', { text: 'Analysis Mode', value: 'analysis' });
    modeSelector.createEl('option', { text: 'Workflow Mode', value: 'workflow' });

    const suggestions = inputControls.createEl('div', { cls: 'input-suggestions' });
    suggestions.style.display = 'none';

    // Event listeners
    this.inputEl.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.sendButton.onclick = () => this.sendMessage();

    // Real-time suggestions
    this.inputEl.addEventListener('input', () => this.updateSuggestions());
  }

  private async loadAgents() {
    try {
      const response = await this.plugin.apiClient.getAgents();
      if (response.success && response.data) {
        const data = response.data as AgentApiResponse['data'];
        this.availableAgents = Array.isArray(data) ? data : (data as { agents: ExtendedAgent[] }).agents || [];
        this.populateAgentSelector();
        this.updateEvolutionStatus();
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }

  private populateAgentSelector() {
    // Clear existing options except first
    while (this.agentSelectorEl.children.length > 1) {
      this.agentSelectorEl.removeChild(this.agentSelectorEl.lastChild!);
    }

    this.availableAgents.forEach(agent => {
      const option = this.agentSelectorEl.createEl('option', {
        text: `${agent.name} (Level ${agent.evolutionLevel || 1})`,
        value: agent.id
      });
    });
  }

  private onAgentChange() {
    const selectedAgentId = this.agentSelectorEl.value;
    const agentInfo = this.agentSelectorEl.nextElementSibling as HTMLElement;
    
    if (selectedAgentId) {
      const agent = this.availableAgents.find(a => a.id === selectedAgentId);
      if (agent) {
        agentInfo.style.display = 'block';
        agentInfo.innerHTML = `
          <div class="agent-details">
            <div class="agent-description">${agent.description}</div>
            <div class="agent-stats">
              <span>Level ${agent.evolutionLevel || 1}</span>
              <span>Performance: ${Math.round((agent.performance || 0.5) * 100)}%</span>
              <span class="agent-status ${agent.status}">${agent.status}</span>
            </div>
            <div class="agent-capabilities">
              ${agent.capabilities?.map(cap => `<span class="capability-tag">${cap}</span>`).join('') || ''}
            </div>
          </div>
        `;
      }
    } else {
      agentInfo.style.display = 'none';
    }
  }

  private updateEvolutionStatus() {
    const evolutionList = this.conversationBranchesEl.parentElement?.querySelector('.evolution-list');
    if (evolutionList) {
      evolutionList.innerHTML = '';
      
      this.availableAgents.forEach(agent => {
        const item = evolutionList.createEl('div', { cls: 'evolution-item' });
        
        const header = item.createEl('div', { cls: 'evolution-header' });
        header.createEl('span', { text: agent.name, cls: 'agent-name' });
        header.createEl('span', { text: `L${agent.evolutionLevel || 1}`, cls: 'evolution-level' });
        
        const progress = item.createEl('div', { cls: 'evolution-progress' });
        const progressBar = progress.createEl('div', { cls: 'progress-bar' });
        const progressFill = progressBar.createEl('div', { 
          cls: 'progress-fill',
          attr: { style: `width: ${(agent.performance || 0.5) * 100}%` }
        });
        
        const status = item.createEl('div', { 
          cls: `evolution-status ${agent.status}`,
          text: agent.status
        });
      });
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.applyCurrentSuggestion();
    }
  }

  private autoResizeInput() {
    this.inputEl.style.height = 'auto';
    this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 120) + 'px';
    this.updateSendButton();
  }

  private updateSendButton() {
    const hasContent = this.inputEl.value.trim().length > 0;
    const hasAssets = this.multiModalAssets.length > 0;
    
    if (this.isStreaming) {
      this.sendButton.innerHTML = '⏹️';
      this.sendButton.title = 'Stop generation';
      this.sendButton.disabled = false;
    } else if (hasContent || hasAssets) {
      this.sendButton.innerHTML = '📤';
      this.sendButton.title = 'Send message';
      this.sendButton.disabled = false;
    } else {
      this.sendButton.innerHTML = '💭';
      this.sendButton.title = 'Type a message';
      this.sendButton.disabled = true;
    }
  }

  private async updateSuggestions() {
    const input = this.inputEl.value;
    const suggestions = this.inputContainer.querySelector('.input-suggestions') as HTMLElement;
    
    if (input.length > 3) {
      // Generate contextual suggestions
      const contextualSuggestions = this.generateSuggestions(input);
      if (contextualSuggestions.length > 0) {
        suggestions.innerHTML = '';
        suggestions.style.display = 'block';
        
        contextualSuggestions.forEach(suggestion => {
          const suggestionEl = suggestions.createEl('div', { 
            cls: 'suggestion-item',
            text: suggestion
          });
          suggestionEl.onclick = () => this.applySuggestion(suggestion);
        });
      } else {
        suggestions.style.display = 'none';
      }
    } else {
      suggestions.style.display = 'none';
    }
  }

  private generateSuggestions(input: string): string[] {
    const suggestions = [];
    
    if (input.toLowerCase().includes('analyz')) {
      suggestions.push('Analyze my vault structure and suggest improvements');
      suggestions.push('Analyze the current file for key insights');
      suggestions.push('Analyze relationships between my notes');
    }
    
    if (input.toLowerCase().includes('plan') || input.toLowerCase().includes('task')) {
      suggestions.push('Plan a comprehensive study schedule');
      suggestions.push('Create a project timeline with milestones');
      suggestions.push('Plan my day based on my notes and calendar');
    }
    
    if (input.toLowerCase().includes('workflow')) {
      suggestions.push('Create a workflow for organizing my research');
      suggestions.push('Build a workflow for weekly review process');
      suggestions.push('Design a content creation workflow');
    }
    
    return suggestions;
  }

  private applySuggestion(suggestion: string) {
    this.inputEl.value = suggestion;
    this.autoResizeInput();
    this.inputEl.focus();
    const suggestionsEl = this.inputContainer.querySelector('.input-suggestions') as HTMLElement;
    suggestionsEl.style.display = 'none';
  }

  private applyCurrentSuggestion() {
    const suggestionsEl = this.inputContainer.querySelector('.input-suggestions') as HTMLElement;
    const firstSuggestion = suggestionsEl.querySelector('.suggestion-item') as HTMLElement;
    if (firstSuggestion) {
      this.applySuggestion(firstSuggestion.textContent || '');
    }
  }

  private async sendMessage() {
    if (this.isStreaming) {
      this.stopStreaming();
      return;
    }

    const message = this.inputEl.value.trim();
    if (!message && this.multiModalAssets.length === 0) return;

    // Add user message
    this.addMessage({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Clear input
    this.inputEl.value = '';
    this.autoResizeInput();

    // Show streaming state
    this.isStreaming = true;
    this.updateSendButton();

    // Add assistant message placeholder
    const assistantMessage = this.addMessage({
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    });

    try {
      // Prepare request
      const request = {
        message,
        conversation_id: this.currentConversationId,
        vault_context: await this.getVaultContext(),
        agent_id: this.agentSelectorEl.value || undefined,
        multimodal_assets: this.multiModalAssets
      };

      // Send to backend with streaming
      await this.streamResponse(request, assistantMessage);
      
    } catch (error) {
      console.error('Chat error:', error);
      this.updateMessageContent(assistantMessage, 'Sorry, I encountered an error. Please try again.');
      new Notice('Failed to send message');
    }

    this.isStreaming = false;
    this.updateSendButton();
    this.clearMultiModalAssets();
  }

  private async streamResponse(request: any, messageEl: HTMLElement) {
    // This would connect to WebSocket for real streaming
    // For now, simulate streaming response
    const response = await this.plugin.apiClient.chat(request);
    
    if (response.success && response.data) {
      await this.simulateStreaming(response.data.response, messageEl);
    } else {
      throw new Error(response.error || 'Failed to get response');
    }
  }

  private async simulateStreaming(fullResponse: string, messageEl: HTMLElement) {
    const words = fullResponse.split(' ');
    let current = '';
    
    for (let i = 0; i < words.length; i++) {
      current += words[i] + ' ';
      this.updateMessageContent(messageEl, current);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private stopStreaming() {
    this.isStreaming = false;
    this.updateSendButton();
  }

  private addMessage(message: ChatMessage): HTMLElement {
    const messageEl = this.messagesEl.createEl('div', { 
      cls: `message ${message.role}` 
    });

    const avatar = messageEl.createEl('div', { cls: 'message-avatar' });
    avatar.innerHTML = message.role === 'user' ? '👤' : '🤖';

    const content = messageEl.createEl('div', { cls: 'message-content' });
    
    if (message.role === 'user') {
      content.createEl('div', { text: message.content, cls: 'message-text' });
    } else {
      const textEl = content.createEl('div', { cls: 'message-text' });
      this.updateMessageContent(messageEl, message.content);
    }

    const timestamp = messageEl.createEl('div', { 
      cls: 'message-timestamp',
      text: new Date(message.timestamp || Date.now()).toLocaleTimeString()
    });

    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return messageEl;
  }

  private updateMessageContent(messageEl: HTMLElement, content: string) {
    const textEl = messageEl.querySelector('.message-text') as HTMLElement;
    if (textEl) {
      textEl.textContent = content;
    }
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private async getVaultContext(): Promise<string> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView?.file) {
      return await this.app.vault.read(activeView.file);
    }
    return '';
  }

  // Multi-modal asset methods
  private async attachImage() {
    // Implementation for image attachment
    new Notice('Image attachment coming soon!');
  }

  private async attachFile() {
    // Implementation for file attachment
    new Notice('File attachment coming soon!');
  }

  private async attachAudio() {
    // Implementation for audio attachment
    new Notice('Audio attachment coming soon!');
  }

  private async attachSelection() {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView?.editor) {
      const selection = activeView.editor.getSelection();
      if (selection) {
        this.multiModalAssets.push({
          type: 'text',
          content: selection,
          metadata: { source: 'selection' }
        });
        this.updateMultiModalDisplay();
        new Notice('Selection attached');
      } else {
        new Notice('No text selected');
      }
    }
  }

  private updateMultiModalDisplay() {
    const assetsList = this.multiModalInputEl.querySelector('.attached-assets') as HTMLElement;
    assetsList.innerHTML = '';
    
    if (this.multiModalAssets.length > 0) {
      this.multiModalInputEl.style.display = 'block';
      
      this.multiModalAssets.forEach((asset, index) => {
        const assetEl = assetsList.createEl('div', { cls: 'attached-asset' });
        
        const typeIcon = asset.type === 'text' ? '📝' :
                        asset.type === 'image' ? '🖼️' :
                        asset.type === 'audio' ? '🎵' : '📁';
        
        assetEl.createEl('span', { text: typeIcon, cls: 'asset-icon' });
        assetEl.createEl('span', { 
          text: this.getAssetDescription(asset),
          cls: 'asset-description'
        });
        
        const removeBtn = assetEl.createEl('button', { 
          text: '×',
          cls: 'asset-remove'
        });
        removeBtn.onclick = () => this.removeAsset(index);
      });
    } else {
      this.multiModalInputEl.style.display = 'none';
    }
    
    this.updateSendButton();
  }

  private getAssetDescription(asset: MultiModalAsset): string {
    if (asset.type === 'text') {
      const content = asset.content as string;
      return content.length > 50 ? content.substring(0, 50) + '...' : content;
    }
    return `${asset.type} attachment`;
  }

  private removeAsset(index: number) {
    this.multiModalAssets.splice(index, 1);
    this.updateMultiModalDisplay();
  }

  private clearMultiModalAssets() {
    this.multiModalAssets = [];
    this.updateMultiModalDisplay();
  }

  // Action methods
  private startNewConversation() {
    this.currentConversationId = null;
    this.messages = [];
    this.messagesEl.empty();
    this.clearMultiModalAssets();
    new Notice('Started new conversation');
  }

  private clearChat() {
    this.messages = [];
    this.messagesEl.empty();
    this.clearMultiModalAssets();
    new Notice('Chat cleared');
  }

  private exportConversation() {
    new Notice('Export feature coming soon!');
  }

  private openChatSettings() {
    new Notice('Chat settings coming soon!');
  }

  private analyzeVault() {
    this.close();
    this.plugin.analyzeVault();
  }

  private startWorkflow() {
    this.close();
    this.plugin.openWorkflowModal();
  }

  private planTasks() {
    this.close();
    // Implementation for task planning
  }

  private openMarketplace() {
    this.close();
    // Implementation for marketplace
  }

  private loadConversationHistory() {
    // Implementation for loading conversation history
    // This would populate the conversation branches
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .vaultpilot-advanced-chat-modal {
        width: 95vw;
        height: 90vh;
        max-width: 1400px;
        max-height: 900px;
      }

      .chat-main-layout {
        display: grid;
        grid-template-columns: 250px 1fr 300px;
        height: 100%;
        gap: 1px;
        background: var(--background-modifier-border);
      }

      .chat-left-sidebar,
      .chat-right-sidebar {
        background: var(--background-secondary);
        padding: 16px;
        overflow-y: auto;
      }

      .chat-main-area {
        background: var(--background-primary);
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--background-modifier-border);
      }

      .sidebar-header h3,
      .sidebar-header h4 {
        margin: 0;
        font-size: 14px;
        color: var(--text-normal);
      }

      .new-chat-btn {
        padding: 4px 8px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
      }

      .chat-header {
        padding: 16px;
        border-bottom: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
      }

      .chat-title-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .chat-title-section h2 {
        margin: 0;
        font-size: 18px;
        color: var(--text-normal);
      }

      .chat-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--text-muted);
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-green);
      }

      .agent-section {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .agent-section label {
        font-size: 12px;
        color: var(--text-muted);
        min-width: 80px;
      }

      .agent-selector {
        flex: 1;
        padding: 6px 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-primary);
        color: var(--text-normal);
      }

      .agent-info {
        margin-top: 8px;
        padding: 8px;
        background: var(--background-primary);
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
      }

      .agent-description {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 6px;
      }

      .agent-stats {
        display: flex;
        gap: 8px;
        font-size: 11px;
        margin-bottom: 6px;
      }

      .agent-status {
        padding: 2px 4px;
        border-radius: 3px;
        font-weight: 500;
        text-transform: uppercase;
      }

      .agent-status.active {
        background: var(--color-green-rgb);
        color: var(--color-green);
      }

      .agent-status.learning {
        background: var(--color-orange-rgb);
        color: var(--color-orange);
      }

      .agent-status.idle {
        background: var(--color-base-30);
        color: var(--text-muted);
      }

      .agent-capabilities {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .capability-tag {
        padding: 2px 6px;
        background: var(--background-modifier-hover);
        border-radius: 3px;
        font-size: 10px;
        color: var(--text-muted);
      }

      .chat-toolbar {
        display: flex;
        gap: 8px;
      }

      .toolbar-btn {
        padding: 6px 12px;
        background: var(--background-modifier-hover);
        border: none;
        border-radius: 4px;
        color: var(--text-normal);
        cursor: pointer;
        font-size: 12px;
      }

      .toolbar-btn:hover {
        background: var(--background-modifier-hover-hover);
      }

      .chat-container {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .message {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }

      .message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 16px;
        background: var(--background-modifier-hover);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }

      .message-content {
        flex: 1;
        min-width: 0;
      }

      .message-text {
        background: var(--background-secondary);
        padding: 12px 16px;
        border-radius: 12px;
        color: var(--text-normal);
        line-height: 1.5;
        word-wrap: break-word;
      }

      .message.user .message-text {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .message-timestamp {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 4px;
      }

      .multimodal-input {
        padding: 8px 16px;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
      }

      .multimodal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .attach-buttons {
        display: flex;
        gap: 6px;
      }

      .attach-btn {
        padding: 4px 8px;
        background: var(--background-modifier-hover);
        border: none;
        border-radius: 4px;
        color: var(--text-normal);
        cursor: pointer;
        font-size: 11px;
      }

      .attached-assets {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .attached-asset {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: var(--background-primary);
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
      }

      .asset-description {
        font-size: 11px;
        color: var(--text-muted);
      }

      .asset-remove {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0;
        width: 16px;
        height: 16px;
      }

      .chat-input-container {
        padding: 16px;
        background: var(--background-primary);
        border-top: 1px solid var(--background-modifier-border);
      }

      .input-wrapper {
        display: flex;
        gap: 8px;
        align-items: end;
      }

      .chat-input-enhanced {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        color: var(--text-normal);
        resize: none;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.4;
        min-height: 20px;
        max-height: 120px;
      }

      .send-button-enhanced {
        width: 40px;
        height: 40px;
        border-radius: 20px;
        border: none;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.2s ease;
      }

      .send-button-enhanced:disabled {
        background: var(--background-modifier-hover);
        color: var(--text-muted);
        cursor: not-allowed;
      }

      .send-button-enhanced:not(:disabled):hover {
        transform: scale(1.05);
      }

      .input-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
      }

      .mode-selector {
        padding: 4px 8px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-size: 11px;
      }

      .input-suggestions {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
      }

      .suggestion-item {
        padding: 8px 12px;
        cursor: pointer;
        font-size: 12px;
        color: var(--text-muted);
        border-bottom: 1px solid var(--background-modifier-border);
      }

      .suggestion-item:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
      }

      .suggestion-item:last-child {
        border-bottom: none;
      }

      .context-section {
        margin-bottom: 20px;
      }

      .context-section h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: var(--text-normal);
        font-weight: 600;
      }

      .context-info {
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.4;
      }

      .context-info div {
        margin-bottom: 4px;
      }

      .actions-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .action-btn {
        padding: 8px 12px;
        background: var(--background-modifier-hover);
        border: none;
        border-radius: 4px;
        color: var(--text-normal);
        cursor: pointer;
        font-size: 11px;
        text-align: left;
      }

      .action-btn:hover {
        background: var(--background-modifier-hover-hover);
      }

      .evolution-item {
        margin-bottom: 12px;
        padding: 8px;
        background: var(--background-primary);
        border-radius: 4px;
        border: 1px solid var(--background-modifier-border);
      }

      .evolution-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .agent-name {
        font-size: 11px;
        color: var(--text-normal);
        font-weight: 500;
      }

      .evolution-level {
        font-size: 10px;
        color: var(--text-muted);
        background: var(--background-modifier-hover);
        padding: 2px 4px;
        border-radius: 3px;
      }

      .evolution-progress {
        margin-bottom: 4px;
      }

      .progress-bar {
        width: 100%;
        height: 4px;
        background: var(--background-modifier-border);
        border-radius: 2px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: var(--interactive-accent);
        transition: width 0.3s ease;
      }

      .evolution-status {
        font-size: 10px;
        font-weight: 500;
        text-transform: uppercase;
      }

      @media (max-width: 1200px) {
        .chat-main-layout {
          grid-template-columns: 200px 1fr 250px;
        }
      }

      @media (max-width: 900px) {
        .chat-main-layout {
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr;
        }
        
        .chat-left-sidebar,
        .chat-right-sidebar {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}
