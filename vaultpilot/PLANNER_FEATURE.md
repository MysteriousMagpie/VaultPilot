# Plan My Day Feature

This feature adds a "Plan My Day" command to the VaultPilot Obsidian plugin that integrates with a backend planner API.

## What it does:

1. **Command Registration**: Adds a "Plan My Day" command to the command palette
2. **Active File Reading**: Reads the entire content of the currently active note
3. **EvoAgentX Integration**: Sends the note content to EvoAgentX's task planning API
4. **Schedule Section Management**: Finds existing `## Schedule` sections or creates new ones
5. **Content Replacement**: Replaces or appends the schedule content with AI-generated response
6. **User Feedback**: Shows success/error notifications with AI insights

## Files Created/Modified:

### New Files:
- `src/planner.ts` - Core planner functionality and EvoAgentX integration
- `__tests__/planner.test.ts` - Comprehensive Jest tests for regex and injection logic
- `jest.config.js` - Jest configuration for testing
- `__mocks__/obsidian.js` - Mock Obsidian API for testing

### Modified Files:
- `src/main.ts` - Added command registration and planMyDay method
- `src/types.ts` - Added PlannerResponse and PlannerRequest interfaces  
- `package.json` - Added Jest dependencies and test scripts
- `tsconfig.json` - Added Jest types and test directory inclusion

## Core Functions:

### `fetchSchedule(noteText: string, apiClient: EvoAgentXClient): Promise<PlannerResponse>`
- Makes request to EvoAgentX task planning API
- Converts task planning response to schedule markdown format
- Returns schedule markdown and AI-generated headline

### `findScheduleSection(text: string): RegExpMatchArray | null`
- Uses regex to locate existing Schedule sections
- Handles variations like "## Schedule", "## My Schedule", etc.
- Avoids false matches like "## Reschedule"

### `injectSchedule(originalText: string, scheduleMarkdown: string): string`
- Replaces existing schedule content or appends new section
- Preserves heading format including HTML comments
- Returns updated note text

### `validateScheduleMarkdown(scheduleMarkdown: string): boolean`
- Basic validation of schedule content
- Ensures non-empty content

## API Contract:

**Request to EvoAgentX `/api/obsidian/planning/tasks`:**
```json
{
  "goal": "Create a daily schedule based on this note content",
  "context": "full note text content",
  "timeframe": "1 day"
}
```

**Expected Response:**
```json
{
  "plan": {
    "title": "Daily Schedule",
    "tasks": [
      {
        "title": "Task Name",
        "description": "Task description (Scheduled: 09:00-10:00)",
        "priority": "high",
        "estimated_time": "1 hour"
      }
    ],
    "estimated_duration": "8 hours"
  },
  "timeline": "1 day"
}
```

## Error Handling:

- No active file: Shows "No active note—open today's daily note first."
- EvoAgentX errors: Shows "Planning error: [specific error message from EvoAgentX]"
- Invalid response: Shows "Planning error: Invalid response format from EvoAgentX"
- Network issues: Shows "Planning error: Unable to connect to EvoAgentX server"

## Testing:

- 19 Jest tests covering regex patterns, edge cases, and content injection
- Tests run with `npm test`
- Comprehensive coverage of schedule section detection and replacement logic

## Usage:

1. Open a daily note in Obsidian
2. Run "Plan My Day" from command palette (Ctrl/Cmd + P)
3. Plugin sends note content to API and updates schedule section
4. Success notification shows when complete

## Regex Pattern:

The schedule detection uses a two-stage regex approach:
1. First tries to match exact "## Schedule" headings
2. Falls back to headings containing "Schedule" as a word boundary
3. Captures heading and content separately for precise replacement
