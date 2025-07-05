import { DevPipeClient } from '../devpipe/DevPipeClient';
import { 
  ModelSelectionRequest, 
  ModelSelectionResponse, 
  ModelHealthStatus, 
  UserPreferences, 
  ModelPerformanceMetrics,
  ModelSelectionConfig,
  ModelSelectionError,
  ModelSelectionEvent 
} from '../types/ModelSelection';

export class ModelSelectionService {
  private devPipeClient: DevPipeClient;
  private config: ModelSelectionConfig;
  private userPreferences: UserPreferences;
  private cachedHealth: ModelHealthStatus[] = [];
  private lastHealthUpdate: number = 0;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(serverUrl: string, devPipePath: string = '', options: Partial<ModelSelectionConfig> = {}) {
    this.config = {
      devpipe_path: devPipePath,
      server_url: serverUrl,
      monitoring_interval: options.monitoring_interval || 30000,
      fallback_enabled: options.fallback_enabled !== false,
      cache_duration: options.cache_duration || 300000, // 5 minutes
      retry_attempts: options.retry_attempts || 3,
      timeout: options.timeout || 30000,
      debug_mode: options.debug_mode || false
    };

    this.devPipeClient = new DevPipeClient(this.config);
    
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
    this.devPipeClient.on('connected', () => {
      this.emit('connected', { status: 'connected' });
    });

    this.devPipeClient.on('disconnected', () => {
      this.emit('disconnected', { status: 'disconnected' });
    });

    this.devPipeClient.on('health-updated', (healthData: ModelHealthStatus[]) => {
      this.cachedHealth = healthData;
      this.lastHealthUpdate = Date.now();
      this.emit('health-updated', healthData);
    });

    this.devPipeClient.on('performance-metrics', (metrics: ModelPerformanceMetrics[]) => {
      this.emit('performance-metrics', metrics);
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.devPipeClient.initialize();
      
      // Load initial health status
      await this.refreshModelHealth();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      if (this.config.debug_mode) {
        console.log('ModelSelectionService initialized successfully');
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
    if (!this.devPipeClient.isReady()) {
      throw new ModelSelectionError('NO_HEALTHY_MODELS', 'DevPipe client not connected', {}, ['Check server connection', 'Retry initialization']);
    }

    // Add user preferences to request
    const enhancedRequest = {
      ...request,
      user_preferences: this.userPreferences,
      timeout_ms: request.timeout_ms || this.config.timeout
    };

    const response = await this.devPipeClient.sendMessage<ModelSelectionResponse>(
      'model-selection-request',
      enhancedRequest,
      this.config.timeout
    );

    return response;
  }

  private async fallbackSelection(
    request: ModelSelectionRequest, 
    originalError: any
  ): Promise<ModelSelectionResponse> {
    console.warn('Model selection failed, using fallback:', originalError);

    // Try cached selection first
    const cached = this.getCachedSelection(request);
    if (cached) {
      return cached;
    }

    // Use static rules as last resort
    return this.staticModelSelection(request);
  }

  private staticModelSelection(request: ModelSelectionRequest): ModelSelectionResponse {
    // Simple static rules for fallback
    const defaultModels: { [key: string]: { name: string; cost: number } } = {
      'text-generation': { name: 'gpt-3.5-turbo', cost: 0.002 },
      'code-generation': { name: 'gpt-4', cost: 0.03 },
      'chat': { name: 'gpt-3.5-turbo', cost: 0.002 },
      'summarization': { name: 'gpt-3.5-turbo', cost: 0.002 },
      'translation': { name: 'gpt-3.5-turbo', cost: 0.002 }
    };

    const defaultModel = defaultModels[request.task_type] || defaultModels['text-generation'];

    return {
      selected_model: {
        id: defaultModel.name,
        name: defaultModel.name,
        provider: 'openai',
        capabilities: [{ type: request.task_type, score: 0.8 }],
        cost_per_token: defaultModel.cost,
        max_tokens: 4000,
        response_time_avg_ms: 2000,
        availability_score: 0.9,
        quality_score: 0.8
      },
      reasoning: 'Fallback selection due to service unavailability',
      fallback_models: [],
      estimated_cost: defaultModel.cost * 100, // Estimate for 100 tokens
      estimated_time_ms: 2000,
      selection_metadata: {
        selection_time_ms: 0,
        factors_considered: ['fallback'],
        confidence_score: 0.5
      }
    };
  }

  private getCachedSelection(request: ModelSelectionRequest): ModelSelectionResponse | null {
    // Implementation of cache lookup
    // For now, return null (no cache)
    return null;
  }

  // Original selectModel method renamed to performSelection (see above)
  async selectModel_OLD(request: ModelSelectionRequest): Promise<ModelSelectionResponse> {
    if (!this.devPipeClient.isReady()) {
      throw new ModelSelectionError('NO_HEALTHY_MODELS', 'DevPipe client not connected', {}, ['Check server connection', 'Retry initialization']);
    }

    try {
      // Add user preferences to request
      const enhancedRequest = {
        ...request,
        user_preferences: this.userPreferences,
        timeout_ms: request.timeout_ms || this.config.timeout
      };

      const response = await this.devPipeClient.sendMessage<ModelSelectionResponse>(
        'model-selection-request',
        enhancedRequest,
        request.timeout_ms || this.config.timeout
      );

      // Emit selection event
      this.emit('model-selected', response);

      if (this.config.debug_mode) {
        console.log('Model selected:', response.selected_model.name, 'for task:', request.task_type);
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new ModelSelectionError('TIMEOUT', 'Model selection request timed out', { originalError: error }, ['Increase timeout', 'Check server performance']);
        } else if (error.message.includes('budget') || error.message.includes('cost')) {
          throw new ModelSelectionError('BUDGET_EXCEEDED', 'Request exceeds budget limits', { originalError: error }, ['Increase budget', 'Use lower cost models']);
        }
      }
      
      throw new ModelSelectionError('SERVICE_UNAVAILABLE', 'Model selection service unavailable', { originalError: error }, ['Check server status', 'Retry request']);
    }
  }

  async getModelHealth(): Promise<ModelHealthStatus[]> {
    // Return cached health if recent
    if (this.cachedHealth.length > 0 && (Date.now() - this.lastHealthUpdate) < this.config.cache_duration) {
      return this.cachedHealth;
    }

    return await this.refreshModelHealth();
  }

  private async refreshModelHealth(): Promise<ModelHealthStatus[]> {
    try {
      const health = await this.devPipeClient.sendMessage<ModelHealthStatus[]>(
        'health-check-request',
        {},
        10000 // Short timeout for health checks
      );

      this.cachedHealth = health;
      this.lastHealthUpdate = Date.now();
      
      return health;
    } catch (error) {
      if (this.config.debug_mode) {
        console.warn('Failed to refresh model health:', error);
      }
      return this.cachedHealth; // Return cached data on error
    }
  }

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    this.userPreferences = {
      ...this.userPreferences,
      ...preferences
    };

    try {
      await this.devPipeClient.sendMessage(
        'preferences-update',
        this.userPreferences,
        5000
      );

      this.emit('preferences-updated', this.userPreferences);
      
      if (this.config.debug_mode) {
        console.log('User preferences updated:', this.userPreferences);
      }
    } catch (error) {
      if (this.config.debug_mode) {
        console.warn('Failed to sync preferences with server:', error);
      }
      // Continue with local preferences even if server sync fails
    }
  }

  getPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }

  private startHealthMonitoring(): void {
    if (this.config.monitoring_interval > 0) {
      setInterval(async () => {
        try {
          await this.refreshModelHealth();
        } catch (error) {
          if (this.config.debug_mode) {
            console.warn('Health monitoring failed:', error);
          }
        }
      }, this.config.monitoring_interval);
    }
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
            console.error('Event listener error:', error);
          }
        }
      });
    }
  }

  // Quick selection methods for common use cases
  async selectForTask(taskType: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<ModelSelectionResponse> {
    return this.selectModel({
      task_type: taskType as any,
      quality_requirement: quality
    });
  }

  async selectCostOptimized(taskType: string, maxCost: number = 0.01): Promise<ModelSelectionResponse> {
    return this.selectModel({
      task_type: taskType as any,
      quality_requirement: 'medium',
      max_cost: maxCost
    });
  }

  async selectHighPerformance(taskType: string): Promise<ModelSelectionResponse> {
    return this.selectModel({
      task_type: taskType as any,
      quality_requirement: 'high'
    });
  }

  // Utility methods
  isConnected(): boolean {
    return this.devPipeClient.isReady();
  }

  getConfig(): ModelSelectionConfig {
    return { ...this.config };
  }

  async disconnect(): Promise<void> {
    await this.devPipeClient.disconnect();
  }
}
