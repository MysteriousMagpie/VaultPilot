# 🏗️ Phase 2 Implementation Guide - Technical Specifications

## 📋 Quick Reference

**Context**: VaultPilot Phase 1 (Foundation Stabilization) is complete  
**Goal**: Implement multi-transport support with intelligent failover  
**Priority**: High - Core infrastructure enhancement  
**Timeline**: 2-3 weeks

---

## 🎯 Current State Analysis

### ✅ Phase 1 Completed Assets
- **Stable foundation**: `src/main.ts` with proper error handling
- **Model selection service**: `src/services/ModelSelectionService.ts` with fallback
- **Environment detection**: `src/utils/EnvironmentDetector.ts`
- **DevPipe client**: `src/devpipe/DevPipeClient.ts` with HTTP transport
- **Test suite**: Basic unit and integration tests
- **Error boundaries**: Comprehensive error handling and retry logic

### 🔧 Current Architecture
```
VaultPilotPlugin
├── ModelSelectionService
│   └── DevPipeClient (HTTP only)
├── EnvironmentDetector
└── Error Handling + Retry Logic
```

### 🎯 Target Architecture (Phase 2)
```
VaultPilotPlugin
├── ModelSelectionService
│   └── TransportManager
│       ├── HTTPTransport (enhanced)
│       ├── WebSocketTransport (new)
│       ├── FileSystemTransport (new)
│       └── HealthMonitor + CircuitBreaker
├── EnvironmentDetector (enhanced)
└── Advanced Error Handling
```

---

## 🏗️ Detailed Implementation Specifications

### 1. Transport Interface Design

**Core Philosophy**: Transport-agnostic communication layer with pluggable implementations

```typescript
// src/devpipe/transports/DevPipeTransport.ts
export enum TransportType {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  FILESYSTEM = 'filesystem'
}

export interface DevPipeTransport {
  readonly type: TransportType
  readonly id: string
  
  // Lifecycle management
  initialize(config: TransportConfig): Promise<void>
  connect(): Promise<void>
  disconnect(): Promise<void>
  destroy(): Promise<void>
  
  // Communication
  send(message: DevPipeMessage): Promise<DevPipeResponse>
  receive(): AsyncIterator<DevPipeMessage>
  
  // Health and capabilities
  isAvailable(): boolean
  isConnected(): boolean
  getCapabilities(): TransportCapabilities
  getHealthStatus(): TransportHealthStatus
  performHealthCheck(): Promise<HealthCheckResult>
  
  // Event system
  on(event: TransportEvent, listener: EventListener): void
  off(event: TransportEvent, listener: EventListener): void
  emit(event: TransportEvent, data?: any): void
}

export interface TransportCapabilities {
  // Feature support
  supportsRealtime: boolean
  supportsBidirectional: boolean
  supportsFileSystem: boolean
  supportsStreaming: boolean
  
  // Performance characteristics
  maxMessageSize: number
  averageLatency: number
  maxConcurrentConnections: number
  
  // Reliability metrics
  reliability: number // 0-1 based on historical data
  supportedEnvironments: EnvironmentType[]
}

export interface TransportConfig {
  serverUrl?: string
  devPipePath?: string
  timeout: number
  retryAttempts: number
  debug: boolean
  
  // Transport-specific config
  http?: HTTPTransportConfig
  websocket?: WebSocketTransportConfig
  filesystem?: FileSystemTransportConfig
}
```

### 2. Base Transport Implementation

```typescript
// src/devpipe/transports/BaseTransport.ts
export abstract class BaseTransport extends EventEmitter implements DevPipeTransport {
  protected config: TransportConfig
  protected healthStatus: TransportHealthStatus
  protected circuitBreaker: CircuitBreaker
  protected metrics: TransportMetrics
  protected logger: Logger
  
  public readonly type: TransportType
  public readonly id: string
  
  constructor(type: TransportType, config: TransportConfig) {
    super()
    this.type = type
    this.id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    this.config = config
    
    this.healthStatus = {
      status: 'disconnected',
      lastCheck: Date.now(),
      latency: 0,
      errorRate: 0,
      consecutiveFailures: 0,
      uptime: 0
    }
    
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 10000
    })
    
    this.metrics = new TransportMetrics(this.id)
    this.logger = new Logger(`Transport:${type}`)
  }
  
  // Common implementations
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    try {
      await this.doHealthCheck()
      const latency = Date.now() - startTime
      
      this.healthStatus.status = 'healthy'
      this.healthStatus.latency = latency
      this.healthStatus.consecutiveFailures = 0
      this.healthStatus.lastCheck = Date.now()
      
      return { success: true, latency, timestamp: Date.now() }
    } catch (error) {
      this.healthStatus.status = 'failing'
      this.healthStatus.consecutiveFailures++
      this.healthStatus.lastCheck = Date.now()
      
      return { success: false, error: error.message, timestamp: Date.now() }
    }
  }
  
  protected async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const startTime = Date.now()
      try {
        const result = await operation()
        this.metrics.recordSuccess(operationName, Date.now() - startTime)
        return result
      } catch (error) {
        this.metrics.recordFailure(operationName, Date.now() - startTime, error)
        throw error
      }
    })
  }
  
  // Abstract methods for specific implementations
  protected abstract doHealthCheck(): Promise<void>
  public abstract getCapabilities(): TransportCapabilities
}
```

### 3. HTTP Transport Enhancement

```typescript
// src/devpipe/transports/HTTPTransport.ts
export class HTTPTransport extends BaseTransport {
  private httpClient: AxiosInstance
  private sseConnection?: EventSource
  private connectionPool: ConnectionPool
  private requestQueue: PriorityQueue<PendingRequest>
  
  constructor(config: TransportConfig) {
    super(TransportType.HTTP, config)
    
    this.httpClient = axios.create({
      baseURL: config.serverUrl,
      timeout: config.timeout,
      retries: config.retryAttempts,
      retryDelay: axiosRetry.exponentialDelay
    })
    
    this.connectionPool = new ConnectionPool({
      maxConnections: 10,
      keepAlive: true,
      timeout: config.timeout
    })
    
    this.requestQueue = new PriorityQueue()
    this.setupInterceptors()
  }
  
  async send(message: DevPipeMessage): Promise<DevPipeResponse> {
    return this.executeWithCircuitBreaker(async () => {
      const request: PendingRequest = {
        message,
        priority: this.getMessagePriority(message),
        timestamp: Date.now(),
        resolve: null,
        reject: null
      }
      
      return new Promise((resolve, reject) => {
        request.resolve = resolve
        request.reject = reject
        this.requestQueue.enqueue(request)
        this.processQueue()
      })
    }, 'http_send')
  }
  
  private async processQueue(): void {
    if (this.requestQueue.isEmpty() || !this.isConnected()) return
    
    const request = this.requestQueue.dequeue()
    if (!request) return
    
    try {
      const response = await this.httpClient.post('/devpipe/message', request.message)
      request.resolve(response.data)
    } catch (error) {
      request.reject(error)
    }
    
    // Continue processing queue
    setImmediate(() => this.processQueue())
  }
  
  private setupSSE(): void {
    if (!this.config.http?.enableSSE) return
    
    this.sseConnection = new EventSource(`${this.config.serverUrl}/devpipe/stream`)
    
    this.sseConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.emit('message', message)
      } catch (error) {
        this.logger.error('Failed to parse SSE message', error)
      }
    }
    
    this.sseConnection.onerror = (error) => {
      this.logger.error('SSE connection error', error)
      this.emit('error', error)
    }
  }
  
  getCapabilities(): TransportCapabilities {
    return {
      supportsRealtime: !!this.config.http?.enableSSE,
      supportsBidirectional: !!this.config.http?.enableSSE,
      supportsFileSystem: false,
      supportsStreaming: true,
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      averageLatency: this.healthStatus.latency,
      maxConcurrentConnections: 10,
      reliability: this.calculateReliability(),
      supportedEnvironments: ['browser', 'node', 'obsidian']
    }
  }
  
  protected async doHealthCheck(): Promise<void> {
    await this.httpClient.get('/health')
  }
}
```

### 4. WebSocket Transport Implementation

```typescript
// src/devpipe/transports/WebSocketTransport.ts
export class WebSocketTransport extends BaseTransport {
  private websocket?: ReconnectingWebSocket
  private messageQueue: MessageQueue
  private heartbeatInterval?: NodeJS.Timeout
  private responseHandlers: Map<string, ResponseHandler> = new Map()
  
  constructor(config: TransportConfig) {
    super(TransportType.WEBSOCKET, config)
    
    this.messageQueue = new MessageQueue({
      maxSize: 1000,
      persistToDisk: config.websocket?.persistMessages || false
    })
  }
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.serverUrl?.replace(/^http/, 'ws') + '/devpipe/ws'
      
      this.websocket = new ReconnectingWebSocket(wsUrl, [], {
        connectionTimeout: this.config.timeout,
        maxRetries: this.config.retryAttempts,
        maxReconnectionDelay: 10000,
        minReconnectionDelay: 1000,
        reconnectionDecay: 1.5,
        debug: this.config.debug
      })
      
      this.websocket.addEventListener('open', () => {
        this.logger.info('WebSocket connected')
        this.startHeartbeat()
        this.emit('connected')
        resolve()
      })
      
      this.websocket.addEventListener('error', (error) => {
        this.logger.error('WebSocket error', error)
        this.emit('error', error)
        reject(error)
      })
      
      this.websocket.addEventListener('message', (event) => {
        this.handleMessage(event.data)
      })
      
      this.websocket.addEventListener('close', () => {
        this.logger.info('WebSocket disconnected')
        this.stopHeartbeat()
        this.emit('disconnected')
      })
    })
  }
  
  async send(message: DevPipeMessage): Promise<DevPipeResponse> {
    return this.executeWithCircuitBreaker(async () => {
      if (!this.isConnected()) {
        throw new Error('WebSocket not connected')
      }
      
      const messageWithId = {
        ...message,
        id: this.generateMessageId(),
        timestamp: Date.now()
      }
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.responseHandlers.delete(messageWithId.id)
          reject(new Error('WebSocket message timeout'))
        }, this.config.timeout)
        
        this.responseHandlers.set(messageWithId.id, {
          resolve: (response) => {
            clearTimeout(timeout)
            resolve(response)
          },
          reject: (error) => {
            clearTimeout(timeout)
            reject(error)
          }
        })
        
        this.websocket?.send(JSON.stringify(messageWithId))
      })
    }, 'websocket_send')
  }
  
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      
      if (message.type === 'response' && message.replyTo) {
        const handler = this.responseHandlers.get(message.replyTo)
        if (handler) {
          this.responseHandlers.delete(message.replyTo)
          handler.resolve(message)
          return
        }
      }
      
      // Handle other message types
      this.emit('message', message)
    } catch (error) {
      this.logger.error('Failed to handle WebSocket message', error)
    }
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.websocket?.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, 30000) // 30 second heartbeat
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
    }
  }
  
  protected async doHealthCheck(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected')
    }
    
    // Send ping and wait for pong
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Health check timeout')), 5000)
      
      const pingId = this.generateMessageId()
      this.responseHandlers.set(pingId, {
        resolve: () => {
          clearTimeout(timeout)
          resolve()
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })
      
      this.websocket?.send(JSON.stringify({ type: 'health_ping', id: pingId }))
    })
  }
}
```

### 5. Transport Manager Implementation

```typescript
// src/devpipe/TransportManager.ts
export class TransportManager extends EventEmitter {
  private transports: Map<TransportType, DevPipeTransport> = new Map()
  private activeTransport?: DevPipeTransport
  private fallbackChain: TransportType[]
  private healthMonitor: TransportHealthMonitor
  private selector: TransportSelector
  private config: TransportManagerConfig
  
  constructor(config: TransportManagerConfig) {
    super()
    this.config = config
    this.healthMonitor = new TransportHealthMonitor()
    this.selector = new TransportSelector(config.selectionCriteria)
    this.fallbackChain = config.fallbackChain || [
      TransportType.WEBSOCKET,
      TransportType.HTTP,
      TransportType.FILESYSTEM
    ]
    
    this.initializeTransports()
    this.setupHealthMonitoring()
  }
  
  private async initializeTransports(): Promise<void> {
    // Initialize HTTP transport (always available)
    const httpTransport = new HTTPTransport(this.config.transportConfigs.http)
    this.transports.set(TransportType.HTTP, httpTransport)
    
    // Initialize WebSocket transport if supported
    if (EnvironmentDetector.supportsWebSockets()) {
      const wsTransport = new WebSocketTransport(this.config.transportConfigs.websocket)
      this.transports.set(TransportType.WEBSOCKET, wsTransport)
    }
    
    // Initialize FileSystem transport if supported
    if (EnvironmentDetector.supportsFileSystem()) {
      const fsTransport = new FileSystemTransport(this.config.transportConfigs.filesystem)
      this.transports.set(TransportType.FILESYSTEM, fsTransport)
    }
    
    // Setup transport event handlers
    for (const transport of this.transports.values()) {
      this.setupTransportEventHandlers(transport)
    }
  }
  
  async selectOptimalTransport(): Promise<DevPipeTransport> {
    const availableTransports = Array.from(this.transports.values())
      .filter(transport => transport.isAvailable())
    
    if (availableTransports.length === 0) {
      throw new Error('No available transports')
    }
    
    // Get capabilities and health status for each transport
    const transportAssessments = await Promise.all(
      availableTransports.map(async (transport) => ({
        transport,
        capabilities: transport.getCapabilities(),
        health: await transport.performHealthCheck(),
        score: await this.selector.calculateScore(transport)
      }))
    )
    
    // Sort by score (highest first)
    transportAssessments.sort((a, b) => b.score - a.score)
    
    const selectedTransport = transportAssessments[0].transport
    
    if (this.activeTransport !== selectedTransport) {
      await this.switchTransport(selectedTransport)
    }
    
    return selectedTransport
  }
  
  private async switchTransport(newTransport: DevPipeTransport): Promise<void> {
    const oldTransport = this.activeTransport
    
    try {
      // Connect new transport
      if (!newTransport.isConnected()) {
        await newTransport.connect()
      }
      
      // Switch active transport
      this.activeTransport = newTransport
      
      // Disconnect old transport if different
      if (oldTransport && oldTransport !== newTransport) {
        await oldTransport.disconnect()
      }
      
      this.emit('transport_switched', {
        from: oldTransport?.type,
        to: newTransport.type,
        reason: 'optimization'
      })
      
    } catch (error) {
      // Rollback if switch failed
      if (oldTransport) {
        this.activeTransport = oldTransport
      }
      throw error
    }
  }
  
  async handleTransportFailure(failedTransport: DevPipeTransport): Promise<void> {
    if (this.activeTransport !== failedTransport) return
    
    this.emit('transport_failed', {
      transport: failedTransport.type,
      timestamp: Date.now()
    })
    
    // Try fallback chain
    for (const transportType of this.fallbackChain) {
      if (transportType === failedTransport.type) continue
      
      const fallbackTransport = this.transports.get(transportType)
      if (fallbackTransport && fallbackTransport.isAvailable()) {
        try {
          await this.switchTransport(fallbackTransport)
          this.emit('transport_recovered', {
            from: failedTransport.type,
            to: fallbackTransport.type
          })
          return
        } catch (error) {
          continue // Try next in chain
        }
      }
    }
    
    throw new Error('All transports failed')
  }
  
  async send(message: DevPipeMessage): Promise<DevPipeResponse> {
    if (!this.activeTransport) {
      await this.selectOptimalTransport()
    }
    
    try {
      return await this.activeTransport!.send(message)
    } catch (error) {
      // Handle transport failure and retry
      await this.handleTransportFailure(this.activeTransport!)
      return await this.activeTransport!.send(message)
    }
  }
}
```

---

## 🔧 Integration Points

### Update ModelSelectionService

```typescript
// src/services/ModelSelectionService.ts - Key changes
export class ModelSelectionService {
  private transportManager: TransportManager  // Replace DevPipeClient
  
  constructor(serverUrl: string, devPipePath: string = '', options: Partial<ModelSelectionConfig> = {}) {
    // ... existing config setup ...
    
    const transportConfig: TransportManagerConfig = {
      selectionCriteria: {
        latencyWeight: 0.3,
        reliabilityWeight: 0.4,
        capabilityWeight: 0.2,
        costWeight: 0.1
      },
      fallbackChain: [TransportType.WEBSOCKET, TransportType.HTTP, TransportType.FILESYSTEM],
      transportConfigs: {
        http: { serverUrl, enableSSE: true, timeout: this.config.timeout },
        websocket: { serverUrl, timeout: this.config.timeout },
        filesystem: { devPipePath, timeout: this.config.timeout }
      }
    }
    
    this.transportManager = new TransportManager(transportConfig)
    this.setupTransportEventListeners()
  }
  
  private setupTransportEventListeners(): void {
    this.transportManager.on('transport_switched', (event) => {
      this.emit('transport_changed', event)
    })
    
    this.transportManager.on('transport_failed', (event) => {
      this.emit('connection_error', event)
    })
  }
  
  async selectModel(request: ModelSelectionRequest): Promise<ModelSelectionResponse> {
    try {
      const message: DevPipeMessage = {
        type: DevPipeMessageType.MODEL_SELECTION,
        payload: request,
        timestamp: Date.now()
      }
      
      const response = await this.transportManager.send(message)
      return response.payload as ModelSelectionResponse
      
    } catch (error) {
      // Enhanced error handling with transport context
      if (error.name === 'TransportError') {
        this.emit('transport_error', { error, context: 'model_selection' })
      }
      
      // Fallback to static selection if all transports fail
      return this.staticModelSelection(request)
    }
  }
}
```

---

## 📋 Migration Checklist

### Phase 1 → Phase 2 Migration
- [ ] **Backup current working code** (Phase 1 is stable)
- [ ] **Create transport interface** and base classes
- [ ] **Refactor DevPipeClient** into HTTPTransport
- [ ] **Implement WebSocket** and FileSystem transports
- [ ] **Create TransportManager** with intelligent selection
- [ ] **Update ModelSelectionService** to use TransportManager
- [ ] **Add health monitoring** and circuit breaker patterns
- [ ] **Implement enhanced error** handling
- [ ] **Update tests** for new transport layer
- [ ] **Validate backward compatibility** with Phase 1

### Configuration Updates
```typescript
// Before (Phase 1)
interface ModelSelectionConfig {
  devpipe_path: string
  server_url: string
  timeout: number
  // ...
}

// After (Phase 2) - Backward compatible
interface ModelSelectionConfig {
  devpipe_path: string    // Still supported
  server_url: string      // Still supported
  timeout: number         // Still supported
  
  // New transport configuration (optional)
  transport?: TransportManagerConfig
}
```

---

This implementation guide provides the technical foundation for the next agent to successfully complete Phase 2. The architecture is designed to be backward compatible while adding powerful new multi-transport capabilities.
