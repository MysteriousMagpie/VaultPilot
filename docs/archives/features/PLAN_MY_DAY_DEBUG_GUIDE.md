# Plan My Day Debugging Guide

## 🛠️ Debugging Features Added

### Enhanced Logging
The Plan My Day feature now includes comprehensive logging that will help identify issues:

- **Console logging**: All operations are logged with timestamps and context
- **Error categorization**: Different error types are handled specifically
- **API client validation**: Checks if EvoAgentX connection is working
- **Response validation**: Validates API responses at each step

### Debug Command
A new command "Plan My Day - Debug Connection" has been added that will:

1. ✅ **Check active file** - Verifies you have a note open
2. ✅ **Analyze API client** - Checks if EvoAgentX client is properly initialized
3. ✅ **Test connection** - Attempts to connect to EvoAgentX server
4. ✅ **Test task planning** - Tries the actual task planning endpoint
5. ✅ **Check settings** - Validates plugin configuration
6. ✅ **Generate report** - Creates a debug report as a new note

## 🔍 How to Debug Issues

### Step 1: Run Debug Command
1. Open Obsidian
2. Press `Ctrl/Cmd + P` to open command palette
3. Search for "Plan My Day - Debug Connection"
4. Run the command

This will:
- Show diagnostic results in console
- Display a summary notification
- Create a debug report note with full details

### Step 2: Check Console Logs
Open Developer Tools (`Ctrl+Shift+I` / `Cmd+Opt+I`) and look for logs starting with:
- `🚀 [Plan My Day]` - Command execution logs
- `🔄 [Plan My Day]` - API communication logs
- `❌ [Plan My Day]` - Error logs
- `🔍 [Plan My Day Debug]` - Debug command logs

### Step 3: Common Issues & Solutions

#### ❌ "API client not initialized"
**Cause**: VaultPilot not connected to EvoAgentX
**Solution**: 
- Check VaultPilot settings
- Verify backend URL is correct
- Test connection using the settings panel
- Restart the plugin

#### ❌ "does not have planTasks method"
**Cause**: API client is outdated or EvoAgentX doesn't support task planning
**Solution**:
- Update VaultPilot plugin
- Check EvoAgentX server has `/api/obsidian/planning/tasks` endpoint
- Verify EvoAgentX version compatibility

#### ❌ "Unable to connect to EvoAgentX server"
**Cause**: Network or server issues
**Solution**:
- Check if EvoAgentX server is running
- Verify backend URL in settings
- Check firewall/network settings
- Try other VaultPilot features to test connection

#### ❌ "EvoAgentX task planning failed"
**Cause**: Server error or endpoint not implemented
**Solution**:
- Check EvoAgentX server logs
- Verify `/api/obsidian/planning/tasks` endpoint exists
- Test endpoint manually with curl/Postman
- Check server implementation

#### ❌ "Invalid response format"
**Cause**: EvoAgentX returned unexpected data structure
**Solution**:
- Check server logs for the exact response
- Verify API contract matches expected format
- Update EvoAgentX implementation if needed

## 📋 Expected API Response Format

The EvoAgentX server should return this format for task planning:

```json
{
  "success": true,
  "data": {
    "plan": {
      "title": "Daily Schedule",
      "description": "AI-generated schedule",
      "tasks": [
        {
          "title": "Task Name",
          "description": "Task description",
          "priority": "high|medium|low",
          "estimated_time": "1 hour"
        }
      ],
      "estimated_duration": "8 hours"
    },
    "timeline": "1 day",
    "milestones": []
  }
}
```

## 🔧 Manual Testing

You can test the EvoAgentX endpoint manually:

```bash
curl -X POST http://your-evoagentx-server/api/obsidian/planning/tasks \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "goal": "Create a daily schedule based on this note content",
    "context": "Test note with tasks and goals",
    "timeframe": "1 day"
  }'
```

## 📊 Log Output Examples

### Successful Execution
```
🚀 [Plan My Day] Command started
📁 [Plan My Day] Active file: {name: "Daily Note.md", path: "Daily Note.md", extension: "md"}
📝 [Plan My Day] File content read: {length: 156, hasContent: true, firstLine: "# Daily Note", lineCount: 8}
🔗 [Plan My Day] API client status: {exists: true, type: "object", isConnected: "available"}
📤 [Plan My Day] Sending request to EvoAgentX...
📥 [Plan My Day] Received response: {success: true, hasData: true, error: undefined}
📋 [Plan My Day] Response data structure: {hasPlan: true, planKeys: ["title", "tasks"], hasTasks: true, taskCount: 3}
✅ [Plan My Day] Schedule generated successfully: {markdownLength: 145, taskCount: 3, headline: "✨ Smart schedule created with 3 tasks!"}
💾 [Plan My Day] File updated successfully
🎉 [Plan My Day] Success: ✨ Smart schedule created with 3 tasks! ✅
```

### Error Execution
```
🚀 [Plan My Day] Command started
📁 [Plan My Day] Active file: {name: "Daily Note.md", path: "Daily Note.md", extension: "md"}
🔗 [Plan My Day] API client status: {exists: true, type: "object", isConnected: "available"}
📤 [Plan My Day] Sending request to EvoAgentX...
❌ [Plan My Day] API Error: Failed to fetch
❌ [Plan My Day] Fetch error: Error: Schedule fetch failed: Failed to fetch
🔍 [Plan My Day] Error details: {message: "Schedule fetch failed: Failed to fetch", stack: "Error: Schedule fetch failed...", type: "object", name: "Error"}
❌ [Plan My Day] Network error
```

## 🎯 Quick Troubleshooting Checklist

- [ ] EvoAgentX server is running
- [ ] VaultPilot shows "🟢 Connected" status
- [ ] Backend URL is correct in settings
- [ ] API key is set and valid
- [ ] Active note is open in Obsidian
- [ ] `/api/obsidian/planning/tasks` endpoint exists on server
- [ ] Network connection is working
- [ ] Check console for detailed error logs
- [ ] Run debug command for comprehensive analysis

## 🆘 Getting Help

If issues persist:

1. **Run the debug command** and save the report
2. **Check console logs** for detailed error information
3. **Test EvoAgentX connection** with other VaultPilot features
4. **Verify server implementation** of task planning endpoint
5. **Share debug report** when asking for help

The enhanced debugging should help identify exactly where the issue is occurring! 🚀
