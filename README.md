# VaultPilot

**Comprehensive EvoAgentX Integration for Obsidian**

VaultPilot is a powerful Obsidian plugin that brings advanced AI capabilities directly into your knowledge vault through seamless integration with the EvoAgentX backend. Transform your note-taking experience with intelligent chat, automated workflows, AI-powered copilot features, and comprehensive vault analysis.

## 🌟 Features

### 🤖 **AI Chat Assistant**
- **Conversational AI**: Natural language conversations with context awareness
- **Vault Context**: AI understands your notes and provides relevant insights
- **Persistent History**: Conversation history maintained across sessions
- **Multi-Agent Support**: Choose from different specialized agents
- **Real-time Communication**: WebSocket-powered live responses

### ✨ **AI Copilot**
- **Intelligent Completion**: Context-aware text suggestions as you write
- **Smart Suggestions**: AI-powered writing assistance
- **Auto-Complete**: Optional automatic completion suggestions
- **Cursor-Aware**: Completions based on current position and context

### ⚙️ **Workflow Automation**
- **Goal-Driven Execution**: Define objectives and let AI create comprehensive workflows
- **Multi-Step Processing**: Complex task automation with progress tracking
- **Artifact Generation**: Automatically create notes, plans, and documents
- **Vault Integration**: Workflows that understand and work with your content

### 🔍 **Vault Analysis**
- **Content Insights**: AI-powered analysis of your knowledge base
- **Connection Discovery**: Find relationships between your notes
- **Knowledge Gaps**: Identify areas for expansion
- **Structured Recommendations**: Actionable insights for improvement

### 📋 **Task Planning**
- **AI-Generated Plans**: Automatic task planning from your notes
- **Priority Management**: Intelligent task prioritization
- **Timeline Creation**: Realistic project timelines
- **Milestone Tracking**: Key checkpoints and deliverables

### 🧠 **Intelligence Parsing**
- **Intent Recognition**: Understand what you're trying to achieve
- **Entity Extraction**: Identify key concepts and entities
- **Context Analysis**: Deep understanding of your content
- **Sentiment Analysis**: Understand the tone and meaning

## 🚀 Quick Start

### Prerequisites

1. **Obsidian** installed on your system
2. **EvoAgentX Backend** running and accessible
3. **Network connectivity** to the backend server

### Installation

1. **Download the Plugin**
   ```bash
   # Clone or download the VaultPilot repository
   git clone https://github.com/malachiledbetter/VaultPilot.git
   ```

2. **Build the Plugin**
   ```bash
   cd VaultPilot/vaultpilot
   npm install
   npm run build
   ```

3. **Install in Obsidian**
   - Copy the built plugin to your Obsidian plugins folder:
     - Windows: `%APPDATA%\Obsidian\plugins\vaultpilot\`
     - macOS: `~/Library/Application Support/obsidian/plugins/vaultpilot/`
     - Linux: `~/.config/obsidian/plugins/vaultpilot/`
   - Enable the plugin in Obsidian Settings > Community plugins

4. **Configure Connection**
   - Open VaultPilot settings in Obsidian
   - Set your EvoAgentX backend URL (default: `http://localhost:8000`)
   - Optionally set API key if required
   - Test the connection

## 🎯 Usage

### Opening VaultPilot

- **Ribbon Icon**: Click the 🤖 robot icon in the left sidebar
- **Command Palette**: Use `Ctrl/Cmd + P` → "VaultPilot: Open Chat"
- **View Panel**: Access through the right sidebar view

### Chat Interface

1. **Start a Conversation**
   - Click "💬 Open Chat" or use the ribbon icon
   - Type your question or request
   - AI responds with context from your vault

2. **Advanced Features**
   - Select different agents for specialized responses
   - Clear chat history when needed
   - Conversations automatically include current file context

### Workflow Execution

1. **Define Your Goal**
   - Use `Ctrl/Cmd + P` → "VaultPilot: Execute Workflow"
   - Describe what you want to achieve
   - Add any constraints or requirements

2. **Configure Options**
   - Include active file content
   - Include entire vault (for comprehensive analysis)
   - Watch progress in real-time

3. **Review Results**
   - Generated artifacts saved as notes
   - Step-by-step execution log
   - Save complete results to vault

### AI Copilot

1. **Manual Completion**
   - Place cursor where you want suggestions
   - Use `Ctrl/Cmd + P` → "VaultPilot: Get AI Completion"
   - AI provides contextual completions

2. **Auto-Complete**
   - Enable in settings for automatic suggestions
   - Suggestions appear as you type
   - Context-aware based on current file

### Vault Analysis

1. **Full Vault Analysis**
   - Use `Ctrl/Cmd + P` → "VaultPilot: Analyze Current Vault"
   - AI analyzes relationships and patterns
   - Results saved as analysis note

2. **Selected Text Analysis**
   - Select text in any note
   - Use `Ctrl/Cmd + P` → "VaultPilot: Quick Chat with Selection"
   - AI provides insights on selected content

### Task Planning

1. **From Current Note**
   - Use `Ctrl/Cmd + P` → "VaultPilot: Plan Tasks from Note"
   - AI creates structured task plan
   - Includes priorities, timelines, and milestones

## ⚙️ Configuration

### Connection Settings

- **Backend URL**: EvoAgentX server address
- **API Key**: Optional authentication (if backend requires)
- **Connection Test**: Verify backend connectivity

### Feature Settings

- **Enable WebSocket**: Real-time communication features
- **Enable Copilot**: AI text completion and suggestions
- **Enable Auto-Complete**: Automatic completion suggestions
- **Chat History Limit**: Number of messages to retain

### Agent Settings

- **Default Agent**: Preferred agent for general tasks
- **Debug Mode**: Additional logging and developer features

## 🔧 Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| Open Chat | Launch the chat interface | - |
| Execute Workflow | Start workflow automation | - |
| Analyze Vault | Analyze entire vault content | - |
| Get AI Completion | Manual copilot completion | - |
| Quick Chat with Selection | Analyze selected text | - |
| Plan Tasks from Note | Generate task plan | - |
| Open VaultPilot View | Show sidebar panel | - |

## 🎨 Interface

### Sidebar View
- **Connection Status**: Backend and WebSocket status
- **Quick Actions**: Fast access to main features
- **Vault Statistics**: Overview of your content
- **Agent Information**: Available AI agents

### Chat Modal
- **Conversation History**: Persistent chat sessions
- **Agent Selection**: Choose specialized agents
- **Context Integration**: Automatic vault context
- **Real-time Responses**: Live AI communication

### Workflow Modal
- **Goal Definition**: Describe your objectives
- **Context Input**: Additional requirements
- **Progress Tracking**: Real-time execution updates
- **Result Management**: Save artifacts and reports

## 🔗 Integration with EvoAgentX

VaultPilot connects to EvoAgentX through comprehensive REST API and WebSocket integration:

### API Endpoints Used
- `/api/obsidian/chat` - Chat conversations
- `/api/obsidian/copilot/complete` - Text completion
- `/api/obsidian/workflow` - Workflow execution
- `/api/obsidian/vault/context` - Vault analysis
- `/api/obsidian/planning/tasks` - Task planning
- `/api/obsidian/agents` - Agent management
- `/api/obsidian/intelligence/parse` - Intelligence parsing

### WebSocket Features
- Real-time chat responses
- Workflow progress updates
- Live copilot suggestions
- Vault synchronization

## 🛠️ Development

### Building from Source

```bash
# Install dependencies
npm install

# Development mode (with watching)
npm run dev

# Production build
npm run build
```

### Project Structure

```
vaultpilot/
├── src/
│   ├── main.ts              # Main plugin class
│   ├── settings.ts          # Settings configuration
│   ├── view.ts              # Sidebar view component
│   ├── chat-modal.ts        # Chat interface
│   ├── workflow-modal.ts    # Workflow interface
│   ├── api-client.ts        # EvoAgentX API client
│   └── types.ts             # TypeScript definitions
├── manifest.json            # Plugin manifest
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
└── rollup.config.js         # Build configuration
```

## 🔒 Security & Privacy

- **Local Processing**: All AI processing happens on your configured backend
- **No Data Collection**: VaultPilot doesn't collect or store personal data
- **Secure Communication**: HTTPS/WSS support for encrypted connections
- **Access Control**: Respects Obsidian's file access permissions

## 🐛 Troubleshooting

### Common Issues

**Backend Connection Failed**
- Verify EvoAgentX is running and accessible
- Check firewall and network settings
- Confirm correct backend URL in settings

**WebSocket Not Connecting**
- Ensure WebSocket support in your environment
- Check for proxy or firewall blocking WebSocket connections
- Try disabling and re-enabling WebSocket in settings

**Copilot Not Working**
- Verify backend connection is working
- Check that Copilot is enabled in settings
- Ensure you're in a Markdown editor

**Slow Performance**
- Reduce chat history limit
- Disable auto-complete for large vaults
- Check backend server performance

### Debug Mode

Enable debug mode in settings for:
- Detailed error logging
- WebSocket connection status
- API request/response information
- Performance metrics

## 📈 Roadmap

### Upcoming Features
- **Vector Search**: Semantic search across vault content
- **Batch Operations**: Process multiple files efficiently
- **Custom Agents**: Create and train specialized agents
- **Mobile Support**: Full compatibility with Obsidian mobile
- **Advanced Analytics**: Usage metrics and insights

### Integrations
- **Other Knowledge Tools**: Support for additional platforms
- **Cloud Sync**: Synchronization with cloud services
- **API Extensions**: Custom integrations and plugins

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the Repository**
2. **Create Feature Branch** (`git checkout -b feature/amazing-feature`)
3. **Commit Changes** (`git commit -m 'Add amazing feature'`)
4. **Push to Branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **EvoAgentX Team** - For the powerful AI backend
- **Obsidian Community** - For the excellent plugin ecosystem
- **Contributors** - For making VaultPilot better

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/malachiledbetter/VaultPilot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/malachiledbetter/VaultPilot/discussions)
- **Documentation**: [Wiki](https://github.com/malachiledbetter/VaultPilot/wiki)

---

**Transform your Obsidian experience with AI-powered intelligence. VaultPilot + EvoAgentX = Your Ultimate Knowledge Assistant.** 🚀