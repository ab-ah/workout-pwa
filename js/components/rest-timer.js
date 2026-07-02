export function computeRemainingSeconds(endTimestamp, now = Date.now()) {
  const remainingMs = endTimestamp - now;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * Short two-tone beep via WebAudio — the reliable "rest over" cue on iOS,
 * where navigator.vibrate is a no-op inside a PWA. Best-effort: silently
 * does nothing if the browser blocks or lacks audio.
 */
function playRestDoneBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    });
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    /* audio unavailable — vibration / visual countdown still cover it */
  }
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
      playRestDoneBeep();
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
