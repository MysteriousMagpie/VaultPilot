# VaultPilot Integration Implementation Guide

## Overview
This guide helps you integrate EvoAgentX vault management capabilities into your VaultPilot Obsidian plugin.

## Prerequisites
- EvoAgentX backend running on localhost:8000 (or configured URL)
- VaultPilot plugin development environment set up
- Node.js and npm/yarn installed

## Step 1: Copy Integration Files

Copy all files from this package to your VaultPilot plugin `src/` directory:

```
src/
├── vault-management/
│   ├── types.ts          # Type definitions
│   ├── api-client.ts     # API client for EvoAgentX
│   ├── commands.ts       # Plugin commands
│   ├── modals.ts         # Modal components
│   └── settings.ts       # Settings extension
```

## Step 2: Update Main Plugin File

Update your main plugin class to integrate vault management:

```typescript
// main.ts
import { Plugin } from 'obsidian';
import { EvoAgentXVaultClient } from './vault-management/api-client';
import { VaultManagementSettings, DEFAULT_VAULT_SETTINGS, addVaultManagementSettings } from './vault-management/settings';
import { registerVaultManagementCommands, addVaultManagementRibbons } from './vault-management/commands';

export default class VaultPilotPlugin extends Plugin {
  settings: VaultManagementSettings;
  vaultClient: EvoAgentXVaultClient;

  async onload() {
    await this.loadSettings();
    
    // Initialize EvoAgentX client
    this.vaultClient = new EvoAgentXVaultClient(
      this.settings.evoagentxUrl,
      this.settings.apiKey
    );

    // Register vault management commands
    if (this.settings.enableVaultManagement) {
      registerVaultManagementCommands(this, this.vaultClient);
      addVaultManagementRibbons(this, this.vaultClient);
    }

    // Add settings tab
    this.addSettingTab(new VaultPilotSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_VAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update client configuration
    this.vaultClient.updateConfig(this.settings.evoagentxUrl, this.settings.apiKey);
  }
}

// Extend your existing settings tab
class VaultPilotSettingTab extends PluginSettingTab {
  plugin: VaultPilotPlugin;

  constructor(app: App, plugin: VaultPilotPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Your existing settings...

    // Add vault management settings
    addVaultManagementSettings(
      this,
      this.plugin.settings,
      () => this.plugin.saveSettings(),
      this.plugin.vaultClient
    );
  }
}
```

## Step 3: Update Package Dependencies

Ensure your `package.json` includes necessary Obsidian API types:

```json
{
  "devDependencies": {
    "@types/node": "^16.11.6",
    "obsidian": "latest",
    "typescript": "4.4.4"
  }
}
```

## Step 4: Update TypeScript Configuration

Ensure your `tsconfig.json` includes the new files:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["dom", "es2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "src/**/*"
  ]
}
```

## Step 5: Test the Integration

1. **Start EvoAgentX backend**:
   ```bash
   cd /path/to/EvoAgentX
   python -m uvicorn server.main:app --reload --port 8000
   ```

2. **Build and install your plugin**:
   ```bash
   npm run build
   # Copy to your Obsidian plugins folder
   ```

3. **Test connection**:
   - Open Obsidian settings
   - Go to VaultPilot settings
   - Click "Test Connection"
   - Should see ✅ Connection successful

4. **Test features**:
   - Use Ctrl+P → "Show Vault Structure"
   - Use Ctrl+P → "Smart Search Vault"
   - Check ribbon icons for quick access

## Step 6: Customize UI (Optional)

Add CSS styling in your `styles.css`:

```css
/* Vault Management Styles */
.vault-summary {
  background: var(--background-secondary);
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.structure-node {
  padding: 0.25rem 0;
  border-left: 1px solid var(--background-modifier-border);
}

.structure-node.level-0 {
  border-left: none;
}

.clickable {
  cursor: pointer;
  color: var(--text-accent);
}

.clickable:hover {
  text-decoration: underline;
}

.search-result {
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  padding: 1rem;
  margin: 0.5rem 0;
}

.result-title {
  margin: 0 0 0.5rem 0;
  color: var(--text-accent);
}

.result-snippet {
  color: var(--text-muted);
  font-size: 0.9em;
  margin: 0.5rem 0;
}

.result-tags .tag {
  display: inline-block;
  background: var(--tag-background);
  color: var(--tag-color);
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8em;
  margin-right: 0.5rem;
}

.operation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  margin: 0.25rem 0;
}

.remove-btn {
  background: var(--interactive-accent);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.vault-management-help {
  border-top: 1px solid var(--background-modifier-border);
  padding-top: 1rem;
  margin-top: 2rem;
}
```

## Troubleshooting

### Connection Issues
- Ensure EvoAgentX backend is running on the configured URL
- Check firewall settings if using remote backend
- Verify API key if authentication is enabled

### TypeScript Errors
- Ensure all files are in the correct directory structure
- Run `npm install` to install missing dependencies
- Check that tsconfig.json includes all source files

### Plugin Not Loading
- Check browser console for JavaScript errors
- Verify manifest.json has correct version and API version
- Ensure all imported modules are available

## Advanced Features

### Custom Organization Rules
```typescript
// Add to your plugin
async customOrganization() {
  const rules = [
    {
      name: 'Move images to assets',
      pattern: '\\.(png|jpg|jpeg|gif)$',
      target_folder: 'assets/images',
      enabled: true
    },
    {
      name: 'Archive old notes',
      pattern: '.*',
      target_folder: 'archive',
      enabled: true
    }
  ];

  const response = await this.vaultClient.organizeVault({
    strategy: 'custom',
    rules: rules,
    dry_run: true
  });

  // Handle response...
}
```

### Batch Operations
```typescript
// Example batch file operations
async batchRename() {
  const operations = [
    {
      operation: 'rename',
      source_path: 'old-name.md',
      target_path: 'new-name.md'
    },
    {
      operation: 'move',
      source_path: 'file.md',
      target_path: 'folder/file.md'
    }
  ];

  const response = await this.vaultClient.performBatchOperations({
    operations,
    create_backup: true
  });

  // Handle response...
}
```

## Next Steps

1. **Test thoroughly** with your vault
2. **Customize UI** to match your plugin's design
3. **Add error handling** for edge cases
4. **Implement progress indicators** for long operations
5. **Add keyboard shortcuts** for power users
6. **Create unit tests** for critical functionality

## Support

For issues with the EvoAgentX backend, check:
- [EvoAgentX GitHub Repository](https://github.com/EvoAgentX/EvoAgentX)
- Backend logs for API errors
- Network tab in browser dev tools for request/response details
