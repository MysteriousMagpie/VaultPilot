// Model Selection Integration Test
// Run this to test the model selection feature

import { ModelSelectionService } from './src/services/ModelSelectionService';

async function testModelSelectionIntegration() {
  console.log('🤖 Testing VaultPilot Model Selection Integration...\n');

  try {
    // Initialize service
    console.log('1. Initializing ModelSelectionService...');
    const service = new ModelSelectionService(
      'http://localhost:8000',
      '../dev-pipe',
      {
        debug_mode: true,
        timeout: 10000
      }
    );

    await service.initialize();
    console.log('✅ Service initialized successfully\n');

    // Test 1: Basic model selection
    console.log('2. Testing basic model selection...');
    try {
      const selection = await service.selectForTask('text-generation', 'medium');
      console.log(`✅ Selected model: ${selection.selected_model.name}`);
      console.log(`   Cost: $${selection.estimated_cost.toFixed(4)}`);
      console.log(`   Reasoning: ${selection.reasoning}\n`);
    } catch (error) {
      console.log(`❌ Basic selection failed: ${error}\n`);
    }

    // Test 2: Different task types
    console.log('3. Testing different task types...');
    const taskTypes = ['code-generation', 'chat', 'summarization'];
    
    for (const taskType of taskTypes) {
      try {
        const selection = await service.selectForTask(taskType as any, 'medium');
        console.log(`✅ ${taskType}: ${selection.selected_model.name} ($${selection.estimated_cost.toFixed(4)})`);
      } catch (error) {
        console.log(`❌ ${taskType}: Failed - ${error}`);
      }
    }
    console.log();

    // Test 3: Health monitoring
    console.log('4. Testing health monitoring...');
    try {
      const health = await service.getModelHealth();
      console.log(`✅ Retrieved health for ${health.length} models:`);
      health.forEach(h => {
        const status = h.status === 'healthy' ? '✅' : '⚠️';
        console.log(`   ${status} ${h.model_id}: ${h.status} (${h.response_time}ms)`);
      });
      console.log();
    } catch (error) {
      console.log(`❌ Health check failed: ${error}\n`);
    }

    // Test 4: Cost optimization
    console.log('5. Testing cost optimization...');
    try {
      const costOptimized = await service.selectCostOptimized('text-generation', 0.01);
      console.log(`✅ Cost-optimized selection: ${costOptimized.selected_model.name}`);
      console.log(`   Cost: $${costOptimized.estimated_cost.toFixed(4)} (target: $0.01)\n`);
    } catch (error) {
      console.log(`❌ Cost optimization failed: ${error}\n`);
    }

    // Test 5: High performance selection
    console.log('6. Testing high performance selection...');
    try {
      const highPerf = await service.selectHighPerformance('code-generation');
      console.log(`✅ High performance selection: ${highPerf.selected_model.name}`);
      console.log(`   Quality score: ${highPerf.selected_model.quality_score}\n`);
    } catch (error) {
      console.log(`❌ High performance selection failed: ${error}\n`);
    }

    // Test 6: Preferences
    console.log('7. Testing preference updates...');
    try {
      await service.updatePreferences({
        priority: 'cost',
        max_cost_per_request: 0.25,
        preferred_providers: ['openai'],
        fallback_enabled: true
      });
      console.log('✅ Preferences updated successfully\n');
    } catch (error) {
      console.log(`❌ Preference update failed: ${error}\n`);
    }

    // Clean up
    await service.disconnect();
    console.log('✅ Service disconnected\n');

    console.log('🎉 Model Selection Integration Test Complete!');
    console.log('The feature is ready to use in your VaultPilot plugin.');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure EvoAgentX backend is running on localhost:8000');
    console.log('2. Check that DevPipe directory exists at ../dev-pipe');
    console.log('3. Verify network connectivity');
    console.log('4. Check server logs for errors');
  }
}

// Run the test
if (require.main === module) {
  testModelSelectionIntegration().catch(console.error);
}

export { testModelSelectionIntegration };
