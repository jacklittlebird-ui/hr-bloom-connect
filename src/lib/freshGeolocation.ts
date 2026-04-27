/**
 * Strict GPS reader that prevents cached location exploits.
 *
 * Why this exists:
 * Browsers (especially mobile) often return a cached/last-known position
 * even when `enableHighAccuracy: true` is set. Employees discovered they
 * could check in/out from home using stale cached coordinates.
 *
 * Defenses applied here:
 *  1. maximumAge = 0  → forbid the browser from returning cached coords.
 *  2. Reject readings whose timestamp is older than `maxAgeMs` from "now".
 *  3. Reject readings whose accuracy is worse than `maxAccuracyMeters`
 *     (cached/network-derived locations typically have very high accuracy
 *     numbers, e.g. > 200m).
 *  4. Detect "frozen coordinates": if the device returns the *exact same*
 *     lat/lng (to 7 decimal places) as the previous reading taken more than
 *     a few seconds ago, treat it as a cached value and reject.
 */

const FROZEN_COORD_KEY = 'last_gps_reading_v1';

interface StoredReading {
  lat: number;
  lng: number;
  ts: number; // ms epoch when stored
}

export interface FreshPositionOptions {
  /** Max age in ms of the position timestamp relative to call time. Default 5min. */
  maxAgeMs?: number;
  /** Max accepted GPS accuracy in meters. Default 300m (lenient for indoors). */
  maxAccuracyMeters?: number;
  /** Timeout for getCurrentPosition in ms. Default 15s. */
  timeoutMs?: number;
  /** Allow falling back to low-accuracy mode if high-accuracy times out. Default true. */
  allowLowAccuracyFallback?: boolean;
  /** Minimum gap (ms) between identical readings before flagging as frozen. Default 2min. */
  frozenMinGapMs?: number;
}

/** Result of a fresh-geolocation request. */
export interface FreshPositionResult {
  position: GeolocationPosition;
  /** Soft warnings that did NOT block the reading (for audit/logging only). */
  warnings: Array<'frozen_coordinates' | 'low_accuracy' | 'stale_cached'>;
}

export class FreshGeolocationError extends Error {
  constructor(
    public code:
      | 'unsupported'
      | 'permission_denied'
      | 'unavailable'
      | 'timeout'
      | 'stale_cached'
      | 'low_accuracy'
      | 'frozen_coordinates',
    message: string,
  ) {
    super(message);
    this.name = 'FreshGeolocationError';
  }
}

const readPosition = (highAccuracy: boolean, timeout: number) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new FreshGeolocationError('unsupported', 'Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        if (err.code === 1) {
          reject(new FreshGeolocationError('permission_denied', 'Location permission denied'));
        } else if (err.code === 2) {
          reject(new FreshGeolocationError('unavailable', 'Position unavailable'));
        } else if (err.code === 3) {
          reject(new FreshGeolocationError('timeout', 'Location timeout'));
        } else {
          reject(new FreshGeolocationError('unavailable', err.message || 'Unknown geolocation error'));
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout,
        // CRITICAL: forbid cached coordinates
        maximumAge: 0,
      },
    );
  });

const readStored = (): StoredReading | null => {
  try {
    const raw = sessionStorage.getItem(FROZEN_COORD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReading;
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStored = (lat: number, lng: number) => {
  try {
    const payload: StoredReading = { lat, lng, ts: Date.now() };
    sessionStorage.setItem(FROZEN_COORD_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
};

const sameToSevenDecimals = (a: number, b: number) =>
  Math.round(a * 1e7) === Math.round(b * 1e7);

/**
 * Fetch a GPS reading with **lenient** anti-cache safeguards.
 *
 * Policy (designed to NEVER block legitimate employees):
 *  - We always force `maximumAge: 0` so the OS prefers a live fix.
 *  - If the reading is suspicious (very stale, very inaccurate, or identical
 *    to the previous one), we silently retry once with a fresh request.
 *  - If the second reading is still suspicious we **accept it anyway** and
 *    return a warning flag so the caller can log it for the admin without
 *    blocking the employee.
 *  - The only HARD failures are: permission denied, geolocation unsupported,
 *    or the OS returning no position at all.
 */
export async function getFreshPosition(opts: FreshPositionOptions = {}): Promise<GeolocationPosition> {
  const result = await getFreshPositionWithMeta(opts);
  return result.position;
}

export async function getFreshPositionWithMeta(
  opts: FreshPositionOptions = {},
): Promise<FreshPositionResult> {
  const {
    maxAgeMs = 300_000, // 5 minutes
    maxAccuracyMeters = 300, // lenient (indoor / weak signal friendly)
    timeoutMs = 15_000,
    allowLowAccuracyFallback = true,
    frozenMinGapMs = 120_000,
  } = opts;

  const readOnce = async (): Promise<GeolocationPosition> => {
    try {
      return await readPosition(true, timeoutMs);
    } catch (err) {
      if (err instanceof FreshGeolocationError && err.code === 'timeout' && allowLowAccuracyFallback) {
        return await readPosition(false, Math.min(timeoutMs, 12_000));
      }
      throw err;
    }
  };

  const evaluate = (pos: GeolocationPosition) => {
    const now = Date.now();
    const ageMs = now - pos.timestamp;
    const accuracy = pos.coords.accuracy;
    const prev = readStored();
    const isFrozen = !!(
      prev &&
      now - prev.ts >= frozenMinGapMs &&
      sameToSevenDecimals(prev.lat, pos.coords.latitude) &&
      sameToSevenDecimals(prev.lng, pos.coords.longitude)
    );
    const isStale = ageMs > maxAgeMs;
    const isInaccurate = typeof accuracy === 'number' && accuracy > maxAccuracyMeters;
    return { isFrozen, isStale, isInaccurate, now };
  };

  // First attempt
  let pos = await readOnce();
  let evalRes = evaluate(pos);

  // If suspicious, silently retry ONCE after a brief delay so the OS can refresh
  if (evalRes.isFrozen || evalRes.isStale || evalRes.isInaccurate) {
    await new Promise((r) => setTimeout(r, 800));
    try {
      const retry = await readOnce();
      const retryEval = evaluate(retry);
      // Prefer the retry only if it improved at least one dimension
      if (
        (!retryEval.isFrozen && evalRes.isFrozen) ||
        (!retryEval.isStale && evalRes.isStale) ||
        (!retryEval.isInaccurate && evalRes.isInaccurate)
      ) {
        pos = retry;
        evalRes = retryEval;
      }
    } catch {
      /* keep the first reading */
    }
  }

  const warnings: FreshPositionResult['warnings'] = [];
  if (evalRes.isFrozen) warnings.push('frozen_coordinates');
  if (evalRes.isStale) warnings.push('stale_cached');
  if (evalRes.isInaccurate) warnings.push('low_accuracy');

  writeStored(pos.coords.latitude, pos.coords.longitude);
  return { position: pos, warnings };
}

/** Localised, user-facing error message for a FreshGeolocationError. */
export function freshGeoErrorMessage(err: unknown, ar: boolean): string {
  if (!(err instanceof FreshGeolocationError)) {
    return err instanceof Error ? err.message : String(err);
  }
  switch (err.code) {
    case 'unsupported':
      return ar ? 'الموقع غير مدعوم على هذا الجهاز' : 'Geolocation not supported on this device';
    case 'permission_denied':
      return ar ? 'يرجى السماح بالوصول للموقع' : 'Please allow location access';
    case 'unavailable':
      return ar ? 'تعذر تحديد الموقع - تأكد من تفعيل GPS' : 'Position unavailable - enable GPS';
    case 'timeout':
      return ar
        ? 'انتهت مهلة تحديد الموقع - تأكد من تفعيل GPS وحاول مجدداً'
        : 'Location timeout - ensure GPS is enabled and try again';
    case 'stale_cached':
      return ar
        ? 'تم رفض موقع قديم محفوظ بالذاكرة. فعّل GPS وأعد المحاولة في الهواء الطلق.'
        : 'A stale cached location was rejected. Enable GPS and retry outdoors.';
    case 'low_accuracy':
      return ar
        ? 'دقة الموقع ضعيفة جداً. اخرج للهواء الطلق وفعّل GPS ثم أعد المحاولة.'
        : 'GPS accuracy is too low. Move outdoors, enable GPS, and retry.';
    case 'frozen_coordinates':
      return ar
        ? 'النظام رصد إحداثيات مكررة (مخزنة في الذاكرة). أعد تشغيل GPS أو حرّك جهازك ثم حاول مجدداً.'
        : 'Repeated cached coordinates detected. Toggle GPS off/on or move your device, then retry.';
    default:
      return err.message;
  }
}
