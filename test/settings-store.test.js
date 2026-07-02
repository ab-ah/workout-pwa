import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSettings, SETTINGS_KEY } from '../js/settings-store.js';

function makeMemoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

test('default settings use lats instead of the legacy back muscle id', () => {
  globalThis.localStorage = makeMemoryStorage();

  const settings = getSettings();
  const row = settings.exercises.find(ex => ex.id === 'bent-over-barbell-row');

  assert.equal(settings.recoveryHours.lats, 72);
  assert.equal(settings.recoveryHours.back, undefined);
  assert.equal(row.muscles.lats, 'prime_mover');
  assert.equal(row.muscles.back, undefined);
});

test('default exercise roles follow the recovery-focused fatigue categories', () => {
  globalThis.localStorage = makeMemoryStorage();

  const settings = getSettings();
  const byId = new Map(settings.exercises.map(ex => [ex.id, ex]));

  assert.deepEqual(byId.get('flat-barbell-bench-press').muscles, {
    chest: 'prime_mover',
    triceps: 'synergist',
    shoulders: 'synergist',
    lats: 'stabilizer',
  });
  assert.deepEqual(byId.get('incline-dumbbell-press').muscles, {
    chest: 'prime_mover',
    shoulders: 'prime_mover',
    triceps: 'synergist',
  });
  assert.deepEqual(byId.get('dumbbell-romanian-deadlift').muscles, {
    hamstrings: 'prime_mover',
    glutes: 'prime_mover',
    lower_back: 'synergist',
    forearms: 'stabilizer',
  });
  assert.deepEqual(byId.get('plank').muscles, {
    abs: 'prime_mover',
    obliques: 'prime_mover',
    shoulders: 'stabilizer',
    glutes: 'stabilizer',
    lower_back: 'stabilizer',
  });
});
