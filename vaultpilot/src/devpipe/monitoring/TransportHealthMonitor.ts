/**
 * Transport Health Monitor for monitoring transport health and performance
 */

import { 
  DevPipeTransport, 
  TransportType, 
  TransportHealthStatus,
  HealthCheckResult,
  TransportEvent
} from '../transports/DevPipeTransport';

export interface HealthCheckSchedule {
  transport: DevPipeTransport;
  interval: number;
  lastCheck: number;
  consecutiveFailures: number;
}

export interface HealthAssessment {
  transport: TransportType;
  score: number; // 0-1, higher is better
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'failing';
  metrics: {
    availability: number;
    latency: number;
    reliability: number;
    errorRate: number;
  };
  recommendation: 'use' | 'monitor' | 'avoid';
}

export interface MetricsCollector {
  recordLatency(transport: TransportType, latency: number): void;
  recordSuccess(transport: TransportType): void;
  recordFailure(transport: TransportType, error: Error): void;
  getMetrics(transport: TransportType): TransportMetrics;
}

export interface TransportMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  uptime: number;
  lastActivity: number;
}

/**
 * Collects and aggregates transport performance metrics
 */
export class DefaultMetricsCollector implements MetricsCollector {
  private metrics: Map<TransportType, TransportMetrics> = new Map();
  private latencyHistory: Map<TransportType, number[]> = new Map();
  private readonly MAX_HISTORY_SIZE = 100;

  recordLatency(transport: TransportType, latency: number): void {
    const metrics = this.getOrCreateMetrics(transport);
    
    // Update latency metrics
    const history = this.getOrCreateHistory(transport);
    history.push(latency);
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }
    
    metrics.averageLatency = history.reduce((sum, val) => sum + val, 0) / history.length;
    metrics.minLatency = Math.min(metrics.minLatency, latency);
    metrics.maxLatency = Math.max(metrics.maxLatency, latency);
    metrics.lastActivity = Date.now();
  }

  recordSuccess(transport: TransportType): void {
    const metrics = this.getOrCreateMetrics(transport);
    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.lastActivity = Date.now();
  }

  recordFailure(transport: TransportType, error: Error): void {
    const metrics = this.getOrCreateMetrics(transport);
    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.lastActivity = Date.now();
  }

  getMetrics(transport: TransportType): TransportMetrics {
    return this.getOrCreateMetrics(transport);
  }

  private getOrCreateMetrics(transport: TransportType): TransportMetrics {
    if (!this.metrics.has(transport)) {
      this.metrics.set(transport, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        uptime: 0,
        lastActivity: Date.now()
      });
    }
    return this.metrics.get(transport)!;
  }

  private getOrCreateHistory(transport: TransportType): number[] {
    if (!this.latencyHistory.has(transport)) {
      this.latencyHistory.set(transport, []);
    }
    return this.latencyHistory.get(transport)!;
  }
}

/**
 * Monitors transport health and provides assessments
 */
export class TransportHealthMonitor {
  private schedules: Map<string, HealthCheckSchedule> = new Map();
  private metricsCollector: MetricsCollector;
  private monitoringInterval?: any;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(metricsCollector?: MetricsCollector) {
    this.metricsCollector = metricsCollector || new DefaultMetricsCollector();
  }

  startMonitoring(transport: DevPipeTransport, interval: number = 30000): void {
    const schedule: HealthCheckSchedule = {
      transport,
      interval,
      lastCheck: 0,
      consecutiveFailures: 0
    };

    this.schedules.set(transport.id, schedule);

    // Set up transport event listeners
    transport.on(TransportEvent.HEALTH_CHECK, (result: HealthCheckResult) => {
      if (result.success) {
        this.metricsCollector.recordLatency(transport.type, result.latency);
        this.metricsCollector.recordSuccess(transport.type);
        schedule.consecutiveFailures = 0;
      } else {
        this.metricsCollector.recordFailure(transport.type, new Error(result.error || 'Health check failed'));
        schedule.consecutiveFailures++;
      }
      
      this.emit('health-updated', this.assessTransportHealth(transport));
    });

    // Start periodic monitoring if not already running
    if (!this.monitoringInterval) {
      this.startPeriodicChecks();
    }
  }

  stopMonitoring(transport: DevPipeTransport): void {
    this.schedules.delete(transport.id);
    
    // Stop periodic monitoring if no transports are being monitored
    if (this.schedules.size === 0 && this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  assessTransportHealth(transport: DevPipeTransport): HealthAssessment {
    const metrics = this.metricsCollector.getMetrics(transport.type);
    const healthStatus = transport.getHealthStatus();
    const capabilities = transport.getCapabilities();
    
    // Calculate individual metric scores (0-1)
    const availability = this.calculateAvailabilityScore(transport);
    const latency = this.calculateLatencyScore(healthStatus.latency);
    const reliability = this.calculateReliabilityScore(metrics);
    const errorRate = this.calculateErrorRateScore(metrics);
    
    // Weighted overall score
    const score = (
      availability * 0.3 +
      latency * 0.25 +
      reliability * 0.3 +
      errorRate * 0.15
    );
    
    // Determine status based on score
    let status: HealthAssessment['status'];
    if (score >= 0.9) status = 'excellent';
    else if (score >= 0.7) status = 'good';
    else if (score >= 0.5) status = 'fair';
    else if (score >= 0.3) status = 'poor';
    else status = 'failing';
    
    // Determine recommendation
    let recommendation: HealthAssessment['recommendation'];
    if (score >= 0.7) recommendation = 'use';
    else if (score >= 0.4) recommendation = 'monitor';
    else recommendation = 'avoid';
    
    return {
      transport: transport.type,
      score,
      status,
      metrics: {
        availability,
        latency: latency,
        reliability,
        errorRate: 1 - errorRate // Invert for display (higher is better)
      },
      recommendation
    };
  }

  private calculateAvailabilityScore(transport: DevPipeTransport): number {
    if (!transport.isAvailable()) return 0;
    if (!transport.isConnected()) return 0.3;
    
    const schedule = this.schedules.get(transport.id);
    if (!schedule) return 0.8; // Default if no monitoring data
    
    // Penalize consecutive failures
    const failurePenalty = Math.min(schedule.consecutiveFailures * 0.1, 0.5);
    return Math.max(1.0 - failurePenalty, 0);
  }

  private calculateLatencyScore(latency: number): number {
    // Optimal latency targets by transport type
    const excellent = 50;   // <50ms
    const good = 200;       // <200ms
    const acceptable = 1000; // <1s
    
    if (latency <= excellent) return 1.0;
    if (latency <= good) return 0.8;
    if (latency <= acceptable) return 0.6;
    return Math.max(0.2, 1.0 - (latency / 5000)); // Degrade further for very high latency
  }

  private calculateReliabilityScore(metrics: TransportMetrics): number {
    if (metrics.totalRequests === 0) return 0.5; // Unknown
    
    const successRate = metrics.successfulRequests / metrics.totalRequests;
    return successRate;
  }

  private calculateErrorRateScore(metrics: TransportMetrics): number {
    if (metrics.totalRequests === 0) return 1.0; // No errors yet
    
    const errorRate = metrics.failedRequests / metrics.totalRequests;
    return Math.max(0, 1.0 - errorRate);
  }

  private startPeriodicChecks(): void {
    this.monitoringInterval = setInterval(() => {
      const now = Date.now();
      
      const schedules = Array.from(this.schedules.values());
      for (const schedule of schedules) {
        if (now - schedule.lastCheck >= schedule.interval) {
          schedule.lastCheck = now;
          
          // Perform health check
          schedule.transport.performHealthCheck().catch(error => {
            // Error is already handled by the transport's health check event
          });
        }
      }
    }, 5000); // Check every 5 seconds
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
          console.error(`Error in health monitor event listener for ${event}:`, error);
        }
      });
    }
  }

  getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }
}
