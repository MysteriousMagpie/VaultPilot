# 🛠️ Technical Architecture Specifications for Conversational Development Environment

## 📋 **Core System Architecture**

### **1. Service Layer Architecture**

```typescript
// Core service interfaces
interface DevelopmentEnvironmentServices {
  contextService: DevelopmentContextService;
  commandParser: CommandParser;
  streamingService: StreamingChatService;
  suggestionService: DevelopmentSuggestionService;
  assetManager: MultiModalAssetManager;
  conversationManager: ConversationManager;
}

// Service dependency injection
export class ServiceContainer {
  private services: Map<string, any> = new Map();
  
  register<T>(name: string, service: T): void;
  get<T>(name: string): T;
  resolve<T>(constructor: new (...args: any[]) => T): T;
}
```

### **2. Event-Driven Architecture**

```typescript
// Central event bus for real-time communication
export class DevelopmentEventBus {
  private listeners: Map<DevelopmentEvent, Set<EventListener>> = new Map();
  
  emit(event: DevelopmentEvent, data: any): void;
  on(event: DevelopmentEvent, listener: EventListener): Unsubscribe;
  off(event: DevelopmentEvent, listener: EventListener): void;
  
  // Typed event emissions
  emitContextChange(context: DevelopmentContext): void;
  emitCommandExecuted(result: CommandResult): void;
  emitStreamChunk(chunk: StreamChunk): void;
}

// Event types
export enum DevelopmentEvent {
  CONTEXT_CHANGED = 'context_changed',
  COMMAND_EXECUTED = 'command_executed',
  STREAM_CHUNK_RECEIVED = 'stream_chunk_received',
  SUGGESTION_GENERATED = 'suggestion_generated',
  FILE_MODIFIED = 'file_modified',
  CONVERSATION_BRANCH_CREATED = 'conversation_branch_created',
  ASSET_PROCESSED = 'asset_processed'
}
```

---

## 💾 **Data Models and Interfaces**

### **1. Development Context Models**

```typescript
interface DevelopmentContext {
  workspace: WorkspaceContext;
  activeFile: FileContext;
  selection: SelectionContext;
  project: ProjectContext;
  git: GitContext;
  session: SessionContext;
}

interface WorkspaceContext {
  root: string;
  files: FileReference[];
  recentFiles: FileReference[];
  openFiles: FileReference[];
  tags: TagReference[];
  metadata: WorkspaceMetadata;
}

interface FileContext {
  path: string;
  content: string;
  language: ProgrammingLanguage;
  metadata: FileMetadata;
  symbols: CodeSymbol[];
  dependencies: DependencyReference[];
  imports: ImportStatement[];
  exports: ExportStatement[];
  tests: TestReference[];
}

interface SelectionContext {
  text: string;
  range: EditorRange;
  lineContext: LineContext;
  surroundingCode: string;
  symbolAtCursor?: CodeSymbol;
}

interface ProjectContext {
  type: ProjectType;
  framework?: Framework;
  buildSystem: BuildSystem;
  testFramework?: TestFramework;
  linter?: LinterConfig;
  dependencies: PackageDependency[];
  structure: ProjectStructure;
}

interface GitContext {
  branch: string;
  status: GitStatus;
  recentCommits: GitCommit[];
  uncommittedChanges: GitChange[];
  remotes: GitRemote[];
}
```

### **2. Command System Models**

```typescript
interface ParsedCommand {
  command: string;
  args: CommandArgs;
  rawMessage: string;
  context?: DevelopmentContext;
}

interface CommandArgs {
  [key: string]: string | number | boolean | string[];
}

interface CommandResult {
  success: boolean;
  message: string;
  error?: string;
  actions?: CommandAction[];
  metadata?: CommandMetadata;
  artifacts?: GeneratedArtifact[];
}

interface CommandAction {
  type: CommandActionType;
  data: any;
  description: string;
  undoable: boolean;
}

enum CommandActionType {
  FILE_CREATED = 'file_created',
  FILE_MODIFIED = 'file_modified',
  FILE_DELETED = 'file_deleted',
  TEXT_INSERTED = 'text_inserted',
  TEXT_REPLACED = 'text_replaced',
  CURSOR_MOVED = 'cursor_moved',
  SELECTION_CHANGED = 'selection_changed'
}
```

### **3. Streaming Models**

```typescript
interface StreamingChatRequest {
  message: string;
  context: DevelopmentContext;
  conversationId?: string;
  agentId?: string;
  streamOptions: StreamOptions;
}

interface StreamOptions {
  chunkSize: number;
  maxTokens?: number;
  temperature?: number;
  includeMetadata: boolean;
}

interface StreamChunk {
  id: string;
  conversationId: string;
  content: string;
  isComplete: boolean;
  metadata: ChunkMetadata;
  timestamp: number;
}

interface ChunkMetadata {
  tokenCount: number;
  confidence: number;
  latency: number;
  reasoning?: string;
  suggestions?: InlineSuggestion[];
}
```

---

## 🔧 **Service Implementations**

### **1. Development Context Service**

```typescript
export class DevelopmentContextService {
  private cache: ContextCache = new ContextCache();
  private eventBus: DevelopmentEventBus;
  
  constructor(
    private app: App,
    private plugin: VaultPilotPlugin,
    eventBus: DevelopmentEventBus
  ) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }
  
  async getFullContext(): Promise<DevelopmentContext> {
    const cacheKey = this.generateContextKey();
    let context = this.cache.get(cacheKey);
    
    if (!context) {
      context = await this.buildFullContext();
      this.cache.set(cacheKey, context);
    }
    
    return context;
  }
  
  private async buildFullContext(): Promise<DevelopmentContext> {
    const [workspace, activeFile, selection, project, git] = await Promise.all([
      this.getWorkspaceContext(),
      this.getActiveFileContext(),
      this.getSelectionContext(),
      this.getProjectContext(),
      this.getGitContext()
    ]);
    
    return {
      workspace,
      activeFile,
      selection,
      project,
      git,
      session: await this.getSessionContext()
    };
  }
  
  private async getWorkspaceContext(): Promise<WorkspaceContext> {
    const vault = this.app.vault;
    const files = vault.getAllLoadedFiles();
    
    return {
      root: vault.adapter.basePath,
      files: await this.analyzeFiles(files),
      recentFiles: await this.getRecentFiles(),
      openFiles: await this.getOpenFiles(),
      tags: await this.extractTags(),
      metadata: await this.getWorkspaceMetadata()
    };
  }
  
  private async getActiveFileContext(): Promise<FileContext> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView?.file) return null;
    
    const file = activeView.file;
    const content = await this.app.vault.read(file);
    
    return {
      path: file.path,
      content,
      language: this.detectLanguage(file),
      metadata: await this.getFileMetadata(file),
      symbols: await this.extractSymbols(content),
      dependencies: await this.extractDependencies(content),
      imports: await this.extractImports(content),
      exports: await this.extractExports(content),
      tests: await this.findRelatedTests(file)
    };
  }
  
  private setupEventListeners(): void {
    // Listen for file changes
    this.app.vault.on('modify', (file) => {
      this.cache.invalidateForFile(file.path);
      this.eventBus.emit(DevelopmentEvent.FILE_MODIFIED, { file });
    });
    
    // Listen for selection changes
    this.app.workspace.on('active-leaf-change', () => {
      this.cache.invalidateSelection();
      this.updateContext();
    });
  }
  
  private async updateContext(): Promise<void> {
    const context = await this.getFullContext();
    this.eventBus.emit(DevelopmentEvent.CONTEXT_CHANGED, context);
  }
}
```

### **2. Streaming Chat Service**

```typescript
export class StreamingChatService {
  private activeStreams: Map<string, ReadableStream> = new Map();
  private eventBus: DevelopmentEventBus;
  
  constructor(
    private apiClient: EvoAgentXClient,
    eventBus: DevelopmentEventBus
  ) {
    this.eventBus = eventBus;
  }
  
  async startStream(request: StreamingChatRequest): Promise<string> {
    const streamId = this.generateStreamId();
    
    try {
      const stream = await this.apiClient.streamChat(request);
      this.activeStreams.set(streamId, stream);
      
      this.processStream(streamId, stream, request.conversationId);
      
      return streamId;
    } catch (error) {
      throw new Error(`Failed to start stream: ${error.message}`);
    }
  }
  
  private async processStream(
    streamId: string, 
    stream: ReadableStream, 
    conversationId?: string
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          this.finalizeStream(streamId);
          break;
        }
        
        const chunk = this.parseChunk(decoder.decode(value));
        
        this.eventBus.emit(DevelopmentEvent.STREAM_CHUNK_RECEIVED, {
          streamId,
          conversationId,
          chunk
        });
      }
    } catch (error) {
      this.handleStreamError(streamId, error);
    } finally {
      reader.releaseLock();
      this.activeStreams.delete(streamId);
    }
  }
  
  stopStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.cancel();
      this.activeStreams.delete(streamId);
    }
  }
  
  private parseChunk(data: string): StreamChunk {
    // Parse SSE format or JSON chunks
    const lines = data.split('\n').filter(line => line.startsWith('data: '));
    const lastLine = lines[lines.length - 1];
    
    if (lastLine) {
      const jsonData = lastLine.replace('data: ', '');
      return JSON.parse(jsonData);
    }
    
    throw new Error('Invalid chunk format');
  }
}
```

### **3. Command Parser and Execution**

```typescript
export class CommandParser {
  private commands: Map<string, BaseCommand> = new Map();
  private aliases: Map<string, string> = new Map();
  
  constructor(private contextService: DevelopmentContextService) {
    this.registerBuiltinCommands();
  }
  
  parseMessage(message: string): ParsedCommand | null {
    const trimmed = message.trim();
    
    // Check for command syntax
    if (!trimmed.startsWith('/')) {
      return null;
    }
    
    const parts = this.tokenize(trimmed.slice(1));
    if (parts.length === 0) {
      return null;
    }
    
    const commandName = this.resolveAlias(parts[0]);
    const args = this.parseArguments(parts.slice(1));
    
    return {
      command: commandName,
      args,
      rawMessage: message
    };
  }
  
  async executeCommand(
    command: ParsedCommand, 
    context?: DevelopmentContext
  ): Promise<CommandResult> {
    const commandImpl = this.commands.get(command.command);
    
    if (!commandImpl) {
      return {
        success: false,
        message: `Unknown command: ${command.command}`,
        error: 'COMMAND_NOT_FOUND'
      };
    }
    
    const fullContext = context || await this.contextService.getFullContext();
    
    try {
      // Validate command arguments
      const validation = commandImpl.validateArgs(command.args);
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error,
          error: 'INVALID_ARGUMENTS'
        };
      }
      
      // Execute command
      const result = await commandImpl.execute(command.args, fullContext);
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Command execution failed: ${error.message}`,
        error: 'EXECUTION_ERROR'
      };
    }
  }
  
  private tokenize(input: string): string[] {
    // Smart tokenization handling quotes, etc.
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes && char === ' ') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      tokens.push(current);
    }
    
    return tokens;
  }
  
  private parseArguments(tokens: string[]): CommandArgs {
    const args: CommandArgs = {};
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      if (token.startsWith('--')) {
        // Long flag: --name=value or --name value
        const [key, value] = token.slice(2).split('=');
        if (value !== undefined) {
          args[key] = this.parseValue(value);
        } else if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
          args[key] = this.parseValue(tokens[++i]);
        } else {
          args[key] = true;
        }
      } else if (token.startsWith('-')) {
        // Short flag: -f value or -f
        const key = token.slice(1);
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
          args[key] = this.parseValue(tokens[++i]);
        } else {
          args[key] = true;
        }
      } else {
        // Positional argument
        const positionalKey = `_${Object.keys(args).filter(k => k.startsWith('_')).length}`;
        args[positionalKey] = this.parseValue(token);
      }
    }
    
    return args;
  }
  
  private parseValue(value: string): string | number | boolean {
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Return as string
    return value;
  }
}
```

---

## 🎨 **UI Component Architecture**

### **1. Streaming Chat UI**

```typescript
export class StreamingChatUI {
  private messageElements: Map<string, HTMLElement> = new Map();
  private activeStreams: Set<string> = new Set();
  
  constructor(
    private container: HTMLElement,
    private eventBus: DevelopmentEventBus
  ) {
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.eventBus.on(DevelopmentEvent.STREAM_CHUNK_RECEIVED, (data) => {
      this.handleStreamChunk(data);
    });
  }
  
  async startStreamingMessage(
    conversationId: string, 
    role: 'assistant' | 'user'
  ): Promise<string> {
    const messageId = this.generateMessageId();
    const messageEl = this.createStreamingMessageElement(messageId, role);
    
    this.container.appendChild(messageEl);
    this.messageElements.set(messageId, messageEl);
    this.activeStreams.add(messageId);
    
    return messageId;
  }
  
  private handleStreamChunk(data: {
    streamId: string;
    conversationId: string;
    chunk: StreamChunk;
  }): void {
    const messageEl = this.messageElements.get(data.streamId);
    if (!messageEl) return;
    
    const contentEl = messageEl.querySelector('.message-content');
    if (!contentEl) return;
    
    // Append chunk content
    this.appendChunkContent(contentEl, data.chunk);
    
    // Update metadata if provided
    if (data.chunk.metadata) {
      this.updateMessageMetadata(messageEl, data.chunk.metadata);
    }
    
    // Handle completion
    if (data.chunk.isComplete) {
      this.finalizeStreamingMessage(data.streamId);
    }
    
    // Auto-scroll to keep message visible
    this.scrollToBottom();
  }
  
  private createStreamingMessageElement(
    messageId: string, 
    role: string
  ): HTMLElement {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${role} streaming`;
    messageEl.dataset.messageId = messageId;
    
    messageEl.innerHTML = `
      <div class="message-header">
        <span class="message-role">${role}</span>
        <span class="message-timestamp">${new Date().toLocaleTimeString()}</span>
        <div class="message-actions">
          <button class="stop-stream" title="Stop streaming">⏹️</button>
        </div>
      </div>
      <div class="message-content"></div>
      <div class="message-metadata">
        <span class="token-count">0 tokens</span>
        <span class="confidence"></span>
        <span class="latency"></span>
      </div>
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;
    
    // Add stop button functionality
    const stopBtn = messageEl.querySelector('.stop-stream') as HTMLButtonElement;
    stopBtn?.addEventListener('click', () => {
      this.stopStream(messageId);
    });
    
    return messageEl;
  }
  
  private appendChunkContent(contentEl: Element, chunk: StreamChunk): void {
    // Handle different content types
    if (chunk.content.includes('```')) {
      this.handleCodeBlock(contentEl, chunk.content);
    } else {
      this.appendText(contentEl, chunk.content);
    }
  }
  
  private handleCodeBlock(contentEl: Element, content: string): void {
    // Enhanced code block handling with syntax highlighting
    const codeBlockRegex = /```(\w+)?\n(.*?)```/gs;
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        this.appendText(contentEl, content.slice(lastIndex, match.index));
      }
      
      // Add code block
      const language = match[1] || 'text';
      const code = match[2];
      this.appendCodeBlock(contentEl, code, language);
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      this.appendText(contentEl, content.slice(lastIndex));
    }
  }
}
```

### **2. Command UI Components**

```typescript
export class CommandUI {
  private suggestions: CommandSuggestion[] = [];
  private activeCommand: ParsedCommand | null = null;
  
  constructor(
    private inputEl: HTMLInputElement,
    private commandParser: CommandParser
  ) {
    this.setupCommandDetection();
    this.setupAutocompletion();
  }
  
  private setupCommandDetection(): void {
    this.inputEl.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      
      if (value.startsWith('/')) {
        this.handleCommandInput(value);
      } else {
        this.hideCommandUI();
      }
    });
  }
  
  private handleCommandInput(input: string): void {
    const partial = input.slice(1); // Remove '/'
    const suggestions = this.generateSuggestions(partial);
    
    this.showCommandSuggestions(suggestions);
    
    // Try to parse complete command
    const parsed = this.commandParser.parseMessage(input);
    if (parsed) {
      this.activeCommand = parsed;
      this.showCommandPreview(parsed);
    }
  }
  
  private generateSuggestions(partial: string): CommandSuggestion[] {
    const allCommands = this.commandParser.getAllCommands();
    
    return allCommands
      .filter(cmd => cmd.name.startsWith(partial) || cmd.aliases.some(alias => alias.startsWith(partial)))
      .map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        usage: cmd.usage,
        category: cmd.category,
        confidence: this.calculateConfidence(partial, cmd.name)
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }
  
  private showCommandSuggestions(suggestions: CommandSuggestion[]): void {
    const container = this.getOrCreateSuggestionsContainer();
    container.empty();
    
    suggestions.forEach((suggestion, index) => {
      const suggestionEl = container.createEl('div', {
        cls: 'command-suggestion',
        text: suggestion.name
      });
      
      suggestionEl.createEl('span', {
        cls: 'command-description',
        text: suggestion.description
      });
      
      suggestionEl.addEventListener('click', () => {
        this.selectSuggestion(suggestion);
      });
      
      if (index === 0) {
        suggestionEl.addClass('active');
      }
    });
    
    container.style.display = 'block';
  }
}
```

---

This technical specification provides the detailed architecture and implementation blueprints needed to execute the conversational development environment plan. Each component is designed to be modular, testable, and extensible while maintaining high performance and user experience standards.
