# VaultPilot Vault Management Integration Package

This package contains all the necessary files to integrate EvoAgentX vault management capabilities into your VaultPilot Obsidian plugin.

## 📦 Package Contents

- `vault-types.ts` - TypeScript type definitions
- `vault-api-client.ts` - API client for vault management
- `vault-commands.ts` - Command definitions and hotkeys
- `vault-modals.ts` - Modal component templates
- `vault-settings.ts` - Settings interface extensions
- `vault-styles.css` - CSS styles for the components
- `integration-guide.md` - This integration guide

## 🚀 Quick Start

### 1. Copy Files to Your Plugin

Copy all the `.ts` and `.css` files to your VaultPilot plugin directory:

```
your-vaultpilot-plugin/
├── src/
│   ├── vault-types.ts
│   ├── vault-api-client.ts
│   ├── vault-commands.ts
│   ├── vault-modals.ts
│   └── vault-settings.ts
└── styles.css (append vault-styles.css content)
```

### 2. Update Your Main Plugin File

Add vault management to your main plugin class:

```typescript
import { Plugin } from 'obsidian';
import { VaultManagementClient } from './vault-api-client';
import { VAULT_MANAGEMENT_COMMANDS } from './vault-commands';
import { addVaultManagementSettings, DEFAULT_VAULT_MANAGEMENT_SETTINGS } from './vault-settings';

export default class YourVaultPilotPlugin extends Plugin {
    settings: YourPluginSettings;
    vaultClient: VaultManagementClient;

    async onload() {
        await this.loadSettings();
        
        // Initialize vault management if enabled
        if (this.settings.vaultManagement?.enableVaultManagement) {
            this.initializeVaultManagement();
        }
        
        // Register vault management commands
        this.registerVaultManagementCommands();
        
        // Your existing plugin initialization...
    }
    
    initializeVaultManagement() {
        this.vaultClient = new VaultManagementClient(
            this.settings.serverUrl,
            this.settings.apiKey
        );
    }
    
    registerVaultManagementCommands() {
        VAULT_MANAGEMENT_COMMANDS.forEach(command => {
            this.addCommand({
                ...command,
                callback: command.callback?.bind(this),
                editorCallback: command.editorCallback?.bind(this)
            });
        });
    }
}
```

### 3. Update Your Settings Interface

Extend your plugin settings:

```typescript
import { VaultManagementSettings } from './vault-types';
import { DEFAULT_VAULT_MANAGEMENT_SETTINGS } from './vault-settings';

interface YourPluginSettings {
    // Your existing settings...
    vaultManagement: VaultManagementSettings;
}

const DEFAULT_SETTINGS: YourPluginSettings = {
    // Your existing defaults...
    vaultManagement: DEFAULT_VAULT_MANAGEMENT_SETTINGS
};
```

### 4. Add Settings UI

In your settings tab display method:

```typescript
import { addVaultManagementSettings } from './vault-settings';

display(): void {
    const { containerEl } = this;
    
    // Your existing settings...
    
    // Add vault management settings
    addVaultManagementSettings(containerEl, this.plugin);
}
```

## 🎯 Key Features Available

### ✅ Ready to Use (No Additional Implementation Needed)

- **API Client** - Complete vault management API integration
- **Commands** - All vault management commands defined
- **Settings** - Full settings interface with all options
- **Styles** - Complete CSS styling for all components

### 🔧 Requires Implementation (Modal UI Components)

The modal templates in `vault-modals.ts` provide the structure, but you'll need to:

1. **Import and Register Modals** in your main plugin file
2. **Handle Obsidian-specific APIs** (the templates show the patterns)
3. **Customize UI** as needed for your plugin's design

### Modal Implementation Example

```typescript
// In your main.ts, import the modals
import { 
    VaultStructureModal, 
    SmartSearchModal, 
    FileOperationsModal 
} from './vault-modals';

// Update command callbacks to use actual modals
const command = VAULT_MANAGEMENT_COMMANDS.find(cmd => cmd.id === 'vaultpilot-vault-structure');
if (command) {
    command.callback = function() {
        new VaultStructureModal(this.app, this).open();
    };
}
```

## 🔌 Backend Requirements

Ensure your EvoAgentX backend is running with vault management endpoints:

```bash
# Start EvoAgentX server
cd /path/to/EvoAgentX
python -m uvicorn server.main:app --reload
```

The following endpoints should be available:
- `POST /api/obsidian/vault/structure`
- `POST /api/obsidian/vault/file/operation`
- `POST /api/obsidian/vault/file/batch`
- `POST /api/obsidian/vault/search`
- `POST /api/obsidian/vault/organize`
- `POST /api/obsidian/vault/backup`

## 🎨 Customization

### Styling
- Modify `vault-styles.css` to match your plugin's theme
- All CSS uses Obsidian CSS variables for consistency
- Responsive design included

### Commands
- Add/remove commands in `vault-commands.ts`
- Customize hotkeys in the `VAULT_MANAGEMENT_HOTKEYS` object
- Modify ribbon icons in `VAULT_MANAGEMENT_RIBBON_ICONS`

### Settings
- Add/remove settings in `vault-settings.ts`
- Customize default values in `DEFAULT_VAULT_MANAGEMENT_SETTINGS`

## 🔧 Advanced Integration

### WebSocket Support
For real-time features, extend the API client:

```typescript
class ExtendedVaultClient extends VaultManagementClient {
    private ws: WebSocket;
    
    connectWebSocket() {
        // Implement WebSocket connection for real-time updates
    }
}
```

### Error Handling
Customize error handling in the API client:

```typescript
private handleVaultManagementError(error: any, feature: string): void {
    // Your custom error handling
    console.error(`Vault management error in ${feature}:`, error);
    
    // Show user-friendly notifications
    new Notice(`Vault ${feature} operation failed`);
}
```

## 📝 Usage Examples

### Basic API Usage

```typescript
// Get vault structure
const structure = await this.vaultClient.getVaultStructure({
    include_content: false,
    max_depth: 3
});

// Search vault
const results = await this.vaultClient.searchVault({
    query: "machine learning",
    search_type: "content",
    max_results: 20
});

// Create file
const result = await this.vaultClient.createFile(
    "Projects/New Research.md",
    "# New Research Project\n\nStarted: " + new Date()
);
```

### Opening Modals

```typescript
// Open vault structure modal
new VaultStructureModal(this.app, this).open();

// Open search modal with initial query
new SmartSearchModal(this.app, this)
    .setInitialQuery("important concepts")
    .open();

// Open file operations modal
new FileOperationsModal(this.app, this)
    .setInitialPath("Projects/")
    .setOperation("create")
    .open();
```

## 🐛 Troubleshooting

### Common Issues

1. **"Vault management not initialized"**
   - Check that `enableVaultManagement` is true in settings
   - Verify `initializeVaultManagement()` is called

2. **API connection failures**
   - Check EvoAgentX server is running on correct URL
   - Verify network connectivity
   - Test connection using settings button

3. **TypeScript errors**
   - Ensure all imports are correct
   - Check that Obsidian types are available
   - Verify file paths match your project structure

### Debug Mode

Enable debug logging:

```typescript
console.log('Vault management debug info:', {
    enabled: this.settings.vaultManagement?.enableVaultManagement,
    serverUrl: this.settings.serverUrl,
    clientInitialized: !!this.vaultClient
});
```

## 📚 Next Steps

1. **Test Basic Integration** - Start with settings and commands
2. **Implement One Modal** - Begin with VaultStructureModal
3. **Add Styling** - Include the CSS and customize as needed
4. **Test All Features** - Verify each command and modal works
5. **Add Error Handling** - Implement robust error handling
6. **Optimize Performance** - Add caching and loading states

## 🆘 Support

If you encounter issues:

1. Check the EvoAgentX backend logs
2. Verify all files are properly imported
3. Test the API endpoints directly
4. Review the modal implementation patterns

---

**This package provides everything you need to integrate vault management into your VaultPilot plugin. The backend is ready, the types are defined, and the UI patterns are provided - you just need to wire them together!**
