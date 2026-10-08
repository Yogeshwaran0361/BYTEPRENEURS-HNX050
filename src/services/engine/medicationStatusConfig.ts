/**
 * Medication Engine Configuration and Time Utilities
 * Centralized business thresholds according to Prompt 5 specifications.
 */

export interface MedicationEngineConfig {
  /** Minutes after scheduled time before DUE transitions to DELAYED */
  dueGracePeriodMinutes: number;
  /** Minutes after scheduled time before DELAYED transitions to MISSED */
  missedThresholdMinutes: number;
  /** Default snooze/postpone reminder duration in minutes if not specified */
  defaultReminderMinutes: number;
}

export const DEFAULT_ENGINE_CONFIG: MedicationEngineConfig = {
  dueGracePeriodMinutes: 15, // 15 minutes grace period before reminder transitions to DELAYED
  missedThresholdMinutes: 120, // 2 hours after scheduled time without confirmation -> MISSED
  defaultReminderMinutes: 15,
};

/**
 * Parses diverse time string formats (e.g. "09:00", "09:00 AM", "9:00 pm", "20:30")
 * into normalized 24-hour hour and minute numbers.
 */
export function parseTimeString(timeStr: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 9, minute: 0 };
  const clean = timeStr.trim();

  // Match 12-hour format e.g. "09:00 AM", "8:30 pm"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const meridian = match12[3]?.toUpperCase();

    if (meridian === 'PM' && hour < 12) hour += 12;
    if (meridian === 'AM' && hour === 12) hour = 0;
    return { hour, minute };
  }

  // Fallback 24-hour match
  const parts = clean.split(':');
  const hour = parseInt(parts[0], 10) || 0;
  const minute = parseInt(parts[1], 10) || 0;
  return { hour, minute };
}

/**
 * Formats a Date object or hour/minute into a senior-friendly 12-hour time string (e.g. "09:00 AM")
 */
export function formatTime12h(dateOrHour: Date | number, maybeMinute?: number): string {
  let date: Date;
  if (dateOrHour instanceof Date) {
    date = dateOrHour;
  } else {
    date = new Date();
    date.setHours(dateOrHour, maybeMinute || 0, 0, 0);
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a Date into standard YYYY-MM-DD local calendar date string
 */
export function formatLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Determines TimeOfDay bucket ('morning' | 'afternoon' | 'evening' | 'night')
 */
export function getTimeOfDayCategory(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Deterministic event key for a schedule occurrence on a specific day
 * Used for idempotency and duplicate event prevention.
 */
export function buildDeterministicEventKey(scheduleId: string, scheduledIso: string): string {
  const dtKey = scheduledIso.slice(0, 16);
  return `${scheduleId}_${dtKey}`;
}
