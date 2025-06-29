// Quick debug script
import { findScheduleSection, injectSchedule } from './src/planner';

const text = `## Schedule
  Indented content
    More indented

## Next`;

console.log('Original text:', JSON.stringify(text));

const match = findScheduleSection(text);
console.log('Match result:', match);

const result = injectSchedule(text, 'New content');
console.log('Inject result:', JSON.stringify(result));
