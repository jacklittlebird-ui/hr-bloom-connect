/**
 * Cairo timezone date utilities.
 *
 * The system runs all attendance logic in Africa/Cairo. Egypt observes
 * Daylight Saving Time (DST), so the UTC offset alternates between
 * +02:00 (winter / EET) and +03:00 (summer / EEST). All helpers below rely
 * on the IANA `Africa/Cairo` zone via `Intl`, which automatically applies
 * the correct DST rules — never hardcode a fixed offset.
 *
 * These helpers always return the date as it is in Cairo, regardless of where
 * the device clock or browser timezone is set.
 */

const CAIRO_TZ = 'Africa/Cairo';

/**
 * Returns the current Cairo UTC offset as a signed string like `+02:00` or `+03:00`.
 * Automatically reflects DST transitions (summer/winter time) without code changes.
 */
export function getCairoOffsetString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAIRO_TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+02:00';
  // Format is like "GMT+02:00" or "GMT+3" — normalize to "+HH:MM"
  const match = tz.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return '+02:00';
  const sign = match[1];
  const hours = match[2].padStart(2, '0');
  const minutes = (match[3] ?? '00').padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

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
