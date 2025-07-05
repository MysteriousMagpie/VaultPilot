# 🤖 VaultPilot Model Selection Integration Guide

## Overview

The Model Selection feature provides intelligent AI model selection for VaultPilot, automatically choosing the best model based on task type, performance requirements, and cost constraints through the DevPipe communication framework.

## Quick Setup

### 1. Configuration

Your plugin settings now include model selection options:

```typescript
export interface VaultPilotSettings {
  // ... existing settings
  modelSelection?: {
    enabled: boolean;
    devpipePath: string;
    monitoringInterval: number;
    fallbackEnabled: boolean;
    cacheDuration: number;
    retryAttempts: number;
    timeout: number;
    debugMode: boolean;
    userPreferences: {
      priority: 'performance' | 'cost' | 'balanced';
      maxCostPerRequest: number;
      preferredProviders: string[];
      qualityThreshold: number;
    };
  };
}
```

### 2. Basic Usage

```typescript
// In your plugin's main class
export default class VaultPilotPlugin extends Plugin {
  modelSelectionService?: ModelSelectionService;

  async onload() {
    // Initialize after loading settings
    if (this.settings.modelSelection?.enabled) {
      await this.initializeModelSelection();
    }
  }

  async initializeModelSelection() {
    this.modelSelectionService = new ModelSelectionService(
      this.settings.backendUrl,
      this.settings.modelSelection?.devpipePath || '../dev-pipe',
      {
        monitoring_interval: this.settings.modelSelection?.monitoringInterval || 30000,
        fallback_enabled: this.settings.modelSelection?.fallbackEnabled !== false,
        debug_mode: this.settings.modelSelection?.debugMode || false
      }
    );

    await this.modelSelectionService.initialize();
  }
}
```

## Use Cases

### 1. Smart Text Generation

```typescript
async generateSmartText(prompt: string, quality: 'low' | 'medium' | 'high' = 'medium') {
  if (this.modelSelectionService?.isConnected()) {
    try {
      const selection = await this.modelSelectionService.selectForTask('text-generation', quality);
      
      console.log(`Using ${selection.selected_model.name} for text generation`);
      console.log(`Estimated cost: $${selection.estimated_cost.toFixed(4)}`);
      
      // Use the selected model in your API call
      return await this.apiClient.chatWithModel(selection.selected_model.id, prompt);
    } catch (error) {
      console.warn('Model selection failed, using default:', error);
    }
  }
  
  // Fallback to default behavior
  return await this.apiClient.chat({ message: prompt });
}
```

### 2. Code Generation Optimization

```typescript
async generateCode(prompt: string, maxCost: number = 0.05) {
  if (this.modelSelectionService?.isConnected()) {
    const selection = await this.modelSelectionService.selectModel({
      task_type: 'code-generation',
      quality_requirement: 'high',
      max_cost: maxCost
    });

    if (selection.estimated_cost <= maxCost) {
      return await this.apiClient.codeGeneration(selection.selected_model.id, prompt);
    }
  }
  
  return await this.apiClient.defaultCodeGeneration(prompt);
}
```

### 3. Health-Aware Chat

```typescript
async healthAwareChat(message: string) {
  if (this.modelSelectionService?.isConnected()) {
    // Check model health first
    const health = await this.modelSelectionService.getModelHealth();
    const healthyModels = health.filter(h => h.status === 'healthy');
    
    if (healthyModels.length > 0) {
      const selection = await this.modelSelectionService.selectModel({
        task_type: 'chat',
        quality_requirement: 'medium',
        preferred_providers: healthyModels.map(h => h.model_id.split('-')[0])
      });
      
      return await this.apiClient.chatWithModel(selection.selected_model.id, message);
    }
  }
  
  return await this.apiClient.chat({ message });
}
```

## Available Commands

The integration adds these commands to your plugin:

1. **Test Smart Model Selection** - Tests model selection across different task types
2. **Show Model Health Status** - Displays current health of all available models

## Settings UI

Model selection settings are automatically added to your plugin's settings tab:

- **Enable Model Selection** - Toggle intelligent model selection
- **DevPipe Path** - Path to the DevPipe communication directory
- **Priority Mode** - Choose between performance, cost, or balanced optimization
- **Max Cost Per Request** - Set maximum spending per AI request
- **Model Selection Debug** - Enable detailed logging

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const selection = await this.modelSelectionService.selectModel(request);
  return await this.useSelectedModel(selection);
} catch (error) {
  if (error instanceof ModelSelectionError) {
    switch (error.code) {
      case 'NO_HEALTHY_MODELS':
        new Notice('⚠️ All AI models are currently offline');
        break;
      case 'BUDGET_EXCEEDED':
        new Notice('💰 Request exceeds your budget limit');
        break;
      case 'TIMEOUT':
        new Notice('⏱️ Model selection timed out');
        break;
      default:
        new Notice('❌ Model selection failed');
    }
  }
  
  // Always provide fallback
  return await this.fallbackToDefault();
}
```

## Performance Monitoring

The service automatically monitors model performance:

```typescript
// Set up performance monitoring
this.modelSelectionService.on('performance-metrics', (metrics) => {
  console.log('Model performance update:', metrics);
  
  // Automatically adjust preferences based on performance
  const lowPerformanceModels = metrics.filter(m => m.success_rate < 0.9);
  if (lowPerformanceModels.length > 0) {
    console.warn('Low performance models detected:', lowPerformanceModels);
  }
});

this.modelSelectionService.on('health-updated', (health) => {
  const unhealthyCount = health.filter(h => h.status !== 'healthy').length;
  if (unhealthyCount > 0) {
    new Notice(`⚠️ ${unhealthyCount} models are experiencing issues`);
  }
});
```

## Task Types

Supported task types for model selection:

- `text-generation` - General text creation
- `code-generation` - Programming and code completion
- `chat` - Conversational interactions
- `summarization` - Text summarization
- `translation` - Language translation
- `embedding` - Text embeddings for search
- `editing` - Text editing and refinement
- `analysis` - Content analysis and classification
- `planning` - Task and project planning
- `workflow-execution` - Complex workflow processing

## Quality Levels

- **`high`** - Best quality models (higher cost, better results)
- **`medium`** - Balanced quality/cost ratio (recommended)
- **`low`** - Fast, economical models (lower cost, faster response)

## Best Practices

1. **Always provide fallbacks** - Never assume model selection will succeed
2. **Monitor costs** - Set appropriate budget limits
3. **Use appropriate quality levels** - Don't use 'high' for simple tasks
4. **Handle errors gracefully** - Show helpful messages to users
5. **Monitor performance** - Track model effectiveness over time

## Troubleshooting

### Model Selection Not Working

1. Check if DevPipe server is running
2. Verify DevPipe path in settings
3. Ensure EvoAgentX backend is accessible
4. Check debug logs in console

### High Costs

1. Lower max cost per request in settings
2. Use 'cost' priority mode
3. Use lower quality requirements for simple tasks
4. Monitor usage patterns

### Poor Performance

1. Check model health status
2. Adjust quality requirements
3. Enable performance monitoring
4. Review preferred providers list

## Integration Status

✅ DevPipe client implementation  
✅ Model selection service  
✅ TypeScript type definitions  
✅ Settings UI integration  
✅ Error handling and fallbacks  
✅ Performance monitoring  
✅ Example implementations  
✅ Documentation and guides  

The model selection feature is now fully integrated and ready to use!
