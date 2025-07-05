/**
 * Unit tests for planner functionality
 * Tests the regex-based schedule section detection and injection
 */

// We'll test the pure functions that don't depend on obsidian
import { findScheduleSection, findPlanSection, injectSchedule, validateScheduleMarkdown } from '../src/planner';

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

  describe('findPlanSection', () => {
    test('should find existing plan section with comment wrapper', () => {
      const text = `# Daily Note

<!-- vp:plan:start -->
| Time | Task |
|------|------|
| 9:00 | Meeting |
<!-- vp:plan:end -->

## Notes
Some other content`;

      const result = findPlanSection(text);
      expect(result).not.toBeNull();
      expect(result![1]).toBe('<!-- vp:plan:start -->');
      expect(result![2]).toContain('| Time | Task |');
      expect(result![3]).toBe('<!-- vp:plan:end -->');
    });

    test('should find plan section with extra content and spacing', () => {
      const text = `# Daily Note

Some intro text

<!-- vp:plan:start -->

## Today's Schedule
| Time | Task |
|------|------|
| 9:00 AM | Morning standup |
| 10:00 AM | Code review |

<!-- vp:plan:end -->

## Notes
Other content`;

      const result = findPlanSection(text);
      expect(result).not.toBeNull();
      expect(result![1]).toBe('<!-- vp:plan:start -->');
      expect(result![2]).toContain('## Today\'s Schedule');
      expect(result![2]).toContain('| 9:00 AM | Morning standup |');
      expect(result![3]).toBe('<!-- vp:plan:end -->');
    });

    test('should handle case insensitive comment wrapper', () => {
      const text = `# Daily Note

<!-- VP:PLAN:START -->
Content here
<!-- VP:PLAN:END -->`;

      const result = findPlanSection(text);
      expect(result).not.toBeNull();
      expect(result![1]).toBe('<!-- VP:PLAN:START -->');
      expect(result![2]).toContain('Content here');
      expect(result![3]).toBe('<!-- VP:PLAN:END -->');
    });

    test('should return null when no plan section exists', () => {
      const text = `# Daily Note

## Schedule
| Time | Task |
|------|------|
| 9:00 | Meeting |

## Notes
Some content`;

      const result = findPlanSection(text);
      expect(result).toBeNull();
    });

    test('should return null with partial comment wrapper', () => {
      const text = `# Daily Note

<!-- vp:plan:start -->
Content here
(missing end comment)`;

      const result = findPlanSection(text);
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

    test('should create new plan wrapper at top when no existing sections (original behavior)', () => {
      const originalText = `# Daily Note

## Notes
Some content

## Tasks
- Task 1`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | New Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result.startsWith('<!-- vp:plan:start -->')).toBe(true);
      expect(result).toContain('| 9:00 | New Meeting |');
      expect(result).toContain('<!-- vp:plan:end -->');
      expect(result).toContain('# Daily Note');
    });

    test('should handle empty original text with plan wrapper', () => {
      const originalText = '';
      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result.startsWith('<!-- vp:plan:start -->')).toBe(true);
      expect(result).toContain('| 9:00 | Meeting |');
      expect(result).toContain('<!-- vp:plan:end -->');
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

    // Tests for plan wrapper functionality
    test('should replace content within existing plan wrapper', () => {
      const originalText = `# Daily Note

<!-- vp:plan:start -->
| Time | Task |
|------|------|
| 9:00 | Old Meeting |
<!-- vp:plan:end -->

## Notes
Some content`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | New Meeting |
| 10:00 | Code review |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result).toContain('<!-- vp:plan:start -->');
      expect(result).toContain('| 9:00 | New Meeting |');
      expect(result).toContain('| 10:00 | Code review |');
      expect(result).toContain('<!-- vp:plan:end -->');
      expect(result).not.toContain('Old Meeting');
      expect(result).toContain('## Notes');
    });

    test('should prioritize plan wrapper over schedule section', () => {
      const originalText = `# Daily Note

<!-- vp:plan:start -->
Old plan content
<!-- vp:plan:end -->

## Schedule
Old schedule content

## Notes
Some content`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | New Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      // Should replace in plan wrapper, not schedule section
      expect(result).toContain('<!-- vp:plan:start -->');
      expect(result).toContain('| 9:00 | New Meeting |');
      expect(result).toContain('<!-- vp:plan:end -->');
      expect(result).toContain('## Schedule\nOld schedule content'); // Schedule section unchanged
      expect(result).not.toContain('Old plan content');
    });

    test('should create new plan wrapper at top when no existing sections', () => {
      const originalText = `# Daily Note

## Notes
Some content

## Tasks
- Task 1
- Task 2`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result.startsWith('<!-- vp:plan:start -->')).toBe(true);
      expect(result).toContain('| 9:00 | Meeting |');
      expect(result).toContain('<!-- vp:plan:end -->');
      expect(result).toContain('# Daily Note');
      expect(result).toContain('## Notes');
    });

    test('should fallback to schedule section when no plan wrapper exists', () => {
      const originalText = `# Daily Note

## Schedule
Old schedule

## Notes
Some content`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | New Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result).toContain('## Schedule\n' + newSchedule);
      expect(result).not.toContain('Old schedule');
      expect(result).not.toContain('<!-- vp:plan:start -->');
    });

    test('should handle empty plan wrapper', () => {
      const originalText = `# Daily Note

<!-- vp:plan:start -->
<!-- vp:plan:end -->

## Notes
Some content`;

      const newSchedule = `| Time | Task |
|------|------|
| 9:00 | Meeting |`;

      const result = injectSchedule(originalText, newSchedule);
      
      expect(result).toContain('<!-- vp:plan:start -->');
      expect(result).toContain('| 9:00 | Meeting |');
      expect(result).toContain('<!-- vp:plan:end -->');
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
