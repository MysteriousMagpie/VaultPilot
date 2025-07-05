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
