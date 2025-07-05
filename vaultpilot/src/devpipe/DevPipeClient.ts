import { DevPipeMessage, DevPipeMessageType, ModelSelectionConfig } from '../types/ModelSelection';
import { EnvironmentDetector, EnvironmentInfo } from '../utils/EnvironmentDetector';

interface EventListener {
  (data: any): void;
}

export class DevPipeClient {
  private serverUrl: string;
  private isConnected: boolean = false;
  private messageId: number = 1;
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: number }> = new Map();
  private config: ModelSelectionConfig;
  private eventListeners: Map<string, EventListener[]> = new Map();
  private environment: EnvironmentInfo;  // Add environment property

  constructor(config: ModelSelectionConfig) {
    this.config = config;
    this.environment = EnvironmentDetector.detect();  // Initialize environment
    this.serverUrl = config.server_url;
    if (this.config.debug_mode) {
      console.log('DevPipe Environment:', this.environment);
    }
  }

  // Event system implementation
  on(event: string, listener: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: EventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
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
      
      if (this.config.debug_mode) {
        console.log('DevPipe client initialized successfully');
      }
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize DevPipe client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.serverUrl}/api/v1/devpipe/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`DevPipe server not accessible: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // Try alternative health check endpoints
      if (error instanceof Error && error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        // Try the main backend health endpoint as fallback
        try {
          const fallbackResponse = await fetch(`${this.serverUrl}/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(3000)
          });
          
          if (fallbackResponse.ok) {
            // Backend is running but DevPipe endpoint might not be available
            console.warn('DevPipe endpoint not available, but backend is accessible');
            return; // Allow initialization to continue
          }
        } catch (fallbackError) {
          // Both endpoints failed
          throw new Error(`DevPipe server not accessible and fallback failed: ${error.message}`);
        }
      }
      throw error;
    }
  }

  async sendMessage<T>(type: DevPipeMessageType, payload: any, timeout: number = 30000): Promise<T> {
    if (!this.isConnected) {
      throw new Error('DevPipe client not connected');
    }

    const messageId = this.generateMessageId();
    const message: DevPipeMessage = {
      id: messageId,
      timestamp: new Date().toISOString(),
      type,
      payload,
      sender: 'vaultpilot-plugin',
      recipient: 'evoagentx-backend',
      priority: 'normal'
    };

    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = window.setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle
      });

      this.sendMessageToServer(message).catch(error => {
        this.pendingRequests.delete(messageId);
        window.clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  private async sendMessageToServer(message: DevPipeMessage): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/v1/devpipe/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`DevPipe server error: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle immediate response
      if (result.response && result.response.id === message.id) {
        const pendingRequest = this.pendingRequests.get(message.id);
        if (pendingRequest) {
          window.clearTimeout(pendingRequest.timeout);
          this.pendingRequests.delete(message.id);
          pendingRequest.resolve(result.response.payload);
        }
      }

      if (this.config.debug_mode) {
        console.log('DevPipe message sent successfully:', message.type);
      }

      return result;
    } catch (error) {
      if (this.config.debug_mode) {
        console.error('Error sending DevPipe message:', error);
      }
      throw error;
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${this.messageId++}`;
  }

  async disconnect(): Promise<void> {
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      window.clearTimeout(request.timeout);
      request.reject(new Error('DevPipe client disconnected'));
    }
    this.pendingRequests.clear();

    this.isConnected = false;
    this.emit('disconnected', { status: 'disconnected' });
  }

  isReady(): boolean {
    return this.isConnected;
  }

  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }
}
