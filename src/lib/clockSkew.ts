/**
 * Clock skew detection & correction.
 *
 * Some users have devices with incorrectly set clocks (manual time, dead battery,
 * stale timezone). This breaks Supabase Auth because the JS client validates JWT
 * `iat` / `exp` claims against `Date.now()` and refuses sessions whose timestamps
 * look "in the future" or "expired" relative to the wrong device clock.
 *
 * Strategy:
 *  1. Probe a trusted server (Supabase REST endpoint) and read its `Date` header.
 *  2. Compute the offset between server time and local time.
 *  3. If the offset exceeds a safety threshold (>60s), patch `Date.now` and
 *     `Date` constructor (no-args) globally so all downstream code — including
 *     Supabase Auth's JWT validation — sees the corrected time.
 *  4. Persist the offset for fast re-application on next page load.
 *
 * This is safe because: (a) we only correct, never spoof; (b) the offset is
 * derived from a trusted HTTPS source; (c) we keep the original Date available
 * for callers that explicitly pass arguments (only `new Date()` and `Date.now()`
 * are corrected — formatting and parsing remain untouched).
 */

const STORAGE_KEY = 'lovable.clockOffsetMs';
const THRESHOLD_MS = 60 * 1000; // 60 seconds — anything below is irrelevant
let applied = false;
let currentOffsetMs = 0;

function readStoredOffset(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeStoredOffset(ms: number) {
  try {
    if (Math.abs(ms) < THRESHOLD_MS) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(ms));
    }
  } catch {
    /* ignore */
  }
}

function applyOffset(offsetMs: number) {
  currentOffsetMs = offsetMs;

  if (applied) return; // patch only once; subsequent updates just change the offset value

  const OriginalDate = window.Date;
  const originalNow = OriginalDate.now.bind(OriginalDate);

  // Patch Date.now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (OriginalDate as any).now = () => originalNow() + currentOffsetMs;

  // Patch `new Date()` (no-args constructor only — preserve all other behaviours)
  const PatchedDate = function (this: unknown, ...args: unknown[]) {
    if (args.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (OriginalDate as any)(originalNow() + currentOffsetMs);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (OriginalDate as any)(...args);
  } as unknown as DateConstructor;

  // Preserve prototype chain & static methods
  PatchedDate.prototype = OriginalDate.prototype;
  PatchedDate.parse = OriginalDate.parse.bind(OriginalDate);
  PatchedDate.UTC = OriginalDate.UTC.bind(OriginalDate);
  PatchedDate.now = (OriginalDate as unknown as { now: () => number }).now;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Date = PatchedDate;
  applied = true;
}

/**
 * Apply a previously-detected offset immediately (synchronously) on app boot.
 * Call this as early as possible — before the Supabase client touches any tokens.
 */
export function applyStoredClockOffset(): number {
  const stored = readStoredOffset();
  if (Math.abs(stored) >= THRESHOLD_MS) {
    applyOffset(stored);
  }
  return stored;
}

/**
 * Probe the server time and update the offset asynchronously.
 * Safe to call multiple times — refreshes the stored value.
 */
export async function detectAndCorrectClockSkew(): Promise<number> {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!url) return currentOffsetMs;

    // HEAD request to a fast endpoint; we only care about the `Date` response header.
    const response = await fetch(`${url}/auth/v1/health`, {
      method: 'HEAD',
      cache: 'no-store',
    }).catch(() => null);

    if (!response) return currentOffsetMs;

    const serverDateHeader = response.headers.get('date');
    if (!serverDateHeader) return currentOffsetMs;

    const serverMs = new Date(serverDateHeader).getTime();
    if (!Number.isFinite(serverMs)) return currentOffsetMs;

    // Use the ORIGINAL local time (without our patch) to compute true skew.
    const localMs = applied ? Date.now() - currentOffsetMs : Date.now();
    const offsetMs = serverMs - localMs;

    if (Math.abs(offsetMs) >= THRESHOLD_MS) {
      applyOffset(offsetMs);
      writeStoredOffset(offsetMs);
      console.warn(
        `[clockSkew] Device clock off by ${Math.round(offsetMs / 1000)}s — corrected automatically.`,
      );
    } else if (applied) {
      // Skew is now negligible — clear stored value (but keep patch active to avoid jank)
      currentOffsetMs = offsetMs;
      writeStoredOffset(0);
    }

    return offsetMs;
  } catch {
    return currentOffsetMs;
  }
}

export function getCurrentClockOffsetMs(): number {
  return currentOffsetMs;
}
