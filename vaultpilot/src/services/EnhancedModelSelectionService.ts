/**
 * Enhanced ModelSelectionService using TransportManager
 * Maintains backward compatibility with Phase 1 API
 */

import { 
  TransportManager, 
  TransportManagerConfig, 
  TransportSelectionCriteria, 
  SelectionContext 
} from '../devpipe/TransportManager';
import { 
  TransportType,
  TransportConfig,
  DevPipeMessage,
  DevPipeResponse
} from '../devpipe/transports/DevPipeTransport';
import { 
  ModelSelectionRequest, 
  ModelSelectionResponse, 
  ModelHealthStatus, 
  UserPreferences, 
  ModelPerformanceMetrics,
  ModelSelectionConfig,
  ModelSelectionError,
  ModelSelectionEvent,
  ModelInfo,
  TaskType
} from '../types/ModelSelection';

export interface EnhancedModelSelectionConfig extends ModelSelectionConfig {
  // New Phase 2 configuration options
  transport?: {
    preferred: TransportType[];
    fallback_enabled: boolean;
    health_check_interval: number;
    selection_criteria: TransportSelectionCriteria;
    auto_failover?: boolean;
  };
}

export class EnhancedModelSelectionService {
  private transportManager: TransportManager;
  private config: EnhancedModelSelectionConfig;
  private userPreferences: UserPreferences;
  private cachedHealth: ModelHealthStatus[] = [];
  private lastHealthUpdate: number = 0;
  private eventListeners: Map<string, Function[]> = new Map();
  private healthMonitoringInterval?: any;

  constructor(serverUrl: string, devPipePath: string = '', options: Partial<EnhancedModelSelectionConfig> = {}) {
    this.config = {
      devpipe_path: devPipePath,
      server_url: serverUrl,
      monitoring_interval: options.monitoring_interval || 30000,
      fallback_enabled: options.fallback_enabled !== false,
      cache_duration: options.cache_duration || 300000, // 5 minutes
      retry_attempts: options.retry_attempts || 3,
      timeout: options.timeout || 30000,
      debug_mode: options.debug_mode || false,
      
      // New transport configuration
      transport: options.transport || {
        preferred: [TransportType.WEBSOCKET, TransportType.HTTP, TransportType.FILESYSTEM],
        fallback_enabled: true,
        health_check_interval: 30000,
        selection_criteria: {
          latencyWeight: 0.3,
          reliabilityWeight: 0.4,
          capabilityWeight: 0.2,
          costWeight: 0.1
        },
        auto_failover: true
      }
    };

    // Create transport manager configuration
    const transportConfig: TransportManagerConfig = {
      selectionCriteria: this.config.transport?.selection_criteria || {
        latencyWeight: 0.3,
        reliabilityWeight: 0.4,
        capabilityWeight: 0.2,
        costWeight: 0.1
      },
      fallbackChain: this.config.transport?.preferred || [TransportType.WEBSOCKET, TransportType.HTTP, TransportType.FILESYSTEM],
      transportConfigs: {
        http: {
          serverUrl,
          timeout: this.config.timeout,
          retryAttempts: this.config.retry_attempts,
          debug: this.config.debug_mode,
          http: {
            enableSSE: true,
            maxConnections: 10,
            keepAlive: true,
            compression: true
          }
        },
        websocket: serverUrl ? {
          serverUrl,
          timeout: this.config.timeout,
          retryAttempts: this.config.retry_attempts,
          debug: this.config.debug_mode,
          websocket: {
            heartbeatInterval: 30000,
            reconnectDelay: 1000,
            maxReconnectAttempts: 10,
            persistMessages: false
          }
        } : undefined,
        filesystem: devPipePath ? {
          devPipePath,
          timeout: this.config.timeout,
          retryAttempts: this.config.retry_attempts,
          debug: this.config.debug_mode,
          filesystem: {
            watchInterval: 500,
            lockTimeout: 5000,
            maxQueueSize: 100
          }
        } : undefined
      },
      healthCheckInterval: this.config.transport?.health_check_interval || 30000,
      autoFailover: this.config.transport?.auto_failover !== false,
      debug: this.config.debug_mode
    };

    this.transportManager = new TransportManager(transportConfig);
    
    // Default user preferences
    this.userPreferences = {
      priority: 'balanced',
      max_cost_per_request: 0.50,
      preferred_providers: [],
      fallback_enabled: true,
      quality_threshold: 0.7,
      timeout_preference: 30000
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Transport manager events
    this.transportManager.on('transport_connected', (event: any) => {
      if (this.config.debug_mode) {
        console.log('Transport connected:', event.transport);
      }
      this.emit('connected', { status: 'connected', transport: event.transport });
    });

    this.transportManager.on('transport_disconnected', (event: any) => {
      if (this.config.debug_mode) {
        console.log('Transport disconnected:', event.transport);
      }
      this.emit('disconnected', { status: 'disconnected', transport: event.transport });
    });

    this.transportManager.on('transport_switched', (event: any) => {
      if (this.config.debug_mode) {
        console.log('Transport switched:', event);
      }
      this.emit('transport_changed', event);
    });

    this.transportManager.on('transport_failed', (event: any) => {
      if (this.config.debug_mode) {
        console.log('Transport failed:', event);
      }
      this.emit('connection_error', event);
    });

    this.transportManager.on('health_updated', (assessment: any) => {
      this.emit('transport_health', assessment);
    });

    this.transportManager.on('message', (message: any) => {
      // Handle incoming messages
      this.handleIncomingMessage(message);
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.transportManager.connect();
      
      // Load initial health status
      await this.refreshModelHealth();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      if (this.config.debug_mode) {
        console.log('Enhanced ModelSelectionService initialized successfully');
        console.log('Active transport:', this.transportManager.getActiveTransport()?.type);
      }
    } catch (error) {
      throw new Error(`Failed to initialize ModelSelectionService: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async selectModel(request: ModelSelectionRequest): Promise<ModelSelectionResponse> {
    try {
      return await this.performSelection(request);
    } catch (error) {
      if (this.config.fallback_enabled) {
        return await this.fallbackSelection(request, error);
      }
      throw error;
    }
  }

  private async performSelection(request: ModelSelectionRequest): Promise<ModelSelectionResponse> {
    // Create selection context based on request
    const context: SelectionContext = {
      messageType: 'model_selection',
      priority: this.determinePriority(request),
      requiresRealtime: this.requiresRealtime(request),
      maxLatency: this.userPreferences.timeout_preference
    };

    const message: DevPipeMessage = {
      id: this.generateRequestId(),
      type: 'model_selection_request',
      payload: {
        task_type: request.task_type,
        quality_requirement: request.quality_requirement || 'medium',
        max_cost: request.max_cost || this.userPreferences.max_cost_per_request,
        context_length: request.context_length,
        preferred_providers: request.preferred_providers || this.userPreferences.preferred_providers,
        timeout_ms: request.timeout_ms || this.userPreferences.timeout_preference,
        user_preferences: this.userPreferences
      },
      timestamp: Date.now()
    };

    try {
      const response = await this.transportManager.send(message, context);
      
      if (!response.success) {
        throw new ModelSelectionError(
          'SERVICE_UNAVAILABLE',
          response.error || 'Model selection failed',
          response.payload || {},
          ['Check server status', 'Retry with different parameters']
        );
      }
      
      return this.processSelectionResponse(response);
      
    } catch (error) {
      if (this.config.debug_mode) {
        console.error('Model selection failed:', error);
      }
      throw error;
    }
  }

  private async fallbackSelection(request: ModelSelectionRequest, originalError: any): Promise<ModelSelectionResponse> {
    if (this.config.debug_mode) {
      console.warn('Using fallback selection due to error:', originalError);
    }

    // Simple static fallback logic
    const fallbackModel = this.selectFallbackModel(request);
    
    return {
      selected_model: fallbackModel,
      reasoning: `Fallback selection due to service unavailability: ${originalError instanceof Error ? originalError.message : 'Unknown error'}`,
      fallback_models: [],
      estimated_cost: 0.02,
      estimated_time_ms: 5000,
      selection_metadata: {
        selection_time_ms: 100,
        factors_considered: ['fallback'],
        confidence_score: 0.3
      }
    };
  }

  private selectFallbackModel(request: ModelSelectionRequest): ModelInfo {
    // Basic fallback logic based on task type
    const modelId = (() => {
      switch (request.task_type) {
        case 'text-generation':
          return 'gpt-3.5-turbo';
        case 'code-generation':
          return 'gpt-4';
        case 'analysis':
          return 'gpt-4';
        case 'summarization':
          return 'gpt-3.5-turbo';
        default:
          return 'gpt-3.5-turbo';
      }
    })();

    return {
      id: modelId,
      name: modelId,
      provider: 'openai',
      capabilities: [{
        type: request.task_type,
        score: 0.7,
        specializations: []
      }],
      cost_per_token: 0.0015,
      max_tokens: 4096,
      response_time_avg_ms: 2000,
      availability_score: 0.8,
      quality_score: 0.7
    };
  }

  private determinePriority(request: ModelSelectionRequest): SelectionContext['priority'] {
    if (request.quality_requirement === 'low') return 'high'; // Low quality = high speed priority
    if (request.quality_requirement === 'high') return 'normal'; // High quality = normal priority
    return 'normal';
  }

  private requiresRealtime(request: ModelSelectionRequest): boolean {
    return request.task_type === 'chat';
  }

  private processSelectionResponse(response: DevPipeResponse): ModelSelectionResponse {
    const payload = response.payload;
    
    return {
      selected_model: payload.selected_model,
      reasoning: payload.reasoning || 'Model selected based on optimal criteria',
      fallback_models: payload.fallback_models || [],
      estimated_cost: payload.estimated_cost || 0.01,
      estimated_time_ms: payload.estimated_time_ms || 2000,
      selection_metadata: {
        selection_time_ms: payload.selection_metadata?.selection_time_ms || 100,
        factors_considered: payload.selection_metadata?.factors_considered || ['transport'],
        confidence_score: payload.selection_metadata?.confidence_score || 0.8
      }
    };
  }

  private handleIncomingMessage(message: any): void {
    // Handle different types of incoming messages
    if (message.type === 'health_update') {
      this.handleHealthUpdate(message.payload);
    } else if (message.type === 'performance_metrics') {
      this.handlePerformanceMetrics(message.payload);
    }
  }

  private handleHealthUpdate(healthData: ModelHealthStatus[]): void {
    this.cachedHealth = healthData;
    this.lastHealthUpdate = Date.now();
    this.emit('health-updated', healthData);
  }

  private handlePerformanceMetrics(metrics: ModelPerformanceMetrics[]): void {
    this.emit('performance-metrics', metrics);
  }

  async refreshModelHealth(): Promise<ModelHealthStatus[]> {
    try {
      const message: DevPipeMessage = {
        type: 'health_check_request',
        payload: {},
        timestamp: Date.now()
      };

      const response = await this.transportManager.send(message);
      
      if (response.success && response.payload) {
        this.cachedHealth = response.payload;
        this.lastHealthUpdate = Date.now();
        return this.cachedHealth;
      }
      
      return this.cachedHealth; // Return cached if request failed
    } catch (error) {
      if (this.config.debug_mode) {
        console.warn('Failed to refresh model health:', error);
      }
      return this.cachedHealth; // Return cached on error
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthMonitoringInterval) return;
    
    this.healthMonitoringInterval = setInterval(async () => {
      await this.refreshModelHealth();
    }, this.config.monitoring_interval);
  }

  private stopHealthMonitoring(): void {
    if (this.healthMonitoringInterval) {
      clearInterval(this.healthMonitoringInterval);
      this.healthMonitoringInterval = undefined;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods (backward compatible)
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }

  getUserPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }

  getCachedHealth(): ModelHealthStatus[] {
    return [...this.cachedHealth];
  }

  isHealthy(): boolean {
    return this.transportManager.getActiveTransport()?.isConnected() || false;
  }

  getConnectionStatus(): string {
    const activeTransport = this.transportManager.getActiveTransport();
    if (!activeTransport) return 'disconnected';
    if (activeTransport.isConnected()) return 'connected';
    return 'connecting';
  }

  getTransportStatus() {
    return {
      active: this.transportManager.getActiveTransport()?.type,
      available: this.transportManager.getAvailableTransports().map(t => t.type),
      health: this.transportManager.getTransportHealth()
    };
  }

  async disconnect(): Promise<void> {
    this.stopHealthMonitoring();
    await this.transportManager.disconnect();
  }

  // Event system
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          if (this.config.debug_mode) {
            console.error(`Error in event listener for ${event}:`, error);
          }
        }
      });
    }
  }
}
