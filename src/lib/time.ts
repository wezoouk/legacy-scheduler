export const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE ?? "Europe/London";

export function formatDateTime(date: Date, timezone: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}