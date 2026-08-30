import { lazy, type ComponentType } from 'react';

const RELOAD_KEY = 'chunk_reload_ts';

/**
 * React.lazy wrapper that recovers from stale/missing chunks after a redeploy.
 * Retries once, then forces a single hard reload (max once per minute).
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      // Retry once — transient network failure
      try {
        await new Promise((r) => setTimeout(r, 400));
        return await factory();
      } catch (err2) {
        const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        if (Date.now() - last > 60_000) {
          sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          // Drop caches/SW so the new build's chunks are fetched
          try {
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            }
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister()));
            }
          } catch {}
          window.location.reload();
          // Never resolves — page is reloading
          return new Promise<{ default: T }>(() => {});
        }
        throw err2;
      }
    }
  });
}
