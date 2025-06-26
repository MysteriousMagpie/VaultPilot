import { App, PluginSettingTab, Setting } from 'obsidian';
import type VaultPilotPlugin from './main';

export interface VaultPilotSettings {
  backendUrl: string;
}

export const DEFAULT_SETTINGS: VaultPilotSettings = {
  backendUrl: 'http://localhost:3000'
};

export class VaultPilotSettingTab extends PluginSettingTab {
  plugin: VaultPilotPlugin;

  constructor(app: App, plugin: VaultPilotPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'VaultPilot Settings' });

    new Setting(containerEl)
      .setName('Backend URL')
      .setDesc('URL of EvoAgent X backend')
      .addText(text =>
        text
          .setPlaceholder('http://localhost:3000')
          .setValue(this.plugin.settings.backendUrl)
          .onChange(async value => {
            this.plugin.settings.backendUrl = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
