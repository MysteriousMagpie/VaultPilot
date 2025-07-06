/**
 * WebSocket Transport for DevPipe communication
 * Supports real-time bidirectional communication with automatic reconnection
 */

import { 
  DevPipeTransport,
  TransportType,
  TransportConfig,
  TransportCapabilities,
  DevPipeMessage,
  DevPipeResponse,
  TransportEvent,
  WebSocketTransportConfig
} from './DevPipeTransport';
import { BaseTransport } from './BaseTransport';
import { EnvironmentDetector } from '../../utils/EnvironmentDetector';

interface ResponseHandler {
  resolve: (response: DevPipeResponse) => void;
  reject: (error: Error) => void;
  timeout: any;
  timestamp: number;
}

interface MessageQueue {
  messages: DevPipeMessage[];
  maxSize: number;
  persistToDisk: boolean;
}

/**
 * Simple reconnecting WebSocket wrapper
 */
class ReconnectingWebSocket {
  private ws?: WebSocket;
  private url: string;
  private protocols: string[];
  private options: any;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private shouldReconnect: boolean = true;
  
  public onopen?: (event: Event) => void;
  public onclose?: (event: CloseEvent) => void;
  public onmessage?: (event: MessageEvent) => void;
  public onerror?: (event: Event) => void;

  constructor(url: string, protocols: string[] = [], options: any = {}) {
    this.url = url;
    this.protocols = protocols;
    this.options = options;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.connect();
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url, this.protocols);
      
      this.ws.onopen = (event) => {
        this.reconnectAttempts = 0;
        if (this.onopen) this.onopen(event);
      };
      
      this.ws.onclose = (event) => {
        if (this.onclose) this.onclose(event);
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => this.reconnect(), this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
      };
      
      this.ws.onmessage = (event) => {
        if (this.onmessage) this.onmessage(event);
      };
      
      this.ws.onerror = (event) => {
        if (this.onerror) this.onerror(event);
      };
      
    } catch (error) {
      if (this.onerror) this.onerror(new Event('error'));
    }
  }

  private reconnect(): void {
    if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.connect();
    }
  }

  send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  close(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
    }
  }

  get readyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
}

/**
 * WebSocket Transport implementation
 */
export class WebSocketTransport extends BaseTransport {
  private websocket?: ReconnectingWebSocket;
  private messageQueue: MessageQueue;
  private heartbeatInterval?: any;
  private responseHandlers: Map<string, ResponseHandler> = new Map();
  private wsConfig: WebSocketTransportConfig;

  constructor(config: TransportConfig) {
    super(TransportType.WEBSOCKET, config);
    
    this.wsConfig = config.websocket || {
      heartbeatInterval: 30000,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      persistMessages: false
    };
    
    this.messageQueue = {
      messages: [],
      maxSize: 1000,
      persistToDisk: this.wsConfig.persistMessages || false
    };
  }

  protected async doInitialize(): Promise<void> {
    // Validate WebSocket support in environment
    const environment = EnvironmentDetector.detect();
    if (!environment.hasWebSocket) {
      throw new Error('WebSocket transport not supported in this environment');
    }

    this.debug('WebSocket transport initialized');
  }

  async connect(): Promise<void> {
    if (!this.config.serverUrl) {
      throw new Error('Server URL required for WebSocket transport');
    }

    return new Promise((resolve, reject) => {
      const wsUrl = this.config.serverUrl!.replace(/^http/, 'ws') + '/api/v1/devpipe/ws';
      
      this.websocket = new ReconnectingWebSocket(wsUrl, [], {
        connectionTimeout: this.config.timeout,
        debug: this.config.debug,
        maxReconnectAttempts: this.wsConfig.maxReconnectAttempts,
        reconnectDelay: this.wsConfig.reconnectDelay
      });
      
      this.websocket.onopen = () => {
        this.connected = true;
        this.healthStatus.status = 'healthy';
        this.startHeartbeat();
        this.emit(TransportEvent.CONNECTED, { transport: this.type });
        this.debug('WebSocket connected');
        resolve();
      };
      
      this.websocket.onerror = (error) => {
        this.debug('WebSocket error:', error);
        this.emit(TransportEvent.ERROR, error);
        if (!this.connected) {
          reject(new Error('Failed to connect WebSocket'));
        }
      };
      
      this.websocket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.websocket.onclose = () => {
        this.connected = false;
        this.healthStatus.status = 'disconnected';
        this.stopHeartbeat();
        this.emit(TransportEvent.DISCONNECTED, { transport: this.type });
        this.debug('WebSocket disconnected');
      };
    });
  }

  async disconnect(): Promise<void> {
    // Reject all pending response handlers
    const handlers = Array.from(this.responseHandlers.values());
    for (const handler of handlers) {
      clearTimeout(handler.timeout);
      handler.reject(new Error('Transport disconnected'));
    }
    this.responseHandlers.clear();

    // Stop heartbeat
    this.stopHeartbeat();

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }

    this.connected = false;
    this.healthStatus.status = 'disconnected';
    this.emit(TransportEvent.DISCONNECTED, { transport: this.type });
    
    this.debug('WebSocket transport disconnected');
  }

  async send(message: DevPipeMessage): Promise<DevPipeResponse> {
    if (!this.isConnected()) {
      throw new Error('WebSocket transport not connected');
    }

    // Add message ID if not present
    if (!message.id) {
      message.id = this.generateMessageId();
    }

    // Add timestamp
    message.timestamp = Date.now();

    return this.executeWithCircuitBreaker(async () => {
      return this.sendWebSocketMessage(message);
    }, 'websocket_send');
  }

  private async sendWebSocketMessage(message: DevPipeMessage): Promise<DevPipeResponse> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.responseHandlers.delete(message.id!);
        reject(new Error(`WebSocket request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      const handler: ResponseHandler = {
        resolve: (response) => {
          clearTimeout(timeoutHandle);
          this.responseHandlers.delete(message.id!);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          this.responseHandlers.delete(message.id!);
          reject(error);
        },
        timeout: timeoutHandle,
        timestamp: Date.now()
      };

      this.responseHandlers.set(message.id!, handler);

      try {
        this.websocket!.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeoutHandle);
        this.responseHandlers.delete(message.id!);
        reject(error);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'pong') {
        // Handle heartbeat pong
        this.debug('Received heartbeat pong');
        return;
      }
      
      if (message.type === 'response' && message.replyTo) {
        // Handle response to pending request
        const handler = this.responseHandlers.get(message.replyTo);
        if (handler) {
          const response: DevPipeResponse = {
            id: message.id,
            success: message.success !== false,
            payload: message.payload,
            error: message.error,
            timestamp: Date.now()
          };
          handler.resolve(response);
        }
      } else if (message.type === 'health_pong' && message.id) {
        // Handle health check response
        const handler = this.responseHandlers.get(message.id);
        if (handler) {
          const response: DevPipeResponse = {
            id: message.id,
            success: true,
            payload: { status: 'healthy' },
            timestamp: Date.now()
          };
          handler.resolve(response);
        }
      } else {
        // Handle incoming message
        this.emit(TransportEvent.MESSAGE, message);
      }
      
    } catch (error) {
      this.debug('Failed to handle WebSocket message:', error);
      this.emit(TransportEvent.ERROR, error);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.websocket!.send(JSON.stringify({ 
            type: 'ping', 
            timestamp: Date.now() 
          }));
        } catch (error) {
          this.debug('Failed to send heartbeat:', error);
        }
      }
    }, this.wsConfig.heartbeatInterval || 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  protected async doHealthCheck(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    // Send ping and wait for pong
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, 5000);
      
      const pingId = this.generateMessageId();
      const handler: ResponseHandler = {
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
        timestamp: Date.now()
      };
      
      this.responseHandlers.set(pingId, handler);
      
      try {
        this.websocket!.send(JSON.stringify({ 
          type: 'health_ping', 
          id: pingId,
          timestamp: Date.now()
        }));
      } catch (error) {
        clearTimeout(timeout);
        this.responseHandlers.delete(pingId);
        reject(error);
      }
    });
  }

  getCapabilities(): TransportCapabilities {
    return {
      supportsRealtime: true,
      supportsBidirectional: true,
      supportsFileSystem: false,
      supportsStreaming: true,
      maxMessageSize: 1024 * 1024, // 1MB
      averageLatency: this.healthStatus.latency,
      maxConcurrentConnections: 1,
      reliability: this.calculateReliability(),
      supportedEnvironments: ['browser', 'node', 'obsidian']
    };
  }
}
