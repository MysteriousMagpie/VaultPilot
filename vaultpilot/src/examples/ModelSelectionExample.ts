// Example: VaultPilot Plugin with Model Selection Integration
// This file demonstrates how to integrate the Model Selection Service
// with your Obsidian plugin for intelligent AI model selection

import { ModelSelectionService } from '../services/ModelSelectionService';
import { ModelSelectionResponse, TaskType } from '../types/ModelSelection';

export class VaultPilotModelIntegration {
  private modelService: ModelSelectionService;

  constructor(modelService: ModelSelectionService) {
    this.modelService = modelService;
  }

  // Example 1: Smart text generation with automatic model selection
  async generateTextWithBestModel(prompt: string, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    try {
      // Let the service select the best model for text generation
      const selection = await this.modelService.selectForTask('text-generation', quality);
      
      console.log(`Using model: ${selection.selected_model.name} for text generation`);
      console.log(`Estimated cost: $${selection.estimated_cost.toFixed(4)}`);
      console.log(`Selection reasoning: ${selection.reasoning}`);

      // Use the selected model for your API call
      const result = await this.callAIWithModel(selection.selected_model, prompt);
      
      return result;
    } catch (error) {
      console.warn('Model selection failed, using default:', error);
      // Fallback to default model
      return await this.callDefaultAI(prompt);
    }
  }

  // Example 2: Code generation with cost optimization
  async generateCodeOptimized(prompt: string, maxCost: number = 0.05): Promise<string> {
    try {
      const selection = await this.modelService.selectModel({
        task_type: 'code-generation',
        quality_requirement: 'high',
        max_cost: maxCost
      });

      if (selection.estimated_cost > maxCost) {
        throw new Error(`Selected model cost (${selection.estimated_cost}) exceeds budget (${maxCost})`);
      }

      return await this.callAIWithModel(selection.selected_model, prompt);
    } catch (error) {
      // Try with a lower cost threshold
      const fallbackSelection = await this.modelService.selectCostOptimized('code-generation', maxCost * 0.5);
      return await this.callAIWithModel(fallbackSelection.selected_model, prompt);
    }
  }

  // Example 3: Chat with real-time model health monitoring
  async chatWithHealthAwareSelection(message: string): Promise<string> {
    try {
      // Check model health first
      const health = await this.modelService.getModelHealth();
      const healthyModels = health.filter(h => h.status === 'healthy');
      
      if (healthyModels.length === 0) {
        throw new Error('No healthy models available');
      }

      // Select best model for chat
      const selection = await this.modelService.selectModel({
        task_type: 'chat',
        quality_requirement: 'medium',
        preferred_providers: healthyModels.map(h => h.model_id.split('-')[0]) // Extract provider names
      });

      return await this.callAIWithModel(selection.selected_model, message);
    } catch (error) {
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Example 4: Task-specific optimization
  async processTask(taskType: string, content: string, userPreferences?: any): Promise<string> {
    try {
      // Update user preferences if provided
      if (userPreferences) {
        await this.modelService.updatePreferences(userPreferences);
      }

      let selection: ModelSelectionResponse;

      switch (taskType) {
        case 'summarize':
          selection = await this.modelService.selectModel({
            task_type: 'summarization',
            quality_requirement: 'medium',
            context_length: content.length
          });
          break;

        case 'translate':
          selection = await this.modelService.selectModel({
            task_type: 'translation',
            quality_requirement: 'high'
          });
          break;

        case 'analyze':
          selection = await this.modelService.selectModel({
            task_type: 'analysis',
            quality_requirement: 'high'
          });
          break;

        default:
          selection = await this.modelService.selectForTask('text-generation', 'medium');
      }

      console.log(`Processing ${taskType} with ${selection.selected_model.name}`);
      console.log(`Reasoning: ${selection.reasoning}`);

      return await this.callAIWithModel(selection.selected_model, content);
    } catch (error) {
      throw new Error(`Task processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Example 5: Batch processing with different models
  async batchProcess(tasks: Array<{type: string, content: string}>): Promise<Array<{result: string, model: string, cost: number}>> {
    const results = [];

    for (const task of tasks) {
      try {
        const selection = await this.modelService.selectForTask(task.type as any, 'medium');
        const result = await this.callAIWithModel(selection.selected_model, task.content);
        
        results.push({
          result,
          model: selection.selected_model.name,
          cost: selection.estimated_cost
        });
      } catch (error) {
        results.push({
          result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          model: 'unknown',
          cost: 0
        });
      }
    }

    return results;
  }

  // Example 6: Performance monitoring and optimization
  setupPerformanceMonitoring(): void {
    // Listen for performance metrics
    this.modelService.on('performance-metrics', (metrics: any) => {
      console.log('Model performance update:', metrics);
      
      // Automatically adjust preferences based on performance
      const lowPerformanceModels = metrics.filter((m: any) => m.success_rate < 0.9);
      if (lowPerformanceModels.length > 0) {
        console.warn('Low performance models detected:', lowPerformanceModels);
        // Could automatically adjust preferences here
      }
    });

    // Listen for health updates
    this.modelService.on('health-updated', (health: any) => {
      const unhealthyModels = health.filter((h: any) => h.status !== 'healthy');
      if (unhealthyModels.length > 0) {
        console.warn('Unhealthy models detected:', unhealthyModels);
      }
    });

    // Listen for model selection events
    this.modelService.on('model-selected', (selection: any) => {
      console.log(`Model selected: ${selection.selected_model.name} for task`);
      
      // Track usage patterns
      this.trackModelUsage(selection);
    });
  }

  // Helper methods (these would integrate with your actual AI service)
  private async callAIWithModel(model: any, prompt: string): Promise<string> {
    // This is where you'd integrate with your actual AI service
    // using the selected model information
    console.log(`Calling AI with model: ${model.name}, provider: ${model.provider}`);
    
    // Example API call structure:
    // return await fetch(`${model.provider}/api/chat`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     model: model.id,
    //     prompt: prompt,
    //     max_tokens: model.max_tokens
    //   })
    // });

    return `Response from ${model.name}: [Generated text for: ${prompt.substring(0, 50)}...]`;
  }

  private async callDefaultAI(prompt: string): Promise<string> {
    // Fallback to default AI service
    console.log('Using fallback default AI');
    return `Fallback response: [Generated text for: ${prompt.substring(0, 50)}...]`;
  }

  private trackModelUsage(selection: ModelSelectionResponse): void {
    // Track model usage patterns for optimization
    const usage = {
      model: selection.selected_model.name,
      task: 'unknown', // Could extract from selection context
      timestamp: new Date().toISOString(),
      cost: selection.estimated_cost,
      confidence: selection.selection_metadata.confidence_score
    };
    
    // Store or send usage data for analysis
    console.log('Model usage tracked:', usage);
  }
}

// Example usage in your plugin:
/*
export default class YourObsidianPlugin extends Plugin {
  private modelIntegration: VaultPilotModelIntegration;

  async onload() {
    // Initialize model selection service
    const modelService = new ModelSelectionService(
      'http://localhost:8000',
      '../dev-pipe'
    );
    
    await modelService.initialize();
    
    // Create integration helper
    this.modelIntegration = new VaultPilotModelIntegration(modelService);
    this.modelIntegration.setupPerformanceMonitoring();

    // Add commands that use smart model selection
    this.addCommand({
      id: 'smart-generate',
      name: 'Smart Generate Text',
      editorCallback: async (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          const result = await this.modelIntegration.generateTextWithBestModel(
            `Continue this text: ${selection}`,
            'high'
          );
          editor.replaceSelection(result);
        }
      }
    });

    this.addCommand({
      id: 'smart-summarize',
      name: 'Smart Summarize',
      editorCallback: async (editor) => {
        const content = editor.getValue();
        const result = await this.modelIntegration.processTask('summarize', content);
        editor.setValue(result);
      }
    });
  }
}
*/
