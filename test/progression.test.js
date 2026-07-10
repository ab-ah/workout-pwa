import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestProgression, parseTopReps, prescribeRpe, recommendLoad } from '../js/progression.js';

test('prescribeRpe scales reps-in-reserve to the rep range', () => {
  assert.equal(prescribeRpe({ repRange: '6–8' }).placeholder, 8);
  assert.match(prescribeRpe({ repRange: '6–8' }).text, /RPE 8/);
  assert.match(prescribeRpe({ repRange: '10–12' }).text, /RPE 8–9/);
  assert.match(prescribeRpe({ repRange: '15–20' }).text, /RPE 9–10/);
});

test('prescribeRpe returns null for holds and cardio', () => {
  assert.equal(prescribeRpe({ repRange: '45–60s hold' }), null);
  assert.equal(prescribeRpe({ repRange: '25–35 min', timer: { type: 'duration' } }), null);
  assert.equal(prescribeRpe(null), null);
});

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

test('suggestProgression reframes a loaded lift once it has stalled for 3+ sessions', () => {
  const sets = [{ weight: 50, reps: 8 }, { weight: 50, reps: 7 }];
  const { text } = suggestProgression(sets, '6-8', { stallCount: 3 });
  assert.match(text, /stall/i);
  assert.match(text, /50kg/); // holds the current load
  assert.doesNotMatch(text, /try \d/);
});

test('suggestProgression keeps normal advice below the stall threshold', () => {
  const sets = [{ weight: 50, reps: 8 }, { weight: 50, reps: 8 }];
  const { text } = suggestProgression(sets, '6-8', { stallCount: 2 });
  assert.match(text, /52\.5kg/); // still prescribes the jump
});

test('suggestProgression does not apply the stall reframe to bodyweight work', () => {
  const { text } = suggestProgression([{ weight: 0, reps: 10 }], '12–15', { stallCount: 5 });
  assert.doesNotMatch(text, /stall/i);
  assert.match(text, /beat/i);
});

test('recommendLoad returns null for bodyweight, time, and empty history', () => {
  assert.equal(recommendLoad([{ weight: 0, reps: 15 }], '12–15'), null);
  assert.equal(recommendLoad([{ weight: 20, reps: 60 }], '45–60s hold'), null);
  assert.equal(recommendLoad([], '8–12'), null);
  assert.equal(recommendLoad(null, '8–12'), null);
});

test('recommendLoad holds last top weight when there is no RPE history', () => {
  // Did the top of the range (8) at 50kg, no RPE logged → shouldn't go backwards.
  const rec = recommendLoad([{ weight: 50, reps: 8 }, { weight: 50, reps: 8 }], '6-8');
  assert.equal(rec.reps, 8);
  assert.equal(rec.weight, 50);
  assert.match(rec.text, /50kg × 8/);
});

test('recommendLoad pushes the load up when last session left reps in reserve', () => {
  // 8 reps at RPE ~6.5 means real capacity is higher → recommend heavier.
  const rec = recommendLoad([{ weight: 50, reps: 8, rpe: 6 }, { weight: 50, reps: 8, rpe: 7 }], '6-8');
  assert.ok(rec.weight > 50, `expected >50, got ${rec.weight}`);
  assert.match(rec.text, /last avg RPE 6\.5/);
});

test('recommendLoad holds (does not push) when last session was a grind', () => {
  const rec = recommendLoad([{ weight: 50, reps: 8, rpe: 9.5 }, { weight: 50, reps: 8, rpe: 9 }], '6-8');
  assert.ok(rec.weight <= 50, `expected ≤50 after a grind, got ${rec.weight}`);
});

test('recommendLoad rounds to the given weight step', () => {
  const rec = recommendLoad([{ weight: 100, reps: 8, rpe: 6 }], '6-8', { weightStep: 5 });
  assert.equal(rec.weight % 5, 0);
});
