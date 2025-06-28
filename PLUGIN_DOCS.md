# VaultPilot Plugin Documentation

## Quick Reference

### Essential Commands

| Command | Purpose | Usage |
|---------|---------|-------|
| Open Chat | Start AI conversation | Ribbon icon / Cmd+P |
| Execute Workflow | Automate complex tasks | Cmd+P → "Execute Workflow" |
| Get AI Completion | Smart text completion | Cmd+P → "Get AI Completion" |
| Analyze Vault | Understand your content | Cmd+P → "Analyze Vault" |

### Settings Overview

#### Connection
- **Backend URL**: Default `http://localhost:8000`
- **API Key**: Optional authentication
- **Test Connection**: Verify backend status

#### Features
- **WebSocket**: Enable real-time features
- **Copilot**: AI text assistance
- **Auto-Complete**: Automatic suggestions
- **Debug Mode**: Detailed logging

## API Integration Details

### Backend Requirements

VaultPilot requires a running EvoAgentX backend with the following endpoints:

```
GET  /api/obsidian/health           - Health check
POST /api/obsidian/chat             - Chat conversations
POST /api/obsidian/copilot/complete - Text completion
POST /api/obsidian/workflow         - Workflow execution
POST /api/obsidian/vault/context    - Vault analysis
POST /api/obsidian/planning/tasks   - Task planning
GET  /api/obsidian/agents           - Available agents
WS   /ws/obsidian                   - WebSocket connection
```

### WebSocket Events

The plugin listens for these WebSocket message types:
- `chat` - Real-time chat responses
- `workflow_progress` - Workflow execution updates
- `copilot` - Live completion suggestions
- `vault_sync` - Vault synchronization
- `error` - Error notifications

## Advanced Usage

### Custom Workflows

Example workflow goals:
```
"Create a comprehensive study guide for machine learning based on my notes"
"Organize my project notes into a structured outline"
"Generate a research plan for quantum computing"
"Create a weekly schedule from my task notes"
```

### Copilot Best Practices

1. **Context Matters**: Copilot works best with existing content
2. **Cursor Position**: Place cursor where you want completion
3. **File Type**: Optimized for Markdown files
4. **Performance**: Disable auto-complete for very large files

### Vault Analysis Tips

- **File Selection**: Include relevant files for focused analysis
- **Regular Analysis**: Run weekly for knowledge gap identification
- **Export Results**: Save analysis notes for reference
- **Pattern Recognition**: Look for connection suggestions

## Troubleshooting Guide

### Connection Issues

**"Backend Offline" Error**
1. Verify EvoAgentX server is running
2. Check network connectivity
3. Confirm URL in settings
4. Test with browser: `http://your-backend-url/api/obsidian/health`

**WebSocket Connection Failed**
1. Ensure WebSocket support
2. Check firewall settings
3. Try different network
4. Disable browser extensions

### Performance Issues

**Slow Responses**
- Check backend server load
- Reduce vault content in requests
- Lower chat history limit
- Disable auto-complete temporarily

**High Memory Usage**
- Restart Obsidian
- Clear chat history
- Reduce file inclusion in workflows
- Check for memory leaks in console

### Feature Issues

**Copilot Not Working**
1. Enable in settings
2. Verify backend connection
3. Check cursor position
4. Ensure Markdown file

**Workflow Fails**
1. Check goal specificity
2. Verify vault permissions
3. Monitor backend logs
4. Try smaller scope

## Security Considerations

### Data Privacy
- VaultPilot sends vault content to configured backend
- No data is collected by the plugin itself
- Backend handles all AI processing
- Consider local backend deployment for sensitive data

### Network Security
- Use HTTPS/WSS for remote backends
- Consider VPN for additional security
- Monitor network traffic
- Regular security updates

### Access Control
- Plugin respects Obsidian permissions
- No unauthorized file access
- Backend authentication recommended
- Audit trail in debug mode

## Development Guide

### Plugin Architecture

```
VaultPilotPlugin (main.ts)
├── EvoAgentXClient (api-client.ts)
├── Settings (settings.ts)
├── Views
│   ├── ChatModal (chat-modal.ts)
│   ├── WorkflowModal (workflow-modal.ts)
│   └── SidebarView (view.ts)
└── Types (types.ts)
```

### Key Classes

**VaultPilotPlugin**
- Main plugin entry point
- Command registration
- Settings management
- WebSocket coordination

**EvoAgentXClient**
- API communication
- WebSocket handling
- Error management
- Response processing

**Modal Components**
- User interfaces
- Event handling
- Result display
- Style management

### Extension Points

**Custom Commands**
```typescript
this.addCommand({
  id: 'custom-feature',
  name: 'Custom Feature',
  callback: () => this.customFunction()
});
```

**API Client Extension**
```typescript
async customEndpoint(data: any) {
  return this.makeRequest('/api/obsidian/custom', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

**WebSocket Handlers**
```typescript
this.apiClient.connectWebSocket({
  onCustomEvent: (data) => this.handleCustomEvent(data)
});
```

## FAQ

**Q: Can I use VaultPilot offline?**
A: No, VaultPilot requires connection to EvoAgentX backend for AI features.

**Q: Does VaultPilot work with mobile Obsidian?**
A: Currently desktop only. Mobile support is planned.

**Q: Can I use my own AI backend?**
A: Yes, any backend implementing the EvoAgentX API will work.

**Q: How much data does VaultPilot send to the backend?**
A: Only content you explicitly include in requests (active file, selections, or vault content).

**Q: Can I customize the AI agents?**
A: Agent management depends on backend capabilities. Check EvoAgentX documentation.

**Q: Is there a rate limit?**
A: Rate limiting depends on backend configuration.

**Q: How do I backup my conversations?**
A: Chat history is stored locally. Export functionality coming soon.

**Q: Can I use multiple backends?**
A: Currently one backend per plugin instance.

## Support Resources

- **GitHub Repository**: [VaultPilot](https://github.com/malachiledbetter/VaultPilot)
- **Issue Tracker**: Report bugs and request features
- **Discussions**: Community support and ideas
- **Wiki**: Detailed documentation and examples
- **EvoAgentX Docs**: Backend documentation and setup

## Version History

**v1.0.0** - Initial Release
- Complete EvoAgentX integration
- Chat, Workflow, Copilot features
- WebSocket support
- Comprehensive settings
- Full documentation
