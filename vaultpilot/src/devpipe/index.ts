/**
 * DevPipe Transport System - Public API Exports
 * Phase 2: Multi-transport support with intelligent failover
 */

// Core transport interfaces and types
export { 
  DevPipeTransport,
  TransportType,
  TransportConfig,
  TransportCapabilities,
  TransportHealthStatus,
  DevPipeMessage,
  DevPipeResponse,
  TransportEvent,
  HTTPTransportConfig,
  WebSocketTransportConfig,
  FileSystemTransportConfig
} from './transports/DevPipeTransport';

// Transport implementations
export { HTTPTransport } from './transports/HTTPTransport';
export { WebSocketTransport } from './transports/WebSocketTransport';
export { FileSystemTransport } from './transports/FileSystemTransport';
export { BaseTransport } from './transports/BaseTransport';

// Transport management
export { 
  TransportManager,
  TransportManagerConfig,
  TransportSelectionCriteria,
  SelectionContext,
  TransportSelector
} from './TransportManager';

// Health monitoring
export {
  TransportHealthMonitor,
  HealthAssessment,
  MetricsCollector,
  TransportMetrics,
  DefaultMetricsCollector
} from './monitoring/TransportHealthMonitor';

// Legacy support - keep DevPipeClient for backward compatibility
export { DevPipeClient } from './DevPipeClient';
