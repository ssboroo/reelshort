// Only cache the offline fallback. Never cache auth, API responses or video.
self.addEventListener('install', event => { event.waitUntil(caches.open('reelshort-offline-v1').then(cache => cache.add('/offline.html'))); self.skipWaiting(); });
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => { if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html'))); });
