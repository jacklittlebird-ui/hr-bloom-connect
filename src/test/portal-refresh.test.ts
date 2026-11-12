import { describe, it, expect, vi } from 'vitest';
import {
  requestGlobalRefresh,
  getRefreshEpoch,
  subscribePortalRefresh,
} from '@/lib/portalRefresh';
import { setCache, getCached } from '@/lib/queryOptimizer';

describe('portal refresh signal', () => {
  it('clears the query cache so the next fetch really hits the database', () => {
    setCache('portal_leaves_v1_abc', [{ x: 1 }]);
    expect(getCached('portal_leaves_v1_abc')).not.toBeNull();

    requestGlobalRefresh();

    expect(getCached('portal_leaves_v1_abc')).toBeNull();
  });

  it('notifies every subscribed context and bumps the epoch', () => {
    const before = getRefreshEpoch();
    const a = vi.fn();
    const b = vi.fn();
    const unA = subscribePortalRefresh(a);
    const unB = subscribePortalRefresh(b);

    const after = requestGlobalRefresh();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(after).toBe(before + 1);
    expect(getRefreshEpoch()).toBe(after);

    unA();
    requestGlobalRefresh();
    expect(a).toHaveBeenCalledTimes(1); // unsubscribed listener is not called again
    expect(b).toHaveBeenCalledTimes(2);
    unB();
  });

  it('keeps notifying the other contexts when one listener throws', () => {
    const boom = vi.fn(() => {
      throw new Error('context exploded');
    });
    const ok = vi.fn();
    const un1 = subscribePortalRefresh(boom);
    const un2 = subscribePortalRefresh(ok);

    requestGlobalRefresh();

    expect(boom).toHaveBeenCalledTimes(1);
    expect(ok).toHaveBeenCalledTimes(1);
    un1();
    un2();
  });
});
