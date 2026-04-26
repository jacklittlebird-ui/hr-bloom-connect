/**
 * Query Optimizer — centralized caching, debounce, and monitoring for all data contexts.
 *
 * Features:
 *   • Stale-while-revalidate (SWR) cache with configurable TTL
 *   • Debounce protection to prevent rapid duplicate fetches
 *   • Per-session query counter and monitoring
 *   • Payload size tracking
 */

// ─── Cache ───────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

const DEFAULT_TTL_MS = 60_000; // 1 minute default staleness window

export function getCached<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > ttlMs) return null; // stale
  return entry.data as T;
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(keyPrefix)) cache.delete(k);
  }
}

// ─── Debounce guard ──────────────────────────────────────────────────────────

const inFlight = new Map<string, Promise<any>>();

/**
 * Wraps an async fetch so that concurrent calls with the same key
 * share a single in-flight promise, and repeated calls within the TTL
 * return the cached result.
 *
 * IMPORTANT: Errors are NEVER cached. If the fetcher throws, the previous
 * cached value (if any) is returned to keep the UI from regressing to an
 * empty state during transient failures (network blip, RLS race during auth
 * restore). The error is re-thrown only when there is no fallback cache.
 *
 * Set `treatEmptyAsError: true` for endpoints where an empty array is
 * suspicious (e.g. an attendance list that should always have at least the
 * current day's records). When set and the fetcher returns an empty array
 * while a non-empty cached value exists, the cached value is preferred.
 */
export async function debouncedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: { ttlMs?: number; debounceMs?: number; treatEmptyAsError?: boolean }
): Promise<T> {
  const ttl = opts?.ttlMs ?? DEFAULT_TTL_MS;

  // Return cached if fresh
  const cached = getCached<T>(key, ttl);
  if (cached !== null) return cached;

  // De-duplicate in-flight requests
  if (inFlight.has(key)) return inFlight.get(key) as Promise<T>;

  const promise = fetcher().then(data => {
    // Suspicious-empty guard: if a previous fetch returned a non-empty list
    // and this one returned an empty one within a short window, prefer the
    // previous result and let the next fetch refresh it. This protects
    // against transient RLS / network failures that swallow data.
    if (opts?.treatEmptyAsError && Array.isArray(data) && data.length === 0) {
      const previous = cache.get(key);
      if (previous && Array.isArray(previous.data) && previous.data.length > 0) {
        inFlight.delete(key);
        return previous.data as T;
      }
    }
    setCache(key, data);
    inFlight.delete(key);
    return data;
  }).catch(err => {
    inFlight.delete(key);
    // Fallback to last known cache (even if stale) instead of failing hard.
    const previous = cache.get(key);
    if (previous) {
      console.warn(`[queryOptimizer] fetch failed for "${key}", returning stale cache:`, err);
      return previous.data as T;
    }
    throw err;
  });

  inFlight.set(key, promise);
  return promise;
}

// ─── Query monitoring ────────────────────────────────────────────────────────

interface QueryStats {
  totalQueries: number;
  totalBytes: number;
  queriesByContext: Record<string, number>;
  lastReset: number;
}

const stats: QueryStats = {
  totalQueries: 0,
  totalBytes: 0,
  queriesByContext: {},
  lastReset: Date.now(),
};

export function trackQuery(context: string, rowCount: number = 0): void {
  stats.totalQueries++;
  stats.queriesByContext[context] = (stats.queriesByContext[context] || 0) + 1;
  // Rough byte estimate: 200 bytes per row
  stats.totalBytes += rowCount * 200;
}

export function getQueryStats(): Readonly<QueryStats> {
  return { ...stats };
}

export function resetQueryStats(): void {
  stats.totalQueries = 0;
  stats.totalBytes = 0;
  stats.queriesByContext = {};
  stats.lastReset = Date.now();
}

// Expose to console for debugging
if (typeof window !== 'undefined') {
  (window as any).__queryStats = () => getQueryStats();
  (window as any).__resetQueryStats = resetQueryStats;
  (window as any).__invalidateCache = invalidateCache;
}

// ─── Pagination defaults ─────────────────────────────────────────────────────

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 50;

export function clampPageSize(requested?: number): number {
  if (!requested || requested < 1) return PAGE_SIZE_DEFAULT;
  return Math.min(requested, PAGE_SIZE_MAX);
}
