// Planned weekly training volume (working sets per muscle) across the schedule.
// Pure: no DOM. The week view renders the returned bars.

// A set counts as working volume for a muscle when the exercise trains it as a
// prime mover or synergist (stabilisers are excluded — they aren't the point of
// the set). A prime-mover set counts in full; a synergist set counts at HALF,
// matching standard hypertrophy volume accounting and the weighting already
// used by the recovery model (ROLE_WEIGHT in recovery-model.js), where indirect
// work fatigues a muscle far less than direct work.
const VOLUME_ROLE_WEIGHT = { prime_mover: 1, synergist: 0.5 };

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
