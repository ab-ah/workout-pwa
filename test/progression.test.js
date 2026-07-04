import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestProgression, parseTopReps } from '../js/progression.js';

test('parseTopReps reads the top of assorted range formats', () => {
  assert.equal(parseTopReps('8–12'), 12);
  assert.equal(parseTopReps('6-8'), 8);
  assert.equal(parseTopReps('10 / leg'), 10);
  assert.equal(parseTopReps('12 (8/side)'), 12);
  assert.equal(parseTopReps('15'), 15);
  assert.equal(parseTopReps('bodyweight'), null);
});

test('suggestProgression returns null without previous sets', () => {
  assert.equal(suggestProgression(null, '8–12'), null);
  assert.equal(suggestProgression([], '8–12'), null);
});

test('suggestProgression bumps weight when every set hit the top of range', () => {
  const sets = [{ weight: 50, reps: 12 }, { weight: 50, reps: 12 }, { weight: 50, reps: 12 }];
  const { text } = suggestProgression(sets, '8–12');
  assert.match(text, /52\.5kg/);
});

test('suggestProgression chases reps when not all sets reached the top', () => {
  const sets = [{ weight: 50, reps: 12 }, { weight: 50, reps: 10 }, { weight: 50, reps: 8 }];
  const { text } = suggestProgression(sets, '8–12');
  assert.match(text, /up to 12 reps/);
  assert.doesNotMatch(text, /try \d/); // not a weight-bump message
});

test('suggestProgression treats zero-weight sets as bodyweight', () => {
  const maxed = suggestProgression([{ weight: 0, reps: 15 }, { weight: 0, reps: 15 }], '12–15');
  assert.match(maxed.text, /add a set|load/i);
  const notMaxed = suggestProgression([{ weight: 0, reps: 10 }], '12–15');
  assert.match(notMaxed.text, /beat/i);
});

test('suggestProgression gives a time cue for hold-based work', () => {
  const { text } = suggestProgression([{ weight: 0, reps: 60 }], '45–60s hold');
  assert.match(text, /60s/);
  assert.match(text, /hold time/i);
});

test('suggestProgression respects a custom weight step', () => {
  const sets = [{ weight: 100, reps: 8 }, { weight: 100, reps: 8 }];
  const { text } = suggestProgression(sets, '6-8', { weightStep: 5 });
  assert.match(text, /105kg/);
});

test('suggestProgression makes a bolder jump when maxed reps came at low RPE', () => {
  const sets = [{ weight: 50, reps: 8, rpe: 6 }, { weight: 50, reps: 8, rpe: 7 }];
  const { text } = suggestProgression(sets, '6-8'); // default step 2.5, so +5 → 55
  assert.match(text, /55kg/);
  assert.match(text, /RPE/);
});

test('suggestProgression holds load when maxed reps came at high RPE', () => {
  const sets = [{ weight: 50, reps: 8, rpe: 9.5 }, { weight: 50, reps: 8, rpe: 9 }];
  const { text } = suggestProgression(sets, '6-8');
  assert.match(text, /hold 50kg/);
  assert.doesNotMatch(text, /try \d/);
});

test('suggestProgression ignores RPE when absent (backward compatible)', () => {
  const sets = [{ weight: 50, reps: 8 }, { weight: 50, reps: 8 }];
  const { text } = suggestProgression(sets, '6-8');
  assert.match(text, /52\.5kg/);
});
