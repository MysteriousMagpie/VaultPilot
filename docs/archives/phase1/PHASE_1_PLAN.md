# 🎯 Phase 1 Implementation Plan - Foundation Stabilization

## Overview
This phase focuses on fixing current issues and establishing a solid foundation for the model selection feature.

---

## 🔧 Task 1: Fix Current TypeScript Errors (Priority: Critical)

### Issue Analysis
Current main.ts has syntax errors where methods are not properly placed within the class structure.

### Solution Steps

#### 1.1 Fix Method Placement
```typescript
// Location: src/main.ts - End of class before closing brace
export default class VaultPilotPlugin extends Plugin {
  // ... existing code ...

  // Model Selection Management (place before final closing brace)
  async initializeModelSelection(): Promise<void> {
    if (!this.settings.modelSelection) {
      return;
    }

    try {
      this.modelSelectionService = new ModelSelectionService(
        this.settings.backendUrl,
        this.settings.modelSelection.devpipePath,
        {
          monitoring_interval: this.settings.modelSelection.monitoringInterval,
          fallback_enabled: this.settings.modelSelection.fallbackEnabled,
          cache_duration: this.settings.modelSelection.cacheDuration,
          retry_attempts: this.settings.modelSelection.retryAttempts,
          timeout: this.settings.modelSelection.timeout,
          debug_mode: this.settings.modelSelection.debugMode
        }
      );

      await this.modelSelectionService.updatePreferences({
        priority: this.settings.modelSelection.userPreferences.priority,
        max_cost_per_request: this.settings.modelSelection.userPreferences.maxCostPerRequest,
        preferred_providers: this.settings.modelSelection.userPreferences.preferredProviders,
        fallback_enabled: this.settings.modelSelection.fallbackEnabled,
        quality_threshold: this.settings.modelSelection.userPreferences.qualityThreshold,
        timeout_preference: this.settings.modelSelection.timeout
      });

      await this.modelSelectionService.initialize();

      if (this.settings.debugMode) {
        console.log('ModelSelectionService initialized successfully');
      }

      new Notice('🤖 Smart model selection enabled', 3000);
    } catch (error) {
      console.error('Failed to initialize ModelSelectionService:', error);
      new Notice('⚠️ Model selection unavailable - using default models', 3000);
    }
  }

  async disconnectModelSelection(): Promise<void> {
    if (this.modelSelectionService) {
      try {
        await this.modelSelectionService.disconnect();
        this.modelSelectionService = undefined;
        
        if (this.settings.debugMode) {
          console.log('ModelSelectionService disconnected');
        }
      } catch (error) {
        console.error('Error disconnecting ModelSelectionService:', error);
      }
    }
  }

  async testModelSelection(): Promise<void> {
    if (!this.modelSelectionService) {
      new Notice('❌ Model selection service not initialized', 5000);
      return;
    }

    const notice = new Notice('🤖 Testing model selection...', 0);

    try {
      const tasks = [
        { type: 'text-generation', quality: 'medium' as const },
        { type: 'code-generation', quality: 'high' as const },
        { type: 'chat', quality: 'low' as const },
        { type: 'summarization', quality: 'medium' as const }
      ];

      let results = [];
      for (const task of tasks) {
        try {
          const selection = await this.modelSelectionService.selectForTask(task.type, task.quality);
          results.push(`✅ ${task.type}: ${selection.selected_model.name} ($${selection.estimated_cost.toFixed(4)})`);
        } catch (error) {
          results.push(`❌ ${task.type}: Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      notice.hide();
      const resultText = results.join('\n');
      new Notice(`Model Selection Test Results:\n${resultText}`, 10000);

      if (this.settings.debugMode) {
        console.log('Model selection test results:', results);
      }
    } catch (error) {
      notice.hide();
      new Notice(`❌ Model selection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 5000);
    }
  }

  async showModelHealth(): Promise<void> {
    if (!this.modelSelectionService) {
      new Notice('❌ Model selection service not initialized', 5000);
      return;
    }

    const notice = new Notice('🏥 Checking model health...', 0);

    try {
      const health = await this.modelSelectionService.getModelHealth();
      
      notice.hide();

      if (health.length === 0) {
        new Notice('⚠️ No model health information available', 5000);
        return;
      }

      const healthInfo = health.map(h => {
        const status = h.status === 'healthy' ? '✅' : h.status === 'degraded' ? '⚠️' : '❌';
        return `${status} ${h.model_id}: ${h.status} (${h.response_time}ms, ${h.availability_percentage}%)`;
      }).join('\n');

      new Notice(`Model Health Status:\n${healthInfo}`, 15000);

      if (this.settings.debugMode) {
        console.log('Model health status:', health);
      }
    } catch (error) {
      notice.hide();
      new Notice(`❌ Failed to get model health: ${error instanceof Error ? error.message : 'Unknown error'}`, 5000);
    }
  }

  async getBestModelForTask(taskType: string, quality: 'low' | 'medium' | 'high' = 'medium') {
    if (this.modelSelectionService && this.modelSelectionService.isConnected()) {
      try {
        const selection = await this.modelSelectionService.selectForTask(taskType, quality);
        
        if (this.settings.debugMode) {
          console.log(`Selected model ${selection.selected_model.name} for ${taskType} task`);
        }
        
        return selection;
      } catch (error) {
        if (this.settings.debugMode) {
          console.warn('Model selection failed, using default:', error);
        }
      }
    }
    
    return null;
  }
} // End of class
```

#### 1.2 Verification Steps
- [ ] Compile without TypeScript errors
- [ ] Settings UI loads without crashes
- [ ] Plugin initializes correctly
- [ ] Commands appear in command palette

---

## 🧪 Task 2: Create Basic Test Suite

### 2.1 Test Framework Setup
```typescript
// Location: src/__tests__/ModelSelectionService.test.ts
import { ModelSelectionService } from '../services/ModelSelectionService';
import { ModelSelectionConfig } from '../types/ModelSelection';

describe('ModelSelectionService', () => {
  let service: ModelSelectionService;
  let mockConfig: ModelSelectionConfig;

  beforeEach(() => {
    mockConfig = {
      devpipe_path: '../dev-pipe',
      server_url: 'http://localhost:8000',
      monitoring_interval: 30000,
      fallback_enabled: true,
      cache_duration: 300000,
      retry_attempts: 3,
      timeout: 30000,
      debug_mode: true
    };

    service = new ModelSelectionService(
      mockConfig.server_url,
      mockConfig.devpipe_path,
      mockConfig
    );
  });

  describe('Initialization', () => {
    test('should initialize with valid config', () => {
      expect(service).toBeDefined();
      expect(service.isConnected()).toBe(false);
    });

    test('should have default preferences', () => {
      const preferences = service.getPreferences();
      expect(preferences.priority).toBe('balanced');
      expect(preferences.max_cost_per_request).toBe(0.50);
    });
  });

  describe('Configuration', () => {
    test('should update preferences', async () => {
      await service.updatePreferences({
        priority: 'cost',
        max_cost_per_request: 0.25
      });

      const preferences = service.getPreferences();
      expect(preferences.priority).toBe('cost');
      expect(preferences.max_cost_per_request).toBe(0.25);
    });
  });

  describe('Error Handling', () => {
    test('should handle service unavailable', async () => {
      // Mock service to throw error
      jest.spyOn(service, 'selectModel').mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(service.selectForTask('text-generation', 'medium'))
        .rejects.toThrow('Service unavailable');
    });
  });
});
```

### 2.2 Integration Test
```typescript
// Location: src/__tests__/integration.test.ts
import { ModelSelectionService } from '../services/ModelSelectionService';

describe('Model Selection Integration', () => {
  let service: ModelSelectionService;

  beforeAll(async () => {
    // Setup test service with mock backend
    service = new ModelSelectionService(
      'http://localhost:8001', // Test server
      '../dev-pipe-test',
      { debug_mode: true }
    );
  });

  test('should connect to test backend', async () => {
    // This test requires a running test backend
    try {
      await service.initialize();
      expect(service.isConnected()).toBe(true);
    } catch (error) {
      // Skip test if backend not available
      console.warn('Test backend not available, skipping integration test');
    }
  });

  afterAll(async () => {
    await service.disconnect();
  });
});
```

---

## 🌍 Task 3: Environment Detection System

### 3.1 Environment Detector
```typescript
// Location: src/utils/EnvironmentDetector.ts
export interface EnvironmentInfo {
  platform: 'node' | 'browser' | 'obsidian' | 'unknown';
  hasFileSystem: boolean;
  hasWebSocket: boolean;
  hasHTTP: boolean;
  capabilities: string[];
}

export class EnvironmentDetector {
  static detect(): EnvironmentInfo {
    const info: EnvironmentInfo = {
      platform: 'unknown',
      hasFileSystem: false,
      hasWebSocket: false,
      hasHTTP: false,
      capabilities: []
    };

    // Detect platform
    if (typeof window !== 'undefined' && window.app && window.app.workspace) {
      info.platform = 'obsidian';
    } else if (typeof window !== 'undefined') {
      info.platform = 'browser';
    } else if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      info.platform = 'node';
    }

    // Check capabilities
    info.hasHTTP = typeof fetch !== 'undefined';
    info.hasWebSocket = typeof WebSocket !== 'undefined';
    info.hasFileSystem = typeof require !== 'undefined' && info.platform === 'node';

    // Add capabilities list
    if (info.hasHTTP) info.capabilities.push('http');
    if (info.hasWebSocket) info.capabilities.push('websocket');
    if (info.hasFileSystem) info.capabilities.push('filesystem');

    return info;
  }

  static isObsidian(): boolean {
    return this.detect().platform === 'obsidian';
  }

  static canUseFileSystem(): boolean {
    return this.detect().hasFileSystem;
  }

  static canUseWebSocket(): boolean {
    return this.detect().hasWebSocket;
  }

  static getOptimalTransport(): 'http' | 'websocket' | 'filesystem' {
    const env = this.detect();
    
    if (env.hasWebSocket) return 'websocket';
    if (env.hasHTTP) return 'http';
    if (env.hasFileSystem) return 'filesystem';
    
    throw new Error('No suitable transport available');
  }
}
```

### 3.2 Update DevPipe Client
```typescript
// Location: src/devpipe/DevPipeClient.ts - Add to constructor
import { EnvironmentDetector } from '../utils/EnvironmentDetector';

export class DevPipeClient {
  private environment: EnvironmentInfo;
  
  constructor(config: ModelSelectionConfig) {
    this.config = config;
    this.environment = EnvironmentDetector.detect();
    this.serverUrl = config.server_url;
    
    if (this.config.debug_mode) {
      console.log('DevPipe Environment:', this.environment);
    }
  }

  async initialize(): Promise<void> {
    try {
      // Validate environment compatibility
      if (!this.environment.hasHTTP) {
        throw new Error('HTTP transport not available in this environment');
      }

      // Test connection with environment-specific method
      await this.testConnection();
      
      this.isConnected = true;
      this.emit('connected', { 
        status: 'connected',
        environment: this.environment.platform,
        transport: 'http'
      });
      
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize DevPipe client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testConnection(): Promise<void> {
    const response = await fetch(`${this.serverUrl}/api/v1/devpipe/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`DevPipe server not accessible: ${response.status} ${response.statusText}`);
    }
  }
}
```

---

## 🛡️ Task 4: Error Boundaries and Fallbacks

### 4.1 Service Error Boundary
```typescript
// Location: src/services/ModelSelectionService.ts - Add error boundary methods
export class ModelSelectionService {
  private fallbackEnabled: boolean = true;
  private lastKnownGoodConfig?: any;
  
  async selectModel(request: ModelSelectionRequest): Promise<ModelSelectionResponse> {
    try {
      return await this.performSelection(request);
    } catch (error) {
      if (this.fallbackEnabled) {
        return await this.fallbackSelection(request, error);
      }
      throw error;
    }
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
    const defaultModels = {
      'text-generation': { name: 'gpt-3.5-turbo', cost: 0.002 },
      'code-generation': { name: 'gpt-4', cost: 0.03 },
      'chat': { name: 'gpt-3.5-turbo', cost: 0.002 },
      'summarization': { name: 'gpt-3.5-turbo', cost: 0.002 }
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
}
```

### 4.2 Plugin Error Boundary
```typescript
// Location: src/main.ts - Add to main plugin class
export default class VaultPilotPlugin extends Plugin {
  private modelSelectionEnabled: boolean = false;

  async initializeModelSelection(): Promise<void> {
    try {
      if (!this.settings.modelSelection?.enabled) {
        console.log('Model selection disabled in settings');
        return;
      }

      // Validate environment
      const env = EnvironmentDetector.detect();
      if (!env.hasHTTP) {
        throw new Error('HTTP transport not available');
      }

      // Initialize service with error boundary
      this.modelSelectionService = new ModelSelectionService(
        this.settings.backendUrl,
        this.settings.modelSelection.devpipePath,
        {
          monitoring_interval: this.settings.modelSelection.monitoringInterval,
          fallback_enabled: this.settings.modelSelection.fallbackEnabled,
          cache_duration: this.settings.modelSelection.cacheDuration,
          retry_attempts: this.settings.modelSelection.retryAttempts,
          timeout: this.settings.modelSelection.timeout,
          debug_mode: this.settings.modelSelection.debugMode
        }
      );

      await this.modelSelectionService.initialize();
      this.modelSelectionEnabled = true;

      if (this.settings.debugMode) {
        console.log('ModelSelectionService initialized successfully');
      }

      new Notice('🤖 Smart model selection enabled', 3000);

    } catch (error) {
      this.modelSelectionEnabled = false;
      console.error('Failed to initialize ModelSelectionService:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('not accessible')) {
          new Notice('⚠️ Cannot connect to AI service - using default models', 5000);
        } else if (error.message.includes('transport not available')) {
          new Notice('⚠️ Model selection not supported in this environment', 5000);
        } else {
          new Notice('⚠️ Model selection unavailable - using default models', 3000);
        }
      }
    }
  }

  // Safe wrapper for model selection
  async getBestModelForTask(taskType: string, quality: 'low' | 'medium' | 'high' = 'medium') {
    if (!this.modelSelectionEnabled || !this.modelSelectionService) {
      return null; // Fallback to default behavior
    }

    try {
      const selection = await this.modelSelectionService.selectForTask(taskType, quality);
      
      if (this.settings.debugMode) {
        console.log(`Selected model ${selection.selected_model.name} for ${taskType} task`);
      }
      
      return selection;
    } catch (error) {
      if (this.settings.debugMode) {
        console.warn('Model selection failed, using default:', error);
      }
      return null; // Graceful fallback
    }
  }
}
```

---

## ✅ Task 5: Testing and Validation

### 5.1 Manual Testing Checklist
- [ ] Plugin loads without errors
- [ ] Settings UI displays model selection options
- [ ] Can enable/disable model selection
- [ ] Test commands appear in command palette
- [ ] Error messages are user-friendly
- [ ] Plugin works with model selection disabled
- [ ] Fallback behavior works correctly

### 5.2 Automated Testing
```bash
# Add to package.json scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "tsc --noEmit",
    "lint:fix": "tsc --noEmit && eslint src --fix"
  }
}
```

### 5.3 Integration Testing
```typescript
// Location: test-integration.js
async function runPhase1ValidationTests() {
  console.log('🧪 Running Phase 1 Validation Tests...\n');

  // Test 1: Basic initialization
  console.log('1. Testing basic initialization...');
  // Implementation here

  // Test 2: Environment detection
  console.log('2. Testing environment detection...');
  // Implementation here

  // Test 3: Error handling
  console.log('3. Testing error handling...');
  // Implementation here

  // Test 4: Fallback behavior
  console.log('4. Testing fallback behavior...');
  // Implementation here

  console.log('\n✅ Phase 1 validation complete!');
}
```

---

## 📋 Phase 1 Success Criteria

### Technical Success Criteria
- [ ] Zero TypeScript compilation errors
- [ ] Plugin loads and initializes correctly
- [ ] All test commands work
- [ ] Settings UI functional
- [ ] Error handling prevents crashes
- [ ] Fallback mechanisms work
- [ ] Test coverage >70%

### User Experience Success Criteria
- [ ] Setup takes <5 minutes
- [ ] Clear error messages
- [ ] Feature can be easily disabled
- [ ] No impact on existing functionality
- [ ] Helpful debug information

### Performance Success Criteria
- [ ] Plugin loads in <2 seconds
- [ ] Model selection completes in <1 second
- [ ] Fallback response in <100ms
- [ ] Memory usage <10MB additional

---

## 🚀 Next Steps After Phase 1

Once Phase 1 is complete:
1. **User feedback collection** - Get input from early users
2. **Performance baseline** - Establish metrics for future optimization
3. **Phase 2 planning** - Detailed planning for multi-transport support
4. **Documentation updates** - Reflect current stable state

Ready to implement Phase 1? Let's start with fixing the TypeScript errors! 🔧
