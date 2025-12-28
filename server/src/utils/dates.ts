/**
 * Format a date as YYYY-MM-DD for Garmin API
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get an array of dates for the last N days (including today)
 */
export function getDateRange(days: number): { start: string; end: string; dates: string[] } {
  const dates: string[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - days + 1);

  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(formatDate(date));
  }

  return {
    start: formatDate(start),
    end: formatDate(today),
    dates,
  };
}

/**
 * Convert seconds to human-readable duration
 */
export function secondsToHoursMinutes(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
