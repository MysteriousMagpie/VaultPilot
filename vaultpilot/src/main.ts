import { Plugin, Notice } from 'obsidian';
import { VaultPilotSettingTab, DEFAULT_SETTINGS, VaultPilotSettings } from './settings';
import { VIEW_TYPE_VAULTPILOT, VaultPilotView } from './view';

export default class VaultPilotPlugin extends Plugin {
  settings!: VaultPilotSettings;

  async onload() {
    await this.loadSettings();

    try {
      const res = await fetch(`${this.settings.backendUrl}/status`);
      if (!res.ok) throw new Error('offline');
    } catch (e) {
      new Notice('EvoAgent backend offline');
    }

    this.registerView(
      VIEW_TYPE_VAULTPILOT,
      (leaf) => new VaultPilotView(leaf, this)
    );

    this.addRibbonIcon('dice', 'Open VaultPilot', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-vaultpilot-view',
      name: 'Open VaultPilot View',
      callback: () => this.activateView()
    });

    this.addSettingTab(new VaultPilotSettingTab(this.app, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VAULTPILOT);
  }

  async activateView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_VAULTPILOT);
    if (leaves.length === 0) {
      const rightLeaf = this.app.workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_VAULTPILOT,
          active: true
        });
      }
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
