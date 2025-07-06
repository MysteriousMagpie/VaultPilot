/**
 * Base transport implementation with common functionality
 * All specific transport types extend this base class
 */

import { 
  DevPipeTransport, 
  TransportType, 
  TransportConfig, 
  TransportHealthStatus, 
  HealthCheckResult,
  EventListener,
  TransportEvent,
  DevPipeMessage,
  DevPipeResponse,
  TransportCapabilities
} from './DevPipeTransport';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface TransportMetrics {
  messagesSent: number;
  messagesReceived: number;
  errors: number;
  totalLatency: number;
  lastActivity: number;
}

/**
 * Circuit breaker pattern implementation for transport reliability
 */
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.config.resetTimeout;
    }
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Base transport class with common functionality
 */
export abstract class BaseTransport implements DevPipeTransport {
  protected config: TransportConfig;
  protected healthStatus: TransportHealthStatus;
  protected circuitBreaker: CircuitBreaker;
  protected metrics: TransportMetrics;
  protected eventListeners: Map<string, EventListener[]> = new Map();
  
  public readonly type: TransportType;
  public readonly id: string;
  protected connected: boolean = false;
  protected initialized: boolean = false;

  constructor(type: TransportType, config: TransportConfig) {
    this.type = type;
    this.id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
    
    this.healthStatus = {
      status: 'disconnected',
      lastCheck: Date.now(),
      latency: 0,
      errorRate: 0,
      consecutiveFailures: 0,
      uptime: 0
    };
    
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 10000
    });
    
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      totalLatency: 0,
      lastActivity: Date.now()
    };

    this.debug(`Transport ${this.id} created`);
  }

  // Event system implementation
  on(event: TransportEvent | string, listener: EventListener): void {
    const eventKey = event.toString();
    if (!this.eventListeners.has(eventKey)) {
      this.eventListeners.set(eventKey, []);
    }
    this.eventListeners.get(eventKey)!.push(listener);
  }

  off(event: TransportEvent | string, listener: EventListener): void {
    const eventKey = event.toString();
    const listeners = this.eventListeners.get(eventKey);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: TransportEvent | string, data?: any): void {
    const eventKey = event.toString();
    const listeners = this.eventListeners.get(eventKey);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.debug(`Error in event listener for ${eventKey}:`, error);
        }
      });
    }
  }

  // Health monitoring
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      await this.doHealthCheck();
      const latency = Date.now() - startTime;
      
      this.healthStatus.status = 'healthy';
      this.healthStatus.latency = latency;
      this.healthStatus.consecutiveFailures = 0;
      this.healthStatus.lastCheck = Date.now();
      
      this.emit(TransportEvent.HEALTH_CHECK, { success: true, latency });
      
      return { success: true, latency, timestamp: Date.now() };
    } catch (error) {
      this.healthStatus.status = 'failing';
      this.healthStatus.consecutiveFailures++;
      this.healthStatus.lastCheck = Date.now();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit(TransportEvent.HEALTH_CHECK, { success: false, error: errorMessage });
      
      return { success: false, error: errorMessage, latency: Date.now() - startTime, timestamp: Date.now() };
    }
  }

  // Circuit breaker wrapper for operations
  protected async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await this.circuitBreaker.execute(operation);
      const latency = Date.now() - startTime;
      this.updateMetrics(true, latency);
      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateMetrics(false, latency);
      this.debug(`Operation ${operationName} failed:`, error);
      throw error;
    }
  }

  private updateMetrics(success: boolean, latency: number): void {
    if (success) {
      this.metrics.messagesSent++;
      this.metrics.totalLatency += latency;
    } else {
      this.metrics.errors++;
    }
    this.metrics.lastActivity = Date.now();
  }

  // Utility methods
  protected generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected debug(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[${this.type}:${this.id}] ${message}`, ...args);
    }
  }

  protected calculateReliability(): number {
    const total = this.metrics.messagesSent + this.metrics.errors;
    if (total === 0) return 1.0;
    return this.metrics.messagesSent / total;
  }

  // Standard interface implementations
  isAvailable(): boolean {
    return this.initialized && this.circuitBreaker.getState() !== 'open';
  }

  isConnected(): boolean {
    return this.connected && this.isAvailable();
  }

  getHealthStatus(): TransportHealthStatus {
    return { ...this.healthStatus };
  }

  async initialize(config: TransportConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.doInitialize();
    this.initialized = true;
    this.debug('Transport initialized');
  }

  async destroy(): Promise<void> {
    await this.disconnect();
    this.eventListeners.clear();
    this.initialized = false;
    this.debug('Transport destroyed');
  }

  // Abstract methods that must be implemented by specific transport types
  protected abstract doInitialize(): Promise<void>;
  protected abstract doHealthCheck(): Promise<void>;
  public abstract connect(): Promise<void>;
  public abstract disconnect(): Promise<void>;
  public abstract send(message: DevPipeMessage): Promise<DevPipeResponse>;
  public abstract getCapabilities(): TransportCapabilities;
}
