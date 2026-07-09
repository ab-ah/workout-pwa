// One-tap deload week. Pure helpers + a thin localStorage wrapper.
//
// deload.js DETECTS when a deload is due (chronic-fatigue heuristic over the
// training log). This module is the ACTION: when the user taps "Start deload
// week", we record the start time and, for the next DELOAD_DAYS, cap every
// exercise's working sets to ~60% (a ~40% volume cut) while holding the weights.
// Following that reduced volume for a week is exactly what clears the streak in
// deload.js (its DELOAD_SET_RATIO check), so the two modules close the loop.

const DELOAD_MODE_KEY = 'leanbuild-deload-mode-v1';
const MS_PER_DAY = 86400000;

export const DELOAD_DAYS = 7;
// Fraction of programmed sets kept during a deload (≈40% cut). Applied per
// exercise via deloadSetTarget().
const DELOAD_SET_FRACTION = 0.6;

/**
 * Reduced working-set count for a deload week: ~60% of the programmed sets,
 * floored at 1 so nothing drops to zero.
 * @param {number} setsCount
 * @returns {number}
 */
export function deloadSetTarget(setsCount) {
  const n = Number(setsCount);
  if (!Number.isFinite(n) || n <= 1) return Math.max(1, Math.round(n) || 1);
  return Math.max(1, Math.round(n * DELOAD_SET_FRACTION));
}

/**
 * Derive deload state from the raw stored value. Pure — no storage — so it is
 * unit-testable. A record older than DELOAD_DAYS reads as inactive (expired).
 * @param {{ startedAt:number } | null | undefined} raw
 * @param {number} [now]
 * @returns {{ active:boolean, startedAt:number|null, endsAt:number|null, daysLeft:number }}
 */
export function deloadModeFrom(raw, now = Date.now()) {
  const startedAt = raw && Number.isFinite(raw.startedAt) ? raw.startedAt : null;
  if (startedAt == null) return { active: false, startedAt: null, endsAt: null, daysLeft: 0 };
  const endsAt = startedAt + DELOAD_DAYS * MS_PER_DAY;
  const active = now < endsAt;
  const daysLeft = active ? Math.max(1, Math.ceil((endsAt - now) / MS_PER_DAY)) : 0;
  return { active, startedAt, endsAt, daysLeft };
}

// ─── localStorage wrappers (guarded; safe in non-browser test contexts) ──────

function readRaw() {
  try {
    const raw = localStorage.getItem(DELOAD_MODE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Current deload state, auto-clearing the record once it has expired. */
export function getDeloadMode(now = Date.now()) {
  const state = deloadModeFrom(readRaw(), now);
  if (!state.active && state.startedAt != null) endDeloadMode(); // tidy up expired
  return state;
}

/** Begin a deload week starting now. */
export function startDeloadMode(now = Date.now()) {
  try {
    localStorage.setItem(DELOAD_MODE_KEY, JSON.stringify({ startedAt: now }));
  } catch {
    /* storage unavailable — nothing to persist */
  }
  return deloadModeFrom({ startedAt: now }, now);
}

/** End a deload week early (or clean up an expired record). */
export function endDeloadMode() {
  try {
    localStorage.removeItem(DELOAD_MODE_KEY);
  } catch {
    /* storage unavailable */
  }
}
