// Double-progression coaching hint derived from last session's sets.
// Pure: no DOM. exercise-card renders the returned text.

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
