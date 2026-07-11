// Double-progression coaching hint derived from last session's sets.
// Pure: no DOM. exercise-card renders the returned text.

import { epley1RM, loadForReps, roundLoad } from './one-rep-max.js';

const DEFAULT_WEIGHT_STEP = 2.5; // kg

// Sessions of flat/declining e1RM before the coach stops chasing load and calls
// the plateau instead. On a cut, a stall is expected — holding strength while
// bodyweight drops is a win, not a failure, so the message reframes rather than
// pushing a jump that isn't there.
const STALL_THRESHOLD = 3;

/** Top of a rep range: "8–12"→12, "6-8"→8, "10 / leg"→10, "12 (8/side)"→12. */
export function parseTopReps(repRange) {
  if (typeof repRange !== 'string') return null;
  const nums = repRange.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  const a = parseInt(nums[0], 10);
  const b = nums[1] != null ? parseInt(nums[1], 10) : a;
  return Math.max(a, b);
}

function isTimeBased(repRange) {
  return typeof repRange === 'string' && /(\d\s*s\b|sec|hold)/i.test(repRange);
}

/** True when the "rep range" is actually a distance, e.g. a loaded carry logged
 *  in metres ("30–40 m"). Such work isn't scored in reps, so the reps-in-reserve
 *  RPE target doesn't apply and the logger labels the field as distance. The
 *  negative lookahead keeps "min" (cardio) from matching the metre unit. */
export function isDistanceBased(repRange) {
  return typeof repRange === 'string' && /\d\s*m(?![a-z])/i.test(repRange);
}

/**
 * Prescribed effort target for a working set, so the app tells you how hard to
 * push (reps in reserve) instead of only recording RPE after the fact. Heavier,
 * lower-rep work leaves more in the tank (technique/joint cost); higher-rep
 * isolation is taken closer to failure. Time-based/cardio work has no RPE target.
 *
 * @param {{ repRange?: string, timer?: object }} exercise
 * @returns {{ text: string, placeholder: number } | null}
 */
export function prescribeRpe(exercise) {
  if (!exercise) return null;
  if (exercise.timer) return null; // cardio countdown — effort isn't RPE-scored
  const repRange = exercise.repRange;
  if (isTimeBased(repRange)) return null; // holds are chased by time, not RPE
  if (isDistanceBased(repRange)) return null; // loaded carries are chased by distance/load, not a reps-in-reserve target
  const top = parseTopReps(repRange);
  if (top == null) return null;

  if (top <= 8) return { text: 'Target RPE 8 · leave ~2 reps in reserve', placeholder: 8 };
  if (top <= 12) return { text: 'Target RPE 8–9 · leave 1–2 reps in reserve', placeholder: 8 };
  return { text: 'Target RPE 9–10 · leave 0–1 reps in reserve', placeholder: 9 };
}

/** Round to one decimal, dropping a trailing .0 (RPE 7.5 stays, 8.0 → 8). */
function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Suggest the next progression from the previous session's sets.
 * Double progression: once every set reaches the top of the range, add load;
 * otherwise chase reps. Bodyweight (no load) chases reps / sets.
 *
 * @param {Array<{weight:number,reps:number}>} previousSets
 * @param {string} repRange
 * @param {{ weightStep?: number, stallCount?: number }} [opts]
 * @returns {{ text: string } | null}
 */
export function suggestProgression(previousSets, repRange, opts = {}) {
  if (!Array.isArray(previousSets) || previousSets.length === 0) return null;
  const step = opts.weightStep ?? DEFAULT_WEIGHT_STEP;

  const reps = previousSets.map(s => Number(s.reps) || 0);
  const weights = previousSets.map(s => Number(s.weight) || 0);
  const maxReps = Math.max(...reps);
  const minReps = Math.min(...reps);
  const topWeight = Math.max(...weights);

  if (isTimeBased(repRange)) {
    return { text: `Last ${maxReps}s — beat your hold time` };
  }

  const top = parseTopReps(repRange);
  const bodyweight = topWeight === 0;

  // A loaded lift that's plateaued for several sessions: stop prescribing a jump
  // that hasn't been there and reframe. Bodyweight/time work is chased by reps,
  // so a stall there just means "beat it", handled below.
  const stall = Number(opts.stallCount) || 0;
  if (!bodyweight && stall >= STALL_THRESHOLD) {
    return { text: `Stalled ${stall} sessions — hold ${topWeight}kg and grind the reps, or drop ~10% and rebuild. In a deficit, keeping strength is the win.` };
  }

  // Autoregulation: if the sets carried RPE, use the average to size the jump.
  // Low RPE (lots left in the tank) → a bolder bump; high RPE → hold and grind.
  const rpes = previousSets.map(s => Number(s.rpe)).filter(v => Number.isFinite(v) && v > 0);
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

  if (bodyweight) {
    if (top != null && minReps >= top) return { text: `Hit ${minReps}+ every set — add a set or load` };
    return { text: `Last best ${maxReps} — beat it` };
  }

  if (top != null && minReps >= top) {
    if (avgRpe != null && avgRpe <= 7) {
      return { text: `Maxed reps at RPE ${round1(avgRpe)} — jump to ${topWeight + step * 2}kg` };
    }
    if (avgRpe != null && avgRpe >= 9) {
      return { text: `All sets ≥ ${top} but RPE ${round1(avgRpe)} — hold ${topWeight}kg, add reps` };
    }
    return { text: `All sets ≥ ${top} reps — try ${topWeight + step}kg` };
  }
  if (top != null) {
    return { text: `Work ${topWeight}kg up to ${top} reps` };
  }
  return { text: `Beat ${maxReps} reps at ${topWeight}kg` };
}

/**
 * Recommend today's working weight from the previous session's actual sets —
 * weights, reps AND logged RPE. It estimates your 1RM from last session's best
 * set, then picks the load that should land you at the top of the rep range with
 * reps-in-reserve sized by how hard last session actually felt: an easy day
 * (avg RPE ≤ 7) pushes for the top rep with nothing in reserve, a grind (avg RPE
 * ≥ 9) backs off a couple of reps. Returns null for bodyweight/time work or when
 * there's no loaded history to learn from (the card falls back to its start hint).
 *
 * @param {Array<{weight:number,reps:number,rpe?:number}>} previousSets
 * @param {string} repRange
 * @param {{ weightStep?: number }} [opts]
 * @returns {{ weight:number, reps:number, avgRpe:number|null, text:string } | null}
 */
export function recommendLoad(previousSets, repRange, opts = {}) {
  if (!Array.isArray(previousSets) || previousSets.length === 0) return null;
  if (isTimeBased(repRange)) return null;

  const loaded = previousSets.filter(s => (Number(s.weight) || 0) > 0);
  if (loaded.length === 0) return null; // bodyweight — no external load to prescribe
  const topWeight = Math.max(...loaded.map(s => Number(s.weight) || 0));

  const top = parseTopReps(repRange);
  const targetReps = top ?? Math.max(...loaded.map(s => Number(s.reps) || 0));
  if (!targetReps) return null;

  // Effort-adjusted 1RM: a set stopped short of failure (low RPE) implies a higher
  // true 1RM than its raw reps show, so credit the reps left in reserve
  // (RIR ≈ 10 − RPE) before estimating. No RPE → take the reps at face value.
  let e1rm = null;
  for (const s of loaded) {
    const w = Number(s.weight) || 0;
    const r = Number(s.reps) || 0;
    if (w <= 0 || r <= 0) continue;
    const rpe = Number(s.rpe);
    const rir = Number.isFinite(rpe) && rpe > 0 ? Math.max(0, 10 - rpe) : 0;
    const e = epley1RM(w, r + rir);
    if (e != null && (e1rm === null || e > e1rm)) e1rm = e;
  }
  if (!e1rm) return null;

  const step = opts.weightStep ?? DEFAULT_WEIGHT_STEP;
  const rpes = loaded.map(s => Number(s.rpe)).filter(v => Number.isFinite(v) && v > 0);
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;

  // Aim for ~1 rep in reserve at the top of the range.
  let weight = roundLoad(loadForReps(e1rm, targetReps + 1), step);
  // Never prescribe going backwards unless last session was a genuine grind.
  if (avgRpe == null || avgRpe < 9) weight = Math.max(weight, topWeight);

  const rpeNote = avgRpe != null ? ` · last avg RPE ${round1(avgRpe)}` : '';
  return { weight, reps: targetReps, avgRpe, text: `Try ~${weight}kg × ${targetReps}${rpeNote}` };
}
