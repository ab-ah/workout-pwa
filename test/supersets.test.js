import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFlowSteps, buildSlotSequence, nextSlotIndex } from '../js/supersets.js';

test('buildFlowSteps merges adjacent declared pairs, leaves the rest single', () => {
  const routine = {
    exerciseIds: ['bench', 'row', 'squat', 'curl', 'tri'],
    supersets: [['bench', 'row'], ['curl', 'tri']],
  };
  const steps = buildFlowSteps(routine);
  assert.deepEqual(steps.map(s => s.exerciseIds), [
    ['bench', 'row'],
    ['squat'],
    ['curl', 'tri'],
  ]);
});

test('buildFlowSteps matches a pair regardless of declared order', () => {
  const steps = buildFlowSteps({ exerciseIds: ['row', 'bench'], supersets: [['bench', 'row']] });
  assert.deepEqual(steps.map(s => s.exerciseIds), [['row', 'bench']]);
});

test('buildFlowSteps degrades a non-adjacent pair to singles', () => {
  const steps = buildFlowSteps({
    exerciseIds: ['bench', 'squat', 'row'],
    supersets: [['bench', 'row']], // not next to each other
  });
  assert.deepEqual(steps.map(s => s.exerciseIds), [['bench'], ['squat'], ['row']]);
});

test('buildFlowSteps returns all singles with no supersets', () => {
  const steps = buildFlowSteps({ exerciseIds: ['a', 'b', 'c'] });
  assert.deepEqual(steps.map(s => s.exerciseIds), [['a'], ['b'], ['c']]);
});

test('buildSlotSequence interleaves A/B and rests after each completed pair', () => {
  const slots = buildSlotSequence(3, 3);
  assert.deepEqual(slots.map(s => [s.side, s.set]), [
    [0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2],
  ]);
  // rest after each B set except the very last slot
  assert.deepEqual(slots.map(s => s.restAfter), [false, true, false, true, false, false]);
});

test('buildSlotSequence tails the longer exercise on alone', () => {
  const slots = buildSlotSequence(4, 2);
  assert.deepEqual(slots.map(s => [s.side, s.set]), [
    [0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [0, 3],
  ]);
  // after B's last set (index 3) a rest fires; the trailing A-only sets rest too, except the last
  assert.deepEqual(slots.map(s => s.restAfter), [false, true, false, true, true, false]);
});

test('nextSlotIndex resumes at the first unlogged slot', () => {
  const slots = buildSlotSequence(3, 3);
  assert.equal(nextSlotIndex(slots, 0, 0), 0); // fresh
  assert.equal(nextSlotIndex(slots, 1, 0), 1); // A1 done → B1 next
  assert.equal(nextSlotIndex(slots, 1, 1), 2); // round 1 done → A2 next
  assert.equal(nextSlotIndex(slots, 3, 3), 6); // all done → past the end
});
