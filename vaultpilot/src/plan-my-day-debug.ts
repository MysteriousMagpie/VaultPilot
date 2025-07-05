// Debug utilities for Plan My Day feature
export class PlanMyDayDebugger {
  private static instance: PlanMyDayDebugger;
  private logs: string[] = [];
  private maxLogs = 100;

  static getInstance(): PlanMyDayDebugger {
    if (!PlanMyDayDebugger.instance) {
      PlanMyDayDebugger.instance = new PlanMyDayDebugger();
    }
    return PlanMyDayDebugger.instance;
  }

  log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}${data ? ` | ${JSON.stringify(data)}` : ''}`;
    
    console.log(logEntry);
    this.logs.push(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;
    
    const logEntry = `[${timestamp}] ERROR: ${message}${errorData ? ` | ${JSON.stringify(errorData)}` : ''}`;
    
    console.error(logEntry);
    this.logs.push(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return this.logs.join('\n');
  }

  // Helper to analyze API client state
  analyzeApiClient(apiClient: any): any {
    if (!apiClient) {
      return { status: 'null', available: false };
    }

    return {
      status: 'available',
      available: true,
      type: typeof apiClient,
      methods: Object.getOwnPropertyNames(Object.getPrototypeOf(apiClient)).filter(name => typeof apiClient[name] === 'function'),
      hasPlanTasks: typeof apiClient.planTasks === 'function',
      hasHealthCheck: typeof apiClient.healthCheck === 'function'
    };
  }

  // Helper to test EvoAgentX connection
  async testConnection(apiClient: any): Promise<any> {
    try {
      this.log('🔗 Testing EvoAgentX connection...');
      
      if (!apiClient) {
        throw new Error('API client is null or undefined');
      }

      if (!apiClient.healthCheck) {
        throw new Error('API client does not have healthCheck method');
      }

      const result = await apiClient.healthCheck();
      this.log('✅ Connection test successful', result);
      return { success: true, result };
      
    } catch (error) {
      this.error('❌ Connection test failed', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Helper to test task planning specifically
  async testTaskPlanning(apiClient: any, testNote: string = 'Test note for schedule generation'): Promise<any> {
    try {
      this.log('📋 Testing task planning...');
      
      if (!apiClient) {
        throw new Error('API client is null or undefined');
      }

      if (!apiClient.planTasks) {
        throw new Error('API client does not have planTasks method');
      }

      const result = await apiClient.planTasks({
        goal: 'Create a test schedule',
        context: testNote,
        timeframe: '1 day'
      });

      this.log('✅ Task planning test successful', {
        success: result.success,
        hasData: !!result.data,
        hasPlan: !!result.data?.plan,
        taskCount: result.data?.plan?.tasks?.length || 0
      });

      return { success: true, result };
      
    } catch (error) {
      this.error('❌ Task planning test failed', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

// Export singleton instance
export const planMyDayDebugger = PlanMyDayDebugger.getInstance();
