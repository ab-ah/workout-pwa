// Keep the screen awake during an active workout so it doesn't sleep between
// sets. Best-effort wrapper over the Screen Wake Lock API — silently no-ops
// where unsupported (e.g. iOS Safari before 16.4). The browser drops the lock
// when the tab is hidden, so we re-acquire on visibilitychange while active.

let sentinel = null;
let active = false;

async function acquire() {
  if (!active) return;
  if (!('wakeLock' in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => { sentinel = null; });
  } catch {
    /* denied or unsupported — not critical */
  }
}

function onVisibility() {
  if (active && document.visibilityState === 'visible' && !sentinel) {
    acquire();
  }
}

/** Start keeping the screen awake. Safe to call repeatedly. */
export function enableWakeLock() {
  if (active) return;
  active = true;
  document.addEventListener('visibilitychange', onVisibility);
  acquire();
}

/** Stop keeping the screen awake and release any held lock. */
export function disableWakeLock() {
  active = false;
  document.removeEventListener('visibilitychange', onVisibility);
  if (sentinel) {
    sentinel.release().catch(() => {});
    sentinel = null;
  }
}
