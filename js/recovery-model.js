import { getExerciseMuscles } from './settings-store.js';

// ─── Fatigue model ───────────────────────────────────────────────────────────
//
// A muscle's freshness is a fraction in [0, 1] (1 = fully recovered).
//
// Each logged session deposits fatigue on the muscles it worked. How much
// depends on THREE things per set: the muscle's role in the exercise, the
// number of sets performed (volume), and — when logged — how hard each set was
// taken (RPE / proximity to failure). Fatigue then recovers back to full over
// that muscle's recovery window; a session that piles on well past a normal
// hard day's volume also lengthens that window (bigger dose, longer to clear).
// Freshness across recent sessions combines multiplicatively, so back-to-back
// training on the same muscle stacks without ever driving freshness below zero.

/** Per-set fatigue weight by role. A prime mover set counts full; assistance
 *  and stabilising work count proportionally less. */
export const ROLE_WEIGHT = {
  prime_mover: 1.0,
  synergist: 0.35,
  stabilizer: 0.08,
};

/** Weighted-set count at which a muscle is treated as ~90% depleted. Beyond
 *  this, extra volume adds progressively less (diminishing returns) — and also
 *  starts stretching the recovery window (see windowStretch). */
export const FULL_DEPLETION_SETS = 4;

// Freshness remaining at FULL_DEPLETION_SETS. Fixes the depletion curve's shape.
const RESIDUAL_AT_FULL = 0.1;
const DECAY_K = -Math.log(RESIDUAL_AT_FULL) / FULL_DEPLETION_SETS;

// ─── Effort (RPE) scaling ─────────────────────────────────────────────────────
// A set taken to failure fatigues far more than the same load left well shy of
// it. When a set carries an RPE we scale its fatigue by proximity to failure,
// pivoting on a normal hard working set (RPE 8 ≈ 2 reps in reserve) which counts
// as 1.0 — the same as the un-scaled model. Sets with no RPE stay neutral (1.0),
// so nothing changes for anyone who doesn't log effort.
export const RPE_REFERENCE = 8;   // a hard working set → multiplier 1.0
const EFFORT_SLOPE = 0.08;        // fatigue change per RPE point off reference
const EFFORT_MIN = 0.6;           // an easy set still deposits some fatigue
const EFFORT_MAX = 1.2;           // a true grinder deposits a bit more

/** Fatigue multiplier for one set from its RPE. Neutral (1.0) when RPE is
 *  absent or invalid, so un-logged effort never changes the model. */
export function effortMultiplier(rpe) {
  const r = Number(rpe);
  if (!Number.isFinite(r) || r <= 0) return 1;
  const m = 1 + (r - RPE_REFERENCE) * EFFORT_SLOPE;
  return Math.min(EFFORT_MAX, Math.max(EFFORT_MIN, m));
}

// ─── Volume → recovery-window stretch ─────────────────────────────────────────
// The base recovery window is calibrated for a normal hard session (up to
// FULL_DEPLETION_SETS weighted sets). A session that drives a muscle well past
// that deposits more damage than the fixed window can clear on time, so the
// effective window lengthens with the overload — capped so it can at most
// double. A normal or light session (≤ FULL_DEPLETION_SETS weighted sets) is
// unaffected (stretch = 1).
const WINDOW_STRETCH_PER_SET = 0.1; // +10% window per weighted set past full
const WINDOW_STRETCH_MAX = 2.0;     // never more than double the base window

function windowStretch(weightedSets) {
  const overload = Math.max(0, weightedSets - FULL_DEPLETION_SETS);
  return Math.min(WINDOW_STRETCH_MAX, 1 + WINDOW_STRETCH_PER_SET * overload);
}

function sessionTimestamp(session) {
  return typeof session.finishedAt === 'number'
    ? session.finishedAt
    : new Date(session.date + 'T12:00:00').getTime();
}

/** Effort-weighted set count for one logged exercise. Logged sets are summed by
 *  their per-set RPE multiplier; a planned exercise (sets given as a plain
 *  number, no RPE) counts each set as a neutral 1.0. */
function effortWeightedSetCount(exercise) {
  if (Array.isArray(exercise.sets)) {
    return exercise.sets.reduce((sum, s) => sum + effortMultiplier(s?.rpe), 0);
  }
  if (typeof exercise.sets === 'number') return exercise.sets;
  return 0;
}

/** Per-exercise fatigue multiplier (isometric holds / cardio deposit less than a
 *  working lift set). Defaults to 1 when the exercise or field is absent. */
function fatigueScale(exerciseId, settings) {
  const ex = settings.exercises?.find(e => e.id === exerciseId);
  const scale = ex?.fatigueScale;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/**
 * Total effort-weighted sets a session lands on one muscle, before the
 * saturating curve. Sums each exercise's (role weight × effort-weighted sets ×
 * fatigue scale). This is the raw "dose" that both depletion depth and the
 * recovery-window stretch are derived from.
 *
 * @param {string} muscle
 * @param {{ exercises?: Array<{ exerciseId: string, sets: any }> }} session
 * @param {{ exercises: Array }} settings
 * @returns {number}
 */
function sessionWeightedSets(muscle, session, settings) {
  let weightedSets = 0;
  for (const ex of (session.exercises ?? [])) {
    const role = getExerciseMuscles(ex.exerciseId, settings)[muscle];
    const weight = ROLE_WEIGHT[role];
    if (!weight) continue;
    weightedSets += weight * effortWeightedSetCount(ex) * fatigueScale(ex.exerciseId, settings);
  }
  return weightedSets;
}

/**
 * Total depletion a single session inflicts on one muscle, in [0, 1).
 * Maps the session's weighted-set dose through a saturating curve so more sets
 * always hurt more but with diminishing returns.
 *
 * @param {string} muscle
 * @param {{ exercises?: Array<{ exerciseId: string, sets: any }> }} session
 * @param {{ exercises: Array }} settings
 * @returns {number}
 */
export function sessionDepletion(muscle, session, settings) {
  const weightedSets = sessionWeightedSets(muscle, session, settings);
  if (weightedSets === 0) return 0;
  return 1 - Math.exp(-DECAY_K * weightedSets);
}

/**
 * Current freshness of a muscle given the full training history.
 * Each session contributes a residual (its depletion minus whatever has
 * linearly recovered over that session's effective window); residuals combine
 * multiplicatively.
 *
 * @param {string} muscle
 * @param {Array} history
 * @param {{ exercises: Array, recoveryHours?: Object }} settings
 * @param {number} [now]
 * @returns {{ fraction: number, hoursAgo: number | null }}
 */
export function muscleFreshness(muscle, history, settings, now = Date.now()) {
  const recoveryHours = settings.recoveryHours?.[muscle] ?? 48;
  let freshness = 1;
  let mostRecentHoursAgo = null;

  for (const session of history) {
    const weightedSets = sessionWeightedSets(muscle, session, settings);
    if (weightedSets === 0) continue;

    const hoursAgo = (now - sessionTimestamp(session)) / 3600000;
    if (hoursAgo < 0) continue; // future-dated session, ignore

    const depletion = 1 - Math.exp(-DECAY_K * weightedSets);
    const effectiveWindow = recoveryHours * windowStretch(weightedSets);
    const recovered = Math.min(1, hoursAgo / effectiveWindow);
    const residual = depletion * (1 - recovered);
    freshness *= (1 - residual);

    if (mostRecentHoursAgo === null || hoursAgo < mostRecentHoursAgo) {
      mostRecentHoursAgo = hoursAgo;
    }
  }

  return { fraction: freshness, hoursAgo: mostRecentHoursAgo };
}

/**
 * Hours from `now` until a muscle's freshness reaches `target` (default 0.9).
 * Because freshness recovers linearly and residuals stack multiplicatively, we
 * can't invert in closed form, so we scan forward hour by hour until the modeled
 * freshness clears the target. Returns 0 if already there. The scan runs out to
 * the longest a session could stretch this muscle's window (base × max stretch).
 *
 * @param {string} muscle
 * @param {Array} history
 * @param {{ exercises: Array, recoveryHours?: Object }} settings
 * @param {number} [target] freshness fraction to reach, 0..1
 * @param {number} [now]
 * @returns {number} whole hours until recovered (0 = ready now)
 */
export function hoursUntilFresh(muscle, history, settings, target = 0.9, now = Date.now()) {
  const { fraction } = muscleFreshness(muscle, history, settings, now);
  if (fraction >= target) return 0;
  const window = (settings.recoveryHours?.[muscle] ?? 48) * WINDOW_STRETCH_MAX;
  for (let h = 1; h <= Math.ceil(window); h++) {
    const future = muscleFreshness(muscle, history, settings, now + h * 3600000);
    if (future.fraction >= target) return h;
  }
  return Math.ceil(window);
}

/**
 * Freshness for every muscle in `muscleIds`, keyed by id.
 * @returns {Object<string, { fraction: number, hoursAgo: number | null }>}
 */
export function allMuscleFreshness(muscleIds, history, settings, now = Date.now()) {
  const result = {};
  for (const muscle of muscleIds) {
    result[muscle] = muscleFreshness(muscle, history, settings, now);
  }
  return result;
}

/**
 * Readiness of a whole routine: an average of each trained muscle's current
 * freshness, weighted by how much fatigue TODAY'S planned volume will add to
 * that muscle. Muscles the routine will hammer count most; lightly-worked
 * assistance muscles barely move the score.
 *
 * The weight is the muscle's projected depletion, computed by running the
 * routine's configured set counts through the same saturating curve used for
 * logged sessions. Each entry also carries the strongest ROLE the muscle
 * plays in the routine (used for warnings), independent of the weight.
 *
 * @param {{ exerciseIds?: string[] }} routine
 * @param {{ exercises: Array, recoveryHours?: Object }} settings
 * @param {Array} history
 * @param {number} [now]
 * @returns {{ readiness: number, perMuscle: Array<{ muscle, role, weight, freshness, hoursAgo }> }}
 */
export function routineReadiness(routine, settings, history, now = Date.now()) {
  // Synthetic session standing in for today's planned work: each exercise
  // contributes its configured number of sets.
  const plannedSession = { exercises: [] };
  const roleByMuscle = {};

  for (const exId of (routine.exerciseIds ?? [])) {
    const exercise = settings.exercises?.find(e => e.id === exId);
    plannedSession.exercises.push({ exerciseId: exId, sets: exercise?.setsCount ?? 0 });

    for (const [muscle, role] of Object.entries(getExerciseMuscles(exId, settings))) {
      const weight = ROLE_WEIGHT[role] ?? 0;
      if (weight > (ROLE_WEIGHT[roleByMuscle[muscle]] ?? 0)) {
        roleByMuscle[muscle] = role;
      }
    }
  }

  let weightSum = 0;
  let weightedFreshness = 0;
  const perMuscle = [];

  for (const [muscle, role] of Object.entries(roleByMuscle)) {
    // Weight = fatigue today's planned sets will add to this muscle.
    const weight = sessionDepletion(muscle, plannedSession, settings);
    const { fraction, hoursAgo } = muscleFreshness(muscle, history, settings, now);
    weightSum += weight;
    weightedFreshness += weight * fraction;
    perMuscle.push({ muscle, role, weight, freshness: fraction, hoursAgo });
  }

  perMuscle.sort((a, b) => a.freshness - b.freshness);
  const readiness = weightSum === 0 ? 1 : weightedFreshness / weightSum;
  return { readiness, perMuscle };
}
