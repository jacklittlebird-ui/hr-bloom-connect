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
  /** Max age in ms of the position timestamp relative to call time. Default 10s. */
  maxAgeMs?: number;
  /** Max accepted GPS accuracy in meters. Default 150m. */
  maxAccuracyMeters?: number;
  /** Timeout for getCurrentPosition in ms. Default 15s. */
  timeoutMs?: number;
  /** Allow falling back to low-accuracy mode if high-accuracy times out. Default true. */
  allowLowAccuracyFallback?: boolean;
  /** Minimum gap (ms) between identical readings before flagging as frozen. Default 5s. */
  frozenMinGapMs?: number;
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
 * Fetch a *fresh* GPS reading or throw FreshGeolocationError.
 */
export async function getFreshPosition(opts: FreshPositionOptions = {}): Promise<GeolocationPosition> {
  const {
    maxAgeMs = 120_000,
    maxAccuracyMeters = 150,
    timeoutMs = 15_000,
    allowLowAccuracyFallback = true,
    frozenMinGapMs = 120_000,
  } = opts;

  let pos: GeolocationPosition;
  try {
    pos = await readPosition(true, timeoutMs);
  } catch (err) {
    if (err instanceof FreshGeolocationError && err.code === 'timeout' && allowLowAccuracyFallback) {
      pos = await readPosition(false, Math.min(timeoutMs, 12_000));
    } else {
      throw err;
    }
  }

  const now = Date.now();
  const ageMs = now - pos.timestamp;
  if (ageMs > maxAgeMs) {
    throw new FreshGeolocationError(
      'stale_cached',
      `Location reading is too old (${Math.round(ageMs / 1000)}s). Please enable GPS and try again.`,
    );
  }

  const accuracy = pos.coords.accuracy;
  if (typeof accuracy === 'number' && accuracy > maxAccuracyMeters) {
    throw new FreshGeolocationError(
      'low_accuracy',
      `GPS accuracy is too low (${Math.round(accuracy)}m). Move outdoors and try again.`,
    );
  }

  // Frozen-coordinate detection: same lat/lng to 7 decimals as a previous
  // reading taken more than `frozenMinGapMs` ago is almost certainly cached.
  const prev = readStored();
  if (prev && now - prev.ts >= frozenMinGapMs) {
    if (
      sameToSevenDecimals(prev.lat, pos.coords.latitude) &&
      sameToSevenDecimals(prev.lng, pos.coords.longitude)
    ) {
      throw new FreshGeolocationError(
        'frozen_coordinates',
        'GPS appears to be returning a cached location. Move slightly, enable GPS, and retry.',
      );
    }
  }

  writeStored(pos.coords.latitude, pos.coords.longitude);
  return pos;
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
