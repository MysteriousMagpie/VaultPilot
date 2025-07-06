/**
 * Enhanced UI Components for VaultPilot
 * Provides progress indicators and response optimization
 */

import { App, Notice, Component } from 'obsidian';
import VaultPilotPlugin from '../main';

export interface ProgressConfig {
    id: string;
    title: string;
    message?: string;
    percentage?: number;
    eta?: number;
    cancelable?: boolean;
    position?: 'top-right' | 'bottom-right' | 'center';
    timeout?: number;
}

export interface CacheEntry<T = any> {
    data: T;
    timestamp: number;
    ttl: number;
    hitCount: number;
    size: number;
}

export interface PerformanceMetrics {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    averageResponseTime: number;
    slowestResponse: number;
    fastestResponse: number;
    currentCacheSize: number;
    memoryUsage: number;
}

export interface WebSocketMessage {
    type: 'progress_update' | 'performance_stats' | 'shortcuts' | 'ping' | 'pong' | 'error';
    data: any;
    timestamp: number;
    id?: string;
}

/**
 * Progress Indicator UI Class
 * Handles real-time progress bars with animations and ETA calculation
 */
export class ProgressIndicatorUI extends Component {
    private plugin: VaultPilotPlugin;
    private app: App;
    private activeProgress: Map<string, ProgressConfig> = new Map();
    private progressContainer: HTMLElement | null = null;
    private updateInterval: number | null = null;
    
    constructor(plugin: VaultPilotPlugin) {
        super();
        this.plugin = plugin;
        this.app = plugin.app;
        this.initializeContainer();
    }

    private initializeContainer() {
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = 'vaultpilot-progress-container';
        this.progressContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
            max-width: 400px;
        `;
        document.body.appendChild(this.progressContainer);
    }

    showProgress(config: ProgressConfig): void {
        this.activeProgress.set(config.id, config);
        this.renderProgress(config);
        
        if (config.timeout) {
            setTimeout(() => {
                this.hideProgress(config.id);
            }, config.timeout);
        }
    }

    updateProgress(id: string, updates: Partial<ProgressConfig>): void {
        const existing = this.activeProgress.get(id);
        if (existing) {
            const updated = { ...existing, ...updates };
            this.activeProgress.set(id, updated);
            this.renderProgress(updated);
        }
    }

    hideProgress(id: string): void {
        this.activeProgress.delete(id);
        const element = document.getElementById(`progress-${id}`);
        if (element) {
            element.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                element.remove();
            }, 300);
        }
    }

    private renderProgress(config: ProgressConfig): void {
        let element = document.getElementById(`progress-${config.id}`);
        
        if (!element) {
            element = this.createProgressElement(config);
            this.progressContainer?.appendChild(element);
        } else {
            this.updateProgressElement(element, config);
        }
    }

    private createProgressElement(config: ProgressConfig): HTMLElement {
        const element = document.createElement('div');
        element.id = `progress-${config.id}`;
        element.className = 'vaultpilot-progress-item';
        element.style.cssText = `
            background: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease-out;
            pointer-events: auto;
            min-width: 300px;
        `;
        
        this.updateProgressElement(element, config);
        return element;
    }

    private updateProgressElement(element: HTMLElement, config: ProgressConfig): void {
        const percentage = config.percentage || 0;
        const eta = config.eta ? this.formatETA(config.eta) : '';
        
        element.innerHTML = `
            <div class="progress-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div class="progress-title" style="font-weight: 600; color: var(--text-normal);">
                    ${config.title}
                </div>
                ${config.cancelable ? '<button class="progress-cancel" style="background: none; border: none; color: var(--text-muted); cursor: pointer;">×</button>' : ''}
            </div>
            ${config.message ? `<div class="progress-message" style="color: var(--text-muted); font-size: 0.9em; margin-bottom: 8px;">${config.message}</div>` : ''}
            <div class="progress-bar-container" style="background: var(--background-modifier-border); border-radius: 4px; height: 6px; overflow: hidden;">
                <div class="progress-bar" style="
                    background: var(--interactive-accent);
                    height: 100%;
                    width: ${percentage}%;
                    transition: width 0.3s ease;
                    border-radius: 4px;
                "></div>
            </div>
            <div class="progress-info" style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.8em; color: var(--text-muted);">
                <span>${Math.round(percentage)}%</span>
                ${eta ? `<span>ETA: ${eta}</span>` : ''}
            </div>
        `;

        // Add cancel handler if cancelable
        if (config.cancelable) {
            const cancelBtn = element.querySelector('.progress-cancel');
            cancelBtn?.addEventListener('click', () => {
                this.hideProgress(config.id);
                // Emit cancel event
                this.plugin.app.workspace.trigger('vaultpilot:progress-cancelled', config.id);
            });
        }
    }

    private formatETA(seconds: number): string {
        if (seconds < 60) {
            return `${Math.round(seconds)}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.round(seconds % 60);
            return `${minutes}m ${secs}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    getActiveProgress(): ProgressConfig[] {
        return Array.from(this.activeProgress.values());
    }

    clearAllProgress(): void {
        for (const id of this.activeProgress.keys()) {
            this.hideProgress(id);
        }
    }

    onunload(): void {
        if (this.progressContainer) {
            this.progressContainer.remove();
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

/**
 * Response Time Optimizer Class
 * Handles client-side caching, request deduplication, and performance optimization
 */
export class ResponseTimeOptimizer extends Component {
    private plugin: VaultPilotPlugin;
    private cache: Map<string, CacheEntry> = new Map();
    private requestQueue: Map<string, Promise<any>> = new Map();
    private metrics!: PerformanceMetrics;
    private maxCacheSize = 100; // Maximum number of cached entries
    private defaultTTL = 300000; // 5 minutes default TTL

    constructor(plugin: VaultPilotPlugin) {
        super();
        this.plugin = plugin;
        this.initializeMetrics();
        this.startCleanupInterval();
    }

    private initializeMetrics(): void {
        this.metrics = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageResponseTime: 0,
            slowestResponse: 0,
            fastestResponse: Infinity,
            currentCacheSize: 0,
            memoryUsage: 0
        };
    }

    async optimizedRequest<T>(
        key: string,
        requestFn: () => Promise<T>,
        options: {
            ttl?: number;
            skipCache?: boolean;
            priority?: 'high' | 'normal' | 'low';
        } = {}
    ): Promise<T> {
        const startTime = performance.now();
        this.metrics.totalRequests++;

        // Check cache first (unless skipped)
        if (!options.skipCache) {
            const cached = this.getFromCache<T>(key);
            if (cached) {
                this.metrics.cacheHits++;
                this.updateResponseTimeMetrics(performance.now() - startTime);
                return cached;
            }
        }

        this.metrics.cacheMisses++;

        // Check if request is already in progress (deduplication)
        const existingRequest = this.requestQueue.get(key);
        if (existingRequest) {
            return existingRequest as Promise<T>;
        }

        // Make the request
        const requestPromise = this.executeRequest(requestFn, key, options.ttl || this.defaultTTL);
        this.requestQueue.set(key, requestPromise);

        try {
            const result = await requestPromise;
            this.updateResponseTimeMetrics(performance.now() - startTime);
            return result;
        } finally {
            this.requestQueue.delete(key);
        }
    }

    private async executeRequest<T>(
        requestFn: () => Promise<T>,
        key: string,
        ttl: number
    ): Promise<T> {
        try {
            const result = await requestFn();
            this.setCache(key, result, ttl);
            return result;
        } catch (error) {
            // Don't cache errors, but still remove from queue
            throw error;
        }
    }

    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        // Update hit count
        entry.hitCount++;
        return entry.data as T;
    }

    private setCache<T>(key: string, data: T, ttl: number): void {
        // Enforce cache size limit
        if (this.cache.size >= this.maxCacheSize) {
            this.evictLeastUsed();
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            hitCount: 0,
            size: this.estimateSize(data)
        };

        this.cache.set(key, entry);
        this.updateCacheMetrics();
    }

    private evictLeastUsed(): void {
        let leastUsedKey = '';
        let leastUsedCount = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.hitCount < leastUsedCount) {
                leastUsedCount = entry.hitCount;
                leastUsedKey = key;
            }
        }

        if (leastUsedKey) {
            this.cache.delete(leastUsedKey);
        }
    }

    private estimateSize(data: any): number {
        // Rough estimation of object size in bytes
        return JSON.stringify(data).length * 2; // Approximate UTF-16 encoding
    }

    private updateResponseTimeMetrics(responseTime: number): void {
        const currentAvg = this.metrics.averageResponseTime;
        const totalRequests = this.metrics.totalRequests;
        
        this.metrics.averageResponseTime = 
            (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
        
        if (responseTime > this.metrics.slowestResponse) {
            this.metrics.slowestResponse = responseTime;
        }
        
        if (responseTime < this.metrics.fastestResponse) {
            this.metrics.fastestResponse = responseTime;
        }
    }

    private updateCacheMetrics(): void {
        this.metrics.currentCacheSize = this.cache.size;
        this.metrics.memoryUsage = Array.from(this.cache.values())
            .reduce((total, entry) => total + entry.size, 0);
    }

    private startCleanupInterval(): void {
        // Clean up expired entries every minute
        setInterval(() => {
            this.cleanupExpiredEntries();
        }, 60000);
    }

    private cleanupExpiredEntries(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }
        this.updateCacheMetrics();
    }

    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    getCacheHitRate(): number {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;
        return total > 0 ? (this.metrics.cacheHits / total) * 100 : 0;
    }

    clearCache(): void {
        this.cache.clear();
        this.updateCacheMetrics();
    }

    setCacheConfig(maxSize: number, defaultTTL: number): void {
        this.maxCacheSize = maxSize;
        this.defaultTTL = defaultTTL;
    }

    onunload(): void {
        this.clearCache();
    }
}

/**
 * WebSocket Handler for Real-time Updates
 */
export class WebSocketHandler extends Component {
    private plugin: VaultPilotPlugin;
    private ws: WebSocket | null = null;
    private reconnectInterval: number | null = null;
    private isConnected = false;
    private messageHandlers = new Map<string, (data: any) => void>();

    constructor(plugin: VaultPilotPlugin) {
        super();
        this.plugin = plugin;
        this.setupMessageHandlers();
    }

    private setupMessageHandlers(): void {
        this.messageHandlers.set('progress_update', (data) => {
            // Find the enhancement manager instance
            const enhancementManager = (this.plugin as any).enhancementManager;
            if (enhancementManager?.progressIndicator) {
                enhancementManager.progressIndicator.updateProgress(
                    data.id,
                    {
                        percentage: data.percentage,
                        message: data.message,
                        eta: data.eta
                    }
                );
            }
        });

        this.messageHandlers.set('performance_stats', (data) => {
            // Handle performance statistics updates
            console.log('Performance stats:', data);
        });

        this.messageHandlers.set('ping', () => {
            this.send({ type: 'pong', data: {}, timestamp: Date.now() });
        });
    }

    connect(url: string): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(url);
            
            this.ws.onopen = () => {
                this.isConnected = true;
                console.log('VaultPilot WebSocket connected');
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                console.log('VaultPilot WebSocket disconnected');
                this.startReconnect(url);
            };

            this.ws.onerror = (error) => {
                console.error('VaultPilot WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.startReconnect(url);
        }
    }

    private handleMessage(message: WebSocketMessage): void {
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
            handler(message.data);
        }
    }

    private startReconnect(url: string): void {
        if (this.reconnectInterval) {
            return;
        }

        this.reconnectInterval = window.setInterval(() => {
            console.log('Attempting to reconnect VaultPilot WebSocket...');
            this.connect(url);
        }, 5000);
    }

    send(message: WebSocketMessage): boolean {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    disconnect(): void {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    isSocketConnected(): boolean {
        return this.isConnected;
    }

    onunload(): void {
        this.disconnect();
    }
}

/**
 * Main Enhancement Manager
 * Orchestrates all enhancement features
 */
export class VaultPilotEnhancementManager extends Component {
    public plugin: VaultPilotPlugin;
    public progressIndicator: ProgressIndicatorUI;
    public responseOptimizer: ResponseTimeOptimizer;
    public webSocketHandler: WebSocketHandler;
    private isInitialized = false;

    constructor(plugin: VaultPilotPlugin) {
        super();
        this.plugin = plugin;
        this.progressIndicator = new ProgressIndicatorUI(plugin);
        this.responseOptimizer = new ResponseTimeOptimizer(plugin);
        this.webSocketHandler = new WebSocketHandler(plugin);
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize progress indicator
            this.addChild(this.progressIndicator);
            
            // Initialize response optimizer
            this.addChild(this.responseOptimizer);
            
            // Initialize WebSocket connection
            this.addChild(this.webSocketHandler);
            const wsUrl = this.plugin.settings.backendUrl.replace(/^http/, 'ws') + '/api/obsidian/ws/enhanced';
            this.webSocketHandler.connect(wsUrl);

            this.isInitialized = true;
            console.log('VaultPilot Enhancement Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Enhancement Manager:', error);
        }
    }

    showProgress(config: ProgressConfig): void {
        this.progressIndicator.showProgress(config);
    }

    async optimizedAPICall<T>(
        endpoint: string,
        requestFn: () => Promise<T>,
        options?: { ttl?: number; skipCache?: boolean }
    ): Promise<T> {
        return this.responseOptimizer.optimizedRequest(endpoint, requestFn, options);
    }

    getPerformanceMetrics(): PerformanceMetrics {
        return this.responseOptimizer.getMetrics();
    }

    getCacheHitRate(): number {
        return this.responseOptimizer.getCacheHitRate();
    }

    clearCache(): void {
        this.responseOptimizer.clearCache();
    }

    isWebSocketConnected(): boolean {
        return this.webSocketHandler.isSocketConnected();
    }

    onunload(): void {
        this.isInitialized = false;
        super.onunload();
    }
}

export default {
    ProgressIndicatorUI,
    ResponseTimeOptimizer,
    WebSocketHandler,
    VaultPilotEnhancementManager
};
