# VaultPilot Integration Package

This package contains essential files to integrate EvoAgentX vault management capabilities into the VaultPilot Obsidian plugin.

## Files Overview

1. **types.ts** - TypeScript type definitions for all vault management features
2. **api-client.ts** - API client methods for communicating with EvoAgentX backend
3. **commands.ts** - Plugin command definitions and UI interactions
4. **modals.ts** - Modal components for vault management operations
5. **settings.ts** - Settings tab extension for vault management configuration

## Quick Integration Steps

1. Copy all `.ts` files to your VaultPilot plugin `src/` directory
2. Import the API client in your main plugin file
3. Register commands from `commands.ts` in your plugin's `onload()` method
4. Add settings from `settings.ts` to your existing settings tab
5. Test with your EvoAgentX backend running on localhost:8000

## Backend Requirements

Ensure your EvoAgentX backend has these endpoints available:
- `GET /api/obsidian/vault/structure` - Get vault folder structure
- `POST /api/obsidian/vault/files/operations` - File operations (create, delete, move, rename)
- `POST /api/obsidian/vault/search/smart` - Smart search across vault
- `POST /api/obsidian/vault/organize` - Auto-organize vault content

## Configuration

Update your plugin settings to include:
```typescript
interface VaultPilotSettings {
  evoagentxUrl: string; // Default: "http://localhost:8000"
  apiKey?: string;
  enableVaultManagement: boolean;
}
```
