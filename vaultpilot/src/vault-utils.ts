import { App } from 'obsidian';

// Global app instance - will be set by the main plugin
export let app: App;

export function setApp(appInstance: App) {
  app = appInstance;
}

/**
 * Gets the content of the currently active markdown file
 * @returns The markdown content (truncated to 8000 chars) or null if no file is active
 */
export async function getActiveMarkdown(): Promise<string | null> {
  const file = app.workspace.getActiveFile();
  if (!file) return null;
  
  // Large notes? Snip to 8000 chars to keep tokens reasonable
  const text = await app.vault.read(file);
  return text.slice(0, 8_000);
}
