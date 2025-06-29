import { request } from 'obsidian';

// Type definitions for the planner feature
export interface PlannerResponse {
  scheduleMarkdown: string;
  headline: string;
}

export interface PlannerRequest {
  note: string;
}

/**
 * Fetches schedule data from the planner API
 * @param noteText - The full text of the active note
 * @returns Promise with the schedule markdown and headline
 */
export async function fetchSchedule(noteText: string): Promise<PlannerResponse> {
  const response = await request({
    url: 'http://localhost:3000/planday',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: noteText })
  });

  return JSON.parse(response);
}

/**
 * Finds and extracts the Schedule section from note text
 * @param text - The full note text
 * @returns Match result with schedule section details or null
 */
export function findScheduleSection(text: string): RegExpMatchArray | null {
  // First try to match headings that are exactly "## Schedule" (with optional content after)
  let scheduleRegex = /(^##\s+Schedule\b[^\n]*\n)([\s\S]*?)(?=\n##\s|$)/im;
  let match = text.match(scheduleRegex);
  
  if (match) {
    return match;
  }
  
  // If no exact match, try to match headings that contain "Schedule" as a word
  scheduleRegex = /(^##\s*(?:.*\s)?\bSchedule\b(?:\s.*)?$\n)([\s\S]*?)(?=\n##\s|$)/im;
  return text.match(scheduleRegex);
}

/**
 * Injects or replaces the schedule section in the note text
 * @param originalText - The original note text
 * @param scheduleMarkdown - The new schedule content to inject
 * @returns Updated note text with the new schedule section
 */
export function injectSchedule(originalText: string, scheduleMarkdown: string): string {
  const match = findScheduleSection(originalText);
  
  if (match) {
    // Replace existing schedule section (keep heading, replace content)
    const [fullMatch, heading] = match;
    const replacement = heading + scheduleMarkdown;
    return originalText.replace(fullMatch, replacement);
  } else {
    // Append new schedule section
    const newSection = `\n\n## Schedule\n${scheduleMarkdown}`;
    return originalText + newSection;
  }
}

/**
 * Validates if the schedule markdown is properly formatted
 * @param scheduleMarkdown - The schedule content to validate
 * @returns True if valid, false otherwise
 */
export function validateScheduleMarkdown(scheduleMarkdown: string): boolean {
  // Basic validation - check if it's not empty and contains some content
  return scheduleMarkdown.trim().length > 0;
}
