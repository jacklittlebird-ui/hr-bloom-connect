/**
 * Global "refresh now" signal for the employee portal.
 *
 * Pressing the portal refresh button must reload *everything* shown in the
 * selected section — not the copy the data contexts already hold in memory.
 * Two things normally stop that:
 *   1. the stale-while-revalidate cache in queryOptimizer (60s TTL), and
 *   2. the per-context "already loaded" guards (loaded / hasFetched refs)
 *      which short-circuit a refetch before it ever reaches the database.
 *
 * requestGlobalRefresh() clears both, then notifies every subscribed context
 * so the next mount of the section re-reads from the database.
 */
import { invalidateCache } from '@/lib/queryOptimizer';

type RefreshListener = () => void;

const listeners = new Set<RefreshListener>();
let epoch = 0;

/** Increments on every global refresh — useful as a React key. */
export const getRefreshEpoch = () => epoch;

/** Register a context's "drop your loaded guards" callback. Returns unsubscribe. */
export const subscribePortalRefresh = (listener: RefreshListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Clear every cached query and tell every data context to forget what it
 * already loaded, so the currently mounted section refetches from scratch.
 */
export const requestGlobalRefresh = () => {
  epoch += 1;
  invalidateCache();
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('[portalRefresh] listener failed:', e);
    }
  });
  return epoch;
};
