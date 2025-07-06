/**
 * Enhanced HTTP Transport for DevPipe communication
 * Supports Server-Sent Events, connection pooling, and advanced retry logic
 */

import { 
  DevPipeTransport,
  TransportType,
  TransportConfig,
  TransportCapabilities,
  DevPipeMessage,
  DevPipeResponse,
  TransportEvent,
  HTTPTransportConfig
} from './DevPipeTransport';
import { BaseTransport } from './BaseTransport';
import { EnvironmentDetector } from '../../utils/EnvironmentDetector';

interface PendingRequest {
  id: string;
  message: DevPipeMessage;
  resolve: (response: DevPipeResponse) => void;
  reject: (error: Error) => void;
  timeout: any; // Can be NodeJS.Timeout or number depending on environment
  timestamp: number;
}

interface ConnectionPoolOptions {
  maxConnections: number;
  keepAlive: boolean;
  timeout: number;
}

/**
 * Simple connection pool for HTTP requests
 */
class ConnectionPool {
  private activeConnections: number = 0;
  private maxConnections: number;
  private queue: (() => void)[] = [];

  constructor(options: ConnectionPoolOptions) {
    this.maxConnections = options.maxConnections;
  }

  async acquire<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.activeConnections++;
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeConnections--;
          if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
          }
        }
      };

      if (this.activeConnections < this.maxConnections) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }
}

/**
 * HTTP Transport implementation with enhanced features
 */
export class HTTPTransport extends BaseTransport {
  private sseConnection?: EventSource;
  private connectionPool: ConnectionPool;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private httpConfig: HTTPTransportConfig;
  private messageQueue: DevPipeMessage[] = [];
  private processingQueue: boolean = false;

  constructor(config: TransportConfig) {
    super(TransportType.HTTP, config);
    
    this.httpConfig = config.http || {
      enableSSE: true,
      maxConnections: 10,
      keepAlive: true,
      compression: true
    };
    
    this.connectionPool = new ConnectionPool({
      maxConnections: this.httpConfig.maxConnections || 10,
      keepAlive: this.httpConfig.keepAlive !== false,
      timeout: config.timeout
    });
  }

  protected async doInitialize(): Promise<void> {
    // Validate HTTP support in environment
    const environment = EnvironmentDetector.detect();
    if (!environment.hasHTTP) {
      throw new Error('HTTP transport not supported in this environment');
    }

    this.debug('HTTP transport initialized');
  }

  async connect(): Promise<void> {
    try {
      // Test basic connectivity
      await this.doHealthCheck();
      
      // Setup Server-Sent Events if enabled
      if (this.httpConfig.enableSSE && this.config.serverUrl) {
        await this.setupSSE();
      }
      
      this.connected = true;
      this.healthStatus.status = 'healthy';
      this.emit(TransportEvent.CONNECTED, { transport: this.type });
      
      this.debug('HTTP transport connected');
    } catch (error) {
      this.emit(TransportEvent.ERROR, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Reject all pending requests
    const requests = Array.from(this.pendingRequests.values());
    for (const request of requests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Transport disconnected'));
    }
    this.pendingRequests.clear();

    // Close SSE connection
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = undefined;
    }

    this.connected = false;
    this.healthStatus.status = 'disconnected';
    this.emit(TransportEvent.DISCONNECTED, { transport: this.type });
    
    this.debug('HTTP transport disconnected');
  }

  async send(message: DevPipeMessage): Promise<DevPipeResponse> {
    if (!this.isConnected()) {
      throw new Error('HTTP transport not connected');
    }

    // Add message ID if not present
    if (!message.id) {
      message.id = this.generateMessageId();
    }

    // Add timestamp
    message.timestamp = Date.now();

    return this.executeWithCircuitBreaker(async () => {
      return this.sendHttpRequest(message);
    }, 'http_send');
  }

  private async sendHttpRequest(message: DevPipeMessage): Promise<DevPipeResponse> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(message.id!);
        reject(new Error(`Request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      const request: PendingRequest = {
        id: message.id!,
        message,
        resolve: (response) => {
          clearTimeout(timeoutHandle);
          this.pendingRequests.delete(message.id!);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          this.pendingRequests.delete(message.id!);
          reject(error);
        },
        timeout: timeoutHandle,
        timestamp: Date.now()
      };

      this.pendingRequests.set(message.id!, request);
      this.performHttpRequest(message, request);
    });
  }

  private async performHttpRequest(message: DevPipeMessage, request: PendingRequest): Promise<void> {
    try {
      const response = await this.connectionPool.acquire(async () => {
        const fetchResponse = await fetch(`${this.config.serverUrl}/api/v1/devpipe/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.httpConfig.compression && { 'Accept-Encoding': 'gzip, deflate' })
          },
          body: JSON.stringify(message)
        });

        if (!fetchResponse.ok) {
          throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
        }

        return fetchResponse.json();
      });

      // Handle immediate response
      if (response && response.id === message.id) {
        const devPipeResponse: DevPipeResponse = {
          id: response.id,
          success: true,
          payload: response.payload || response,
          timestamp: Date.now()
        };
        request.resolve(devPipeResponse);
      } else {
        // Wait for async response via SSE or polling
        this.debug(`Waiting for async response for message ${message.id}`);
      }

    } catch (error) {
      request.reject(error instanceof Error ? error : new Error('HTTP request failed'));
    }
  }

  private async setupSSE(): Promise<void> {
    if (!this.config.serverUrl) {
      throw new Error('Server URL required for SSE');
    }

    return new Promise((resolve, reject) => {
      const sseUrl = `${this.config.serverUrl}/api/v1/devpipe/stream`;
      this.sseConnection = new EventSource(sseUrl);
      
      this.sseConnection.onopen = () => {
        this.debug('SSE connection established');
        resolve();
      };

      this.sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSSEMessage(data);
        } catch (error) {
          this.debug('Failed to parse SSE message:', error);
        }
      };

      this.sseConnection.onerror = (error) => {
        this.debug('SSE connection error:', error);
        if (this.sseConnection?.readyState === EventSource.CONNECTING) {
          this.emit(TransportEvent.RECONNECTING, { transport: this.type });
        } else {
          this.emit(TransportEvent.ERROR, error);
          reject(error);
        }
      };
    });
  }

  private handleSSEMessage(data: any): void {
    if (data.type === 'response' && data.id) {
      // Handle response to pending request
      const request = this.pendingRequests.get(data.id);
      if (request) {
        const response: DevPipeResponse = {
          id: data.id,
          success: data.success !== false,
          payload: data.payload,
          error: data.error,
          timestamp: Date.now()
        };
        request.resolve(response);
      }
    } else {
      // Handle incoming message
      this.emit(TransportEvent.MESSAGE, data);
    }
  }

  protected async doHealthCheck(): Promise<void> {
    if (!this.config.serverUrl) {
      throw new Error('No server URL configured');
    }

    const response = await fetch(`${this.config.serverUrl}/api/v1/devpipe/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
    }
  }

  getCapabilities(): TransportCapabilities {
    return {
      supportsRealtime: !!this.httpConfig.enableSSE,
      supportsBidirectional: !!this.httpConfig.enableSSE,
      supportsFileSystem: false,
      supportsStreaming: true,
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      averageLatency: this.healthStatus.latency,
      maxConcurrentConnections: this.httpConfig.maxConnections || 10,
      reliability: this.calculateReliability(),
      supportedEnvironments: ['browser', 'node', 'obsidian']
    };
  }
}
