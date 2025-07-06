/**
 * Enhanced Commands System for VaultPilot
 * Provides keyboard shortcuts and enhanced command definitions
 */

import { App, Notice, Editor, TFile, Modal, MarkdownView } from 'obsidian';
import VaultPilotPlugin from '../main';

export interface KeyboardShortcut {
    key: string;
    modifiers: string[];
    command: string;
    description: string;
    context?: 'editor' | 'global' | 'modal';
    enabled?: boolean;
}

export interface EnhancedCommand {
    id: string;
    name: string;
    description: string;
    callback?: () => void;
    editorCallback?: (editor: Editor, view: any) => void;
    checkCallback?: (checking: boolean) => boolean | void;
    hotkeys?: KeyboardShortcut[];
    category?: string;
    priority?: number;
}

export class KeyboardShortcutHandler {
    private plugin: VaultPilotPlugin;
    private app: App;
    private shortcuts: Map<string, KeyboardShortcut> = new Map();
    private contextMenuEnabled = true;
    
    constructor(plugin: VaultPilotPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.initializeDefaultShortcuts();
    }

    private initializeDefaultShortcuts() {
        const defaultShortcuts: KeyboardShortcut[] = [
            // Core VaultPilot shortcuts
            {
                key: 'Enter',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:open-chat',
                description: 'Open VaultPilot Chat',
                context: 'global'
            },
            {
                key: 'KeyS',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:smart-search',
                description: 'Smart Search',
                context: 'global'
            },
            {
                key: 'KeyC',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:quick-chat',
                description: 'Quick Chat with Selection',
                context: 'editor'
            },
            {
                key: 'Space',
                modifiers: ['Ctrl'],
                command: 'vaultpilot:copilot-complete',
                description: 'Get AI Completion',
                context: 'editor'
            },
            {
                key: 'KeyW',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:execute-workflow',
                description: 'Execute Workflow',
                context: 'global'
            },
            {
                key: 'KeyA',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:analyze-vault',
                description: 'Analyze Current Vault',
                context: 'global'
            },
            {
                key: 'KeyD',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:open-dashboard',
                description: 'Open VaultPilot Dashboard',
                context: 'global'
            },
            {
                key: 'KeyP',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:plan-my-day',
                description: 'Plan My Day',
                context: 'global'
            },
            // Vault Management shortcuts
            {
                key: 'KeyV',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:vault-structure',
                description: 'View Vault Structure',
                context: 'global'
            },
            {
                key: 'KeyF',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:file-operations',
                description: 'File Operations',
                context: 'global'
            },
            {
                key: 'KeyO',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:vault-organizer',
                description: 'Vault Organizer',
                context: 'global'
            },
            {
                key: 'KeyB',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:batch-operations',
                description: 'Batch Operations',
                context: 'global'
            },
            // Enhanced shortcuts
            {
                key: 'KeyH',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:show-shortcuts',
                description: 'Show Keyboard Shortcuts',
                context: 'global'
            },
            {
                key: 'KeyR',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:refresh-cache',
                description: 'Refresh Cache',
                context: 'global'
            },
            {
                key: 'KeyM',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:performance-metrics',
                description: 'Show Performance Metrics',
                context: 'global'
            },
            // Agent management
            {
                key: 'KeyG',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:agent-marketplace',
                description: 'Agent Marketplace',
                context: 'global'
            },
            {
                key: 'KeyE',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:agent-evolution',
                description: 'Agent Evolution Status',
                context: 'global'
            },
            // Quick actions
            {
                key: 'KeyQ',
                modifiers: ['Alt'],
                command: 'vaultpilot:quick-note',
                description: 'Quick Note Creation',
                context: 'global'
            },
            {
                key: 'KeyI',
                modifiers: ['Ctrl', 'Alt'],
                command: 'vaultpilot:insert-template',
                description: 'Insert Template',
                context: 'editor'
            },
            {
                key: 'KeyL',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:link-analyzer',
                description: 'Analyze Links',
                context: 'editor'
            },
            {
                key: 'KeyT',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:tag-manager',
                description: 'Tag Manager',
                context: 'global'
            },
            // Demo shortcut
            {
                key: 'KeyZ',
                modifiers: ['Ctrl', 'Shift'],
                command: 'vaultpilot:enhancement-demo',
                description: 'Enhancement Features Demo',
                context: 'global'
            }
        ];

        defaultShortcuts.forEach(shortcut => {
            this.addShortcut(shortcut);
        });
    }

    addShortcut(shortcut: KeyboardShortcut) {
        const key = this.getShortcutKey(shortcut);
        this.shortcuts.set(key, shortcut);
    }

    removeShortcut(shortcut: KeyboardShortcut) {
        const key = this.getShortcutKey(shortcut);
        this.shortcuts.delete(key);
    }

    private getShortcutKey(shortcut: KeyboardShortcut): string {
        return `${shortcut.modifiers.sort().join('+')}_${shortcut.key}`;
    }

    handleKeyDown(event: KeyboardEvent): boolean {
        const modifiers = [];
        if (event.ctrlKey) modifiers.push('Ctrl');
        if (event.shiftKey) modifiers.push('Shift');
        if (event.altKey) modifiers.push('Alt');
        if (event.metaKey) modifiers.push('Meta');

        const key = event.code;
        const shortcutKey = `${modifiers.sort().join('+')}_${key}`;
        
        const shortcut = this.shortcuts.get(shortcutKey);
        if (shortcut && (shortcut.enabled !== false)) {
            const context = this.getCurrentContext();
            if (this.isShortcutValidForContext(shortcut, context)) {
                event.preventDefault();
                event.stopPropagation();
                this.executeCommand(shortcut.command);
                return true;
            }
        }
        
        return false;
    }

    private getCurrentContext(): 'editor' | 'global' | 'modal' {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            return 'editor';
        }
        
        // Check if modal is open
        const modals = document.querySelectorAll('.modal');
        if (modals.length > 0) {
            return 'modal';
        }
        
        return 'global';
    }

    private isShortcutValidForContext(shortcut: KeyboardShortcut, context: string): boolean {
        if (!shortcut.context) return true;
        return shortcut.context === context || shortcut.context === 'global';
    }

    private executeCommand(commandId: string) {
        const command = commandId.replace('vaultpilot:', '');
        
        switch (command) {
            case 'open-chat':
                this.plugin.openChatModal();
                break;
            case 'smart-search':
                this.plugin.openSmartSearchModal();
                break;
            case 'quick-chat':
                const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
                if (editor) {
                    this.plugin.quickChatWithSelection(editor);
                }
                break;
            case 'copilot-complete':
                const activeEditor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
                if (activeEditor) {
                    this.plugin.getCopilotCompletion(activeEditor);
                }
                break;
            case 'execute-workflow':
                this.plugin.openWorkflowModal();
                break;
            case 'analyze-vault':
                this.plugin.analyzeVault();
                break;
            case 'open-dashboard':
                this.plugin.activateFullTabView();
                break;
            case 'plan-my-day':
                this.plugin.planMyDay();
                break;
            case 'vault-structure':
                this.plugin.openVaultStructureModal();
                break;
            case 'file-operations':
                this.plugin.openFileOperationsModal();
                break;
            case 'vault-organizer':
                this.plugin.openVaultOrganizerModal();
                break;
            case 'batch-operations':
                this.plugin.openBatchOperationsModal();
                break;
            case 'show-shortcuts':
                this.showShortcutsHelp();
                break;
            case 'refresh-cache':
                this.refreshCache();
                break;
            case 'performance-metrics':
                this.showPerformanceMetrics();
                break;
            case 'agent-marketplace':
                this.openAgentMarketplace();
                break;
            case 'agent-evolution':
                this.showAgentEvolution();
                break;
            case 'quick-note':
                this.createQuickNote();
                break;
            case 'insert-template':
                this.insertTemplate();
                break;
            case 'link-analyzer':
                this.analyzeLinks();
                break;
            case 'tag-manager':
                this.openTagManager();
                break;
            case 'enhancement-demo':
                this.openEnhancementDemo();
                break;
            default:
                new Notice(`Unknown command: ${command}`);
        }
    }

    private showShortcutsHelp() {
        const shortcuts = Array.from(this.shortcuts.values());
        const content = this.generateShortcutsHelpContent(shortcuts);
        
        const modal = new Modal(this.app);
        modal.titleEl.textContent = 'VaultPilot Keyboard Shortcuts';
        modal.contentEl.innerHTML = content;
        modal.open();
    }

    private generateShortcutsHelpContent(shortcuts: KeyboardShortcut[]): string {
        const categorized = this.categorizeShortcuts(shortcuts);
        
        let html = '<div class="vaultpilot-shortcuts-help">';
        
        for (const [category, categoryShortcuts] of Object.entries(categorized)) {
            html += `<div class="shortcut-category">`;
            html += `<h3>${category}</h3>`;
            html += `<div class="shortcut-list">`;
            
            categoryShortcuts.forEach(shortcut => {
                const keyCombo = `${shortcut.modifiers.join(' + ')} + ${shortcut.key.replace('Key', '')}`;
                html += `<div class="shortcut-item">`;
                html += `<span class="shortcut-keys">${keyCombo}</span>`;
                html += `<span class="shortcut-desc">${shortcut.description}</span>`;
                html += `</div>`;
            });
            
            html += `</div></div>`;
        }
        
        html += '</div>';
        return html;
    }

    private categorizeShortcuts(shortcuts: KeyboardShortcut[]): Record<string, KeyboardShortcut[]> {
        const categories: Record<string, KeyboardShortcut[]> = {
            'Core Features': [],
            'Vault Management': [],
            'Agent Features': [],
            'Quick Actions': [],
            'System': []
        };

        shortcuts.forEach(shortcut => {
            const command = shortcut.command.replace('vaultpilot:', '');
            
            if (['open-chat', 'copilot-complete', 'execute-workflow', 'analyze-vault'].includes(command)) {
                categories['Core Features'].push(shortcut);
            } else if (['vault-structure', 'file-operations', 'vault-organizer', 'batch-operations'].includes(command)) {
                categories['Vault Management'].push(shortcut);
            } else if (['agent-marketplace', 'agent-evolution'].includes(command)) {
                categories['Agent Features'].push(shortcut);
            } else if (['quick-note', 'insert-template', 'link-analyzer', 'tag-manager'].includes(command)) {
                categories['Quick Actions'].push(shortcut);
            } else {
                categories['System'].push(shortcut);
            }
        });

        return categories;
    }

    private refreshCache() {
        // Implement cache refresh functionality
        new Notice('Cache refreshed successfully');
    }

    private showPerformanceMetrics() {
        // This will be implemented with ProgressIndicatorUI
        new Notice('Performance metrics feature coming soon');
    }

    private openAgentMarketplace() {
        // Use existing agent marketplace if available
        new Notice('Agent marketplace feature coming soon');
    }

    private showAgentEvolution() {
        new Notice('Agent evolution status feature coming soon');
    }

    private createQuickNote() {
        const newFile = this.app.vault.create(
            `Quick Note ${new Date().toISOString().slice(0, 19)}.md`,
            '# Quick Note\n\n'
        );
        
        newFile.then(file => {
            this.app.workspace.getLeaf().openFile(file);
        });
    }

    private insertTemplate() {
        new Notice('Template insertion feature coming soon');
    }

    private analyzeLinks() {
        new Notice('Link analyzer feature coming soon');
    }

    private openTagManager() {
        new Notice('Tag manager feature coming soon');
    }

    private openEnhancementDemo() {
        // Import demo class dynamically to avoid circular dependencies
        import('./enhancement-demo').then(({ VaultPilotEnhancementDemo }) => {
            new VaultPilotEnhancementDemo(this.app, this.plugin).open();
        }).catch(error => {
            console.error('Failed to load enhancement demo:', error);
            new Notice('Enhancement demo failed to load');
        });
    }

    getShortcuts(): KeyboardShortcut[] {
        return Array.from(this.shortcuts.values());
    }

    isEnabled(): boolean {
        return this.contextMenuEnabled;
    }

    setEnabled(enabled: boolean) {
        this.contextMenuEnabled = enabled;
    }
}

/**
 * Enhanced Commands Factory
 * Creates enhanced command definitions for VaultPilot
 */
export class EnhancedCommandsFactory {
    static createEnhancedCommands(plugin: VaultPilotPlugin): EnhancedCommand[] {
        return [
            {
                id: 'vaultpilot-enhanced-chat',
                name: 'Enhanced AI Chat',
                description: 'Open enhanced AI chat with real-time progress',
                callback: () => plugin.openChatModal(),
                category: 'AI Features',
                priority: 1
            },
            {
                id: 'vaultpilot-smart-search',
                name: 'Smart Search',
                description: 'AI-powered search with context awareness',
                callback: () => plugin.openSmartSearchModal(),
                category: 'Search',
                priority: 2
            },
            {
                id: 'vaultpilot-quick-completion',
                name: 'Quick AI Completion',
                description: 'Get AI completion for current context',
                editorCallback: (editor: Editor) => plugin.getCopilotCompletion(editor),
                category: 'AI Features',
                priority: 3
            },
            {
                id: 'vaultpilot-workflow-enhanced',
                name: 'Enhanced Workflow Execution',
                description: 'Execute workflows with progress tracking',
                callback: () => plugin.openWorkflowModal(),
                category: 'Automation',
                priority: 4
            },
            {
                id: 'vaultpilot-vault-analysis',
                name: 'Enhanced Vault Analysis',
                description: 'Comprehensive vault analysis with optimization',
                callback: () => plugin.analyzeVault(),
                category: 'Analytics',
                priority: 5
            },
            {
                id: 'vaultpilot-enhancement-demo',
                name: 'Enhancement Features Demo',
                description: 'Demonstrate keyboard shortcuts, progress indicators, and performance features',
                callback: () => {
                    import('./enhancement-demo').then(({ VaultPilotEnhancementDemo }) => {
                        new VaultPilotEnhancementDemo(plugin.app, plugin).open();
                    }).catch(error => {
                        console.error('Failed to load enhancement demo:', error);
                        new Notice('Enhancement demo failed to load');
                    });
                },
                category: 'Demo',
                priority: 10
            }
        ];
    }
}

export default { KeyboardShortcutHandler, EnhancedCommandsFactory };
