# 🚀 Phase 2 Integration Guide - Using Multi-Transport Features

## Quick Start

### Using Enhanced Model Selection Service

```typescript
import { EnhancedModelSelectionService } from './services/EnhancedModelSelectionService';
import { TransportType } from './devpipe/transports/DevPipeTransport';

// Create enhanced service with multi-transport support
const modelService = new EnhancedModelSelectionService(
  'http://localhost:8000',
  '.devpipe',
  {
    debug_mode: true,
    transport: {
      preferred: [TransportType.WEBSOCKET, TransportType.HTTP],
      fallback_enabled: true,
      selection_criteria: {
        latencyWeight: 0.3,
        reliabilityWeight: 0.4,
        capabilityWeight: 0.2,
        costWeight: 0.1
      }
    }
  }
);

// Initialize and use
await modelService.initialize();
const response = await modelService.selectModel(request);
```

### Direct Transport Manager Usage

```typescript
import { TransportManager, TransportType } from './devpipe/TransportManager';

const manager = new TransportManager({
  selectionCriteria: {
    latencyWeight: 0.3,
    reliabilityWeight: 0.4,
    capabilityWeight: 0.2,
    costWeight: 0.1
  },
  fallbackChain: [TransportType.WEBSOCKET, TransportType.HTTP],
  transportConfigs: {
    http: { serverUrl: 'http://localhost:8000', timeout: 10000 }
  }
});

await manager.initialize();
const response = await manager.send(message);
```

### Transport Events

```typescript
// Listen for transport events
modelService.on('transport_changed', (event) => {
  console.log(`Switched from ${event.from} to ${event.to}`);
});

modelService.on('transport_failed', (event) => {
  console.log(`Transport ${event.transport} failed`);
});
```

## Backward Compatibility

Phase 2 is fully backward compatible with Phase 1:

```typescript
// Phase 1 code continues to work unchanged
import { ModelSelectionService } from './services/ModelSelectionService';

const originalService = new ModelSelectionService(
  'http://localhost:8000',
  '.devpipe'
);
// All existing functionality preserved
```

## Testing Your Integration

Run the validation script:
```bash
node validate-phase2.js
```

Expected output: 100% pass rate with all transport features validated.

## Performance Benefits

- **WebSocket**: Real-time updates, <50ms latency
- **Automatic failover**: <500ms switching time  
- **Intelligent selection**: Optimal transport chosen automatically
- **Circuit breaker**: Automatic error recovery
- **Health monitoring**: Continuous status tracking

## Next Steps

Phase 2 provides the foundation for Phase 3 user experience enhancements. The transport layer is now robust and ready for advanced UI features.
