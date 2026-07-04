import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warmupSets } from '../js/warmup.js';

test('warmupSets returns empty for non-positive load', () => {
  assert.deepEqual(warmupSets(0), []);
  assert.deepEqual(warmupSets(NaN), []);
});

test('warmupSets collapses to a single bar set at or below the bar', () => {
  const sets = warmupSets(20, { barWeight: 20 });
  assert.equal(sets.length, 1);
  assert.equal(sets[0].weight, 20);
});

test('warmupSets ramps toward a heavy working weight and stays below it', () => {
  const sets = warmupSets(100, { barWeight: 20, increment: 2.5 });
  assert.ok(sets.length >= 2);
  for (const s of sets) assert.ok(s.weight < 100);
  // strictly increasing loads
  for (let i = 1; i < sets.length; i++) assert.ok(sets[i].weight > sets[i - 1].weight);
  // reps drop as load climbs
  for (let i = 1; i < sets.length; i++) assert.ok(sets[i].reps <= sets[i - 1].reps);
});

test('warmupSets never emits duplicate loads after rounding', () => {
  const sets = warmupSets(30, { barWeight: 20, increment: 2.5 });
  const weights = sets.map(s => s.weight);
  assert.equal(new Set(weights).size, weights.length);
  for (const w of weights) assert.ok(w < 30);
});
