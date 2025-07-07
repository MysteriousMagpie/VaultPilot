/**
 * VaultPilot AI Panel
 * 
 * Placeholder for the AI Panel component that will display agent status,
 * task queue, insights, and AI health monitoring.
 */

import { Component } from 'obsidian';
import VaultPilotPlugin from '../../main';
import { WorkspaceManager } from '../WorkspaceManager';

export class AIPanel extends Component {
  private plugin: VaultPilotPlugin;
  private workspace: WorkspaceManager;
  private containerEl: HTMLElement;

  constructor(containerEl: HTMLElement, plugin: VaultPilotPlugin, workspace: WorkspaceManager) {
    super();
    this.containerEl = containerEl;
    this.plugin = plugin;
    this.workspace = workspace;
  }

  async onload(): Promise<void> {
    this.containerEl.empty();
    this.containerEl.addClass('vp-ai-panel');
    
    // Create placeholder content
    const placeholder = this.containerEl.createEl('div', {
      cls: 'vp-ai-panel-placeholder'
    });
    
    placeholder.createEl('h3', { text: 'AI Panel' });
    placeholder.createEl('p', { text: 'AI status monitoring, task queue, and insights will be displayed here.' });
    
    if (this.plugin.settings.debugMode) {
      console.log('AIPanel placeholder loaded');
    }
  }

  onunload(): void {
    super.onunload();
  }
}