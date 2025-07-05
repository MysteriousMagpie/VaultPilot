export interface EnvironmentInfo {
  platform: 'node' | 'browser' | 'obsidian' | 'unknown';
  hasFileSystem: boolean;
  hasWebSocket: boolean;
  hasHTTP: boolean;
  capabilities: string[];
}

declare global {
  interface Window {
    app?: any;
  }
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
    } else if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.versions && (globalThis as any).process.versions.node) {
      info.platform = 'node';
    }

    // Check capabilities
    info.hasHTTP = typeof fetch !== 'undefined';
    info.hasWebSocket = typeof WebSocket !== 'undefined';
    info.hasFileSystem = typeof (globalThis as any).require !== 'undefined' && info.platform === 'node';

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
