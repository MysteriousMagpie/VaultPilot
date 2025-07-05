// Type definitions for the planner feature
export interface PlannerResponse {
  scheduleMarkdown: string;
  headline: string;
}

export interface PlannerRequest {
  note: string;
}

/**
 * Fetches schedule data from the EvoAgentX API
 * @param noteText - The full text of the active note
 * @param apiClient - The EvoAgentX API client instance
 * @returns Promise with the schedule markdown and headline
 */
export async function fetchSchedule(noteText: string, apiClient: any): Promise<PlannerResponse> {
  console.log('🔄 [Plan My Day] Starting schedule fetch...');
  console.log('📝 [Plan My Day] Note text length:', noteText.length);
  console.log('🔗 [Plan My Day] API client type:', typeof apiClient);
  
  if (!apiClient) {
    const error = 'API client is null or undefined';
    console.error('❌ [Plan My Day] Error:', error);
    throw new Error(error);
  }

  if (!apiClient.planTasks) {
    const error = 'API client does not have planTasks method';
    console.error('❌ [Plan My Day] Error:', error);
    console.log('🔍 [Plan My Day] Available methods:', Object.getOwnPropertyNames(apiClient));
    throw new Error(error);
  }

  try {
    console.log('📤 [Plan My Day] Sending request to EvoAgentX...');
    
    // Use EvoAgentX task planning endpoint instead of local server
    const response = await apiClient.planTasks({
      goal: `Create a daily schedule based on this note content`,
      context: noteText,
      timeframe: '1 day'
    });

    console.log('📥 [Plan My Day] Received response:', {
      success: response.success,
      hasData: !!response.data,
      error: response.error
    });

    console.log('🔍 [Plan My Day] Raw response data:', JSON.stringify(response.data, null, 2));
    console.log('🔍 [Plan My Day] Response data type:', typeof response.data);
    console.log('🔍 [Plan My Day] Response data keys:', response.data ? Object.keys(response.data) : 'no data');

    if (!response.success) {
      const error = response.error || 'Failed to generate schedule';
      console.error('❌ [Plan My Day] API Error:', error);
      throw new Error(error);
    }

    if (!response.data) {
      const error = 'No data in API response';
      console.error('❌ [Plan My Day] Error:', error);
      console.log('🔍 [Plan My Day] Full response:', response);
      throw new Error(error);
    }

    // The EvoAgentX API returns a nested structure: response.data.data.plan
    const actualData = response.data.data || response.data;
    
    console.log('📋 [Plan My Day] Response data structure:', {
      hasPlan: !!actualData.plan,
      planKeys: actualData.plan ? Object.keys(actualData.plan) : null,
      hasTasks: actualData.plan?.tasks ? true : false,
      taskCount: actualData.plan?.tasks?.length || 0
    });

    // Check if plan exists in response
    if (!actualData.plan) {
      const error = 'No plan data in API response';
      console.error('❌ [Plan My Day] Error:', error);
      console.log('🔍 [Plan My Day] Full response data:', response.data);
      console.log('🔍 [Plan My Day] Actual data:', actualData);
      throw new Error(error);
    }

    // Convert EvoAgentX task planning response to schedule format
    const taskPlan = actualData.plan;
    const tasks = taskPlan.tasks || [];
    
    console.log('📝 [Plan My Day] Processing tasks:', tasks.length);
    
    if (tasks.length === 0) {
      console.warn('⚠️ [Plan My Day] No tasks in response, creating fallback schedule');
      return {
        scheduleMarkdown: '| Time | Task |\n|------|------|\n| 9:00 AM | Plan your day |\n| 10:00 AM | Start working |\n| 12:00 PM | Lunch break |',
        headline: '📅 Basic schedule created (no tasks found in note)'
      };
    }
    
    // Generate schedule markdown from tasks
    let scheduleMarkdown = '| Time | Task |\n|------|------|\n';
    
    // Extract scheduled times from task descriptions or generate them
    tasks.forEach((task: any, index: number) => {
      console.log(`📋 [Plan My Day] Processing task ${index + 1}:`, {
        title: task.title,
        description: task.description?.substring(0, 100),
        priority: task.priority,
        estimatedTime: task.estimated_time
      });
      
      const timeMatch = task.description?.match(/(\d{1,2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : `${9 + Math.floor(index * 1.5)}:${(index * 30) % 60 || '00'}`;
      scheduleMarkdown += `| ${time} | ${task.title} |\n`;
    });

    const result = {
      scheduleMarkdown,
      headline: `✨ Smart schedule created with ${tasks.length} tasks!`
    };

    console.log('✅ [Plan My Day] Schedule generated successfully:', {
      markdownLength: scheduleMarkdown.length,
      taskCount: tasks.length,
      headline: result.headline
    });

    return result;

  } catch (error) {
    console.error('❌ [Plan My Day] Fetch error:', error);
    console.error('🔍 [Plan My Day] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Schedule fetch failed: ${error.message}`);
    } else {
      throw new Error(`Schedule fetch failed: ${String(error)}`);
    }
  }
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
  console.log('📝 [Plan My Day] Injecting schedule:', {
    originalLength: originalText.length,
    scheduleLength: scheduleMarkdown.length,
    hasOriginalContent: originalText.trim().length > 0
  });
  
  const match = findScheduleSection(originalText);
  
  if (match) {
    console.log('🔄 [Plan My Day] Replacing existing schedule section');
    console.log('📋 [Plan My Day] Found section:', {
      headingMatch: match[1]?.substring(0, 50),
      contentMatch: match[2]?.substring(0, 100)
    });
    
    // Replace existing schedule section (keep heading, replace content)
    const [fullMatch, heading] = match;
    const replacement = heading + scheduleMarkdown;
    const result = originalText.replace(fullMatch, replacement);
    
    console.log('✅ [Plan My Day] Schedule section replaced');
    return result;
  } else {
    console.log('➕ [Plan My Day] Appending new schedule section');
    
    // Append new schedule section
    const newSection = `\n\n## Schedule\n${scheduleMarkdown}`;
    const result = originalText + newSection;
    
    console.log('✅ [Plan My Day] New schedule section appended');
    return result;
  }
}

/**
 * Validates if the schedule markdown is properly formatted
 * @param scheduleMarkdown - The schedule content to validate
 * @returns True if valid, false otherwise
 */
export function validateScheduleMarkdown(scheduleMarkdown: string): boolean {
  console.log('🔍 [Plan My Day] Validating schedule markdown:', {
    length: scheduleMarkdown.length,
    trimmedLength: scheduleMarkdown.trim().length,
    isString: typeof scheduleMarkdown === 'string',
    preview: scheduleMarkdown.substring(0, 100)
  });
  
  // Basic validation - check if it's not empty and contains some content
  const isValid = scheduleMarkdown.trim().length > 0;
  
  console.log('✅ [Plan My Day] Validation result:', isValid);
  
  return isValid;
}
