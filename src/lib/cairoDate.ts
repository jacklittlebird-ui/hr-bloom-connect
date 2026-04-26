/**
 * Cairo timezone date utilities.
 *
 * The system runs all attendance logic in Africa/Cairo (UTC+2, no DST).
 * Using `new Date().toISOString().split('T')[0]` gives the UTC date, which is
 * wrong for users in Cairo between 22:00 and 23:59 local time (that's already
 * the next UTC day) — and during early-morning hours after midnight UTC.
 *
 * These helpers always return the date as it is in Cairo, regardless of where
 * the device clock or browser timezone is set.
 */

const CAIRO_TZ = 'Africa/Cairo';

/**
 * Returns today's date in Cairo as `YYYY-MM-DD`.
 * Stable regardless of the user's device timezone.
 */
export function getCairoDateString(date: Date = new Date()): string {
  // en-CA locale formats as YYYY-MM-DD natively when using Intl.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns the current hour (0-23) in Cairo.
 */
export function getCairoHour(date: Date = new Date()): number {
  return parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: CAIRO_TZ,
      hour: '2-digit',
      hour12: false,
    }).format(date),
    10,
  );
}

/**
 * Returns the local Cairo wall-clock parts for a given Date instance.
 */
export function getCairoParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dateStr: string;
  timeStr: string;
} {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAIRO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parseInt(fmt.find((p) => p.type === type)?.value ?? '0', 10);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  // Some browsers return "24" for midnight in en-GB hourCycle h23; normalize to 0.
  let hour = get('hour');
  if (hour === 24) hour = 0;
  const minute = get('minute');
  const second = get('second');

  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr: `${year}-${pad(month)}-${pad(day)}`,
    timeStr: `${pad(hour)}:${pad(minute)}`,
  };
}
