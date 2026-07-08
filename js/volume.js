// Planned weekly training volume (working sets per muscle) across the schedule.
// Pure: no DOM. The week view renders the returned bars.

// A set counts as working volume for a muscle when the exercise trains it as a
// prime mover or synergist (stabilisers are excluded — they aren't the point of
// the set). A prime-mover set counts in full; a synergist set counts at HALF,
// matching standard hypertrophy volume accounting and the weighting already
// used by the recovery model (ROLE_WEIGHT in recovery-model.js), where indirect
// work fatigues a muscle far less than direct work.
const VOLUME_ROLE_WEIGHT = { prime_mover: 1, synergist: 0.5 };

// Weekly working-set landmarks per muscle (Renaissance-Periodization style):
//   mev = minimum effective volume (below this, you're barely maintaining)
//   mav = adaptive volume (the productive growth band sits mev–mrv, centred here)
//   mrv = maximum recoverable volume (above this, fatigue outruns recovery)
// Values are direct-set counts; the volume tally already half-credits synergist
// work, so these compare against that same weighted number. Tuned a touch lower
// for a calorie-deficit context, where recoverable volume is reduced.
export const VOLUME_LANDMARKS = {
  chest:       { mev: 8,  mav: 14, mrv: 20 },
  // Front delts get direct pressing 4×/week here; 18 MRV matches the literature
  // for a muscle this press-tolerant and keeps the plan's pressing volume in the
  // productive band instead of falsely flagging "over MRV".
  front_delts: { mev: 6,  mav: 10, mrv: 18 },
  side_delts:  { mev: 8,  mav: 14, mrv: 22 },
  rear_delts:  { mev: 6,  mav: 10, mrv: 18 },
  traps:       { mev: 4,  mav: 10, mrv: 18 },
  lats:        { mev: 10, mav: 16, mrv: 22 },
  lower_back:  { mev: 2,  mav: 6,  mrv: 10 },
  biceps:      { mev: 8,  mav: 14, mrv: 20 },
  triceps:     { mev: 6,  mav: 12, mrv: 18 },
  forearms:    { mev: 2,  mav: 6,  mrv: 12 },
  quads:       { mev: 8,  mav: 14, mrv: 20 },
  hamstrings:  { mev: 6,  mav: 10, mrv: 16 },
  // Glute weekly volume here is entirely INDIRECT (synergist half-credit from
  // squats/RDLs/lunges — no direct glute isolation), so the ceiling is set a
  // touch higher: indirect-only work shouldn't trip the same MRV flag as direct
  // sets would.
  glutes:      { mev: 4,  mav: 10, mrv: 18 },
  calves:      { mev: 8,  mav: 12, mrv: 18 },
  abs:         { mev: 6,  mav: 14, mrv: 25 },
  obliques:    { mev: 4,  mav: 10, mrv: 20 },
};

/**
 * Classify a muscle's weekly set count against its landmarks.
 * @param {string} muscle
 * @param {number} sets
 * @returns {{ tier:'below'|'maintenance'|'optimal'|'high'|'unknown',
 *             landmarks:{mev:number,mav:number,mrv:number}|null }}
 */
export function volumeStatus(muscle, sets) {
  const lm = VOLUME_LANDMARKS[muscle];
  if (!lm) return { tier: 'unknown', landmarks: null };
  let tier;
  if (sets < lm.mev) tier = 'below';
  else if (sets < lm.mav) tier = 'maintenance';
  else if (sets <= lm.mrv) tier = 'optimal';
  else tier = 'high';
  return { tier, landmarks: lm };
}

/**
 * @param {Object<string,string|null>} schedule  dow → routineId
 * @param {Array<{id:string, exerciseIds:string[]}>} routines
 * @param {Array<{id:string, setsCount:number, muscles:Object<string,string>}>} exercises
 * @returns {Array<{ muscle: string, sets: number }>} sorted desc by sets
 */
export function weeklyVolumeByMuscle(schedule, routines, exercises) {
  const routineById = new Map((routines ?? []).map(r => [r.id, r]));
  const exerciseById = new Map((exercises ?? []).map(e => [e.id, e]));
  const tally = {};

  for (const dow of Object.keys(schedule ?? {})) {
    const routine = routineById.get(schedule[dow]);
    if (!routine) continue;
    for (const exId of (routine.exerciseIds ?? [])) {
      const ex = exerciseById.get(exId);
      if (!ex) continue;
      const setsCount = ex.setsCount ?? 0;
      for (const [muscle, role] of Object.entries(ex.muscles ?? {})) {
        const weight = VOLUME_ROLE_WEIGHT[role];
        if (!weight) continue;
        tally[muscle] = (tally[muscle] ?? 0) + setsCount * weight;
      }
    }
  }

  return Object.entries(tally)
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets);
}
