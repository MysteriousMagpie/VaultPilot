# 🚀 Quick Start - Fix Phase 1 Issues

## Immediate Actions Needed (30 minutes)

### Step 1: Fix TypeScript Errors in main.ts (10 minutes)

The current main.ts has method placement issues. Here's the exact fix:

**Problem**: Methods are not properly placed within the class structure.

**Solution**: Replace the problematic section in `src/main.ts`:

```typescript
// Find this line (around line 880):
  }

  // Model Selection Test Methods
  async testModelSelection(): Promise<void> {

// Replace everything from that point to the end of the file with:
  }

  // Model Selection Management
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
}
```

### Step 2: Test the Fix (5 minutes)

```bash
# Run TypeScript compiler to check for errors
npm run lint

# If no errors, try building
npm run build
```

### Step 3: Create Simple Test (10 minutes)

Create `test-basic.js` in the root directory:

```javascript
// Quick test to verify the integration works
console.log('🧪 Testing VaultPilot Model Selection...');

// Test 1: Check if files exist
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'src/types/ModelSelection.ts',
  'src/devpipe/DevPipeClient.ts',
  'src/services/ModelSelectionService.ts'
];

console.log('1. Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
  }
});

// Test 2: Check TypeScript compilation
console.log('\n2. Testing TypeScript compilation...');
const { execSync } = require('child_process');
try {
  execSync('npm run lint', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed:');
  console.log(error.stdout?.toString() || error.message);
}

console.log('\n🎉 Basic validation complete!');
```

Run it:
```bash
node test-basic.js
```

### Step 4: Create Environment Detector (5 minutes)

Create `src/utils/EnvironmentDetector.ts`:

```typescript
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
    if (typeof window !== 'undefined' && (window as any).app && (window as any).app.workspace) {
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

  static getOptimalTransport(): 'http' | 'websocket' | 'filesystem' {
    const env = this.detect();
    
    if (env.hasWebSocket) return 'websocket';
    if (env.hasHTTP) return 'http';
    if (env.hasFileSystem) return 'filesystem';
    
    throw new Error('No suitable transport available');
  }
}
```

---

## Quick Validation (Total: 30 minutes)

### 1. Compile Check
```bash
npm run lint
```
**Expected**: No TypeScript errors

### 2. Build Check
```bash
npm run build
```
**Expected**: Successful build

### 3. Manual Plugin Test
1. Copy built files to Obsidian plugin directory
2. Enable plugin in Obsidian
3. Check settings for model selection options
4. Try the test commands

### 4. Basic Function Test
Open Obsidian Developer Console and run:
```javascript
// Test environment detection
console.log('Environment:', app.plugins.plugins.vaultpilot?.environmentDetector?.detect());

// Test model selection availability
console.log('Model selection available:', app.plugins.plugins.vaultpilot?.modelSelectionService !== undefined);
```

---

## Common Issues & Quick Fixes

### Issue 1: "Cannot find module" errors
**Fix**: Check import paths are correct relative to file locations

### Issue 2: "Property does not exist" errors
**Fix**: Ensure all new properties are declared in the class

### Issue 3: Plugin doesn't load
**Fix**: Check console for errors, verify manifest.json is valid

### Issue 4: Settings don't appear
**Fix**: Verify DEFAULT_SETTINGS includes modelSelection

---

## Success Indicators

After these fixes, you should see:
- ✅ No TypeScript compilation errors
- ✅ Plugin builds successfully
- ✅ Model Selection section appears in settings
- ✅ Test commands appear in command palette
- ✅ Plugin loads without console errors

---

## Next Steps After Quick Fix

1. **Test the commands** - Try "Test Smart Model Selection" command
2. **Check error handling** - Disable backend and verify graceful fallback
3. **Validate settings** - Change preferences and verify they persist
4. **Plan Phase 2** - Multi-transport support and advanced features

Ready to implement? Start with Step 1! 🚀
