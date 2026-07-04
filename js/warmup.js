// Warm-up ramp calculator. Pure: no DOM/storage.
//
// Given a working weight for a barbell lift, produce 2–3 ramp sets that build
// from the empty bar toward the working load, dropping reps as intensity rises.
// Keeps warm-ups proportional so they prime the movement without pre-fatiguing.

import { roundLoad } from './one-rep-max.js';

const DEFAULT_BAR_KG = 20;

// Ramp as fractions of the working weight, with a rep target for each. The last
// (heaviest) primer sits just under the working set.
const RAMP = [
  { pct: 0.45, reps: 8 },
  { pct: 0.65, reps: 5 },
  { pct: 0.85, reps: 3 },
];

/**
 * Warm-up sets building to `workingWeight`.
 * Sets at or below the bar collapse to a single bar set; duplicate loads (after
 * rounding) are removed so we never show two identical primers.
 *
 * @param {number} workingWeight kg on the bar for the working sets
 * @param {{ barWeight?: number, increment?: number }} [opts]
 * @returns {Array<{ weight:number, reps:number }>}
 */
export function warmupSets(workingWeight, opts = {}) {
  const w = Number(workingWeight);
  if (!Number.isFinite(w) || w <= 0) return [];
  const bar = Number.isFinite(opts.barWeight) ? opts.barWeight : DEFAULT_BAR_KG;
  const increment = opts.increment ?? 2.5;

  // Light working weight: an empty-bar set is the only sensible warm-up.
  if (w <= bar) return [{ weight: bar, reps: 8 }];

  const out = [];
  let lastWeight = null;
  for (const { pct, reps } of RAMP) {
    const raw = Math.max(bar, w * pct);
    const weight = roundLoad(raw, increment);
    if (weight >= w) continue;              // never meet/exceed the working set
    if (weight === lastWeight) continue;    // skip a rounding-collapsed duplicate
    out.push({ weight, reps });
    lastWeight = weight;
  }
  // Guarantee at least the bar as a primer for any load above the bar.
  if (out.length === 0) out.push({ weight: bar, reps: 8 });
  return out;
}
