// In-flow exercise substitution. Pure: no DOM/storage.
//
// Mid-workout, an exercise might not be an option today (a tweaked joint, a
// bench in use). This finds same-purpose swaps from the existing pool — every
// pooled exercise is already equipment-valid for this user, so any candidate is
// safe to do. Candidates are ranked by how much their prime movers overlap with
// the original's, so the closest substitute comes first.

/** Prime-mover muscle ids for an exercise. */
function primeMovers(exercise) {
  return Object.entries(exercise?.muscles ?? {})
    .filter(([, role]) => role === 'prime_mover')
    .map(([m]) => m);
}

/**
 * Same-muscle substitutes for `exercise`, drawn from `allExercises`, ranked by
 * prime-mover overlap then name. The exercise itself is excluded; so is anything
 * that shares no prime mover with it (a different movement pattern entirely).
 *
 * @param {{ id:string, name?:string, muscles?:Object<string,string> }} exercise
 * @param {Array<{ id:string, name?:string, muscles?:Object<string,string> }>} allExercises
 * @returns {Array<object>} candidate exercise objects, best match first
 */
export function substituteOptions(exercise, allExercises) {
  if (!exercise) return [];
  const primes = primeMovers(exercise);
  if (primes.length === 0) return [];
  const primeSet = new Set(primes);

  return (allExercises ?? [])
    .filter(e => e && e.id !== exercise.id)
    .map(e => ({ e, overlap: primeMovers(e).filter(m => primeSet.has(m)).length }))
    .filter(x => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || String(a.e.name ?? '').localeCompare(String(b.e.name ?? '')))
    .map(x => x.e);
}
