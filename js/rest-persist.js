// Persist the rest-timer's end time so a mid-rest reload doesn't lose the clock.
//
// The rest countdown used to live only in memory: a pull-to-refresh, an accidental
// reload, or a service-worker update while resting silently killed it. Storing the
// absolute end timestamp means any card can re-mount the timer with the correct
// remaining seconds after a reload. Only one rest runs at a time, so a single
// global key is enough.

const REST_KEY = 'leanbuild-rest-until-v1';

/** Remaining whole seconds on a persisted rest, or 0 if none / already elapsed. */
export function getPendingRestSeconds(now = Date.now()) {
  try {
    const raw = localStorage.getItem(REST_KEY);
    if (!raw) return 0;
    const endsAt = JSON.parse(raw)?.endsAt;
    if (!Number.isFinite(endsAt)) return 0;
    return Math.max(0, Math.ceil((endsAt - now) / 1000));
  } catch {
    return 0;
  }
}

/** Record that a rest ends `durationSeconds` from now. */
export function setPendingRest(durationSeconds, now = Date.now()) {
  try {
    localStorage.setItem(REST_KEY, JSON.stringify({ endsAt: now + durationSeconds * 1000 }));
  } catch {
    /* storage unavailable — the in-memory timer still runs */
  }
}

/** Forget any persisted rest (completed, skipped, or cancelled). */
export function clearPendingRest() {
  try {
    localStorage.removeItem(REST_KEY);
  } catch {
    /* storage unavailable */
  }
}
