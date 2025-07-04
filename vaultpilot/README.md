# VaultPilot Obsidian Plugin

This plugin provides a comprehensive AI-powered interface for Obsidian, connecting to the EvoAgentX backend for advanced vault management, chat capabilities, and intelligent automation.

## 🚀 Key Features

### 🤖 AI Chat Interface
- **Dual-Mode Chat**: Ask mode for Q&A, Agent mode for complex workflows
- **Real-time Communication**: WebSocket support for live updates
- **Context-Aware**: Automatic vault context inclusion
- **Full Dashboard**: Comprehensive tab-based interface

### 🗂️ **NEW: Advanced Vault Management**
VaultPilot now includes powerful AI-powered vault management capabilities:

#### 📊 Vault Structure Analysis
- **Complete Vault Overview**: Analyze your entire vault structure with AI insights
- **File Statistics**: Total files, folders, size, and type distribution
- **Orphaned Files Detection**: Find files that may be disconnected from your knowledge graph
- **Recent Files Tracking**: Quick access to recently modified content
- **Interactive Tree View**: Navigate your vault structure visually

**Access**: Command Palette → "View Vault Structure" or Ctrl+Shift+V

#### 🔍 Smart Vault Search
- **AI-Powered Search**: Intelligent search with context understanding
- **Multiple Search Types**:
  - Content search (full-text with AI insights)
  - Filename search (smart pattern matching)
  - Tag search (semantic tag relationships)
  - Link search (connection analysis)
  - Comprehensive search (all methods combined)
- **Search Insights**: AI-generated suggestions and related queries
- **Quick Search**: Select text and instantly search

**Access**: Command Palette → "Smart Vault Search" or Ctrl+Shift+F

#### 📁 File Operations Manager
- **Create Files**: Generate new files with AI-suggested content
- **Update Files**: Modify existing files with intelligent assistance
- **Move/Copy Files**: Reorganize your vault with AI recommendations
- **Delete Files**: Safe deletion with backup options
- **Batch Operations**: Perform multiple file operations efficiently

**Access**: Command Palette → "File Operations Manager" or Ctrl+Shift+O

#### 🧹 AI Vault Organization
- **Smart Organization**: AI-powered suggestions for vault structure improvements
- **Topic-Based Grouping**: Automatically categorize files by content
- **Date-Based Organization**: Organize by creation or modification dates
- **Type-Based Sorting**: Group files by format and purpose
- **Custom Rules**: Define your own organization patterns

**Access**: Command Palette → "AI Vault Organization" or Ctrl+Shift+G

#### 🔧 Vault Health & Maintenance
- **Health Check**: Comprehensive vault analysis for issues and optimization
- **Backup Creation**: Automated vault backups with compression
- **Performance Monitoring**: Track vault performance and suggest improvements
- **Link Validation**: Find and fix broken internal links
- **Duplicate Detection**: Identify similar or duplicate content

**Access**: Command Palette → "Vault Health Check" or Ctrl+Shift+H

### VaultPilot Dashboard (Full Tab View)

VaultPilot now offers a comprehensive dashboard view that opens as a full tab, providing a complete AI assistant interface:

#### Features
- **Three-Panel Layout**: 
  - Left sidebar with connection status, quick actions, and vault statistics
  - Main content area with tabbed interface (Chat, Workflows, Analytics)
  - Right sidebar with recent files, agent status, and activity feed

#### Access Methods
- **Command Palette**: Search for "Open VaultPilot Dashboard"
- **Ribbon Icon**: Ctrl/Cmd + click the VaultPilot robot icon
- **Sidebar View**: Click the "📊 Open Dashboard" button in the sidebar view

## ⚙️ Configuration

### Vault Management Settings
Access vault management settings through: Settings → VaultPilot → Vault Management

#### Core Settings
- **Enable Vault Management**: Toggle all vault management features
- **Auto Sync Structure**: Automatically update vault analysis when files change
- **Enable Smart Search**: Use AI-powered search with insights
- **Enable File Operations**: Allow file creation, deletion, and modification
- **Confirm Destructive Operations**: Show confirmation dialogs for file deletion
- **Auto Backup Before Operations**: Automatically backup before destructive operations

#### Search Configuration
- **Search Results Limit**: Maximum number of results to display (10-200)
- **Default Search Type**: Default search mode (Content, Filename, Tags, Links, Comprehensive)
- **Maximum Search Results**: Backend limit for search results (50-500)

#### Advanced Settings
- **Batch Operation Timeout**: Timeout for bulk operations (1-300 seconds)
- **Show Vault Statistics**: Display file counts and sizes in interfaces

### Backend Connection
1. **Backend URL**: Default `http://localhost:8000`
2. **API Key**: Optional authentication key
3. **Enable WebSocket**: Real-time updates and progress tracking

### Test Your Setup
Use the "Test Vault Management Connection" button in settings to verify:
- EvoAgentX backend connectivity
- Vault management endpoint availability
- API authentication status

## 🚀 Quick Start

### Prerequisites
1. **EvoAgentX Backend**: Ensure the backend server is running
2. **Network Access**: Backend must be accessible from Obsidian
3. **Vault Permissions**: Plugin needs read/write access to your vault

### First-Time Setup
1. Install the VaultPilot plugin
2. Open Settings → VaultPilot
3. Configure your backend URL (default: `http://localhost:8000`)
4. Test the connection using the "Test Connection" button
5. Enable vault management features
6. Start with "Vault Health Check" to analyze your vault

### Getting Started with Vault Management
1. **Explore Your Vault**: Use "View Vault Structure" to get an overview
2. **Try Smart Search**: Search for a concept across your notes
3. **Organize Content**: Use "AI Vault Organization" for suggestions
4. **Create Backups**: Run "Create Vault Backup" for safety
5. **Monitor Health**: Regular "Vault Health Check" to maintain quality

## 📋 Available Commands

### Vault Management Commands
| Command | Shortcut | Description |
|---------|----------|-------------|
| View Vault Structure | `Ctrl+Shift+V` | Analyze and browse vault structure |
| Smart Vault Search | `Ctrl+Shift+F` | AI-powered content search |
| Quick Search Selected Text | `Ctrl+Shift+S` | Search selected text instantly |
| File Operations Manager | `Ctrl+Shift+O` | Create, edit, move, delete files |
| AI Vault Organization | `Ctrl+Shift+G` | Get organization suggestions |
| Vault Health Check | `Ctrl+Shift+H` | Comprehensive vault analysis |
| Create Vault Backup | - | Create compressed vault backup |
| Search Content | - | Search within file content |
| Search Filenames | - | Search by file names |
| View Recent Files | - | Show recently modified files |

### Chat & Workflow Commands
| Command | Description |
|---------|-------------|
| Open Chat | Open chat modal |
| Execute Workflow | Open workflow selection |
| Analyze Current Vault | Analyze the current vault |
| Get AI Completion | AI text completion |
| Quick Chat with Selection | Chat about selected text |
| Plan Tasks from Note | Extract and plan tasks |
| Plan My Day | AI-powered daily planning |
| Open VaultPilot View | Open sidebar view |
| Open VaultPilot Dashboard | Open full dashboard |

## 🔧 Advanced Usage

### Batch Operations
- Queue multiple file operations
- Atomic execution (all or nothing)
- Progress tracking and error handling
- Rollback capabilities for failed operations

### Smart Search Tips
- Use natural language queries: "notes about machine learning from last month"
- Combine search types for comprehensive results
- Save frequently used searches as suggested queries
- Use AI insights to discover related content

### Organization Strategies
- Start with topic-based organization for knowledge management
- Use date-based organization for journaling and time-sensitive content
- Combine custom rules with AI suggestions
- Regular organization maintenance with health checks
  - Daily planning
  - Knowledge graph visualization

**Analytics Tab**
- Vault statistics and visualizations (coming soon)
- File type distribution charts
- Note creation timeline
- Tag usage analytics

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
