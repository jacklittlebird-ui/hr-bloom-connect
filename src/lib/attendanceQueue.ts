/**
 * Attendance Queue & Anti-Fraud Utilities
 * Optimized for ≤1M requests/month with 1000 users and 3 kiosks.
 */
import type { DeviceMeta } from '@/lib/device';

// ─── Rate Limiting (3 requests per user per minute) ────────────────────────

const userRequestLog = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 3;

export function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const log = userRequestLog.get(userId) || [];
  // Keep only last minute
  const recent = log.filter(t => now - t < 60_000);
  userRequestLog.set(userId, recent);
  return recent.length >= MAX_REQUESTS_PER_MINUTE;
}

export function recordRequest(userId: string): void {
  const now = Date.now();
  const log = userRequestLog.get(userId) || [];
  log.push(now);
  // Prune old entries
  userRequestLog.set(userId, log.filter(t => now - t < 60_000));
}

// ─── Deduplication ──────────────────────────────────────────────────────────

const DEDUP_WINDOW_MS = 10_000; // 10 seconds — matches server-side
const recentRequests = new Map<string, number>();

export function isDuplicate(key: string): boolean {
  const last = recentRequests.get(key);
  if (last && Date.now() - last < DEDUP_WINDOW_MS) return true;
  return false;
}

export function recordDedup(key: string): void {
  recentRequests.set(key, Date.now());
}

// ─── Queue System ───────────────────────────────────────────────────────────

type QueueItem = {
  id: string;
  fn: () => Promise<any>;
  resolve: (v: any) => void;
  reject: (e: any) => void;
};

const MAX_CONCURRENT = 10;
let activeWorkers = 0;
const queue: QueueItem[] = [];

function processQueue(): void {
  while (queue.length > 0 && activeWorkers < MAX_CONCURRENT) {
    const item = queue.shift()!;
    activeWorkers++;
    item.fn()
      .then(item.resolve)
      .catch(item.reject)
      .finally(() => {
        activeWorkers--;
        processQueue();
      });
  }
}

export function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({ id: crypto.randomUUID(), fn, resolve, reject });
    processQueue();
  });
}

// ─── Request Monitoring ─────────────────────────────────────────────────────

interface RequestMonitor {
  totalCheckins: number;
  totalErrors: number;
  totalDuplicates: number;
  totalRateLimited: number;
  avgResponseMs: number;
  responseTimes: number[];
  minuteTimestamps: number[];
  hourTimestamps: number[];
}

const monitor: RequestMonitor = {
  totalCheckins: 0,
  totalErrors: 0,
  totalDuplicates: 0,
  totalRateLimited: 0,
  avgResponseMs: 0,
  responseTimes: [],
  minuteTimestamps: [],
  hourTimestamps: [],
};

const WARN_PER_MINUTE = 300;
const WARN_PER_HOUR = 7000;

export function trackCheckinStart(): number {
  return performance.now();
}

export function trackCheckinEnd(startTime: number, success: boolean): void {
  const elapsed = performance.now() - startTime;
  const now = Date.now();

  monitor.responseTimes.push(elapsed);
  if (monitor.responseTimes.length > 50) monitor.responseTimes.shift();

  monitor.minuteTimestamps.push(now);
  monitor.hourTimestamps.push(now);

  // Prune
  const oneMinAgo = now - 60_000;
  const oneHourAgo = now - 3_600_000;
  monitor.minuteTimestamps = monitor.minuteTimestamps.filter(t => t > oneMinAgo);
  monitor.hourTimestamps = monitor.hourTimestamps.filter(t => t > oneHourAgo);

  if (success) monitor.totalCheckins++;
  else monitor.totalErrors++;

  monitor.avgResponseMs =
    monitor.responseTimes.reduce((a, b) => a + b, 0) / monitor.responseTimes.length;

  // Threshold warnings
  if (monitor.minuteTimestamps.length > WARN_PER_MINUTE) {
    console.warn(`[AttendanceMonitor] ⚠️ ${monitor.minuteTimestamps.length} requests/min (threshold: ${WARN_PER_MINUTE})`);
  }
  if (monitor.hourTimestamps.length > WARN_PER_HOUR) {
    console.warn(`[AttendanceMonitor] ⚠️ ${monitor.hourTimestamps.length} requests/hour (threshold: ${WARN_PER_HOUR})`);
  }
  if (elapsed > 1000) {
    console.warn(`[AttendanceMonitor] Slow check-in: ${Math.round(elapsed)}ms`);
  }
}

export function trackDuplicate(): void {
  monitor.totalDuplicates++;
  console.warn(`[AttendanceMonitor] Duplicate blocked (total: ${monitor.totalDuplicates})`);
}

export function trackRateLimited(): void {
  monitor.totalRateLimited++;
  console.warn(`[AttendanceMonitor] Rate-limited (total: ${monitor.totalRateLimited})`);
}

export function getAttendanceStats(): Readonly<RequestMonitor> {
  return { ...monitor };
}

// Expose to console
if (typeof window !== 'undefined') {
  (window as any).__attendanceStats = () => getAttendanceStats();
  (window as any).__attendanceQueueSize = () => queue.length;
}

// ─── Consolidated Check-in Flow ─────────────────────────────────────────────

interface CheckinParams {
  eventType: 'check_in' | 'check_out';
  accessToken: string;
  userId: string;
  deviceId: string;
  gpsLat: number;
  gpsLng: number;
  gpsAccuracy: number;
  deviceMeta?: DeviceMeta;
}

interface CheckinResult {
  ok: boolean;
  error?: string;
  event_type?: string;
  location?: string;
}

export async function performCheckin(params: CheckinParams): Promise<CheckinResult> {
  const dedupKey = `${params.userId}:${params.eventType}`;

  // 1. Dedup check
  if (isDuplicate(dedupKey)) {
    trackDuplicate();
    return { ok: false, error: 'طلب مكرر - يرجى الانتظار / Duplicate request - please wait' };
  }

  // 2. Rate limit check (3/min)
  if (isRateLimited(params.userId)) {
    trackRateLimited();
    return { ok: false, error: 'تجاوزت الحد المسموح - انتظر دقيقة / Rate limit exceeded - wait a minute' };
  }

  // 3. Record dedup + rate limit
  recordDedup(dedupKey);
  recordRequest(params.userId);

  const startTime = trackCheckinStart();

  // 4. Enqueue the request (no random delay — removed to reduce latency)
  try {
    const result = await enqueue(async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/gps-checkin`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${params.accessToken}`,
          },
          body: JSON.stringify({
            event_type: params.eventType,
            gps_lat: params.gpsLat,
            gps_lng: params.gpsLng,
            gps_accuracy: params.gpsAccuracy,
            device_id: params.deviceId,
            device_meta: params.deviceMeta || null,
          }),
        }
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        return { ok: false, error: e.error || res.statusText } as CheckinResult;
      }
      return await res.json() as CheckinResult;
    });

    trackCheckinEnd(startTime, result.ok !== false);
    return result;
  } catch (e: any) {
    trackCheckinEnd(startTime, false);

    // Single retry after 5 seconds on network failure
    try {
      await new Promise(r => setTimeout(r, 5000));
      const retryResult = await enqueue(async () => {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/gps-checkin`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${params.accessToken}`,
            },
            body: JSON.stringify({
              event_type: params.eventType,
              gps_lat: params.gpsLat,
              gps_lng: params.gpsLng,
              gps_accuracy: params.gpsAccuracy,
              device_id: params.deviceId,
              device_meta: params.deviceMeta || null,
            }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false, error: err.error || res.statusText } as CheckinResult;
        }
        return await res.json() as CheckinResult;
      });
      return retryResult;
    } catch {
      return { ok: false, error: e.message };
    }
  }
}
