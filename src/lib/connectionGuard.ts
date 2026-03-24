/**
 * Connection guard — limits concurrent Supabase auth requests
 * to prevent connection-pool exhaustion under load.
 * Priority accounts (admin) bypass the queue entirely.
 */

const MAX_CONCURRENT_LOGINS = 50;
const LOGIN_QUEUE_TIMEOUT_MS = 15_000;

/** Emails that always get immediate login slots (no queue) */
const PRIORITY_EMAILS = new Set([
  'admin@linkagency.com',
  'jishak@linkagency.com',
]);

let activeLogins = 0;
let totalLogins = 0;
let totalErrors = 0;
let totalLoginTimeMs = 0;
const waitQueue: Array<{ resolve: () => void; timer: ReturnType<typeof setTimeout> }> = [];

function releaseSlot() {
  activeLogins = Math.max(0, activeLogins - 1);
  const next = waitQueue.shift();
  if (next) {
    clearTimeout(next.timer);
    activeLogins++;
    next.resolve();
  }
}

/**
 * Acquire a login slot.
 * Priority emails bypass the concurrency limit entirely.
 * Others resolve immediately if under limit, or queue with timeout.
 */
export function acquireLoginSlot(email?: string): Promise<void> {
  // Priority accounts always get through immediately
  if (email && PRIORITY_EMAILS.has(email.toLowerCase())) {
    activeLogins++;
    return Promise.resolve();
  }

  if (activeLogins < MAX_CONCURRENT_LOGINS) {
    activeLogins++;
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = waitQueue.findIndex((w) => w.resolve === resolve);
      if (idx !== -1) waitQueue.splice(idx, 1);
      reject(new Error('Login queue timeout — server is busy'));
    }, LOGIN_QUEUE_TIMEOUT_MS);

    waitQueue.push({ resolve, timer });
  });
}

export { releaseSlot };

/**
 * Record a completed login attempt for monitoring.
 */
export function recordLoginMetric(durationMs: number, error: boolean) {
  totalLogins++;
  totalLoginTimeMs += durationMs;
  if (error) totalErrors++;
}

/**
 * Connection guard diagnostics — call from console for live monitoring.
 */
export function getConnectionGuardStats() {
  return {
    maxConcurrent: MAX_CONCURRENT_LOGINS,
    activeLogins,
    queueDepth: waitQueue.length,
    totalLogins,
    totalErrors,
    errorRate: totalLogins > 0 ? `${((totalErrors / totalLogins) * 100).toFixed(1)}%` : '0%',
    avgLoginTimeMs: totalLogins > 0 ? Math.round(totalLoginTimeMs / totalLogins) : 0,
  };
}

// Expose to browser console for live monitoring
if (typeof window !== 'undefined') {
  (window as any).__connectionGuardStats = getConnectionGuardStats;
}

/**
 * Global request throttle — simple token-bucket for any Supabase call.
 */
let lastRequestTs = 0;
const MIN_REQUEST_GAP_MS = 50; // 20 req/s max per tab

export async function throttle(): Promise<void> {
  const now = Date.now();
  const gap = MIN_REQUEST_GAP_MS - (now - lastRequestTs);
  if (gap > 0) {
    await new Promise((r) => setTimeout(r, gap));
  }
  lastRequestTs = Date.now();
}

/**
 * Emergency flags — disable heavy background work.
 */
export const EMERGENCY_MODE = {
  disableRealtimeSubscriptions: true,
  disableBackgroundJobs: true,
  disableAutoPreload: true,
  maxIdleConnectionMs: 5_000,
};
