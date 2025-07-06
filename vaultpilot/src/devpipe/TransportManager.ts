/**
 * Transport Manager - Intelligent transport selection and failover management
 */

import { 
  DevPipeTransport,
  TransportType,
  TransportConfig,
  DevPipeMessage,
  DevPipeResponse,
  TransportEvent
} from './transports/DevPipeTransport';
import { HTTPTransport } from './transports/HTTPTransport';
import { WebSocketTransport } from './transports/WebSocketTransport';
import { FileSystemTransport } from './transports/FileSystemTransport';
import { TransportHealthMonitor, HealthAssessment } from './monitoring/TransportHealthMonitor';
import { EnvironmentDetector } from '../utils/EnvironmentDetector';

export interface TransportSelectionCriteria {
  latencyWeight: number;      // 0-1
  reliabilityWeight: number;  // 0-1
  capabilityWeight: number;   // 0-1
  costWeight: number;         // 0-1
}

export interface TransportManagerConfig {
  selectionCriteria: TransportSelectionCriteria;
  fallbackChain: TransportType[];
  transportConfigs: {
    http: TransportConfig;
    websocket?: TransportConfig;
    filesystem?: TransportConfig;
  };
  healthCheckInterval?: number;
  autoFailover?: boolean;
  debug?: boolean;
}

export interface SelectionContext {
  messageType?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  requiresRealtime?: boolean;
  maxLatency?: number;
  retryAttempt?: number;
}

/**
 * Transport selector that chooses the best transport based on criteria
 */
export class TransportSelector {
  private criteria: TransportSelectionCriteria;

  constructor(criteria: TransportSelectionCriteria) {
    this.criteria = criteria;
  }

  async calculateScore(transport: DevPipeTransport, context?: SelectionContext): Promise<number> {
    const capabilities = transport.getCapabilities();
    const healthStatus = transport.getHealthStatus();
    
    // Capability score (0-1)
    let capabilityScore = 0.5; // Base score
    
    if (context?.requiresRealtime && capabilities.supportsRealtime) {
      capabilityScore += 0.3;
    }
    
    if (context?.maxLatency && capabilities.averageLatency <= context.maxLatency) {
      capabilityScore += 0.2;
    }
    
    // Normalize capability score
    capabilityScore = Math.min(capabilityScore, 1.0);
    
    // Latency score (0-1, lower latency = higher score)
    const latencyScore = Math.max(0, 1.0 - (capabilities.averageLatency / 5000));
    
    // Reliability score (0-1)
    const reliabilityScore = capabilities.reliability;
    
    // Cost score (simplified - could be enhanced with actual cost data)
    let costScore = 1.0;
    if (transport.type === TransportType.HTTP) costScore = 0.8;
    else if (transport.type === TransportType.WEBSOCKET) costScore = 0.9;
    else if (transport.type === TransportType.FILESYSTEM) costScore = 1.0;
    
    // Availability penalty
    let availabilityMultiplier = 1.0;
    if (!transport.isAvailable()) availabilityMultiplier = 0;
    else if (!transport.isConnected()) availabilityMultiplier = 0.3;
    else if (healthStatus.status === 'failing') availabilityMultiplier = 0.1;
    else if (healthStatus.status === 'degraded') availabilityMultiplier = 0.5;
    
    // Calculate weighted score
    const weightedScore = (
      latencyScore * this.criteria.latencyWeight +
      reliabilityScore * this.criteria.reliabilityWeight +
      capabilityScore * this.criteria.capabilityWeight +
      costScore * this.criteria.costWeight
    ) * availabilityMultiplier;
    
    return Math.max(0, Math.min(1, weightedScore));
  }

  selectBest(
    available: DevPipeTransport[], 
    context?: SelectionContext
  ): Promise<DevPipeTransport | null> {
    return new Promise(async (resolve) => {
      if (available.length === 0) {
        resolve(null);
        return;
      }
      
      // Calculate scores for all available transports
      const scoredTransports = await Promise.all(
        available.map(async (transport) => ({
          transport,
          score: await this.calculateScore(transport, context)
        }))
      );
      
      // Sort by score (highest first)
      scoredTransports.sort((a, b) => b.score - a.score);
      
      // Return the best transport
      resolve(scoredTransports[0].transport);
    });
  }
}

/**
 * Main Transport Manager class
 */
export class TransportManager {
  private transports: Map<TransportType, DevPipeTransport> = new Map();
  private activeTransport?: DevPipeTransport;
  private fallbackChain: TransportType[];
  private healthMonitor: TransportHealthMonitor;
  private selector: TransportSelector;
  private config: TransportManagerConfig;
  private eventListeners: Map<string, Function[]> = new Map();
  private failoverInProgress: boolean = false;

  constructor(config: TransportManagerConfig) {
    this.config = config;
    this.fallbackChain = config.fallbackChain || [
      TransportType.WEBSOCKET,
      TransportType.HTTP,
      TransportType.FILESYSTEM
    ];
    
    this.healthMonitor = new TransportHealthMonitor();
    this.selector = new TransportSelector(config.selectionCriteria);
    
    this.initializeTransports();
    this.setupHealthMonitoring();
  }

  private async initializeTransports(): Promise<void> {
    const environment = EnvironmentDetector.detect();
    
    // Always initialize HTTP transport (most compatible)
    const httpTransport = new HTTPTransport(this.config.transportConfigs.http);
    await httpTransport.initialize(this.config.transportConfigs.http);
    this.transports.set(TransportType.HTTP, httpTransport);
    
    // Initialize WebSocket transport if supported and configured
    if (environment.hasWebSocket && this.config.transportConfigs.websocket) {
      const wsTransport = new WebSocketTransport(this.config.transportConfigs.websocket);
      await wsTransport.initialize(this.config.transportConfigs.websocket);
      this.transports.set(TransportType.WEBSOCKET, wsTransport);
    }
    
    // Initialize FileSystem transport if supported and configured
    if (environment.hasFileSystem && this.config.transportConfigs.filesystem) {
      const fsTransport = new FileSystemTransport(this.config.transportConfigs.filesystem);
      await fsTransport.initialize(this.config.transportConfigs.filesystem);
      this.transports.set(TransportType.FILESYSTEM, fsTransport);
    }
    
    // Setup event handlers for each transport
    const transports = Array.from(this.transports.values());
    for (const transport of transports) {
      this.setupTransportEventHandlers(transport);
    }
    
    this.debug(`Initialized ${this.transports.size} transports`);
  }

  private setupTransportEventHandlers(transport: DevPipeTransport): void {
    transport.on(TransportEvent.CONNECTED, () => {
      this.debug(`Transport ${transport.type} connected`);
      this.emit('transport_connected', { transport: transport.type });
    });
    
    transport.on(TransportEvent.DISCONNECTED, () => {
      this.debug(`Transport ${transport.type} disconnected`);
      this.emit('transport_disconnected', { transport: transport.type });
      
      // Trigger failover if this was the active transport
      if (this.activeTransport === transport && this.config.autoFailover !== false) {
        this.handleTransportFailure(transport);
      }
    });
    
    transport.on(TransportEvent.ERROR, (error) => {
      this.debug(`Transport ${transport.type} error:`, error);
      this.emit('transport_error', { transport: transport.type, error });
    });
    
    transport.on(TransportEvent.MESSAGE, (message) => {
      this.emit('message', message);
    });
  }

  private setupHealthMonitoring(): void {
    const transports = Array.from(this.transports.values());
    for (const transport of transports) {
      this.healthMonitor.startMonitoring(
        transport, 
        this.config.healthCheckInterval || 30000
      );
    }
    
    this.healthMonitor.on('health-updated', (assessment: HealthAssessment) => {
      this.emit('health_updated', assessment);
      
      // Consider transport switching if current transport is degrading
      if (this.activeTransport?.type === assessment.transport && 
          assessment.recommendation === 'avoid' &&
          !this.failoverInProgress) {
        this.selectOptimalTransport();
      }
    });
  }

  async selectOptimalTransport(context?: SelectionContext): Promise<DevPipeTransport> {
    const availableTransports = Array.from(this.transports.values())
      .filter(transport => transport.isAvailable());
    
    if (availableTransports.length === 0) {
      throw new Error('No available transports');
    }
    
    const selectedTransport = await this.selector.selectBest(availableTransports, context);
    if (!selectedTransport) {
      throw new Error('No suitable transport found');
    }
    
    if (this.activeTransport !== selectedTransport) {
      await this.switchTransport(selectedTransport, 'optimization');
    }
    
    return selectedTransport;
  }

  private async switchTransport(
    newTransport: DevPipeTransport, 
    reason: 'optimization' | 'failover' | 'manual'
  ): Promise<void> {
    const oldTransport = this.activeTransport;
    
    try {
      this.debug(`Switching transport from ${oldTransport?.type || 'none'} to ${newTransport.type} (${reason})`);
      
      // Connect new transport if not already connected
      if (!newTransport.isConnected()) {
        await newTransport.connect();
      }
      
      // Switch active transport
      this.activeTransport = newTransport;
      
      // Disconnect old transport if different (but don't await to avoid delays)
      if (oldTransport && oldTransport !== newTransport) {
        oldTransport.disconnect().catch(error => {
          this.debug(`Error disconnecting old transport ${oldTransport.type}:`, error);
        });
      }
      
      this.emit('transport_switched', {
        from: oldTransport?.type,
        to: newTransport.type,
        reason
      });
      
    } catch (error) {
      // Rollback if switch failed
      if (oldTransport && oldTransport.isConnected()) {
        this.activeTransport = oldTransport;
      }
      throw error;
    }
  }

  async handleTransportFailure(failedTransport: DevPipeTransport): Promise<void> {
    if (this.failoverInProgress) return;
    this.failoverInProgress = true;
    
    try {
      this.debug(`Handling failure of transport ${failedTransport.type}`);
      this.emit('transport_failed', {
        transport: failedTransport.type,
        timestamp: Date.now()
      });
      
      // Try fallback chain
      for (const transportType of this.fallbackChain) {
        if (transportType === failedTransport.type) continue;
        
        const fallbackTransport = this.transports.get(transportType);
        if (fallbackTransport && fallbackTransport.isAvailable()) {
          try {
            await this.switchTransport(fallbackTransport, 'failover');
            this.debug(`Successfully failed over to ${transportType}`);
            return;
          } catch (error) {
            this.debug(`Failover to ${transportType} failed:`, error);
            continue;
          }
        }
      }
      
      throw new Error('All transports failed');
      
    } finally {
      this.failoverInProgress = false;
    }
  }

  async send(message: DevPipeMessage, context?: SelectionContext): Promise<DevPipeResponse> {
    // Ensure we have an active transport
    if (!this.activeTransport) {
      await this.selectOptimalTransport(context);
    }
    
    if (!this.activeTransport) {
      throw new Error('No active transport available');
    }
    
    try {
      return await this.activeTransport.send(message);
    } catch (error) {
      // Handle transport failure and retry
      this.debug(`Send failed on ${this.activeTransport.type}, attempting failover`);
      await this.handleTransportFailure(this.activeTransport);
      
      if (this.activeTransport) {
        return await this.activeTransport.send(message);
      } else {
        throw error;
      }
    }
  }

  async connect(): Promise<void> {
    await this.selectOptimalTransport();
  }

  async disconnect(): Promise<void> {
    const disconnectPromises = Array.from(this.transports.values())
      .map(transport => transport.disconnect().catch(error => {
        this.debug(`Error disconnecting transport ${transport.type}:`, error);
      }));
    
    await Promise.all(disconnectPromises);
    this.activeTransport = undefined;
  }

  getActiveTransport(): DevPipeTransport | undefined {
    return this.activeTransport;
  }

  getAvailableTransports(): DevPipeTransport[] {
    return Array.from(this.transports.values())
      .filter(transport => transport.isAvailable());
  }

  getTransportHealth(): Map<TransportType, HealthAssessment> {
    const assessments = new Map<TransportType, HealthAssessment>();
    
    const transports = Array.from(this.transports.values());
    for (const transport of transports) {
      assessments.set(transport.type, this.healthMonitor.assessTransportHealth(transport));
    }
    
    return assessments;
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
          this.debug(`Error in transport manager event listener for ${event}:`, error);
        }
      });
    }
  }

  private debug(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[TransportManager] ${message}`, ...args);
    }
  }
}
