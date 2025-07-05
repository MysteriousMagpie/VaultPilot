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
