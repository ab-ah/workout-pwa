// Superset flow helpers. Pure: no DOM/storage.
//
// A routine may declare antagonist `supersets` — [idA, idB] pairs meant to be
// run by alternating a set of each with one shared rest after the pair. The
// Today flow walks "steps" instead of raw exercises: a step is either a single
// exercise or a superset of two ADJACENT exercises. (Pairs are only merged when
// the two ids sit next to each other in the routine; a non-adjacent declaration
// degrades gracefully to two singles rather than reordering the session.)

/**
 * Group a routine's exercises into ordered flow steps.
 * @param {{ exerciseIds?: string[], supersets?: Array<[string,string]> }} routine
 * @returns {Array<{ exerciseIds: string[] }>}  each step has 1 or 2 exercise ids
 */
export function buildFlowSteps(routine) {
  const ids = routine?.exerciseIds ?? [];
  const pairs = routine?.supersets ?? [];
  const arePaired = (a, b) =>
    pairs.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));

  const steps = [];
  let i = 0;
  while (i < ids.length) {
    if (i + 1 < ids.length && arePaired(ids[i], ids[i + 1])) {
      steps.push({ exerciseIds: [ids[i], ids[i + 1]] });
      i += 2;
    } else {
      steps.push({ exerciseIds: [ids[i]] });
      i += 1;
    }
  }
  return steps;
}

/**
 * Interleaved logging order for a superset of two exercises with `setsA` and
 * `setsB` working sets: set 1 of A, set 1 of B, (rest), set 2 of A, set 2 of B,
 * (rest), … When one exercise has more sets, its extra sets tail on alone. Each
 * slot flags whether a shared rest follows it — true after the last slot of a
 * round, except the final slot overall.
 *
 * @param {number} setsA
 * @param {number} setsB
 * @returns {Array<{ side:0|1, set:number, restAfter:boolean }>}
 */
export function buildSlotSequence(setsA, setsB) {
  const a = Math.max(0, Math.floor(setsA) || 0);
  const b = Math.max(0, Math.floor(setsB) || 0);
  const rounds = Math.max(a, b);
  const slots = [];
  for (let r = 0; r < rounds; r++) {
    if (r < a) slots.push({ side: 0, set: r, restAfter: false });
    if (r < b) slots.push({ side: 1, set: r, restAfter: false });
  }
  // Rest after the last slot of each round, but never after the final slot.
  let idx = 0;
  for (let r = 0; r < rounds; r++) {
    idx += (r < a ? 1 : 0) + (r < b ? 1 : 0);
    if (idx < slots.length) slots[idx - 1].restAfter = true;
  }
  return slots;
}

/**
 * First slot not yet satisfied by the sets already logged for each side — the
 * resume point when re-entering a partly-done superset.
 * @param {Array<{side:0|1,set:number}>} slots
 * @param {number} loggedA
 * @param {number} loggedB
 * @returns {number}
 */
export function nextSlotIndex(slots, loggedA, loggedB) {
  for (let i = 0; i < slots.length; i++) {
    const done = slots[i].side === 0 ? loggedA : loggedB;
    if (done <= slots[i].set) return i;
  }
  return slots.length;
}
