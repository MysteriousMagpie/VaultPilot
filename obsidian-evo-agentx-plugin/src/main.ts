import { Plugin, Notice } from 'obsidian';
import { EvoAgentSettingTab, DEFAULT_SETTINGS, EvoAgentSettings } from './settings';
import { VIEW_TYPE_EVO_AGENT, EvoAgentView } from './view';

export default class EvoAgentXPlugin extends Plugin {
  settings: EvoAgentSettings;

  async onload() {
    await this.loadSettings();

    try {
      const res = await fetch(`${this.settings.backendUrl}/status`);
      if (!res.ok) throw new Error('offline');
    } catch (e) {
      new Notice('EvoAgent backend offline');
    }

    this.registerView(
      VIEW_TYPE_EVO_AGENT,
      (leaf) => new EvoAgentView(leaf, this)
    );

    this.addRibbonIcon('dice', 'Open EvoAgent X', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-evo-agent-view',
      name: 'Open EvoAgent View',
      callback: () => this.activateView()
    });

    this.addSettingTab(new EvoAgentSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_EVO_AGENT);
  }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_EVO_AGENT);
    if (leaves.length === 0) {
      await this.app.workspace.getRightLeaf(false).setViewState({
        type: VIEW_TYPE_EVO_AGENT,
        active: true
      });
    } else {
      this.app.workspace.revealLeaf(leaves[0]);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
