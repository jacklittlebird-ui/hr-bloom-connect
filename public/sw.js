const CACHE_NAME = "hr-link-v2";
const PRECACHE = ["/", "/manifest.json"];
const NETWORK_ONLY_PATHS = ["/auth/v1/", "/rest/v1/", "/functions/v1/", "/storage/v1/", "/realtime/v1/"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache POST requests (scan submits must be online)
  if (request.method !== "GET") return;

  if (
    url.origin !== self.location.origin ||
    NETWORK_ONLY_PATHS.some((path) => url.pathname.includes(path))
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok || request.cache === "only-if-cached") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
