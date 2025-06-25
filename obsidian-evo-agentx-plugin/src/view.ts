import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import type EvoAgentXPlugin from './main';

export const VIEW_TYPE_EVO_AGENT = 'evo-agent-view';

export class EvoAgentView extends ItemView {
  private outputEl: HTMLElement | null = null;
  plugin: EvoAgentXPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: EvoAgentXPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_EVO_AGENT;
  }

  getDisplayText(): string {
    return 'EvoAgent X';
  }

  async onOpen() {
    const container = this.containerEl;
    container.empty();
    container.createEl('h2', { text: 'EvoAgent X' });
    const btn = container.createEl('button', { text: 'Run Workflow' });
    btn.addEventListener('click', () => this.runWorkflow());
    this.outputEl = container.createEl('pre');
  }

  async runWorkflow() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('No active file');
      return;
    }
    const content = await this.app.vault.read(file);
    try {
      const resp = await fetch(`${this.plugin.settings.backendUrl}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const text = await resp.text();
      if (this.outputEl) this.outputEl.textContent = text;
    } catch (err) {
      new Notice('Failed to run workflow');
      console.error(err);
    }
  }

  async onClose() {
    // nothing
  }
}
