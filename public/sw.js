// Legacy cleanup worker.
// Chunk loading failures are handled in the page with a reload cooldown.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
