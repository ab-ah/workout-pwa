// Estimate how long a routine takes to train, in minutes. Pure: no DOM/storage.
//
// The estimate accounts for the real time cost of a session:
//   - the working sets themselves (time under way, not just the reps),
//   - the prescribed between-set rest,
//   - antagonist supersets, which share ONE rest per round instead of resting
//     after every exercise (so they run meaningfully faster than two singles),
//   - cardio timers, whose programmed duration IS the exercise,
//   - isometric holds, timed by their hold seconds rather than a rep set.
//
// It is deliberately a coaching-grade approximation, not a stopwatch: the
// constants below are averages, and warm-ups / setup faff aren't modelled.

import { buildFlowSteps } from './supersets.js';
import { buildPhases } from './components/workout-timer.js';

// Average seconds a working strength set is actually under way — unrack, the
// reps, rack — separate from the programmed rest that follows it.
const STRENGTH_SET_WORK_SECONDS = 40;
// Fallback hold time (s) when an isometric's rep range doesn't name one.
const DEFAULT_HOLD_SECONDS = 45;
// Changeover between steps: walking to the next station and setting up.
const STEP_TRANSITION_SECONDS = 20;

/** Seconds of one working set of `ex`, EXCLUDING the rest that follows it. */
function setWorkSeconds(ex) {
  if (ex?.timer) {
    // A cardio timer's whole programmed duration is a single "set".
    return buildPhases(ex.timer).reduce((sum, p) => sum + (Number(p.seconds) || 0), 0);
  }
  const holdMatch = typeof ex?.repRange === 'string' && ex.repRange.match(/(\d+)\s*s\b/i);
  if (holdMatch) return parseInt(holdMatch[1], 10);
  if (typeof ex?.repRange === 'string' && /(sec|hold)/i.test(ex.repRange)) return DEFAULT_HOLD_SECONDS;
  return STRENGTH_SET_WORK_SECONDS;
}

/** Working-set count for an exercise, floored to a sane minimum of 1. */
function setsCountOf(ex) {
  const n = Number(ex?.setsCount);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

/** Prescribed between-set rest in seconds (0 if unset). */
function restOf(ex) {
  const r = Number(ex?.restSeconds);
  return Number.isFinite(r) && r >= 0 ? r : 0;
}

/** Seconds for one single-exercise step: each set is work + rest, minus the
 *  trailing rest (you move on rather than resting after the final set). */
function singleStepSeconds(ex) {
  const sets = setsCountOf(ex);
  return sets * setWorkSeconds(ex) + Math.max(0, sets - 1) * restOf(ex);
}

/** Seconds for a two-exercise antagonist superset: rounds = the higher set
 *  count; each round runs a set of each side then ONE shared rest (the longer of
 *  the two prescribed rests), with no rest after the final round. */
function supersetStepSeconds(exA, exB) {
  const rounds = Math.max(setsCountOf(exA), setsCountOf(exB));
  const workPerRound = setWorkSeconds(exA) + setWorkSeconds(exB);
  const rest = Math.max(restOf(exA), restOf(exB));
  return rounds * workPerRound + Math.max(0, rounds - 1) * rest;
}

/**
 * Estimated total minutes for a routine.
 *
 * @param {{ exerciseIds?: string[], supersets?: Array<[string,string]> }} routine
 * @param {Array<object>} allExercises  the exercise pool to resolve ids against
 * @returns {number}  whole minutes (rounded, 0 for an empty/unresolved routine)
 */
export function estimateRoutineMinutes(routine, allExercises) {
  if (!routine) return 0;
  const byId = new Map((allExercises ?? []).map(e => [e.id, e]));
  const steps = buildFlowSteps(routine);

  let seconds = 0;
  let realSteps = 0;
  for (const step of steps) {
    const exs = step.exerciseIds.map(id => byId.get(id)).filter(Boolean);
    if (exs.length === 0) continue; // id points at a since-deleted exercise
    realSteps++;
    seconds += exs.length === 2
      ? supersetStepSeconds(exs[0], exs[1])
      : singleStepSeconds(exs[0]);
  }
  if (realSteps === 0) return 0;
  seconds += Math.max(0, realSteps - 1) * STEP_TRANSITION_SECONDS;
  return Math.round(seconds / 60);
}
