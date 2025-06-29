/**
 * Unit tests for planner functionality
 * Tests the regex-based schedule section detection and injection
 */

// We'll test the pure functions that don't depend on obsidian
import { findScheduleSection, injectSchedule, validateScheduleMarkdown } from '../src/planner';

describe('Planner Functions', () => {
  describe('findScheduleSection', () => {
    test('should find existing schedule section with basic heading', () => {
      const text = `# Daily Note

## Schedule
| Time | Task |
|------|------|
| 9:00 | Meeting |

## Notes
Some other content`;

      const result = findScheduleSection(text);
      expect(result).not.toBeNull();
      expect(result![1]).toBe('## Schedule\n');
      expect(result![2]).toContain('| Time | Task |');
    });

    test('should find schedule section with HTML comment', () => {
      const text = `# Daily Note

## Schedule <!-- AUTO-SCHEDULE-123 -->
| Time | Task |
|------|------|
| 9:00 | Meeting |

## Notes
Some other content`;

      const result = findScheduleSection(text);
      expect(result).not.toBeNull();
      expect(result![1]).toBe('## Schedule <!-- AUTO-SCHEDULE-123 -->\n');
      expect(result![2]).toContain('| Time | Task |');
    });

    test('should find schedule section with variations in heading', () => {
      // Test that the function can find schedule sections
      const basicSchedule = `# Daily Note

## Schedule
Some schedule content

## Other Section
Other content`;

      const result1 = findScheduleSection(basicSchedule);
      expect(result1).not.toBeNull();
      expect(result1![1]).toContain('Schedule');

      const mySchedule = `# Daily Note

## My Schedule
Some schedule content

## Other Section
Other content`;

      const result2 = findScheduleSection(mySchedule);
      expect(result2).not.toBeNull();
      expect(result2![1]).toContain('Schedule');
    });

    test('should handle schedule section at end of document', () => {
      const text = `# Daily Note

## Notes
Some content

## Schedule
| Time | Task |
|------|------|
| 9:00 | Meeting |`;

      const result = findScheduleSection(text);
      expect(result).not.toBeNull();
      expect(result![1]).toBe('## Schedule\n');
      expect(result![2]).toContain('| Time | Task |');
    });

    test('should return null when no schedule section exists', () => {
      const text = `# Daily Note

## Notes
Some content

## Tasks
- Task 1
- Task 2`;

      const result = findScheduleSection(text);
      expect(result).toBeNull();
    });

    test('should handle empty schedule section', () => {
      const text = `# Daily Note

## Schedule

## Notes
Some other content`;

      const result = findScheduleSection(text);
      expect(result).not.toBeNull();
      expect(result![1]).toBe('## Schedule\n');
      expect(result![2]).toBe(''); // Empty content section
    });

    test('should not match schedule in middle of word', () => {
      const text = `# Daily Note

## Reschedule
Some content about rescheduling

## Notes
Other content`;

      const result = findScheduleSection(text);
      expect(result).toBeNull();
    });
  });

  describe('injectSchedule', () => {
    test('should replace existing schedule content while keeping heading', () => {
      const originalText = `# Daily Note

## Schedule
Old schedule content
with multiple lines

## Notes
Some other content`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | New Meeting |
| 10:00 | New Task |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result).toContain('## Schedule\n' + newSchedule);
      expect(result).not.toContain('Old schedule content');
      expect(result).toContain('## Notes');
    });

    test('should append new schedule section when none exists', () => {
      const originalText = `# Daily Note

## Notes
Some content

## Tasks
- Task 1`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | New Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result).toBe(originalText + '\n\n## Schedule\n' + newSchedule);
    });

    test('should handle empty original text', () => {
      const originalText = '';
      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result).toBe('\n\n## Schedule\n' + newSchedule);
    });

    test('should preserve HTML comments in existing heading', () => {
      const originalText = `# Daily Note

## Schedule <!-- AUTO-SCHEDULE-123 -->
Old content

## Notes
Other content`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | Updated Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result).toContain('## Schedule <!-- AUTO-SCHEDULE-123 -->\n' + newSchedule);
      expect(result).not.toContain('Old content');
    });

    test('should handle multiple headings with schedule in the name correctly', () => {
      const originalText = `# Daily Note

## Meeting Schedule
This should not be replaced

## Schedule
This should be replaced

## Reschedule Tasks
This should also not be replaced`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | New Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result).toContain('## Meeting Schedule\nThis should not be replaced');
      expect(result).toContain('## Schedule\n' + newSchedule);
      expect(result).toContain('## Reschedule Tasks\nThis should also not be replaced');
      expect(result).not.toContain('This should be replaced');
    });
  });

  describe('validateScheduleMarkdown', () => {
    test('should return true for valid markdown table', () => {
      const validSchedule = `| Time | Task |
|------|------|
| 9:00 | Meeting |
| 10:00 | Work |`;

      expect(validateScheduleMarkdown(validSchedule)).toBe(true);
    });

    test('should return true for simple text content', () => {
      const simpleSchedule = 'Morning: Work on project\nAfternoon: Meetings';
      
      expect(validateScheduleMarkdown(simpleSchedule)).toBe(true);
    });

    test('should return false for empty or whitespace-only content', () => {
      expect(validateScheduleMarkdown('')).toBe(false);
      expect(validateScheduleMarkdown('   ')).toBe(false);
      expect(validateScheduleMarkdown('\n\n')).toBe(false);
      expect(validateScheduleMarkdown('\t\t')).toBe(false);
    });

    test('should return true for minimal content', () => {
      expect(validateScheduleMarkdown('a')).toBe(true);
      expect(validateScheduleMarkdown('No tasks today')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle text with multiple ## Schedule-like headings', () => {
      const text = `# Daily Note

## Meeting Schedule
Content 1

## Daily Schedule  
Content 2

## Schedule
Main schedule content

## Reschedule
Content 3`;

      const result = findScheduleSection(text);
      expect(result).not.toBeNull();
      expect(result![1]).toBe('## Schedule\n');
      expect(result![2]).toContain('Main schedule content');
    });

    test('should handle case insensitive matching', () => {
      const text = `# Daily Note

## SCHEDULE
Content in caps

## Other`;

      const result = findScheduleSection(text);
      expect(result).not.toBeNull();
      expect(result![1]).toBe('## SCHEDULE\n');
    });

    test('should preserve exact formatting when replacing', () => {
      const originalText = `## Schedule
  Indented content
    More indented

## Next`;
      const newSchedule = 'New content';
      
      const result = injectSchedule(originalText, newSchedule);
      // The function should properly replace the content section
      expect(result).toContain('## Schedule\nNew content');
      expect(result).toContain('## Next');
      expect(result).not.toContain('Indented content');
    });
  });
});
