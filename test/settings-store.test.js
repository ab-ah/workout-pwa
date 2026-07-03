import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSettings, saveSettings, SETTINGS_KEY, CURRENT_PLAN_VERSION } from '../js/settings-store.js';

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
    traps: 'stabilizer',
  });
  assert.deepEqual(byId.get('plank').muscles, {
    abs: 'prime_mover',
    obliques: 'synergist',
    shoulders: 'stabilizer',
    glutes: 'stabilizer',
    lower_back: 'stabilizer',
  });
});

test('fat-loss plan ships the new conditioning exercises with muscle maps', () => {
  globalThis.localStorage = makeMemoryStorage();

  const settings = getSettings();
  const byId = new Map(settings.exercises.map(ex => [ex.id, ex]));

  for (const id of ['treadmill-incline-walk', 'treadmill-hiit-intervals', 'dumbbell-thruster', 'dumbbell-swing', 'renegade-row', 'burpee']) {
    assert.ok(byId.has(id), `expected default exercise "${id}" to exist`);
  }
  assert.equal(byId.get('dumbbell-thruster').muscles.quads, 'prime_mover');
  assert.equal(byId.get('dumbbell-thruster').muscles.shoulders, 'prime_mover');
});

test('treadmill exercises ship a cardio countdown timer config', () => {
  globalThis.localStorage = makeMemoryStorage();

  const settings = getSettings();
  const byId = new Map(settings.exercises.map(ex => [ex.id, ex]));

  assert.deepEqual(byId.get('treadmill-hiit-intervals').timer, {
    type: 'interval',
    workSeconds: 30,
    restSeconds: 60,
    rounds: 9,
  });
  assert.deepEqual(byId.get('treadmill-incline-walk').timer, {
    type: 'duration',
    seconds: 1800,
  });
  // Lifting exercises are untouched — no timer field at all.
  assert.equal(byId.get('flat-barbell-bench-press').timer, undefined);
});

test('default schedule spaces fatigue: Mon–Sat with mid-week active recovery', () => {
  globalThis.localStorage = makeMemoryStorage();

  const settings = getSettings();
  const routineIds = new Set(settings.routines.map(r => r.id));

  assert.deepEqual(
    ['1', '2', '3', '4', '5', '6'].map(d => settings.schedule[d]),
    ['upper-power', 'lower-power', 'recovery-walk', 'upper-hypertrophy', 'lower-hypertrophy', 'conditioning-core'],
  );
  assert.equal(settings.schedule['0'], null);
  // Every scheduled routine's exercises must resolve against the pool.
  const exIds = new Set(settings.exercises.map(e => e.id));
  for (const r of settings.routines) {
    assert.ok(routineIds.has(r.id));
    for (const id of r.exerciseIds) {
      assert.ok(exIds.has(id), `routine "${r.id}" references unknown exercise "${id}"`);
    }
  }
});

test('migrates a legacy saved plan: installs new routines and adds missing exercises once', () => {
  globalThis.localStorage = makeMemoryStorage();

  // A pre-fat-loss user: old routines, no planVersion, missing the new exercises.
  saveSettings({
    exercises: [{ id: 'flat-barbell-bench-press', name: 'Flat Barbell Bench Press', muscles: {} }],
    routines: [{ id: 'push', name: 'Push Day', tag: 't', colorVar: '--push', exerciseIds: ['flat-barbell-bench-press'] }],
    schedule: { '0': null, '1': 'push', '2': null, '3': null, '4': null, '5': null, '6': null },
    recoveryHours: {},
  });

  const migrated = getSettings();
  assert.equal(migrated.planVersion, CURRENT_PLAN_VERSION);
  assert.equal(migrated.schedule['1'], 'upper-power');
  assert.ok(migrated.exercises.some(e => e.id === 'treadmill-hiit-intervals'));
  // The migration must have been persisted so it does not re-run.
  const persisted = JSON.parse(globalThis.localStorage.getItem(SETTINGS_KEY));
  assert.equal(persisted.planVersion, CURRENT_PLAN_VERSION);
});

test('default exercises reference bundled local GIFs, not external URLs', () => {
  globalThis.localStorage = makeMemoryStorage();

  const settings = getSettings();
  for (const ex of settings.exercises) {
    assert.ok(
      /^assets\/exercise-gifs\/.+\.gif$/.test(ex.gifUrl),
      `exercise "${ex.id}" should use a local gif path, got "${ex.gifUrl}"`,
    );
  }
});

test('migration repoints an existing default exercise from an external gif to the local file', () => {
  globalThis.localStorage = makeMemoryStorage();

  saveSettings({
    exercises: [
      {
        id: 'flat-barbell-bench-press',
        name: 'Flat Barbell Bench Press',
        gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
        muscles: {},
      },
      {
        id: 'hanging-leg-raise',
        name: 'Hanging-Free Leg Raise / Lying Leg Raise', // pre-v4 pull-up-bar name
        gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/08/Hanging-Leg-Raises.gif',
        muscles: {},
      },
      {
        id: 'dumbbell-pullover',
        name: 'Dumbbell Pullover (lat/chest)',
        gifUrl: 'assets/exercise-gifs/dumbbell-pullover.gif',
        muscles: { lats: 'prime_mover', chest: 'stabilizer' }, // pre-v5 roles
      },
    ],
    routines: [],
    schedule: {},
    recoveryHours: {},
    planVersion: 2, // had the plan already, but on the old external-gif version
  });

  const settings = getSettings();
  const bench = settings.exercises.find(e => e.id === 'flat-barbell-bench-press');
  assert.equal(bench.gifUrl, 'assets/exercise-gifs/flat-barbell-bench-press.gif');
  const legRaise = settings.exercises.find(e => e.id === 'hanging-leg-raise');
  assert.equal(legRaise.name, 'Lying Leg Raise'); // no pull-up bar assumption
  assert.equal(legRaise.gifUrl, 'assets/exercise-gifs/hanging-leg-raise.gif');
  const pullover = settings.exercises.find(e => e.id === 'dumbbell-pullover');
  assert.deepEqual(pullover.muscles, {
    lats: 'prime_mover',
    chest: 'synergist',
    triceps: 'stabilizer',
  }); // stale muscle roles refreshed by the plan bump
  assert.equal(settings.planVersion, CURRENT_PLAN_VERSION);
});

test('migration adds the interval timer to a treadmill exercise saved before v6', () => {
  globalThis.localStorage = makeMemoryStorage();

  saveSettings({
    exercises: [{
      id: 'treadmill-hiit-intervals',
      name: 'Treadmill HIIT Intervals',
      gifUrl: 'assets/exercise-gifs/treadmill-hiit-intervals.gif',
      muscles: { quads: 'synergist', calves: 'synergist', hamstrings: 'synergist', glutes: 'stabilizer' },
      // no `timer` field — this is what a pre-v6 save looks like
    }],
    routines: [],
    schedule: {},
    recoveryHours: {},
    planVersion: 5,
  });

  const settings = getSettings();
  const hiit = settings.exercises.find(e => e.id === 'treadmill-hiit-intervals');
  assert.deepEqual(hiit.timer, { type: 'interval', workSeconds: 30, restSeconds: 60, rounds: 9 });
  assert.equal(settings.planVersion, CURRENT_PLAN_VERSION);
});

test('does not overwrite routines once the plan version is current', () => {
  globalThis.localStorage = makeMemoryStorage();

  saveSettings({
    exercises: [],
    routines: [{ id: 'my-custom', name: 'My Custom Day', tag: 't', colorVar: '--push', exerciseIds: [] }],
    schedule: { '0': null, '1': 'my-custom', '2': null, '3': null, '4': null, '5': null, '6': null },
    recoveryHours: {},
    planVersion: CURRENT_PLAN_VERSION,
  });

  const settings = getSettings();
  assert.deepEqual(settings.routines.map(r => r.id), ['my-custom']);
  assert.equal(settings.schedule['1'], 'my-custom');
});
