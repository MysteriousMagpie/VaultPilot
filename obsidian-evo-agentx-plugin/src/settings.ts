import { App, PluginSettingTab, Setting } from 'obsidian';
import type EvoAgentXPlugin from './main';

export interface EvoAgentSettings {
  backendUrl: string;
}

export const DEFAULT_SETTINGS: EvoAgentSettings = {
  backendUrl: 'http://localhost:3000'
};

export class EvoAgentSettingTab extends PluginSettingTab {
  plugin: EvoAgentXPlugin;

  constructor(app: App, plugin: EvoAgentXPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'EvoAgent X Settings' });

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
