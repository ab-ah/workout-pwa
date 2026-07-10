import { playBeep } from '../audio.js';
import { setPendingRest, clearPendingRest } from '../rest-persist.js';
import { notifyRestOver } from '../notify.js';

export function computeRemainingSeconds(endTimestamp, now = Date.now()) {
  const remainingMs = endTimestamp - now;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

// Two-tone "rest over" cue on the shared, gesture-unlocked context (audio.js) so
// it still sounds when the tab is backgrounded (e.g. you're in Spotify) — a fresh
// per-beep context created while hidden would start suspended and stay silent.
function playRestDoneBeep() {
  playBeep([880, 1320]);
}

/**
 * Mounts a rest timer into `container` counting down `durationSeconds`.
 * Calls `onComplete` when it reaches zero. Returns a `stop()` function
 * to cancel early (used by the Skip button and on unmount).
 *
 * The absolute end time is persisted (rest-persist.js) so a mid-rest reload can
 * re-mount the timer with the correct remaining seconds.
 */
export function mountRestTimer(container, durationSeconds, onComplete) {
  const endTimestamp = Date.now() + durationSeconds * 1000;
  setPendingRest(durationSeconds);
  container.innerHTML = `
    <div class="rest-timer">
      <span class="muted rest-timer-label">Rest</span>
      <span class="time">${durationSeconds}s</span>
      <button class="btn-secondary btn-skip-rest">Skip rest</button>
    </div>
  `;
  const timeEl = container.querySelector('.time');
  const skipBtn = container.querySelector('.btn-skip-rest');

  let intervalId = null;
  let fired = false;

  function complete() {
    if (fired) return;
    fired = true;
    clearPendingRest();
    stop();
    onComplete();
  }

  function tick() {
    const remaining = computeRemainingSeconds(endTimestamp);
    timeEl.textContent = `${remaining}s`;
    if (remaining <= 0) {
      if (navigator.vibrate) navigator.vibrate(200);
      playRestDoneBeep();
      notifyRestOver();
      complete();
    }
  }

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    skipBtn.removeEventListener('click', handleSkip);
  }

  function handleSkip() {
    clearPendingRest();
    complete();
  }

  intervalId = setInterval(tick, 250);
  skipBtn.addEventListener('click', handleSkip);

  return { stop };
}
