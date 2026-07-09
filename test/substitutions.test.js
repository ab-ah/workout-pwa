import { test } from 'node:test';
import assert from 'node:assert/strict';
import { substituteOptions } from '../js/substitutions.js';

const POOL = [
  { id: 'goblet-squat', name: 'Goblet Squat', muscles: { quads: 'prime_mover', glutes: 'synergist' } },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscles: { quads: 'prime_mover', glutes: 'prime_mover' } },
  { id: 'reverse-lunge', name: 'Reverse Lunge', muscles: { quads: 'prime_mover', glutes: 'prime_mover' } },
  { id: 'leg-curl', name: 'Leg Curl', muscles: { hamstrings: 'prime_mover' } },
  { id: 'bench', name: 'Bench Press', muscles: { chest: 'prime_mover', triceps: 'synergist' } },
];

test('returns same-prime-mover swaps, excluding the exercise itself', () => {
  const target = POOL[0]; // goblet squat (quads prime)
  const ids = substituteOptions(target, POOL).map(e => e.id);
  assert.ok(ids.includes('bulgarian-split-squat'));
  assert.ok(ids.includes('reverse-lunge'));
  assert.ok(!ids.includes('goblet-squat'), 'excludes itself');
  assert.ok(!ids.includes('leg-curl'), 'different prime mover excluded');
  assert.ok(!ids.includes('bench'), 'unrelated exercise excluded');
});

test('ranks higher prime-mover overlap first', () => {
  // A two-prime quad+glute move should surface the other two-prime moves above
  // a single-prime quad move.
  const target = { id: 'x', name: 'X', muscles: { quads: 'prime_mover', glutes: 'prime_mover' } };
  const ids = substituteOptions(target, POOL).map(e => e.id);
  assert.deepEqual(ids.slice(0, 2).sort(), ['bulgarian-split-squat', 'reverse-lunge']);
  assert.equal(ids[ids.length - 1], 'goblet-squat'); // only 1 overlapping prime
});

test('exercise with no prime mover yields no options', () => {
  const target = { id: 'plank', name: 'Plank', muscles: { abs: 'synergist' } };
  assert.deepEqual(substituteOptions(target, POOL), []);
});

test('handles empty / missing pool gracefully', () => {
  assert.deepEqual(substituteOptions(POOL[0], []), []);
  assert.deepEqual(substituteOptions(POOL[0], undefined), []);
  assert.deepEqual(substituteOptions(null, POOL), []);
});
