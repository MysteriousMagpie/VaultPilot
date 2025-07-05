# VaultPilot - Plan My Day Feature

## Overview

The Plan My Day feature integrates your Obsidian daily notes with an AI-powered planning API to automatically generate and update your daily schedule.

## ✨ Features

- **Smart Schedule Generation**: Analyzes your note content and generates personalized daily schedules
- **Seamless Integration**: Works directly within your existing daily note workflow
- **Intelligent Section Management**: Automatically finds and updates existing schedule sections
- **Flexible API**: Easy to integrate with any backend planning service
- **Comprehensive Testing**: 19 Jest tests ensure reliable functionality

## 🚀 Quick Start

### 1. Set Up the EvoAgentX Backend

The feature uses your existing EvoAgentX server's task planning capabilities. Make sure:

1. **EvoAgentX Server is Running**: Your EvoAgentX backend should be running and accessible
2. **VaultPilot Connected**: Ensure VaultPilot is connected to EvoAgentX (check the 🟢 status in settings)
3. **Task Planning Endpoint**: The `/api/obsidian/planning/tasks` endpoint should be available

No additional setup required - it uses your existing EvoAgentX integration!

### 2. Use the Feature

1. Open a daily note in Obsidian
2. Press `Ctrl/Cmd + P` to open the command palette
3. Search for and select "Plan My Day"
4. Your schedule will be automatically generated and inserted!

## 📋 How It Works

### Command Execution
1. **Active File Check**: Verifies you have a note open
2. **Content Reading**: Reads your entire note content
3. **EvoAgentX Integration**: Sends note content to EvoAgentX's task planning API
4. **Schedule Injection**: Intelligently updates or creates a schedule section
5. **User Feedback**: Shows success notification with AI-generated insights

### Schedule Section Detection
The feature intelligently finds schedule sections using these patterns:
- `## Schedule`
- `## My Schedule`
- `## Daily Schedule`
- And more variations containing "Schedule"

### Content Management
- **Existing Section**: Replaces content while preserving the heading
- **No Section**: Appends a new "## Schedule" section
- **HTML Comments**: Preserves any HTML comments in headings (e.g., for automation IDs)

## 🔧 EvoAgentX Integration

### Request Format
The feature sends a TaskPlanningRequest to EvoAgentX:
```json
POST /api/obsidian/planning/tasks
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "goal": "Create a daily schedule based on this note content",
  "context": "full note text content including headings, tasks, etc.",
  "timeframe": "1 day"
}
```

### Response Format
EvoAgentX returns a TaskPlanningResponse:
```json
{
  "plan": {
    "title": "Daily Schedule",
    "description": "AI-generated schedule based on your note",
    "tasks": [
      {
        "title": "Morning Planning",
        "description": "Review goals and priorities (Scheduled: 09:00-09:30)",
        "priority": "high",
        "estimated_time": "30 minutes"
      }
    ],
    "estimated_duration": "8 hours"
  },
  "timeline": "1 day",
  "milestones": [...]
}
```

The feature converts this into a markdown table for your schedule section.

## 🛠️ Development

### Running Tests
```bash
npm test
```

### Building the Plugin
```bash
npm run build
```

### Development with Auto-reload
```bash
npm run dev
```

### Testing in Demo Vault
```bash
npm run copy:demo
```

## 📁 File Structure

```
src/
├── planner.ts              # Core planner functionality
├── main.ts                 # Command registration and integration
├── types.ts                # TypeScript interfaces
└── ...

__tests__/
└── planner.test.ts         # Comprehensive test suite

__mocks__/
└── obsidian.js            # Obsidian API mocks for testing

jest.config.js             # Jest configuration
```

## 🔍 Error Handling

The feature includes comprehensive error handling:

- **No Active File**: "No active note—open today's daily note first."
- **EvoAgentX Connection**: Shows specific EvoAgentX connection errors
- **Invalid Response**: "Invalid schedule data received from API"
- **Server Errors**: "Planning error: [specific error message from EvoAgentX]"

## 🧪 Testing

The feature includes 19 comprehensive Jest tests covering:

- ✅ Schedule section detection with various heading formats
- ✅ Content injection and replacement logic
- ✅ Edge cases and error conditions
- ✅ HTML comment preservation
- ✅ Multiple schedule section handling
- ✅ Case-insensitive matching
- ✅ Empty content validation

Run tests with: `npm test`

## 🔄 Integration Examples

### EvoAgentX Task Planning Integration
The feature now leverages EvoAgentX's sophisticated AI capabilities:

```typescript
// In planner.ts
export async function fetchSchedule(noteText: string, apiClient: EvoAgentXClient) {
  const response = await apiClient.planTasks({
    goal: 'Create a daily schedule based on this note content',
    context: noteText,
    timeframe: '1 day'
  });
  
  // Convert task plan to schedule format
  const scheduleMarkdown = convertTasksToSchedule(response.data.plan.tasks);
  return { scheduleMarkdown, headline: '✨ Smart schedule created!' };
}
```

### Advanced AI Features
With EvoAgentX integration, you get:
- **Context-aware planning**: AI understands your existing tasks and priorities
- **Calendar integration**: Considers your existing calendar events
- **Smart time allocation**: Optimizes task scheduling based on priority and duration
- **Personalized suggestions**: Learns from your patterns and preferences

## 🤝 Contributing

The feature is designed to be extensible and maintainable:

1. **Pure Functions**: Core logic is separated into testable pure functions
2. **Type Safety**: Full TypeScript support with proper interfaces
3. **Test Coverage**: Comprehensive test suite ensures reliability
4. **Error Handling**: Robust error handling for all edge cases

## 📄 License

Part of the VaultPilot project - see main LICENSE file.
