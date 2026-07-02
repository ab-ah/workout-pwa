const CACHE_NAME = 'leanbuild-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/data.js',
  './js/store.js',
  './js/recovery-model.js',
  './js/recovery-tuning.js',
  './js/backup.js',
  './js/progression.js',
  './js/volume.js',
  './js/schedule.js',
  './js/wake-lock.js',
  './js/views/today.js',
  './js/views/week.js',
  './js/views/history.js',
  './js/views/recovery.js',
  './css/recovery.css',
  './js/settings-store.js',
  './js/views/settings.js',
  './css/settings.css',
  './js/components/exercise-card.js',
  './js/components/rest-timer.js',
  './js/components/chart.js',
  './js/components/muscle-atlas.js',
  './js/components/muscle-atlas-paths.js',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
