/**
 * Mission time helpers. All mission attendance windows are anchored to
 * Africa/Cairo local time, never to the device's UTC offset.
 */

export type MissionType = 'morning' | 'evening' | 'full_day';

export interface MissionWindow {
  /** Local Cairo start time, "HH:MM" */
  checkIn: string;
  /** Local Cairo end time, "HH:MM" */
  checkOut: string;
}

export const MISSION_WINDOWS: Record<MissionType, MissionWindow> = {
  morning: { checkIn: '09:00', checkOut: '13:00' },
  evening: { checkIn: '13:00', checkOut: '17:00' },
  full_day: { checkIn: '09:00', checkOut: '17:00' },
};

/**
 * Returns the Cairo-local "HH:MM" string for a given UTC ISO timestamp.
 * Honors Africa/Cairo DST automatically (UTC+2 winter, UTC+3 summer).
 */
export function toCairoHHMM(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  // en-GB gives 24h HH:MM
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hh = parts.find(p => p.type === 'hour')?.value ?? '00';
  const mm = parts.find(p => p.type === 'minute')?.value ?? '00';
  return `${hh}:${mm}`;
}

/**
 * Builds a UTC ISO string anchored to the given Cairo-local date + HH:MM,
 * accounting for DST. Equivalent to Postgres `timestamp AT TIME ZONE 'Africa/Cairo'`.
 */
export function cairoLocalToIso(dateYmd: string, hhmm: string): string {
  // Compute Cairo's UTC offset (in minutes) at this instant.
  // Strategy: form a naive UTC date at the requested wall-clock time,
  // then compare what Cairo reads back vs. what we asked for; adjust.
  const [y, m, d] = dateYmd.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  // First guess: treat as if UTC.
  const guessUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0);
  const guessDate = new Date(guessUtcMs);
  // What does Cairo show for this instant?
  const cairo = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(guessDate);
  const get = (t: string) => Number(cairo.find(p => p.type === t)?.value ?? 0);
  const cairoMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), 0);
  // offset = how many ms ahead Cairo is of UTC at this instant
  const offsetMs = cairoMs - guessUtcMs;
  // Real UTC ms = naive Cairo ms minus that offset.
  const realUtcMs = guessUtcMs - offsetMs;
  return new Date(realUtcMs).toISOString();
}

/**
 * Validates that a mission's Cairo-local check-in/out match the allowed window.
 * Returns null when valid, or a human-readable error key when not.
 */
export function validateMissionWindow(
  type: MissionType,
  checkInIso: string | null,
  checkOutIso: string | null
): { ok: true } | { ok: false; reason: string; expected: MissionWindow; actual: { checkIn: string | null; checkOut: string | null } } {
  const w = MISSION_WINDOWS[type];
  const ci = toCairoHHMM(checkInIso);
  const co = toCairoHHMM(checkOutIso);
  if (ci !== w.checkIn || co !== w.checkOut) {
    return {
      ok: false,
      reason: 'out_of_window',
      expected: w,
      actual: { checkIn: ci, checkOut: co },
    };
  }
  return { ok: true };
}
