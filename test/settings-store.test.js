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

  assert.equal(settings.recoveryHours.lats, 60); // v8 recalibrated 72 → 60
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
    front_delts: 'synergist',
    lats: 'stabilizer',
  });
  assert.deepEqual(byId.get('incline-dumbbell-press').muscles, {
    chest: 'prime_mover',
    front_delts: 'prime_mover',
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
    front_delts: 'stabilizer',
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
  assert.equal(byId.get('dumbbell-thruster').muscles.front_delts, 'prime_mover');
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
    lats: 'synergist',   // v14: demoted from prime_mover (honest vertical-pull accounting)
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

test('v8 migration recalibrates stale-default recovery windows but keeps tuned ones', () => {
  globalThis.localStorage = makeMemoryStorage();

  saveSettings({
    exercises: [],
    routines: [],
    schedule: {},
    // lower_back/lats/quads at OLD defaults (should migrate); chest hand-tuned (should stay).
    recoveryHours: { lower_back: 84, lats: 72, quads: 72, hamstrings: 72, glutes: 72, chest: 90 },
    planVersion: 5,
  });

  const s = getSettings();
  assert.equal(s.recoveryHours.lower_back, 60, 'stale 84 → 60');
  assert.equal(s.recoveryHours.lats, 60);
  assert.equal(s.recoveryHours.quads, 60);
  assert.equal(s.recoveryHours.hamstrings, 60);
  assert.equal(s.recoveryHours.glutes, 60);
  assert.equal(s.recoveryHours.chest, 90, 'user-tuned window is preserved');
});

test('v8 retags: preacher/standing curl forearms are stabilizer; hammer curl stays synergist', () => {
  globalThis.localStorage = makeMemoryStorage();
  const byId = new Map(getSettings().exercises.map(ex => [ex.id, ex]));
  assert.equal(byId.get('preacher-curl').muscles.forearms, 'stabilizer');
  assert.equal(byId.get('standing-dumbbell-curl').muscles.forearms, 'stabilizer');
  assert.equal(byId.get('dumbbell-hammer-curl').muscles.forearms, 'synergist');
  assert.equal(byId.get('dumbbell-farmer-carry').muscles.forearms, 'prime_mover');
});

test('v8 fatigueScale ships on isometric/cardio moves and not on straight lifts', () => {
  globalThis.localStorage = makeMemoryStorage();
  const byId = new Map(getSettings().exercises.map(ex => [ex.id, ex]));
  assert.equal(byId.get('plank').fatigueScale, 0.4);
  assert.equal(byId.get('treadmill-incline-walk').fatigueScale, 0.5);
  assert.equal(byId.get('flat-barbell-bench-press').fatigueScale, undefined);
});

test('v8 schedule: HIIT off upper-power (Mon), no swing on conditioning', () => {
  globalThis.localStorage = makeMemoryStorage();
  const s = getSettings();
  const up = s.routines.find(r => r.id === 'upper-power');
  const cc = s.routines.find(r => r.id === 'conditioning-core');
  assert.ok(up.exerciseIds.includes('treadmill-incline-walk'));
  assert.ok(!up.exerciseIds.includes('treadmill-hiit-intervals'));
  assert.ok(!cc.exerciseIds.includes('dumbbell-swing'));
});

test('v13 ships a lying leg curl (knee-flexion hamstrings) with a weight step', () => {
  globalThis.localStorage = makeMemoryStorage();
  const byId = new Map(getSettings().exercises.map(ex => [ex.id, ex]));
  const curl = byId.get('dumbbell-lying-leg-curl');
  assert.ok(curl, 'leg curl exists in the pool');
  assert.equal(curl.muscles.hamstrings, 'prime_mover');
  assert.equal(curl.muscles.glutes, undefined, 'no hip load — pure knee flexion');
  assert.equal(curl.weightStep, 2);
});

test('v13 Lower Hypertrophy swaps flutter kicks for the leg curl', () => {
  globalThis.localStorage = makeMemoryStorage();
  const lh = getSettings().routines.find(r => r.id === 'lower-hypertrophy');
  assert.ok(lh.exerciseIds.includes('dumbbell-lying-leg-curl'));
  assert.ok(!lh.exerciseIds.includes('flutter-kicks'));
});

test('v13 bumps lateral-raise volume to 4 sets and uses the dropset on Thursday', () => {
  globalThis.localStorage = makeMemoryStorage();
  const s = getSettings();
  const byId = new Map(s.exercises.map(ex => [ex.id, ex]));
  assert.equal(byId.get('dumbbell-lateral-raise').setsCount, 4);
  assert.equal(byId.get('lateral-raise-dropset').setsCount, 4);
  const uh = s.routines.find(r => r.id === 'upper-hypertrophy');
  assert.ok(uh.exerciseIds.includes('lateral-raise-dropset'));
  assert.ok(!uh.exerciseIds.includes('dumbbell-lateral-raise'));
});

test('v13 retires burpees for the dumbbell push press on Conditioning & Core', () => {
  globalThis.localStorage = makeMemoryStorage();
  const s = getSettings();
  const cc = s.routines.find(r => r.id === 'conditioning-core');
  assert.ok(cc.exerciseIds.includes('dumbbell-push-press'));
  assert.ok(!cc.exerciseIds.includes('burpee'));
  // burpee stays in the library, just off the schedule
  assert.ok(s.exercises.some(e => e.id === 'burpee'));
});

test('v13 declares antagonist supersets on both upper days', () => {
  globalThis.localStorage = makeMemoryStorage();
  const s = getSettings();
  const up = s.routines.find(r => r.id === 'upper-power');
  const uh = s.routines.find(r => r.id === 'upper-hypertrophy');
  assert.ok(Array.isArray(up.supersets) && up.supersets.length >= 1);
  // each pair references exercises actually in the routine
  for (const routine of [up, uh]) {
    for (const [a, b] of routine.supersets) {
      assert.ok(routine.exerciseIds.includes(a), `${a} in ${routine.id}`);
      assert.ok(routine.exerciseIds.includes(b), `${b} in ${routine.id}`);
    }
  }
});

test('v13 refreshes setsCount on default exercises during the plan bump', () => {
  globalThis.localStorage = makeMemoryStorage();
  saveSettings({
    exercises: [{
      id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise',
      setsCount: 3, // stale pre-v13 set count
      gifUrl: 'assets/exercise-gifs/dumbbell-lateral-raise.gif', muscles: {},
    }],
    routines: [], schedule: {}, recoveryHours: {}, planVersion: 12,
  });
  const ex = getSettings().exercises.find(e => e.id === 'dumbbell-lateral-raise');
  assert.equal(ex.setsCount, 4, 'programmed set count refreshed on the bump');
});

test('v10 remaps an orphaned "shoulders" tag on a user exercise onto front_delts', () => {
  globalThis.localStorage = makeMemoryStorage();
  saveSettings({
    exercises: [{
      id: 'my-custom-press', name: 'My Press',
      muscles: { chest: 'prime_mover', shoulders: 'synergist' }, // pre-v9 orphan tag
    }],
    routines: [], schedule: {}, recoveryHours: {}, planVersion: 9,
  });
  const ex = getSettings().exercises.find(e => e.id === 'my-custom-press');
  assert.equal(ex.muscles.shoulders, undefined, 'orphan shoulders removed');
  assert.equal(ex.muscles.front_delts, 'synergist', 'remapped onto front_delts');
  assert.equal(ex.muscles.chest, 'prime_mover', 'other tags untouched');
});

test('v10 remap keeps the stronger role when front_delts already present', () => {
  globalThis.localStorage = makeMemoryStorage();
  saveSettings({
    exercises: [{
      id: 'my-ohp', name: 'My OHP',
      muscles: { front_delts: 'stabilizer', shoulders: 'prime_mover' },
    }],
    routines: [], schedule: {}, recoveryHours: {}, planVersion: 9,
  });
  const ex = getSettings().exercises.find(e => e.id === 'my-ohp');
  assert.equal(ex.muscles.front_delts, 'prime_mover', 'stronger of the two roles wins');
  assert.equal(ex.muscles.shoulders, undefined);
});

test('v10 refreshes heavy-compound rest to the longer defaults on the bump', () => {
  globalThis.localStorage = makeMemoryStorage();
  saveSettings({
    exercises: [{
      id: 'flat-barbell-bench-press', name: 'Flat Barbell Bench Press',
      restSeconds: 90, // stale pre-v10 rest
      gifUrl: 'assets/exercise-gifs/flat-barbell-bench-press.gif', muscles: {},
    }],
    routines: [], schedule: {}, recoveryHours: {}, planVersion: 9,
  });
  const ex = getSettings().exercises.find(e => e.id === 'flat-barbell-bench-press');
  assert.equal(ex.restSeconds, 150);
});

test('v10 schedule: lateral raises added to Monday for side-delt volume', () => {
  globalThis.localStorage = makeMemoryStorage();
  const up = getSettings().routines.find(r => r.id === 'upper-power');
  assert.ok(up.exerciseIds.includes('dumbbell-lateral-raise'));
});

test('v11 ships the barbell back squat with quad-focused roles and a barbell weight step', () => {
  globalThis.localStorage = makeMemoryStorage();
  const byId = new Map(getSettings().exercises.map(ex => [ex.id, ex]));
  const squat = byId.get('barbell-back-squat');
  assert.ok(squat, 'barbell-back-squat exists in the default pool');
  assert.deepEqual(squat.muscles, {
    quads: 'prime_mover',
    glutes: 'synergist',
    lower_back: 'synergist',
    hamstrings: 'stabilizer',
    abs: 'stabilizer',
  });
  assert.equal(squat.weightStep, 2.5, 'barbell moves step 2.5 kg');
  assert.match(squat.gifUrl, /^assets\/exercise-gifs\/barbell-back-squat\.gif$/);
});

test('v11 Lower Power squats with the barbell, not the goblet', () => {
  globalThis.localStorage = makeMemoryStorage();
  const lp = getSettings().routines.find(r => r.id === 'lower-power');
  assert.ok(lp.exerciseIds.includes('barbell-back-squat'));
  assert.ok(!lp.exerciseIds.includes('goblet-squat'));
});

test('v11 Lower Hypertrophy trades the weighted hyperextension for lateral raises', () => {
  globalThis.localStorage = makeMemoryStorage();
  const lh = getSettings().routines.find(r => r.id === 'lower-hypertrophy');
  assert.ok(lh.exerciseIds.includes('dumbbell-lateral-raise'));
  assert.ok(!lh.exerciseIds.includes('weighted-back-hyperextension'));
});

test('v11 keeps the retired exercises in the library, just off the schedule', () => {
  globalThis.localStorage = makeMemoryStorage();
  const s = getSettings();
  const exIds = new Set(s.exercises.map(e => e.id));
  // Still available to pick from the exercise library...
  assert.ok(exIds.has('goblet-squat'));
  assert.ok(exIds.has('weighted-back-hyperextension'));
  // ...but no default routine schedules them anymore.
  const scheduled = new Set(s.routines.flatMap(r => r.exerciseIds));
  assert.ok(!scheduled.has('goblet-squat'));
  assert.ok(!scheduled.has('weighted-back-hyperextension'));
});

test('v11 migrates a v10 saved plan onto the new squat/lateral routines', () => {
  globalThis.localStorage = makeMemoryStorage();
  saveSettings({
    exercises: [{ id: 'flat-barbell-bench-press', name: 'Flat Barbell Bench Press', muscles: {} }],
    routines: [{ id: 'lower-power', name: 'Lower Power + Walk', tag: 't', colorVar: '--legs', exerciseIds: ['goblet-squat'] }],
    schedule: { '0': null, '1': 'lower-power', '2': null, '3': null, '4': null, '5': null, '6': null },
    recoveryHours: {},
    planVersion: 10,
  });
  const s = getSettings();
  assert.equal(s.planVersion, CURRENT_PLAN_VERSION);
  const lp = s.routines.find(r => r.id === 'lower-power');
  assert.ok(lp.exerciseIds.includes('barbell-back-squat'), 'new routine reinstalled');
  assert.ok(s.exercises.some(e => e.id === 'barbell-back-squat'), 'new exercise appended to the pool');
});

test('v12 rebalance: Lower Power drops the back hyperextension', () => {
  globalThis.localStorage = makeMemoryStorage();
  const lp = getSettings().routines.find(r => r.id === 'lower-power');
  assert.ok(!lp.exerciseIds.includes('back-hyperextension'), 'lumbar direct work removed from Tuesday');
  assert.ok(lp.exerciseIds.includes('barbell-back-squat'));
});

test('v12 rebalance: Upper Power swaps the shoulder press for a rear-delt fly', () => {
  globalThis.localStorage = makeMemoryStorage();
  const up = getSettings().routines.find(r => r.id === 'upper-power');
  assert.ok(up.exerciseIds.includes('rear-delt-dumbbell-fly'), 'rear-delt work added to Monday');
  assert.ok(!up.exerciseIds.includes('seated-dumbbell-shoulder-press'), 'front-delt press pulled from Monday');
});

test('v12 keeps overhead pressing on Upper Hypertrophy and the moves in the library', () => {
  globalThis.localStorage = makeMemoryStorage();
  const s = getSettings();
  const uh = s.routines.find(r => r.id === 'upper-hypertrophy');
  assert.ok(uh.exerciseIds.includes('seated-dumbbell-shoulder-press'), 'still press overhead Thursday');
  const exIds = new Set(s.exercises.map(e => e.id));
  assert.ok(exIds.has('back-hyperextension'), 'retired move stays pickable');
  assert.ok(exIds.has('seated-dumbbell-shoulder-press'));
});

test('v12 migrates an older saved plan onto the rebalanced routines', () => {
  globalThis.localStorage = makeMemoryStorage();
  saveSettings({
    exercises: [{ id: 'flat-barbell-bench-press', name: 'Flat Barbell Bench Press', muscles: {} }],
    routines: [
      { id: 'upper-power', name: 'Upper Power + Walk', tag: 't', colorVar: '--push', exerciseIds: ['seated-dumbbell-shoulder-press'] },
      { id: 'lower-power', name: 'Lower Power + Walk', tag: 't', colorVar: '--legs', exerciseIds: ['back-hyperextension', 'barbell-back-squat'] },
    ],
    schedule: { '0': null, '1': 'upper-power', '2': 'lower-power', '3': null, '4': null, '5': null, '6': null },
    recoveryHours: {},
    planVersion: 11,
  });
  const s = getSettings();
  assert.equal(s.planVersion, CURRENT_PLAN_VERSION);
  const up = s.routines.find(r => r.id === 'upper-power');
  const lp = s.routines.find(r => r.id === 'lower-power');
  assert.ok(up.exerciseIds.includes('rear-delt-dumbbell-fly'));
  assert.ok(!up.exerciseIds.includes('seated-dumbbell-shoulder-press'));
  assert.ok(!lp.exerciseIds.includes('back-hyperextension'));
});

test('v9 splits shoulders into front/side delts and carries a tuned window onto both', () => {
  globalThis.localStorage = makeMemoryStorage();
  saveSettings({
    exercises: [],
    routines: [],
    schedule: {},
    recoveryHours: { shoulders: 66 }, // user-tuned single shoulder window
    planVersion: 8,
  });
  const s = getSettings();
  assert.equal(s.recoveryHours.front_delts, 66, 'tuned shoulders window carried to front');
  assert.equal(s.recoveryHours.side_delts, 66, 'tuned shoulders window carried to side');
  assert.equal(s.recoveryHours.shoulders, undefined, 'orphan shoulders key removed');
});

test('v9 default exercises tag deltoid heads, never legacy shoulders', () => {
  globalThis.localStorage = makeMemoryStorage();
  const s = getSettings();
  for (const ex of s.exercises) {
    assert.equal(ex.muscles.shoulders, undefined, `${ex.id} still tags legacy "shoulders"`);
  }
  const byId = new Map(s.exercises.map(e => [e.id, e]));
  assert.equal(byId.get('dumbbell-lateral-raise').muscles.side_delts, 'prime_mover');
  assert.equal(byId.get('seated-dumbbell-shoulder-press').muscles.front_delts, 'prime_mover');
  assert.equal(byId.get('seated-dumbbell-shoulder-press').muscles.side_delts, 'synergist');
  assert.equal(s.recoveryHours.front_delts, 48);
  assert.equal(s.recoveryHours.side_delts, 48);
});

test('v14 adds hip thrust, face pulls, incline curl and refreshes cues', () => {
  globalThis.localStorage = makeMemoryStorage();
  saveSettings({
    exercises: [
      // A stale calf raise with no cue, to prove the cue is refreshed on the bump.
      { id: 'dumbbell-calf-raise', name: 'Dumbbell Calf Raise', muscles: {} },
    ],
    routines: [
      { id: 'upper-power', name: 'Upper Power + Walk', tag: 't', colorVar: '--push', exerciseIds: ['flat-barbell-bench-press'] },
      { id: 'upper-hypertrophy', name: 'Upper Hypertrophy', tag: 't', colorVar: '--pull', exerciseIds: ['standing-dumbbell-curl'] },
      { id: 'lower-hypertrophy', name: 'Lower Hypertrophy + Walk', tag: 't', colorVar: '--legs', exerciseIds: [] },
    ],
    schedule: {},
    recoveryHours: {},
    planVersion: 13,
  });
  const s = getSettings();
  assert.equal(s.planVersion, CURRENT_PLAN_VERSION);

  const byId = new Map(s.exercises.map(e => [e.id, e]));
  // New exercises appended to the pool.
  assert.ok(byId.has('dumbbell-hip-thrust'));
  assert.ok(byId.has('band-face-pull'));
  assert.ok(byId.has('incline-dumbbell-curl'));
  assert.equal(byId.get('dumbbell-hip-thrust').muscles.glutes, 'prime_mover');
  assert.equal(byId.get('band-face-pull').muscles.rear_delts, 'prime_mover');
  // Cue refreshed onto the stale default calf raise.
  assert.match(byId.get('dumbbell-calf-raise').cue ?? '', /plate|step/i);

  // Routines reinstalled with the new movements.
  const up = s.routines.find(r => r.id === 'upper-power');
  const uh = s.routines.find(r => r.id === 'upper-hypertrophy');
  const lh = s.routines.find(r => r.id === 'lower-hypertrophy');
  assert.ok(up.exerciseIds.includes('band-face-pull'));
  assert.ok(uh.exerciseIds.includes('incline-dumbbell-curl'));
  assert.ok(!uh.exerciseIds.includes('standing-dumbbell-curl'), 'standing curl swapped out');
  assert.ok(lh.exerciseIds.includes('dumbbell-hip-thrust'));
  // Superset pair updated to the incline curl.
  assert.ok(uh.supersets.some(pair => pair.includes('incline-dumbbell-curl')));
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
