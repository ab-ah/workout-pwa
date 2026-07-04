import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveSuggestion } from '../js/adaptive.js';

test('high readiness → train as planned, no dropped sets', () => {
  const s = adaptiveSuggestion(0.92, []);
  assert.equal(s.level, 'ready');
  assert.equal(s.dropSets, 0);
});

test('mid readiness → trim one set', () => {
  const s = adaptiveSuggestion(0.7, []);
  assert.equal(s.level, 'trim');
  assert.equal(s.dropSets, 1);
});

test('low readiness → caution, drop two, list lagging prime movers', () => {
  const perMuscle = [
    { muscle: 'chest', role: 'prime_mover', freshness: 0.4 },
    { muscle: 'triceps', role: 'synergist', freshness: 0.3 },
    { muscle: 'shoulders', role: 'prime_mover', freshness: 0.55 },
  ];
  const s = adaptiveSuggestion(0.45, perMuscle);
  assert.equal(s.level, 'caution');
  assert.equal(s.dropSets, 2);
  // only prime movers below threshold, sorted worst-first
  assert.deepEqual(s.laggingMuscles, ['chest', 'shoulders']);
});

test('non-finite readiness is treated as fully ready', () => {
  const s = adaptiveSuggestion(undefined, []);
  assert.equal(s.level, 'ready');
});
