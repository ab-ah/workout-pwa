// Readiness-adaptive session advice. Pure: no DOM/storage.
//
// Turns a routine's readiness score (and its per-muscle freshness breakdown,
// both from recovery-model.routineReadiness) into a concrete recommendation:
// train as planned, trim volume, or hold the heavy compounds back. The point is
// to autoregulate — push on fresh days, pull back when under-recovered — instead
// of grinding a fixed plan into a hole.

// Readiness thresholds. Above READY: go as planned. Between: trim a set.
// Below CAUTION: back off / swap heavy compounds.
const READY = 0.85;
const CAUTION = 0.6;

// A prime-mover muscle below this freshness is called out by name as the limiter.
const LAGGING_MUSCLE = 0.6;

/**
 * @param {number} readiness 0..1 from routineReadiness
 * @param {Array<{ muscle:string, role:string, freshness:number }>} perMuscle
 * @param {{ ready?:number, caution?:number }} [opts]
 * @returns {{ level:'ready'|'trim'|'caution', headline:string, detail:string,
 *            dropSets:number, laggingMuscles:string[] }}
 */
export function adaptiveSuggestion(readiness, perMuscle = [], opts = {}) {
  const ready = opts.ready ?? READY;
  const caution = opts.caution ?? CAUTION;
  const r = Number.isFinite(readiness) ? readiness : 1;

  const lagging = (perMuscle ?? [])
    .filter(m => m.role === 'prime_mover' && m.freshness < LAGGING_MUSCLE)
    .sort((a, b) => a.freshness - b.freshness)
    .map(m => m.muscle);

  if (r >= ready) {
    return {
      level: 'ready',
      headline: 'Train as planned',
      detail: 'Recovery looks good — chase your progression targets today.',
      dropSets: 0,
      laggingMuscles: [],
    };
  }

  if (r >= caution) {
    return {
      level: 'trim',
      headline: 'Trim one set per exercise',
      detail: 'Partial recovery — keep the working weight, cut a set to manage fatigue.',
      dropSets: 1,
      laggingMuscles: lagging,
    };
  }

  return {
    level: 'caution',
    headline: 'Go light or swap the heavy compounds',
    detail: 'Under-recovered — drop a set, hold weight, or swap in accessory work for the lagging muscles.',
    dropSets: 2,
    laggingMuscles: lagging,
  };
}
