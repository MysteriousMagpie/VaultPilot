# VaultPilot Obsidian Plugin

This plugin provides a thin frontend for the EvoAgent X backend. It exposes a view inside Obsidian that allows you to send the current note to the backend and display the result.

## Features

### Dual-Mode Chat Interface

The chat interface now supports two distinct modes:

#### Ask Mode (Default)
- **Purpose**: Simple Q&A and quick explanations
- **Use Cases**: 
  - "What is machine learning?"
  - "Explain this concept"
  - "Help me understand my notes"
- **Response Style**: Conversational and direct

#### Agent Mode
- **Purpose**: Complex workflow execution and structured tasks
- **Use Cases**:
  - "Create a study plan with deadlines and resources"
  - "Organize my project notes into a structured outline"
  - "Generate a research plan for quantum computing"
- **Response Style**: Structured workflow results with actionable steps

### Mode Switching
- Toggle between modes using the **Ask Mode** / **Agent Mode** buttons in the chat header
- Mode selection is preserved during the chat session
- Input placeholder text changes to guide appropriate usage
- Set your preferred default mode in plugin settings

### Settings
- **Default Chat Mode**: Choose whether new chats start in Ask or Agent mode
- **Backend URL**: Configure your EvoAgentX backend connection
- **API Key**: Optional authentication
- **Agent Selection**: Choose specific agents or use auto-selection

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

The compiled plugin files `dist/main.js` and `manifest.json` can then be copied to your Obsidian vault's plugins folder.
