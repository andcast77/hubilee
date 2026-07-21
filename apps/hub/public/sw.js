/**
 * Hub service worker — install/activate only.
 * Scope is registered as `/dashboard/` from the dashboard layout.
 * No fetch caching (offline) and no push/VAPID handlers.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
