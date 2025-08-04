/**
 * VaultPilot Conversation Development Service
 * 
 * Provides enhanced conversation capabilities for development contexts using the dev-pipe framework.
 * This service enables intelligent, context-aware AI conversations with comprehensive project understanding.
 */

import { Notice } from 'obsidian';
import type VaultPilotPlugin from '../main';
import { DevelopmentContextService, DevelopmentContext } from './DevelopmentContextService';
import { DevPipeClient } from '../devpipe/DevPipeClient';
import { DevPipeMessageType, ModelSelectionConfig } from '../types/ModelSelection';
import { ChatRequest, ChatResponse, APIResponse } from '../types';

export interface ConversationDevConfig {
  enableContextEnrichment: boolean;
  enableIntelligentModelSelection: boolean;
  enableDevPipeTransport: boolean;
  contextDepth: 'minimal' | 'standard' | 'comprehensive';
  debugMode: boolean;
}

export interface EnrichedChatRequest extends ChatRequest {
  development_context?: DevelopmentContext;
  context_summary?: string;
  conversation_type?: 'general' | 'code_review' | 'debugging' | 'architecture' | 'documentation';
  project_context?: {
    type: string;
    structure: any;
    dependencies: any[];
  };
}

export interface ConversationMetrics {
  totalConversations: number;
  contextEnhancedConversations: number;
  devPipeUsage: number;
  averageResponseTime: number;
  modelSelectionHits: number;
  errorCount: number;
}

export class ConversationDevService {
  private plugin: VaultPilotPlugin;
  private contextService: DevelopmentContextService;
  private devPipeClient?: DevPipeClient;
  private config: ConversationDevConfig;
  private metrics: ConversationMetrics;
  private isInitialized = false;

  constructor(plugin: VaultPilotPlugin, config: Partial<ConversationDevConfig> = {}) {
    this.plugin = plugin;
    this.contextService = new DevelopmentContextService(plugin.app, plugin);
    
    this.config = {
      enableContextEnrichment: true,
      enableIntelligentModelSelection: true,
      enableDevPipeTransport: true,
      contextDepth: 'standard',
      debugMode: plugin.settings.debugMode || false,
      ...config
    };

    this.metrics = {
      totalConversations: 0,
      contextEnhancedConversations: 0,
      devPipeUsage: 0,
      averageResponseTime: 0,
      modelSelectionHits: 0,
      errorCount: 0
    };
  }

  /**
   * Initialize the conversation dev service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize DevPipe if enabled and model selection is available
      if (this.config.enableDevPipeTransport && this.plugin.settings.modelSelection?.enabled) {
        await this.initializeDevPipe();
      }

      this.isInitialized = true;
      
      if (this.config.debugMode) {
        console.log('ConversationDevService initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize ConversationDevService:', error);
      // Don't throw - allow graceful degradation
    }
  }

  /**
   * Initialize DevPipe client for enhanced communication
   */
  private async initializeDevPipe(): Promise<void> {
    if (!this.plugin.settings.modelSelection) return;

    const modelConfig: ModelSelectionConfig = {
      server_url: this.plugin.settings.backendUrl,
      devpipe_path: this.plugin.settings.modelSelection.devpipePath,
      monitoring_interval: this.plugin.settings.modelSelection.monitoringInterval,
      fallback_enabled: this.plugin.settings.modelSelection.fallbackEnabled,
      cache_duration: this.plugin.settings.modelSelection.cacheDuration,
      retry_attempts: this.plugin.settings.modelSelection.retryAttempts,
      timeout: this.plugin.settings.modelSelection.timeout,
      debug_mode: this.config.debugMode
    };

    this.devPipeClient = new DevPipeClient(modelConfig);
    
    try {
      await this.devPipeClient.initialize();
      
      // Set up event listeners
      this.devPipeClient.on('connected', () => {
        if (this.config.debugMode) {
          console.log('DevPipe connected for conversation dev service');
        }
      });

      this.devPipeClient.on('error', (error) => {
        console.error('DevPipe error:', error);
        this.metrics.errorCount++;
      });

    } catch (error) {
      console.warn('DevPipe initialization failed, falling back to standard transport:', error);
      this.devPipeClient = undefined;
    }
  }

  /**
   * Enhanced chat function with development context
   */
  async chat(message: string, options: {
    conversation_id?: string;
    agent_id?: string;
    mode?: 'ask' | 'agent';
    conversation_type?: 'general' | 'code_review' | 'debugging' | 'architecture' | 'documentation';
  } = {}): Promise<APIResponse<ChatResponse>> {
    const startTime = Date.now();
    this.metrics.totalConversations++;

    try {
      // Build enriched chat request
      const enrichedRequest = await this.buildEnrichedRequest(message, options);

      // Choose transport method
      let response: APIResponse<ChatResponse>;
      
      if (this.devPipeClient?.isReady() && this.config.enableDevPipeTransport) {
        response = await this.sendViaDevPipe(enrichedRequest);
        this.metrics.devPipeUsage++;
      } else {
        response = await this.sendViaStandardTransport(enrichedRequest);
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeMetrics(responseTime);

      if (this.config.debugMode) {
        console.log(`Conversation completed in ${responseTime}ms via ${this.devPipeClient?.isReady() ? 'DevPipe' : 'Standard'} transport`);
      }

      return response;

    } catch (error) {
      this.metrics.errorCount++;
      console.error('ConversationDevService chat error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown conversation error'
      };
    }
  }

  /**
   * Build enriched chat request with development context
   */
  private async buildEnrichedRequest(
    message: string, 
    options: any
  ): Promise<EnrichedChatRequest> {
    const baseRequest: ChatRequest = {
      message,
      conversation_id: options.conversation_id,
      agent_id: options.agent_id,
      mode: options.mode || 'ask'
    };

    // Add development context if enabled
    if (this.config.enableContextEnrichment) {
      try {
        const developmentContext = await this.gatherDevelopmentContext();
        const contextSummary = await this.contextService.getContextSummary();
        
        const enrichedRequest: EnrichedChatRequest = {
          ...baseRequest,
          development_context: developmentContext,
          context_summary: contextSummary,
          conversation_type: options.conversation_type || this.detectConversationType(message),
          project_context: {
            type: developmentContext.project.type,
            structure: developmentContext.project.structure,
            dependencies: developmentContext.project.dependencies
          }
        };

        this.metrics.contextEnhancedConversations++;
        return enrichedRequest;

      } catch (contextError) {
        console.warn('Failed to gather development context, using base request:', contextError);
        return baseRequest as EnrichedChatRequest;
      }
    }

    return baseRequest as EnrichedChatRequest;
  }

  /**
   * Gather development context based on configured depth
   */
  private async gatherDevelopmentContext(): Promise<DevelopmentContext> {
    switch (this.config.contextDepth) {
      case 'minimal':
        return {
          workspace: await this.contextService.getWorkspaceContext(),
          activeFile: await this.contextService.getActiveFileContext(),
          selection: null,
          project: await this.contextService.getProjectContext(),
          git: null,
          timestamp: Date.now()
        };
      
      case 'comprehensive':
        return await this.contextService.getFullContext();
      
      case 'standard':
      default:
        return {
          workspace: await this.contextService.getWorkspaceContext(),
          activeFile: await this.contextService.getActiveFileContext(),
          selection: await this.contextService.getSelectionContext(),
          project: await this.contextService.getProjectContext(),
          git: await this.contextService.getGitContext(),
          timestamp: Date.now()
        };
    }
  }

  /**
   * Detect conversation type based on message content
   */
  private detectConversationType(message: string): 'general' | 'code_review' | 'debugging' | 'architecture' | 'documentation' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('review') || lowerMessage.includes('feedback') || lowerMessage.includes('improve')) {
      return 'code_review';
    }
    
    if (lowerMessage.includes('bug') || lowerMessage.includes('error') || lowerMessage.includes('debug') || lowerMessage.includes('fix')) {
      return 'debugging';
    }
    
    if (lowerMessage.includes('architecture') || lowerMessage.includes('design') || lowerMessage.includes('structure') || lowerMessage.includes('pattern')) {
      return 'architecture';
    }
    
    if (lowerMessage.includes('document') || lowerMessage.includes('explain') || lowerMessage.includes('comment') || lowerMessage.includes('readme')) {
      return 'documentation';
    }
    
    return 'general';
  }

  /**
   * Send request via DevPipe transport
   */
  private async sendViaDevPipe(request: EnrichedChatRequest): Promise<APIResponse<ChatResponse>> {
    if (!this.devPipeClient) {
      throw new Error('DevPipe client not available');
    }

    try {
      const response = await this.devPipeClient.sendMessage<ChatResponse>(
        'chat_enhanced' as DevPipeMessageType,
        request,
        30000
      );

      return {
        success: true,
        data: response
      };

    } catch (error) {
      console.error('DevPipe transport error:', error);
      
      // Fallback to standard transport
      if (this.config.debugMode) {
        console.log('Falling back to standard transport due to DevPipe error');
      }
      
      return await this.sendViaStandardTransport(request);
    }
  }

  /**
   * Send request via standard HTTP transport
   */
  private async sendViaStandardTransport(request: EnrichedChatRequest): Promise<APIResponse<ChatResponse>> {
    // Convert enriched request back to standard format for compatibility
    const standardRequest: ChatRequest = {
      message: request.message,
      conversation_id: request.conversation_id,
      agent_id: request.agent_id,
      mode: request.mode,
      vault_context: request.context_summary // Include summary as vault context
    };

    return await this.plugin.apiClient.chat(standardRequest);
  }

  /**
   * Get conversation insights and recommendations
   */
  async getConversationInsights(): Promise<{
    contextRelevance: number;
    suggestedActions: string[];
    projectStatus: string;
    recommendations: string[];
  }> {
    try {
      const context = await this.contextService.getFullContext();
      
      // Calculate context relevance score
      const contextRelevance = this.calculateContextRelevance(context);
      
      // Generate suggestions based on project state
      const suggestedActions = this.generateSuggestedActions(context);
      
      // Assess project status
      const projectStatus = this.assessProjectStatus(context);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(context);

      return {
        contextRelevance,
        suggestedActions,
        projectStatus,
        recommendations
      };

    } catch (error) {
      console.error('Failed to generate conversation insights:', error);
      return {
        contextRelevance: 0,
        suggestedActions: [],
        projectStatus: 'unknown',
        recommendations: ['Consider checking your project structure']
      };
    }
  }

  /**
   * Calculate context relevance score (0-1)
   */
  private calculateContextRelevance(context: DevelopmentContext): number {
    let score = 0;
    let factors = 0;

    // Active file contributes to relevance
    if (context.activeFile) {
      score += 0.3;
      factors++;
    }

    // Current selection adds relevance
    if (context.selection) {
      score += 0.2;
      factors++;
    }

    // Project type recognition
    if (context.project.type !== 'unknown') {
      score += 0.3;
      factors++;
    }

    // Git repository adds context
    if (context.git?.isRepository) {
      score += 0.2;
      factors++;
    }

    return factors > 0 ? score : 0;
  }

  /**
   * Generate suggested actions based on context
   */
  private generateSuggestedActions(context: DevelopmentContext): string[] {
    const actions: string[] = [];

    if (context.activeFile) {
      actions.push(`Review ${context.activeFile.name}`);
      
      if (context.activeFile.symbols.length > 0) {
        actions.push('Explore code symbols');
      }
      
      if (context.activeFile.dependencies.length > 0) {
        actions.push('Analyze dependencies');
      }
    }

    if (context.selection) {
      actions.push('Discuss selected code');
      actions.push('Get suggestions for improvement');
    }

    if (context.project.buildSystem) {
      actions.push(`Run ${context.project.buildSystem.type} build`);
    }

    if (context.project.testFramework) {
      actions.push(`Execute ${context.project.testFramework.type} tests`);
    }

    return actions;
  }

  /**
   * Assess project status
   */
  private assessProjectStatus(context: DevelopmentContext): string {
    if (context.project.type === 'unknown') {
      return 'Project type not recognized';
    }

    if (context.project.structure.estimatedSize === 'large') {
      return 'Large, complex project';
    }

    if (context.project.structure.estimatedSize === 'small') {
      return 'Small, focused project';
    }

    return 'Medium-sized project';
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(context: DevelopmentContext): string[] {
    const recommendations: string[] = [];

    // Documentation recommendations
    if (context.project.documentation.length === 0) {
      recommendations.push('Consider adding documentation (README, etc.)');
    }

    // Testing recommendations
    if (!context.project.testFramework) {
      recommendations.push('Consider setting up a testing framework');
    }

    // Build system recommendations
    if (!context.project.buildSystem) {
      recommendations.push('Consider setting up a build system');
    }

    // Code organization recommendations
    if (context.project.structure.sourceDirectories.length === 0) {
      recommendations.push('Consider organizing code into source directories');
    }

    return recommendations;
  }

  /**
   * Update response time metrics
   */
  private updateResponseTimeMetrics(responseTime: number): void {
    const currentAverage = this.metrics.averageResponseTime;
    const totalConversations = this.metrics.totalConversations;
    
    this.metrics.averageResponseTime = (currentAverage * (totalConversations - 1) + responseTime) / totalConversations;
  }

  /**
   * Get service metrics
   */
  getMetrics(): ConversationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    devPipeReady: boolean;
    contextServiceReady: boolean;
    config: ConversationDevConfig;
  } {
    return {
      initialized: this.isInitialized,
      devPipeReady: this.devPipeClient?.isReady() || false,
      contextServiceReady: true,
      config: { ...this.config }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConversationDevConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.debugMode) {
      console.log('ConversationDevService config updated:', this.config);
    }
  }

  /**
   * Clear context cache
   */
  clearContextCache(): void {
    this.contextService.clearCache();
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (this.devPipeClient) {
      await this.devPipeClient.disconnect();
    }
    
    this.contextService.clearCache();
    this.isInitialized = false;
  }
}