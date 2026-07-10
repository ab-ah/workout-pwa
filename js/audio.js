// One shared, gesture-unlocked AudioContext for every workout cue.
//
// A backgrounded tab throttles timers and ignores navigator.vibrate, and an
// AudioContext created while hidden starts suspended — so a beep scheduled from
// a background timer (e.g. the rest timer firing while you're in Spotify) often
// never sounds. The fix: create ONE context on a user gesture (the Log tap) and
// resume it there, then reuse it for every later beep. A context unlocked by a
// gesture keeps playing scheduled tones even after the tab is hidden.

let ctx = null;

function ensureCtx() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) {
    try { ctx = new Ctx(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Unlock/resume the shared context. Call from a user gesture (e.g. Log tap) so
 *  later background beeps are allowed to play. Best-effort, silent on failure. */
export function unlockAudio() {
  try { ensureCtx(); } catch { /* audio unavailable */ }
}

/**
 * Play a short sequence of sine tones on the shared context.
 * @param {number[]} freqs   frequencies, played in order
 * @param {{ gap?:number, dur?:number }} [opts]  seconds between/within tones
 */
export function playBeep(freqs, opts = {}) {
  const gap = opts.gap ?? 0.18;
  const dur = opts.dur ?? 0.16;
  try {
    const audio = ensureCtx();
    if (!audio) return;
    const now = audio.currentTime;
    freqs.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * gap;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + dur + 0.01);
    });
  } catch {
    /* audio unavailable — visual countdown / vibration still cover it */
  }
}
