/**
 * VaultPilot Enhancement Features Demo
 * Demonstrates the new keyboard shortcuts, progress indicators, and performance optimization
 */

import { App, Modal, Notice } from 'obsidian';
import VaultPilotPlugin from '../main';

export class VaultPilotEnhancementDemo extends Modal {
    private plugin: VaultPilotPlugin;

    constructor(app: App, plugin: VaultPilotPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'VaultPilot Enhancement Features Demo' });

        // Demo Section 1: Keyboard Shortcuts
        this.createKeyboardShortcutsDemo(contentEl);

        // Demo Section 2: Progress Indicators
        this.createProgressIndicatorDemo(contentEl);

        // Demo Section 3: Performance Optimization
        this.createPerformanceDemo(contentEl);

        // Demo Section 4: WebSocket Features
        this.createWebSocketDemo(contentEl);
    }

    private createKeyboardShortcutsDemo(container: HTMLElement) {
        const section = container.createDiv({ cls: 'enhancement-demo-section' });
        section.createEl('h3', { text: '⌨️ Keyboard Shortcuts' });
        
        const description = section.createEl('p');
        description.innerHTML = `
            <strong>20+ keyboard shortcuts are now available!</strong><br>
            Try these shortcuts:
            <ul>
                <li><code>Ctrl+Shift+Enter</code> - Open VaultPilot Chat</li>
                <li><code>Ctrl+Shift+S</code> - Smart Search</li>
                <li><code>Ctrl+Space</code> - AI Completion</li>
                <li><code>Ctrl+Shift+H</code> - Show All Shortcuts</li>
            </ul>
        `;

        const button = section.createEl('button', { text: 'Show All Keyboard Shortcuts' });
        button.onclick = () => {
            if (this.plugin.keyboardHandler) {
                this.plugin.keyboardHandler.getShortcuts();
                // Manually trigger the shortcuts help
                const shortcuts = this.plugin.keyboardHandler.getShortcuts();
                const helpModal = new Modal(this.app);
                helpModal.titleEl.textContent = 'VaultPilot Keyboard Shortcuts';
                
                const content = helpModal.contentEl;
                content.style.maxHeight = '70vh';
                content.style.overflowY = 'auto';
                
                shortcuts.forEach(shortcut => {
                    const item = content.createDiv({ cls: 'shortcut-item' });
                    item.style.cssText = `
                        display: flex; 
                        justify-content: space-between; 
                        padding: 8px; 
                        margin: 4px 0; 
                        background: var(--background-secondary); 
                        border-radius: 4px;
                    `;
                    
                    const keys = item.createSpan({ cls: 'shortcut-keys' });
                    keys.textContent = `${shortcut.modifiers.join(' + ')} + ${shortcut.key.replace('Key', '')}`;
                    keys.style.cssText = `
                        font-family: monospace; 
                        background: var(--background-primary-alt); 
                        padding: 2px 6px; 
                        border-radius: 3px;
                    `;
                    
                    const desc = item.createSpan({ cls: 'shortcut-desc' });
                    desc.textContent = shortcut.description;
                });
                
                helpModal.open();
            }
        };
    }

    private createProgressIndicatorDemo(container: HTMLElement) {
        const section = container.createDiv({ cls: 'enhancement-demo-section' });
        section.createEl('h3', { text: '📊 Progress Indicators' });
        
        section.createEl('p', { 
            text: 'Real-time progress bars with animations, ETA calculation, and WebSocket updates.' 
        });

        const buttonsDiv = section.createDiv({ cls: 'demo-buttons' });
        buttonsDiv.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap;';

        // Quick Progress Demo
        const quickProgressBtn = buttonsDiv.createEl('button', { text: 'Quick Progress (3s)' });
        quickProgressBtn.onclick = () => {
            this.demoQuickProgress();
        };

        // Long Progress Demo
        const longProgressBtn = buttonsDiv.createEl('button', { text: 'Long Progress (10s)' });
        longProgressBtn.onclick = () => {
            this.demoLongProgress();
        };

        // Multiple Progress Demo
        const multiProgressBtn = buttonsDiv.createEl('button', { text: 'Multiple Progress' });
        multiProgressBtn.onclick = () => {
            this.demoMultipleProgress();
        };
    }

    private createPerformanceDemo(container: HTMLElement) {
        const section = container.createDiv({ cls: 'enhancement-demo-section' });
        section.createEl('h3', { text: '⚡ Performance Optimization' });
        
        section.createEl('p', { 
            text: 'Intelligent caching, request deduplication, and performance metrics.' 
        });

        const buttonsDiv = section.createDiv({ cls: 'demo-buttons' });
        buttonsDiv.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap;';

        // Cache Demo
        const cacheBtn = buttonsDiv.createEl('button', { text: 'Test Caching' });
        cacheBtn.onclick = () => {
            this.demoCaching();
        };

        // Performance Metrics
        const metricsBtn = buttonsDiv.createEl('button', { text: 'Show Metrics' });
        metricsBtn.onclick = () => {
            this.showPerformanceMetrics();
        };

        // Clear Cache
        const clearBtn = buttonsDiv.createEl('button', { text: 'Clear Cache' });
        clearBtn.onclick = () => {
            if (this.plugin.enhancementManager) {
                this.plugin.enhancementManager.clearCache();
                new Notice('Cache cleared successfully');
            }
        };
    }

    private createWebSocketDemo(container: HTMLElement) {
        const section = container.createDiv({ cls: 'enhancement-demo-section' });
        section.createEl('h3', { text: '🔗 WebSocket Features' });
        
        const statusDiv = section.createDiv();
        const isConnected = this.plugin.enhancementManager?.isWebSocketConnected() || false;
        
        statusDiv.innerHTML = `
            <p>WebSocket Status: 
                <span style="color: ${isConnected ? 'var(--color-green)' : 'var(--color-red)'};">
                    ${isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </span>
            </p>
            <p>Real-time features: Progress updates, Performance metrics, Dynamic shortcuts</p>
        `;

        const button = section.createEl('button', { text: 'Test WebSocket Connection' });
        button.onclick = () => {
            const connected = this.plugin.enhancementManager?.isWebSocketConnected();
            new Notice(`WebSocket is ${connected ? 'connected' : 'disconnected'}`, 3000);
        };
    }

    private demoQuickProgress() {
        if (!this.plugin.enhancementManager) {
            new Notice('Enhancement Manager not initialized');
            return;
        }

        const progressId = 'demo-quick-' + Date.now();
        this.plugin.enhancementManager.showProgress({
            id: progressId,
            title: 'Quick Demo Task',
            message: 'Processing...',
            percentage: 0,
            eta: 3,
            cancelable: true
        });

        let progress = 0;
        const interval = setInterval(() => {
            progress += 33.33;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    this.plugin.enhancementManager?.progressIndicator.hideProgress(progressId);
                }, 500);
            }

            this.plugin.enhancementManager?.progressIndicator.updateProgress(progressId, {
                percentage: progress,
                message: progress < 100 ? 'Processing...' : 'Complete!',
                eta: progress < 100 ? (100 - progress) / 33.33 : 0
            });
        }, 1000);
    }

    private demoLongProgress() {
        if (!this.plugin.enhancementManager) {
            new Notice('Enhancement Manager not initialized');
            return;
        }

        const progressId = 'demo-long-' + Date.now();
        this.plugin.enhancementManager.showProgress({
            id: progressId,
            title: 'Long Running Task',
            message: 'Analyzing vault structure...',
            percentage: 0,
            eta: 10,
            cancelable: true
        });

        const stages = [
            { msg: 'Analyzing vault structure...', duration: 2000 },
            { msg: 'Processing files...', duration: 3000 },
            { msg: 'Generating insights...', duration: 2000 },
            { msg: 'Optimizing performance...', duration: 2000 },
            { msg: 'Finalizing results...', duration: 1000 }
        ];

        let currentStage = 0;
        let totalProgress = 0;

        const runStage = () => {
            if (currentStage >= stages.length) {
                this.plugin.enhancementManager?.progressIndicator.updateProgress(progressId, {
                    percentage: 100,
                    message: 'Complete!',
                    eta: 0
                });
                setTimeout(() => {
                    this.plugin.enhancementManager?.progressIndicator.hideProgress(progressId);
                }, 1000);
                return;
            }

            const stage = stages[currentStage];
            const stageProgress = 100 / stages.length;
            
            this.plugin.enhancementManager?.progressIndicator.updateProgress(progressId, {
                percentage: totalProgress,
                message: stage.msg,
                eta: (stages.length - currentStage) * 2
            });

            setTimeout(() => {
                totalProgress += stageProgress;
                currentStage++;
                runStage();
            }, stage.duration);
        };

        runStage();
    }

    private demoMultipleProgress() {
        if (!this.plugin.enhancementManager) {
            new Notice('Enhancement Manager not initialized');
            return;
        }

        // Start 3 different progress indicators
        const tasks = [
            { id: 'task1', title: 'Backup Creation', duration: 5000 },
            { id: 'task2', title: 'File Analysis', duration: 7000 },
            { id: 'task3', title: 'Index Update', duration: 3000 }
        ];

        tasks.forEach((task, index) => {
            setTimeout(() => {
                const progressId = `demo-multi-${task.id}-${Date.now()}`;
                this.plugin.enhancementManager?.showProgress({
                    id: progressId,
                    title: task.title,
                    message: 'Starting...',
                    percentage: 0,
                    eta: task.duration / 1000,
                    cancelable: true
                });

                let progress = 0;
                const interval = setInterval(() => {
                    progress += 10;
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(interval);
                        setTimeout(() => {
                            this.plugin.enhancementManager?.progressIndicator.hideProgress(progressId);
                        }, 500);
                    }

                    this.plugin.enhancementManager?.progressIndicator.updateProgress(progressId, {
                        percentage: progress,
                        message: progress < 100 ? 'Processing...' : 'Complete!',
                        eta: progress < 100 ? ((100 - progress) / 10) * (task.duration / 10000) : 0
                    });
                }, task.duration / 10);
            }, index * 1000);
        });
    }

    private async demoCaching() {
        if (!this.plugin.enhancementManager) {
            new Notice('Enhancement Manager not initialized');
            return;
        }

        const testEndpoint = 'demo-cache-test';
        
        // First request (cache miss)
        const start1 = performance.now();
        try {
            await this.plugin.enhancementManager.optimizedAPICall(
                testEndpoint,
                () => new Promise(resolve => setTimeout(() => resolve({ data: 'test response' }), 1000))
            );
            const time1 = performance.now() - start1;
            
            // Second request (cache hit)
            const start2 = performance.now();
            await this.plugin.enhancementManager.optimizedAPICall(
                testEndpoint,
                () => new Promise(resolve => setTimeout(() => resolve({ data: 'test response' }), 1000))
            );
            const time2 = performance.now() - start2;
            
            new Notice(`First request: ${Math.round(time1)}ms (cache miss)\nSecond request: ${Math.round(time2)}ms (cache hit)`, 5000);
        } catch (error) {
            new Notice('Cache test failed: ' + error);
        }
    }

    private showPerformanceMetrics() {
        if (!this.plugin.enhancementManager) {
            new Notice('Enhancement Manager not initialized');
            return;
        }

        const metrics = this.plugin.enhancementManager.getPerformanceMetrics();
        const cacheHitRate = this.plugin.enhancementManager.getCacheHitRate();

        const modal = new Modal(this.app);
        modal.titleEl.textContent = 'Performance Metrics';
        
        const content = modal.contentEl;
        content.innerHTML = `
            <div class="vaultpilot-metrics-container">
                <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div class="metric-item" style="background: var(--background-secondary); padding: 12px; border-radius: 6px;">
                        <div class="metric-label">Total Requests</div>
                        <div class="metric-value">${metrics.totalRequests}</div>
                    </div>
                    <div class="metric-item" style="background: var(--background-secondary); padding: 12px; border-radius: 6px;">
                        <div class="metric-label">Cache Hit Rate</div>
                        <div class="metric-value">${Math.round(cacheHitRate)}%</div>
                    </div>
                    <div class="metric-item" style="background: var(--background-secondary); padding: 12px; border-radius: 6px;">
                        <div class="metric-label">Avg Response Time</div>
                        <div class="metric-value">${Math.round(metrics.averageResponseTime)}ms</div>
                    </div>
                    <div class="metric-item" style="background: var(--background-secondary); padding: 12px; border-radius: 6px;">
                        <div class="metric-label">Cache Size</div>
                        <div class="metric-value">${metrics.currentCacheSize} items</div>
                    </div>
                    <div class="metric-item" style="background: var(--background-secondary); padding: 12px; border-radius: 6px;">
                        <div class="metric-label">Memory Usage</div>
                        <div class="metric-value">${Math.round(metrics.memoryUsage / 1024)} KB</div>
                    </div>
                    <div class="metric-item" style="background: var(--background-secondary); padding: 12px; border-radius: 6px;">
                        <div class="metric-label">Fastest Response</div>
                        <div class="metric-value">${Math.round(metrics.fastestResponse)}ms</div>
                    </div>
                </div>
            </div>
        `;
        
        modal.open();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Add styles for the demo
const demoStyles = `
.enhancement-demo-section {
    margin: 20px 0;
    padding: 15px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    background: var(--background-secondary);
}

.enhancement-demo-section h3 {
    margin-top: 0;
    color: var(--text-accent);
}

.demo-buttons {
    margin-top: 10px;
}

.demo-buttons button {
    padding: 8px 16px;
    margin: 4px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--interactive-normal);
    color: var(--text-normal);
    cursor: pointer;
    transition: background-color 0.2s;
}

.demo-buttons button:hover {
    background: var(--interactive-hover);
}

.shortcut-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    margin: 4px 0;
    background: var(--background-secondary);
    border-radius: 4px;
}

.metric-label {
    color: var(--text-muted);
    font-size: 0.85em;
    margin-bottom: 4px;
    text-transform: uppercase;
}

.metric-value {
    color: var(--text-normal);
    font-size: 1.2em;
    font-weight: 600;
}
`;

// Inject demo styles
const styleId = 'vaultpilot-demo-styles';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = demoStyles;
    document.head.appendChild(style);
}
