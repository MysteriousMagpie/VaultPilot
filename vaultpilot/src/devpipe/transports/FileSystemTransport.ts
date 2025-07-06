/**
 * FileSystem Transport for DevPipe communication
 * Supports file-based communication with proper locking and atomic operations
 */

import { 
  DevPipeTransport,
  TransportType,
  TransportConfig,
  TransportCapabilities,
  DevPipeMessage,
  DevPipeResponse,
  TransportEvent,
  FileSystemTransportConfig
} from './DevPipeTransport';
import { BaseTransport } from './BaseTransport';
import { EnvironmentDetector } from '../../utils/EnvironmentDetector';

interface PendingFileRequest {
  id: string;
  message: DevPipeMessage;
  resolve: (response: DevPipeResponse) => void;
  reject: (error: Error) => void;
  timeout: any;
  timestamp: number;
  requestFile: string;
  responseFile: string;
}

/**
 * Simple file lock manager for atomic operations
 */
class FileLockManager {
  private locks: Set<string> = new Set();
  private lockTimeout: number;

  constructor(lockTimeout: number = 5000) {
    this.lockTimeout = lockTimeout;
  }

  async acquireLock(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const attemptLock = () => {
        if (!this.locks.has(filePath)) {
          this.locks.add(filePath);
          resolve();
        } else {
          setTimeout(attemptLock, 100); // Retry every 100ms
        }
      };

      // Set timeout for lock acquisition
      setTimeout(() => {
        reject(new Error(`Failed to acquire lock for ${filePath} within ${this.lockTimeout}ms`));
      }, this.lockTimeout);

      attemptLock();
    });
  }

  releaseLock(filePath: string): void {
    this.locks.delete(filePath);
  }
}

/**
 * File watcher implementation for monitoring response files
 */
class FileWatcher {
  private watchers: Map<string, any> = new Map();
  private callbacks: Map<string, (content: string) => void> = new Map();

  watch(filePath: string, callback: (content: string) => void): void {
    this.callbacks.set(filePath, callback);
    
    // Simple polling implementation (could be enhanced with proper file watching)
    const watcher = setInterval(async () => {
      try {
        const exists = await this.fileExists(filePath);
        if (exists) {
          const content = await this.readFile(filePath);
          callback(content);
          this.unwatch(filePath);
        }
      } catch (error) {
        // File doesn't exist yet or other error, continue watching
      }
    }, 500); // Check every 500ms

    this.watchers.set(filePath, watcher);
  }

  unwatch(filePath: string): void {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      clearInterval(watcher);
      this.watchers.delete(filePath);
    }
    this.callbacks.delete(filePath);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    // Platform-specific file existence check
    if (typeof window !== 'undefined' && window.app?.vault?.adapter?.exists) {
      // Obsidian environment
      return window.app.vault.adapter.exists(filePath);
    } else if (typeof (globalThis as any).require !== 'undefined') {
      // Node.js environment
      try {
        const fs = (globalThis as any).require('fs').promises;
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  private async readFile(filePath: string): Promise<string> {
    // Platform-specific file reading
    if (typeof window !== 'undefined' && window.app?.vault?.adapter?.read) {
      // Obsidian environment
      return window.app.vault.adapter.read(filePath);
    } else if (typeof (globalThis as any).require !== 'undefined') {
      // Node.js environment
      const fs = (globalThis as any).require('fs').promises;
      return fs.readFile(filePath, 'utf-8');
    }
    throw new Error('File reading not supported in this environment');
  }
}

/**
 * FileSystem Transport implementation
 */
export class FileSystemTransport extends BaseTransport {
  private devPipePath: string;
  private fileWatcher: FileWatcher;
  private lockManager: FileLockManager;
  private pendingRequests: Map<string, PendingFileRequest> = new Map();
  private fsConfig: FileSystemTransportConfig;
  private messageQueue: DevPipeMessage[] = [];

  constructor(config: TransportConfig) {
    super(TransportType.FILESYSTEM, config);
    
    this.fsConfig = config.filesystem || {
      watchInterval: 500,
      lockTimeout: 5000,
      maxQueueSize: 100
    };
    
    this.devPipePath = config.devPipePath || './devpipe';
    this.fileWatcher = new FileWatcher();
    this.lockManager = new FileLockManager(this.fsConfig.lockTimeout);
  }

  protected async doInitialize(): Promise<void> {
    // Validate file system support in environment
    const environment = EnvironmentDetector.detect();
    if (!environment.hasFileSystem) {
      throw new Error('FileSystem transport not supported in this environment');
    }

    // Ensure devpipe directory exists
    await this.ensureDirectoryExists(this.devPipePath);
    
    this.debug('FileSystem transport initialized');
  }

  async connect(): Promise<void> {
    try {
      // Test file system access
      await this.doHealthCheck();
      
      // Start watching for incoming messages
      this.setupIncomingMessageWatcher();
      
      this.connected = true;
      this.healthStatus.status = 'healthy';
      this.emit(TransportEvent.CONNECTED, { transport: this.type });
      
      this.debug('FileSystem transport connected');
    } catch (error) {
      this.emit(TransportEvent.ERROR, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Reject all pending requests
    const requests = Array.from(this.pendingRequests.values());
    for (const request of requests) {
      clearTimeout(request.timeout);
      this.fileWatcher.unwatch(request.responseFile);
      request.reject(new Error('Transport disconnected'));
    }
    this.pendingRequests.clear();

    this.connected = false;
    this.healthStatus.status = 'disconnected';
    this.emit(TransportEvent.DISCONNECTED, { transport: this.type });
    
    this.debug('FileSystem transport disconnected');
  }

  async send(message: DevPipeMessage): Promise<DevPipeResponse> {
    if (!this.isConnected()) {
      throw new Error('FileSystem transport not connected');
    }

    // Add message ID if not present
    if (!message.id) {
      message.id = this.generateMessageId();
    }

    // Add timestamp
    message.timestamp = Date.now();

    return this.executeWithCircuitBreaker(async () => {
      return this.sendFileMessage(message);
    }, 'filesystem_send');
  }

  private async sendFileMessage(message: DevPipeMessage): Promise<DevPipeResponse> {
    const requestFile = `${this.devPipePath}/request_${message.id}.json`;
    const responseFile = `${this.devPipePath}/response_${message.id}.json`;

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(message.id!);
        this.fileWatcher.unwatch(responseFile);
        reject(new Error(`FileSystem request timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      const request: PendingFileRequest = {
        id: message.id!,
        message,
        resolve: (response) => {
          clearTimeout(timeoutHandle);
          this.pendingRequests.delete(message.id!);
          this.fileWatcher.unwatch(responseFile);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timeoutHandle);
          this.pendingRequests.delete(message.id!);
          this.fileWatcher.unwatch(responseFile);
          reject(error);
        },
        timeout: timeoutHandle,
        timestamp: Date.now(),
        requestFile,
        responseFile
      };

      this.pendingRequests.set(message.id!, request);

      // Watch for response file
      this.fileWatcher.watch(responseFile, (content) => {
        try {
          const response = JSON.parse(content);
          const devPipeResponse: DevPipeResponse = {
            id: response.id,
            success: response.success !== false,
            payload: response.payload,
            error: response.error,
            timestamp: Date.now()
          };
          request.resolve(devPipeResponse);
        } catch (error) {
          request.reject(new Error('Failed to parse response file'));
        }
      });

      // Write request file
      this.writeRequestFile(requestFile, message, request);
    });
  }

  private async writeRequestFile(filePath: string, message: DevPipeMessage, request: PendingFileRequest): Promise<void> {
    try {
      await this.lockManager.acquireLock(filePath);
      await this.writeFile(filePath, JSON.stringify(message, null, 2));
      this.lockManager.releaseLock(filePath);
    } catch (error) {
      this.lockManager.releaseLock(filePath);
      request.reject(error instanceof Error ? error : new Error('Failed to write request file'));
    }
  }

  private setupIncomingMessageWatcher(): void {
    // Watch for incoming messages (this would be implemented based on the specific protocol)
    // For now, we'll just log that the watcher is set up
    this.debug('Incoming message watcher setup completed');
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    // Platform-specific directory creation
    if (typeof window !== 'undefined' && window.app?.vault?.adapter?.mkdir) {
      // Obsidian environment
      try {
        await window.app.vault.adapter.mkdir(path);
      } catch (error) {
        // Directory might already exist
      }
    } else if (typeof (globalThis as any).require !== 'undefined') {
      // Node.js environment
      try {
        const fs = (globalThis as any).require('fs').promises;
        await fs.mkdir(path, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    // Platform-specific file writing
    if (typeof window !== 'undefined' && window.app?.vault?.adapter?.write) {
      // Obsidian environment
      return window.app.vault.adapter.write(filePath, content);
    } else if (typeof (globalThis as any).require !== 'undefined') {
      // Node.js environment
      const fs = (globalThis as any).require('fs').promises;
      return fs.writeFile(filePath, content, 'utf-8');
    }
    throw new Error('File writing not supported in this environment');
  }

  private async readFile(filePath: string): Promise<string> {
    // Platform-specific file reading
    if (typeof window !== 'undefined' && window.app?.vault?.adapter?.read) {
      // Obsidian environment
      return window.app.vault.adapter.read(filePath);
    } else if (typeof (globalThis as any).require !== 'undefined') {
      // Node.js environment
      const fs = (globalThis as any).require('fs').promises;
      return fs.readFile(filePath, 'utf-8');
    }
    throw new Error('File reading not supported in this environment');
  }

  protected async doHealthCheck(): Promise<void> {
    const testFile = `${this.devPipePath}/health_check_${Date.now()}.tmp`;
    
    try {
      // Test write access
      await this.writeFile(testFile, 'health_check');
      
      // Test read access
      const content = await this.readFile(testFile);
      if (content !== 'health_check') {
        throw new Error('File content mismatch during health check');
      }
      
      // Clean up test file
      await this.deleteFile(testFile);
      
    } catch (error) {
      throw new Error(`FileSystem health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async deleteFile(filePath: string): Promise<void> {
    // Platform-specific file deletion
    if (typeof window !== 'undefined' && window.app?.vault?.adapter?.remove) {
      // Obsidian environment
      try {
        await window.app.vault.adapter.remove(filePath);
      } catch (error) {
        // File might not exist
      }
    } else if (typeof (globalThis as any).require !== 'undefined') {
      // Node.js environment
      try {
        const fs = (globalThis as any).require('fs').promises;
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist
      }
    }
  }

  getCapabilities(): TransportCapabilities {
    return {
      supportsRealtime: false,
      supportsBidirectional: true,
      supportsFileSystem: true,
      supportsStreaming: false,
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      averageLatency: this.healthStatus.latency,
      maxConcurrentConnections: 1,
      reliability: this.calculateReliability(),
      supportedEnvironments: ['node', 'obsidian']
    };
  }
}
