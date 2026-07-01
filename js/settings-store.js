export const SETTINGS_KEY = 'leanbuild-settings-v1';

const DEFAULT_RECOVERY_HOURS = {
  chest: 60, shoulders: 48, traps: 48, triceps: 48, back: 72,
  lower_back: 84, biceps: 48, forearms: 40, rear_delts: 48,
  quads: 72, hamstrings: 72, glutes: 72, calves: 48,
  abs: 36, obliques: 36,
};

// 4-level fatigue model: prime_mover=1.0, synergist=0.67, stabilizer=0.33, absent=0.0
const DEFAULT_EXERCISE_MUSCLES = {
  'flat-barbell-bench-press':            { chest: 'prime_mover', triceps: 'synergist', shoulders: 'synergist' },
  'incline-dumbbell-press':              { chest: 'prime_mover', shoulders: 'synergist', triceps: 'synergist' },
  'incline-barbell-bench-press':         { chest: 'prime_mover', shoulders: 'synergist', triceps: 'synergist' },
  'decline-dumbbell-press':              { chest: 'prime_mover', triceps: 'synergist' },
  'seated-dumbbell-shoulder-press':      { shoulders: 'prime_mover', triceps: 'synergist', traps: 'stabilizer' },
  'dumbbell-lateral-raise':              { shoulders: 'prime_mover', traps: 'stabilizer' },
  'lateral-raise-dropset':               { shoulders: 'prime_mover', traps: 'stabilizer' },
  'lying-dumbbell-triceps-extension':    { triceps: 'prime_mover' },
  'close-grip-dumbbell-press':           { triceps: 'prime_mover', chest: 'synergist' },
  'overhead-dumbbell-triceps-extension': { triceps: 'prime_mover' },
  'bent-over-barbell-row':               { back: 'prime_mover', biceps: 'synergist', rear_delts: 'synergist', forearms: 'stabilizer', lower_back: 'stabilizer' },
  'one-arm-dumbbell-row':                { back: 'prime_mover', biceps: 'synergist', forearms: 'stabilizer' },
  'chest-supported-dumbbell-row':        { back: 'prime_mover', rear_delts: 'synergist', biceps: 'synergist' },
  'two-arm-dumbbell-row':                { back: 'prime_mover', biceps: 'synergist', forearms: 'stabilizer', lower_back: 'stabilizer' },
  'dumbbell-pullover':                   { back: 'prime_mover', chest: 'synergist' },
  'back-hyperextension':                 { lower_back: 'prime_mover', glutes: 'synergist', hamstrings: 'synergist' },
  'weighted-back-hyperextension':        { lower_back: 'prime_mover', glutes: 'synergist', hamstrings: 'synergist' },
  'preacher-curl':                       { biceps: 'prime_mover', forearms: 'synergist' },
  'dumbbell-hammer-curl':                { biceps: 'prime_mover', forearms: 'synergist' },
  'standing-dumbbell-curl':              { biceps: 'prime_mover', forearms: 'synergist' },
  'rear-delt-dumbbell-fly':              { rear_delts: 'prime_mover', traps: 'synergist' },
  'goblet-squat':                        { quads: 'prime_mover', glutes: 'synergist', abs: 'stabilizer', lower_back: 'stabilizer' },
  'goblet-heels-elevated-squat':         { quads: 'prime_mover', glutes: 'synergist', abs: 'stabilizer' },
  'bulgarian-split-squat':               { quads: 'prime_mover', glutes: 'prime_mover', hamstrings: 'synergist', abs: 'stabilizer' },
  'dumbbell-reverse-lunge':              { quads: 'prime_mover', glutes: 'prime_mover', hamstrings: 'synergist', abs: 'stabilizer' },
  'dumbbell-romanian-deadlift':          { hamstrings: 'prime_mover', glutes: 'synergist', lower_back: 'synergist', forearms: 'stabilizer' },
  'barbell-romanian-deadlift':           { hamstrings: 'prime_mover', glutes: 'synergist', lower_back: 'synergist', forearms: 'stabilizer' },
  'dumbbell-calf-raise':                 { calves: 'prime_mover' },
  'hanging-leg-raise':                   { abs: 'prime_mover' },
  'plank':                               { abs: 'prime_mover', obliques: 'synergist', lower_back: 'stabilizer' },
  'dumbbell-russian-twist':              { obliques: 'prime_mover', abs: 'synergist' },
  'weighted-crunch':                     { abs: 'prime_mover' },
  'dead-bug':                            { abs: 'prime_mover', obliques: 'synergist' },
};

// Muscle groups introduced after the original 11-group model. Used by
// migration to enrich stored exercises without clobbering user edits.
const NEW_MUSCLE_IDS = ['traps', 'forearms', 'lower_back', 'obliques'];

// Pre-expansion defaults for exercises whose assignments changed beyond
// simple additions. If a stored exercise still matches its legacy default
// exactly (user never customised it), migration upgrades it wholesale.
const LEGACY_EXERCISE_MUSCLES = {
  'back-hyperextension':          { back: 'prime_mover', glutes: 'synergist', hamstrings: 'synergist' },
  'weighted-back-hyperextension': { back: 'prime_mover', glutes: 'synergist', hamstrings: 'synergist' },
  'dumbbell-russian-twist':       { abs: 'prime_mover' },
  'rear-delt-dumbbell-fly':       { rear_delts: 'prime_mover', shoulders: 'synergist' },
  'dumbbell-romanian-deadlift':   { hamstrings: 'prime_mover', glutes: 'synergist', back: 'stabilizer' },
  'barbell-romanian-deadlift':    { hamstrings: 'prime_mover', glutes: 'synergist', back: 'stabilizer' },
};

function musclesEqual(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return aKeys.length === bKeys.length && aKeys.every(k => a[k] === b[k]);
}

/**
 * Enrich a stored exercise with the expanded muscle groups. Untouched
 * legacy assignments are upgraded to the new defaults wholesale; customised
 * ones only gain roles for the brand-new muscle groups.
 */
function upgradeExerciseMuscles(ex) {
  const current = DEFAULT_EXERCISE_MUSCLES[ex.id];
  if (!current) return ex;
  const muscles = ex.muscles ?? {};

  const legacy = LEGACY_EXERCISE_MUSCLES[ex.id];
  if (legacy && musclesEqual(muscles, legacy)) {
    return { ...ex, muscles: { ...current } };
  }

  const added = {};
  for (const m of NEW_MUSCLE_IDS) {
    if (current[m] && !(m in muscles)) added[m] = current[m];
  }
  if (Object.keys(added).length === 0) return ex;
  return { ...ex, muscles: { ...muscles, ...added } };
}

// All exercise data self-contained (no import from data.js)
const EXERCISE_POOL_DATA = [
  { id: 'flat-barbell-bench-press', name: 'Flat Barbell Bench Press', setsCount: 4, repRange: '6–8', restSeconds: 90, startWeight: '50–60 kg bar', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif' },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '18–22 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif' },
  { id: 'seated-dumbbell-shoulder-press', name: 'Seated Dumbbell Shoulder Press', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '16–20 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Shoulder-Press.gif' },
  { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: '7–10 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif' },
  { id: 'lying-dumbbell-triceps-extension', name: 'Lying Dumbbell Triceps Extension', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '8–12 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Dumbbell-Skull-Crusher.gif' },
  { id: 'close-grip-dumbbell-press', name: 'Close-Grip Dumbbell Press', setsCount: 2, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/10/Close-Grip-Dumbbell-Press.gif' },
  { id: 'bent-over-barbell-row', name: 'Bent-Over Barbell Row', setsCount: 4, repRange: '6–8', restSeconds: 90, startWeight: '40–50 kg bar', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif' },
  { id: 'one-arm-dumbbell-row', name: 'One-Arm Dumbbell Row', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '22–28 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif' },
  { id: 'chest-supported-dumbbell-row', name: 'Chest-Supported Dumbbell Row (incline bench)', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg / hand', gifUrl: 'https://gymvisual.com/img/p/3/7/3/6/8/37368.gif' },
  { id: 'back-hyperextension', name: 'Back Hyperextension', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: 'bodyweight → hold plate', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/hyperextension.gif' },
  { id: 'preacher-curl', name: 'Preacher Curl (EZ/straight bar)', setsCount: 3, repRange: '8–10', restSeconds: 60, startWeight: '20–30 kg bar', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Preacher-Curl.gif' },
  { id: 'dumbbell-hammer-curl', name: 'Dumbbell Hammer Curl', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '10–14 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif' },
  { id: 'rear-delt-dumbbell-fly', name: 'Rear-Delt Dumbbell Fly', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: '6–9 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bent-Over-Dumbbell-Rear-Delt-Raise-With-Head-On-Bench.gif' },
  { id: 'goblet-squat', name: 'Goblet Squat (or DB Front Squat)', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '24–32 kg DB', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2023/01/Dumbbell-Goblet-Squat.gif' },
  { id: 'dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '22–28 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Romanian-Deadlift.gif' },
  { id: 'bulgarian-split-squat', name: 'Walking / Bulgarian Split Squat', setsCount: 3, repRange: '10 / leg', restSeconds: 60, startWeight: '12–18 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Dumbbell-Bulgarian-Split-Squat.gif' },
  { id: 'dumbbell-calf-raise', name: 'Dumbbell Calf Raise', setsCount: 4, repRange: '15–20', restSeconds: 45, startWeight: '20–30 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Calf-Raise.gif' },
  { id: 'hanging-leg-raise', name: 'Hanging-Free Leg Raise / Lying Leg Raise', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: 'bodyweight', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/08/Hanging-Leg-Raises.gif' },
  { id: 'plank', name: 'Plank', setsCount: 3, repRange: '45–60s hold', restSeconds: 45, startWeight: 'bodyweight', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/plank.gif' },
  { id: 'incline-barbell-bench-press', name: 'Incline Barbell Bench Press', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '40–50 kg bar', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Barbell-Bench-Press.gif' },
  { id: 'decline-dumbbell-press', name: 'Decline Dumbbell Press', setsCount: 3, repRange: '10–12', restSeconds: 75, startWeight: '16–20 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Decline-Dumbbell-Press.gif' },
  { id: 'two-arm-dumbbell-row', name: 'Two-Arm Dumbbell Row', setsCount: 4, repRange: '10–12', restSeconds: 75, startWeight: '18–24 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bent-Over-Dumbbell-Row.gif' },
  { id: 'dumbbell-pullover', name: 'Dumbbell Pullover (lat/chest)', setsCount: 3, repRange: '12', restSeconds: 60, startWeight: '16–22 kg', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Pullover.gif' },
  { id: 'standing-dumbbell-curl', name: 'Standing Dumbbell Curl', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '12–16 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif' },
  { id: 'overhead-dumbbell-triceps-extension', name: 'Overhead Dumbbell Triceps Extension', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Seated-Dumbbell-Triceps-Extension.gif' },
  { id: 'lateral-raise-dropset', name: 'Lateral Raise (drop set last set)', setsCount: 3, repRange: '15', restSeconds: 60, startWeight: '6–9 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif' },
  { id: 'barbell-romanian-deadlift', name: 'Barbell Romanian Deadlift', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '50–60 kg bar', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif' },
  { id: 'goblet-heels-elevated-squat', name: 'Goblet / Heels-Elevated Squat', setsCount: 3, repRange: '10–12', restSeconds: 75, startWeight: '24–30 kg DB', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2025/07/Heel-Elevated-Goblet-Squat.gif' },
  { id: 'dumbbell-reverse-lunge', name: 'Dumbbell Reverse Lunge', setsCount: 3, repRange: '10 / leg', restSeconds: 60, startWeight: '12–16 kg / hand', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2022/09/Dumbell-reverse-lunge.gif' },
  { id: 'weighted-back-hyperextension', name: 'Back Hyperextension (weighted)', setsCount: 3, repRange: '12', restSeconds: 60, startWeight: 'hold 10–20 kg plate', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Weighted-Back-Extension.gif' },
  { id: 'dumbbell-russian-twist', name: 'Dumbbell Russian Twist', setsCount: 3, repRange: '16 (8/side)', restSeconds: 45, startWeight: '8–12 kg', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Russian-Twist.gif' },
  { id: 'weighted-crunch', name: 'Weighted Crunch / Cable-free Crunch', setsCount: 3, repRange: '15', restSeconds: 45, startWeight: 'hold 5–10 kg DB', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Weighted-Crunch.gif' },
  { id: 'dead-bug', name: 'Dead Bug', setsCount: 2, repRange: '12 / side', restSeconds: 45, startWeight: 'bodyweight', gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Dead-Bug.gif' },
];

const DEFAULT_ROUTINES = [
  {
    id: 'push',
    name: 'Push Day',
    tag: 'Chest · Shoulders · Triceps',
    colorVar: '--push',
    exerciseIds: [
      'flat-barbell-bench-press',
      'incline-dumbbell-press',
      'seated-dumbbell-shoulder-press',
      'dumbbell-lateral-raise',
      'lying-dumbbell-triceps-extension',
      'close-grip-dumbbell-press',
    ],
  },
  {
    id: 'pull',
    name: 'Pull Day',
    tag: 'Back · Biceps · Rear Delts',
    colorVar: '--pull',
    exerciseIds: [
      'bent-over-barbell-row',
      'one-arm-dumbbell-row',
      'chest-supported-dumbbell-row',
      'back-hyperextension',
      'preacher-curl',
      'dumbbell-hammer-curl',
      'rear-delt-dumbbell-fly',
    ],
  },
  {
    id: 'legs',
    name: 'Legs + Core',
    tag: 'Quads · Hams · Glutes · Abs',
    colorVar: '--legs',
    exerciseIds: [
      'goblet-squat',
      'bulgarian-split-squat',
      'dumbbell-reverse-lunge',
      'dumbbell-romanian-deadlift',
      'dumbbell-calf-raise',
      'hanging-leg-raise',
      'plank',
      'dumbbell-russian-twist',
    ],
  },
  {
    id: 'upper',
    name: 'Upper Body',
    tag: 'Chest · Back · Shoulders',
    colorVar: '--push',
    exerciseIds: [
      'incline-barbell-bench-press',
      'bent-over-barbell-row',
      'seated-dumbbell-shoulder-press',
      'one-arm-dumbbell-row',
      'dumbbell-lateral-raise',
      'preacher-curl',
      'lying-dumbbell-triceps-extension',
    ],
  },
  {
    id: 'lower',
    name: 'Lower + Core',
    tag: 'Legs · Core',
    colorVar: '--legs',
    exerciseIds: [
      'goblet-heels-elevated-squat',
      'barbell-romanian-deadlift',
      'weighted-back-hyperextension',
      'dumbbell-calf-raise',
      'weighted-crunch',
      'dead-bug',
      'dumbbell-russian-twist',
    ],
  },
];

const DEFAULT_SCHEDULE = {
  '0': null,
  '1': 'push',
  '2': 'pull',
  '3': 'legs',
  '4': 'upper',
  '5': 'lower',
  '6': null,
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return buildDefaults();
    const parsed = JSON.parse(raw);
    return migrateSettings(parsed);
  } catch {
    return buildDefaults();
  }
}

function migrateSettings(settings) {
  // Old format had a `days` array — migrate to new pool+routines+schedule model
  if (Array.isArray(settings.days)) {
    const exerciseMap = new Map();
    const routines = [];

    for (const day of settings.days) {
      const exerciseIds = [];
      for (const ex of (day.exercises ?? [])) {
        if (!exerciseMap.has(ex.id)) {
          const muscles = {};
          for (const m of (ex.primaryMuscles ?? [])) muscles[m] = 'prime_mover';
          for (const m of (ex.secondaryMuscles ?? [])) {
            if (!muscles[m]) muscles[m] = 'synergist';
          }
          exerciseMap.set(ex.id, {
            id: ex.id,
            name: ex.name,
            gifUrl: ex.gifUrl ?? '',
            setsCount: ex.setsCount,
            repRange: ex.repRange,
            restSeconds: ex.restSeconds,
            startWeight: ex.startWeight ?? '',
            muscles,
          });
        }
        exerciseIds.push(ex.id);
      }

      const slugId = day.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      routines.push({
        id: slugId,
        name: day.title,
        tag: day.tag ?? '',
        colorVar: day.colorVar ?? '--push',
        exerciseIds,
      });
    }

    // Assign Mon-Fri to routine order, rest on weekends
    const schedule = { '0': null, '1': null, '2': null, '3': null, '4': null, '5': null, '6': null };
    const weekdayKeys = ['1', '2', '3', '4', '5'];
    routines.forEach((r, i) => {
      if (i < weekdayKeys.length) schedule[weekdayKeys[i]] = r.id;
    });

    return {
      exercises: Array.from(exerciseMap.values()).map(upgradeExerciseMuscles),
      routines,
      schedule,
      recoveryHours: { ...DEFAULT_RECOVERY_HOURS, ...(settings.recoveryHours ?? {}) },
    };
  }

  // Already new format — ensure required fields exist and merge in any
  // muscle groups added since the settings were last saved
  return {
    exercises: (settings.exercises ?? []).map(upgradeExerciseMuscles),
    routines: settings.routines ?? [],
    schedule: settings.schedule ?? { ...DEFAULT_SCHEDULE },
    recoveryHours: { ...DEFAULT_RECOVERY_HOURS, ...(settings.recoveryHours ?? {}) },
  };
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function buildDefaults() {
  // Deduplicate exercise pool by id
  const seen = new Set();
  const exercises = [];
  for (const ex of EXERCISE_POOL_DATA) {
    if (!seen.has(ex.id)) {
      seen.add(ex.id);
      exercises.push({
        ...ex,
        muscles: DEFAULT_EXERCISE_MUSCLES[ex.id] ?? {},
      });
    }
  }

  return {
    exercises,
    routines: DEFAULT_ROUTINES.map(r => ({ ...r, exerciseIds: [...r.exerciseIds] })),
    schedule: { ...DEFAULT_SCHEDULE },
    recoveryHours: { ...DEFAULT_RECOVERY_HOURS },
  };
}

/**
 * Returns the muscles object { [muscleId]: role } for the given exercise,
 * or {} if the exercise is not found in settings.
 */
export function getExerciseMuscles(exerciseId, settings) {
  const ex = settings.exercises.find(e => e.id === exerciseId);
  return ex?.muscles ?? {};
}
