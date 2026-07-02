import { getExerciseMuscles } from './settings-store.js';

// ─── Fatigue model ───────────────────────────────────────────────────────────
//
// A muscle's freshness is a fraction in [0, 1] (1 = fully recovered).
//
// Each logged session deposits fatigue on the muscles it worked. How much
// depends on BOTH the muscle's role in each exercise AND the number of sets
// actually performed (volume). Fatigue then recovers linearly back to full
// over that muscle's configured recovery window. Freshness across multiple
// recent sessions combines multiplicatively, so back-to-back training on the
// same muscle stacks without ever driving freshness below zero.

/** Per-set fatigue weight by role. A prime mover set counts full; assistance
 *  and stabilising work count proportionally less. */
export const ROLE_WEIGHT = {
  prime_mover: 1.0,
  synergist: 0.35,
  stabilizer: 0.08,
};

/** Weighted-set count at which a muscle is treated as ~90% depleted. Beyond
 *  this, extra volume adds progressively less (diminishing returns). */
export const FULL_DEPLETION_SETS = 4;

// Freshness remaining at FULL_DEPLETION_SETS. Fixes the depletion curve's shape.
const RESIDUAL_AT_FULL = 0.1;
const DECAY_K = -Math.log(RESIDUAL_AT_FULL) / FULL_DEPLETION_SETS;

function sessionTimestamp(session) {
  return typeof session.finishedAt === 'number'
    ? session.finishedAt
    : new Date(session.date + 'T12:00:00').getTime();
}

function setCount(exercise) {
  if (Array.isArray(exercise.sets)) return exercise.sets.length;
  if (typeof exercise.sets === 'number') return exercise.sets;
  return 0;
}

/**
 * Total depletion a single session inflicts on one muscle, in [0, 1).
 * Sums weighted sets across every exercise that works the muscle, then maps
 * that volume through a saturating curve so more sets always hurt more but
 * with diminishing returns.
 *
 * @param {string} muscle
 * @param {{ exercises?: Array<{ exerciseId: string, sets: any }> }} session
 * @param {{ exercises: Array }} settings
 * @returns {number}
 */
export function sessionDepletion(muscle, session, settings) {
  let weightedSets = 0;
  for (const ex of (session.exercises ?? [])) {
    const role = getExerciseMuscles(ex.exerciseId, settings)[muscle];
    const weight = ROLE_WEIGHT[role];
    if (!weight) continue;
    weightedSets += weight * setCount(ex);
  }
  if (weightedSets === 0) return 0;
  return 1 - Math.exp(-DECAY_K * weightedSets);
}

/**
 * Current freshness of a muscle given the full training history.
 * Each session contributes a residual (its depletion minus whatever has
 * linearly recovered); residuals combine multiplicatively.
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
    const depletion = sessionDepletion(muscle, session, settings);
    if (depletion === 0) continue;

    const hoursAgo = (now - sessionTimestamp(session)) / 3600000;
    if (hoursAgo < 0) continue; // future-dated session, ignore

    const recovered = Math.min(1, hoursAgo / recoveryHours);
    const residual = depletion * (1 - recovered);
    freshness *= (1 - residual);

    if (mostRecentHoursAgo === null || hoursAgo < mostRecentHoursAgo) {
      mostRecentHoursAgo = hoursAgo;
    }
  }

  return { fraction: freshness, hoursAgo: mostRecentHoursAgo };
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
