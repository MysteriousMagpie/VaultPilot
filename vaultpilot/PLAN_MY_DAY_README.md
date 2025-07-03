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

### 1. Set Up the Backend API

The feature requires a backend service running on `http://localhost:3000/planday`. For testing, you can use the included test server:

```bash
cd vaultpilot
node test-server.js
```

### 2. Use the Feature

1. Open a daily note in Obsidian
2. Press `Ctrl/Cmd + P` to open the command palette
3. Search for and select "Plan My Day"
4. Your schedule will be automatically generated and inserted!

## 📋 How It Works

### Command Execution
1. **Active File Check**: Verifies you have a note open
2. **Content Reading**: Reads your entire note content
3. **API Request**: Sends note content to the planning API
4. **Schedule Injection**: Intelligently updates or creates a schedule section
5. **User Feedback**: Shows success notification with optional custom message

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

## 🔧 API Contract

### Request Format
```json
POST http://localhost:3000/planday
Content-Type: application/json

{
  "note": "full note text content including headings, tasks, etc."
}
```

### Response Format
```json
{
  "scheduleMarkdown": "| Time | Task |\n|------|------|\n| 9:00 | Meeting |",
  "headline": "Your day is planned!"
}
```

- `scheduleMarkdown`: The schedule content in Markdown format (tables, lists, etc.)
- `headline`: Optional custom success message shown to the user

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
test-server.js             # Example API server for testing
```

## 🔍 Error Handling

The feature includes comprehensive error handling:

- **No Active File**: "No active note—open today's daily note first."
- **API Connection**: "Unable to connect to localhost:3000"
- **Invalid Response**: "Invalid schedule data received from API"
- **Server Errors**: "Planner API error: [specific error message]"

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

### Simple Planning API
```javascript
app.post('/planday', (req, res) => {
  const { note } = req.body;
  
  // Analyze note content
  const schedule = generateSchedule(note);
  
  res.json({
    scheduleMarkdown: schedule,
    headline: "Your day is optimized!"
  });
});
```

### AI-Powered Planning
```javascript
app.post('/planday', async (req, res) => {
  const { note } = req.body;
  
  // Send to AI service
  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{
      role: "user",
      content: `Analyze this daily note and create a schedule: ${note}`
    }]
  });
  
  res.json({
    scheduleMarkdown: aiResponse.choices[0].message.content,
    headline: "AI-powered schedule ready!"
  });
});
```

## 🤝 Contributing

The feature is designed to be extensible and maintainable:

1. **Pure Functions**: Core logic is separated into testable pure functions
2. **Type Safety**: Full TypeScript support with proper interfaces
3. **Test Coverage**: Comprehensive test suite ensures reliability
4. **Error Handling**: Robust error handling for all edge cases

## 📄 License

Part of the VaultPilot project - see main LICENSE file.
