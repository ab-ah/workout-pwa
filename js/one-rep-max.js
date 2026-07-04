// Estimated 1-rep-max (e1RM) helpers and PR detection. Pure: no DOM/storage.
//
// e1RM lets us compare sets done at different weight/rep combos on one scale,
// drive % based loading (warm-ups, target loads), and detect strength PRs even
// when the top set's raw weight didn't change.

// Epley is the default: 1RM = w * (1 + reps/30). Simple, well-known, and close
// to Brzycki in the 1–10 rep range we program. Reps beyond ~12 estimate poorly,
// so callers should treat high-rep e1RM as a rough floor.
const EPLEY_DIVISOR = 30;

/**
 * Estimated one-rep max from a single set. Returns the raw weight for a 1-rep
 * set and null for non-positive input (bodyweight/time work has weight 0).
 * @param {number} weight
 * @param {number} reps
 * @returns {number|null}
 */
export function epley1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return null;
  if (r === 1) return w;
  return w * (1 + r / EPLEY_DIVISOR);
}

/**
 * The best (highest) e1RM across a list of sets, or null if none qualify.
 * @param {Array<{weight:number,reps:number}>} sets
 * @returns {number|null}
 */
export function bestE1RM(sets) {
  if (!Array.isArray(sets)) return null;
  let best = null;
  for (const s of sets) {
    const e = epley1RM(s?.weight, s?.reps);
    if (e != null && (best === null || e > best)) best = e;
  }
  return best;
}

/**
 * Invert Epley: the load that should allow `reps` reps given an e1RM.
 * Useful for "what weight puts me at the top of my rep range".
 * @param {number} e1rm
 * @param {number} reps
 * @returns {number|null}
 */
export function loadForReps(e1rm, reps) {
  const e = Number(e1rm);
  const r = Number(reps);
  if (!Number.isFinite(e) || !Number.isFinite(r) || e <= 0 || r <= 0) return null;
  if (r === 1) return e;
  return e / (1 + r / EPLEY_DIVISOR);
}

/**
 * A percentage of e1RM (for warm-up ramps / intensity targets).
 * @param {number} e1rm
 * @param {number} pct 0..1
 * @returns {number|null}
 */
export function loadForPercent(e1rm, pct) {
  const e = Number(e1rm);
  const p = Number(pct);
  if (!Number.isFinite(e) || !Number.isFinite(p) || e <= 0 || p <= 0) return null;
  return e * p;
}

/**
 * Round a load to the nearest usable increment (default 0.5 kg).
 * @param {number} weight
 * @param {number} [increment]
 * @returns {number}
 */
export function roundLoad(weight, increment = 0.5) {
  const inc = increment > 0 ? increment : 0.5;
  return Math.round(weight / inc) * inc;
}

/**
 * Best e1RM the user has ever hit for one exercise, scanning full history.
 * @param {Array} history
 * @param {string} exerciseId
 * @returns {number|null}
 */
export function bestE1RMForExercise(history, exerciseId) {
  if (!Array.isArray(history)) return null;
  let best = null;
  for (const session of history) {
    const ex = (session?.exercises ?? []).find(e => e.exerciseId === exerciseId);
    if (!ex) continue;
    const e = bestE1RM(ex.sets);
    if (e != null && (best === null || e > best)) best = e;
  }
  return best;
}

/**
 * e1RM over time for one exercise: one point per session that trained it,
 * carrying the session's best e1RM. Feeds the Progress chart.
 * @param {Array} history
 * @param {string} exerciseId
 * @returns {Array<{ date:string, weight:number, reps:number }>}
 */
export function e1rmSeries(history, exerciseId) {
  const points = [];
  for (const session of (history ?? [])) {
    const ex = (session?.exercises ?? []).find(e => e.exerciseId === exerciseId);
    if (!ex) continue;
    const e = bestE1RM(ex.sets);
    if (e == null) continue;
    // Weight field carries the estimate so the shared chart can plot it.
    points.push({ date: session.date, weight: Math.round(e * 10) / 10, reps: 1 });
  }
  return points;
}

/**
 * Was `session` an e1RM PR for `exerciseId` — i.e. did it beat the best e1RM of
 * every earlier session in `history`? `history` should be the full, ordered log.
 * @param {Array} history
 * @param {string} sessionId
 * @param {string} exerciseId
 * @returns {boolean}
 */
export function isE1RMPRInSession(history, sessionId, exerciseId) {
  if (!Array.isArray(history)) return false;
  let priorBest = null;
  for (const session of history) {
    const ex = (session?.exercises ?? []).find(e => e.exerciseId === exerciseId);
    const e = ex ? bestE1RM(ex.sets) : null;
    if (session?.sessionId === sessionId) {
      if (e == null) return false;
      return priorBest === null || e > priorBest + 1e-9;
    }
    if (e != null && (priorBest === null || e > priorBest)) priorBest = e;
  }
  return false;
}
