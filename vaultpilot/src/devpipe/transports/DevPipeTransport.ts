/**
 * Transport interface for DevPipe communication
 * Supports multiple transport types: HTTP, WebSocket, FileSystem
 */

export enum TransportType {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  FILESYSTEM = 'filesystem'
}

export enum TransportEvent {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  MESSAGE = 'message',
  ERROR = 'error',
  HEALTH_CHECK = 'health_check',
  RECONNECTING = 'reconnecting'
}

export interface TransportCapabilities {
  // Feature support
  supportsRealtime: boolean;
  supportsBidirectional: boolean;
  supportsFileSystem: boolean;
  supportsStreaming: boolean;
  
  // Performance characteristics
  maxMessageSize: number;
  averageLatency: number;
  maxConcurrentConnections: number;
  
  // Reliability metrics
  reliability: number; // 0-1 based on historical data
  supportedEnvironments: string[];
}

export interface TransportHealthStatus {
  status: 'healthy' | 'degraded' | 'failing' | 'disconnected';
  lastCheck: number;
  latency: number;
  errorRate: number;
  consecutiveFailures: number;
  uptime: number;
}

export interface HealthCheckResult {
  success: boolean;
  latency: number;
  timestamp: number;
  error?: string;
}

export interface DevPipeMessage {
  id?: string;
  type: string;
  payload: any;
  timestamp?: number;
  replyTo?: string;
}

export interface DevPipeResponse {
  id?: string;
  success: boolean;
  payload?: any;
  error?: string;
  timestamp: number;
}

export interface TransportConfig {
  serverUrl?: string;
  devPipePath?: string;
  timeout: number;
  retryAttempts: number;
  debug: boolean;
  
  // Transport-specific config
  http?: HTTPTransportConfig;
  websocket?: WebSocketTransportConfig;
  filesystem?: FileSystemTransportConfig;
}

export interface HTTPTransportConfig {
  enableSSE?: boolean;
  maxConnections?: number;
  keepAlive?: boolean;
  compression?: boolean;
}

export interface WebSocketTransportConfig {
  heartbeatInterval?: number;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  persistMessages?: boolean;
}

export interface FileSystemTransportConfig {
  watchInterval?: number;
  lockTimeout?: number;
  maxQueueSize?: number;
}

export interface EventListener {
  (data: any): void;
}

/**
 * Core transport interface that all transport implementations must follow
 */
export interface DevPipeTransport {
  readonly type: TransportType;
  readonly id: string;
  
  // Lifecycle management
  initialize(config: TransportConfig): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  destroy(): Promise<void>;
  
  // Communication
  send(message: DevPipeMessage): Promise<DevPipeResponse>;
  
  // Message receiving is handled via events rather than async iterator
  // Listen to 'message' event to receive incoming messages
  
  // Health and capabilities
  isAvailable(): boolean;
  isConnected(): boolean;
  getCapabilities(): TransportCapabilities;
  getHealthStatus(): TransportHealthStatus;
  performHealthCheck(): Promise<HealthCheckResult>;
  
  // Event system
  on(event: TransportEvent | string, listener: EventListener): void;
  off(event: TransportEvent | string, listener: EventListener): void;
  emit(event: TransportEvent | string, data?: any): void;
}
