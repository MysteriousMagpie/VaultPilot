# Plan My Day Feature

This feature adds a "Plan My Day" command to the VaultPilot Obsidian plugin that integrates with a backend planner API.

## What it does:

1. **Command Registration**: Adds a "Plan My Day" command to the command palette
2. **Active File Reading**: Reads the entire content of the currently active note
3. **API Integration**: Sends the note content to `http://localhost:3000/planday` via POST
4. **Schedule Section Management**: Finds existing `## Schedule` sections or creates new ones
5. **Content Replacement**: Replaces or appends the schedule content with API response
6. **User Feedback**: Shows success/error notifications with optional headline

## Files Created/Modified:

### New Files:
- `src/planner.ts` - Core planner functionality and API integration
- `__tests__/planner.test.ts` - Comprehensive Jest tests for regex and injection logic
- `jest.config.js` - Jest configuration for testing
- `__mocks__/obsidian.js` - Mock Obsidian API for testing

### Modified Files:
- `src/main.ts` - Added command registration and planMyDay method
- `src/types.ts` - Added PlannerResponse and PlannerRequest interfaces  
- `package.json` - Added Jest dependencies and test scripts
- `tsconfig.json` - Added Jest types and test directory inclusion

## Core Functions:

### `fetchSchedule(noteText: string): Promise<PlannerResponse>`
- Makes HTTP POST request to planner API
- Returns schedule markdown and optional headline

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

**Request to `http://localhost:3000/planday`:**
```json
{
  "note": "full note text content"
}
```

**Expected Response:**
```json
{
  "scheduleMarkdown": "| Time | Task |\n|------|------|\n| 9:00 | Meeting |",
  "headline": "Your day is planned!"
}
```

## Error Handling:

- No active file: Shows "No active note—open today's daily note first."
- API errors: Shows "Planner API error: [specific error message]"
- Invalid response: Shows "Invalid schedule data received from API"
- Network issues: Shows "Unable to connect to localhost:3000"

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
