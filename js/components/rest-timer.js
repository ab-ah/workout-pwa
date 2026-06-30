export function computeRemainingSeconds(endTimestamp, now = Date.now()) {
  const remainingMs = endTimestamp - now;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * Mounts a rest timer into `container` counting down `durationSeconds`.
 * Calls `onComplete` when it reaches zero. Returns a `stop()` function
 * to cancel early (used by the Skip button and on unmount).
 */
export function mountRestTimer(container, durationSeconds, onComplete) {
  const endTimestamp = Date.now() + durationSeconds * 1000;
  container.innerHTML = `
    <div class="rest-timer">
      <span class="muted">Rest</span>
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
    stop();
    onComplete();
  }

  function tick() {
    const remaining = computeRemainingSeconds(endTimestamp);
    timeEl.textContent = `${remaining}s`;
    if (remaining <= 0) {
      if (navigator.vibrate) navigator.vibrate(200);
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
    complete();
  }

  intervalId = setInterval(tick, 250);
  skipBtn.addEventListener('click', handleSkip);

  return { stop };
}
