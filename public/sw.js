// ponytail: pass-through service worker. Its only job is to satisfy
// Chrome's PWA install criterion ("page must register a service worker
// with a fetch handler"). No caching, no offline — YAGNI for v1.
//
// If you need to add caching, ALSO wire up a cache-bust strategy on
// deploy (otherwise users will be stuck on old bundles until the SW
// itself updates).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Intentionally empty: every request falls through to the browser's
  // default network fetch.
});