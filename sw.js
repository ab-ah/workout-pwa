const CACHE_NAME = 'leanbuild-v37';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/fonts.css',
  './assets/fonts/anton.woff2',
  './assets/fonts/inter.woff2',
  './assets/fonts/jetbrainsmono.woff2',
  './js/app.js',
  './js/version.js',
  './js/store.js',
  './js/recovery-model.js',
  './js/recovery-tuning.js',
  './js/backup.js',
  './js/backup-io.js',
  './js/progression.js',
  './js/one-rep-max.js',
  './js/warmup.js',
  './js/bodyweight.js',
  './js/weight-coach.js',
  './js/adaptive.js',
  './js/volume.js',
  './js/deload.js',
  './js/deload-mode.js',
  './js/substitutions.js',
  './js/mobility.js',
  './js/supersets.js',
  './js/schedule.js',
  './js/wake-lock.js',
  './js/audio.js',
  './js/rest-persist.js',
  './js/notify.js',
  './js/escape.js',
  './js/views/today.js',
  './js/views/plan.js',
  './js/views/history.js',
  './js/views/recovery.js',
  './css/recovery.css',
  './js/settings-store.js',
  './js/views/settings.js',
  './css/settings.css',
  './js/components/exercise-card.js',
  './js/components/superset-card.js',
  './js/components/stepper.js',
  './js/components/gif-lightbox.js',
  './js/components/mobility-flow.js',
  './js/components/rest-timer.js',
  './js/components/workout-timer.js',
  './js/components/chart.js',
  './js/components/muscle-atlas.js',
  './js/components/muscle-atlas-paths.js',
  './icon-192.png',
  './icon-512.png'
];

// Exercise demo GIFs, bundled locally so the app never depends on external
// hosts. Precached best-effort (see install) so they also work fully offline.
const GIFS = [
  './assets/exercise-gifs/back-hyperextension.gif',
  './assets/exercise-gifs/band-face-pull.gif',
  './assets/exercise-gifs/band-pull-apart.gif',
  './assets/exercise-gifs/dumbbell-hip-thrust.gif',
  './assets/exercise-gifs/incline-dumbbell-curl.gif',
  './assets/exercise-gifs/barbell-back-squat.gif',
  './assets/exercise-gifs/barbell-romanian-deadlift.gif',
  './assets/exercise-gifs/bent-over-barbell-row.gif',
  './assets/exercise-gifs/bicycle-crunch.gif',
  './assets/exercise-gifs/bulgarian-split-squat.gif',
  './assets/exercise-gifs/burpee.gif',
  './assets/exercise-gifs/chest-supported-dumbbell-row.gif',
  './assets/exercise-gifs/close-grip-dumbbell-press.gif',
  './assets/exercise-gifs/dead-bug.gif',
  './assets/exercise-gifs/decline-dumbbell-press.gif',
  './assets/exercise-gifs/dumbbell-calf-raise.gif',
  './assets/exercise-gifs/dumbbell-farmer-carry.gif',
  './assets/exercise-gifs/dumbbell-hammer-curl.gif',
  './assets/exercise-gifs/dumbbell-lateral-raise.gif',
  './assets/exercise-gifs/dumbbell-lying-leg-curl.gif',
  './assets/exercise-gifs/dumbbell-pullover.gif',
  './assets/exercise-gifs/dumbbell-push-press.gif',
  './assets/exercise-gifs/dumbbell-reverse-lunge.gif',
  './assets/exercise-gifs/dumbbell-romanian-deadlift.gif',
  './assets/exercise-gifs/dumbbell-russian-twist.gif',
  './assets/exercise-gifs/dumbbell-swing.gif',
  './assets/exercise-gifs/dumbbell-thruster.gif',
  './assets/exercise-gifs/flat-barbell-bench-press.gif',
  './assets/exercise-gifs/flutter-kicks.gif',
  './assets/exercise-gifs/goblet-heels-elevated-squat.gif',
  './assets/exercise-gifs/goblet-squat.gif',
  './assets/exercise-gifs/hanging-leg-raise.gif',
  './assets/exercise-gifs/incline-barbell-bench-press.gif',
  './assets/exercise-gifs/incline-dumbbell-press.gif',
  './assets/exercise-gifs/lateral-raise-dropset.gif',
  './assets/exercise-gifs/lying-dumbbell-triceps-extension.gif',
  './assets/exercise-gifs/mobility-cat-cow.gif',
  './assets/exercise-gifs/mobility-cobra-stretch.gif',
  './assets/exercise-gifs/mobility-childs-pose.gif',
  './assets/exercise-gifs/mobility-chest-stretch.gif',
  './assets/exercise-gifs/mobility-hamstring-stretch.gif',
  './assets/exercise-gifs/mobility-hip-flexor-stretch.gif',
  './assets/exercise-gifs/mobility-90-90-hip.gif',
  './assets/exercise-gifs/mountain-climber.gif',
  './assets/exercise-gifs/one-arm-dumbbell-row.gif',
  './assets/exercise-gifs/overhead-dumbbell-triceps-extension.gif',
  './assets/exercise-gifs/plank.gif',
  './assets/exercise-gifs/preacher-curl.gif',
  './assets/exercise-gifs/push-up.gif',
  './assets/exercise-gifs/rear-delt-dumbbell-fly.gif',
  './assets/exercise-gifs/renegade-row.gif',
  './assets/exercise-gifs/seated-dumbbell-shoulder-press.gif',
  './assets/exercise-gifs/side-plank.gif',
  './assets/exercise-gifs/standing-dumbbell-curl.gif',
  './assets/exercise-gifs/treadmill-hiit-intervals.gif',
  './assets/exercise-gifs/treadmill-incline-walk.gif',
  './assets/exercise-gifs/two-arm-dumbbell-row.gif',
  './assets/exercise-gifs/weighted-back-hyperextension.gif',
  './assets/exercise-gifs/weighted-crunch.gif'
];

// Each demo now ships as interpolated 16 fps video (see js/components/
// demo-media.js): a WebM + MP4 pair per movement, ~3.5 MB total vs ~15 MB of
// GIF. We precache the videos and NOT the GIFs — the GIF stays in the repo only
// as the in-<video> fallback for browsers that can play neither source, and is
// runtime-cached on the rare occasion it's actually needed.
const DEMO_VIDEOS = GIFS.flatMap((gif) => [
  gif.replace(/\.gif$/, '.webm'),
  gif.replace(/\.gif$/, '.mp4'),
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Core app shell must all cache for install to count as successful.
      await cache.addAll(ASSETS);
      // Demo videos are best-effort: a single missing/failed file must not abort
      // the install. Any that miss here are still runtime-cached on first view.
      await Promise.allSettled(DEMO_VIDEOS.map((url) => cache.add(url)));
    })
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
