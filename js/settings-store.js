import { PLAN } from './data.js';

export const SETTINGS_KEY = 'leanbuild-settings-v1';

const DEFAULT_RECOVERY_HOURS = {
  chest: 60, shoulders: 48, triceps: 48, back: 72,
  biceps: 48, rear_delts: 48, quads: 72, hamstrings: 72,
  glutes: 72, calves: 48, abs: 36,
};

const DEFAULT_EXERCISE_MUSCLES = {
  'flat-barbell-bench-press':           { primary: ['chest'],            secondary: ['triceps', 'shoulders'] },
  'incline-dumbbell-press':             { primary: ['chest'],            secondary: ['triceps', 'shoulders'] },
  'incline-barbell-bench-press':        { primary: ['chest'],            secondary: ['triceps', 'shoulders'] },
  'decline-dumbbell-press':             { primary: ['chest'],            secondary: ['triceps'] },
  'seated-dumbbell-shoulder-press':     { primary: ['shoulders'],        secondary: ['triceps'] },
  'dumbbell-lateral-raise':             { primary: ['shoulders'],        secondary: [] },
  'lateral-raise-dropset':              { primary: ['shoulders'],        secondary: [] },
  'lying-dumbbell-triceps-extension':   { primary: ['triceps'],          secondary: [] },
  'close-grip-dumbbell-press':          { primary: ['triceps'],          secondary: ['chest'] },
  'overhead-dumbbell-triceps-extension':{ primary: ['triceps'],          secondary: [] },
  'bent-over-barbell-row':              { primary: ['back'],             secondary: ['biceps', 'rear_delts'] },
  'one-arm-dumbbell-row':               { primary: ['back'],             secondary: ['biceps'] },
  'chest-supported-dumbbell-row':       { primary: ['back'],             secondary: ['rear_delts'] },
  'two-arm-dumbbell-row':               { primary: ['back'],             secondary: ['biceps'] },
  'dumbbell-pullover':                  { primary: ['back'],             secondary: ['chest'] },
  'back-hyperextension':                { primary: ['back'],             secondary: ['glutes', 'hamstrings'] },
  'weighted-back-hyperextension':       { primary: ['back'],             secondary: ['glutes', 'hamstrings'] },
  'preacher-curl':                      { primary: ['biceps'],           secondary: [] },
  'dumbbell-hammer-curl':               { primary: ['biceps'],           secondary: [] },
  'standing-dumbbell-curl':             { primary: ['biceps'],           secondary: [] },
  'rear-delt-dumbbell-fly':             { primary: ['rear_delts'],       secondary: ['shoulders'] },
  'goblet-squat':                       { primary: ['quads'],            secondary: ['glutes'] },
  'goblet-heels-elevated-squat':        { primary: ['quads'],            secondary: ['glutes'] },
  'bulgarian-split-squat':              { primary: ['quads', 'glutes'],  secondary: ['hamstrings'] },
  'dumbbell-reverse-lunge':             { primary: ['quads', 'glutes'],  secondary: ['hamstrings'] },
  'dumbbell-romanian-deadlift':         { primary: ['hamstrings'],       secondary: ['glutes', 'back'] },
  'barbell-romanian-deadlift':          { primary: ['hamstrings'],       secondary: ['glutes', 'back'] },
  'dumbbell-calf-raise':                { primary: ['calves'],           secondary: [] },
  'hanging-leg-raise':                  { primary: ['abs'],              secondary: [] },
  'plank':                              { primary: ['abs'],              secondary: [] },
  'dumbbell-russian-twist':             { primary: ['abs'],              secondary: [] },
  'weighted-crunch':                    { primary: ['abs'],              secondary: [] },
  'dead-bug':                           { primary: ['abs'],              secondary: [] },
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
  for (const day of (settings.days ?? [])) {
    for (const ex of (day.exercises ?? [])) {
      if (ex.muscles && !ex.primaryMuscles) {
        ex.primaryMuscles = ex.muscles;
        ex.secondaryMuscles = [];
        delete ex.muscles;
      }
      ex.primaryMuscles = ex.primaryMuscles ?? [];
      ex.secondaryMuscles = ex.secondaryMuscles ?? [];
    }
  }
  return settings;
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function buildDefaults() {
  return {
    days: PLAN.map(day => ({
      title: day.title,
      tag: day.tag,
      colorVar: day.colorVar,
      focus: day.focus,
      exercises: day.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        setsCount: ex.setsCount,
        repRange: ex.repRange,
        restSeconds: ex.restSeconds,
        startWeight: ex.startWeight,
        gifUrl: ex.gifUrl,
        primaryMuscles: DEFAULT_EXERCISE_MUSCLES[ex.id]?.primary ?? [],
        secondaryMuscles: DEFAULT_EXERCISE_MUSCLES[ex.id]?.secondary ?? [],
      })),
    })),
    recoveryHours: { ...DEFAULT_RECOVERY_HOURS },
  };
}

export function getExerciseMuscles(exerciseId, settings) {
  for (const day of settings.days) {
    const ex = day.exercises.find(e => e.id === exerciseId);
    if (ex) return { primary: ex.primaryMuscles ?? [], secondary: ex.secondaryMuscles ?? [] };
  }
  return { primary: [], secondary: [] };
}
