import { PLAN } from './data.js';

export const SETTINGS_KEY = 'leanbuild-settings-v1';

const DEFAULT_RECOVERY_HOURS = {
  chest: 60, shoulders: 48, triceps: 48, back: 72,
  biceps: 48, rear_delts: 48, quads: 72, hamstrings: 72,
  glutes: 72, calves: 48, abs: 36,
};

// Default muscle groups trained per exercise (exercise id → muscle array)
const DEFAULT_EXERCISE_MUSCLES = {
  'flat-barbell-bench-press': ['chest', 'triceps', 'shoulders'],
  'incline-dumbbell-press': ['chest', 'triceps', 'shoulders'],
  'seated-dumbbell-shoulder-press': ['shoulders', 'triceps'],
  'dumbbell-lateral-raise': ['shoulders'],
  'lying-dumbbell-triceps-extension': ['triceps'],
  'close-grip-dumbbell-press': ['triceps', 'chest'],
  'bent-over-barbell-row': ['back', 'biceps', 'rear_delts'],
  'one-arm-dumbbell-row': ['back', 'biceps'],
  'chest-supported-dumbbell-row': ['back', 'rear_delts'],
  'back-hyperextension': ['back', 'glutes', 'hamstrings'],
  'preacher-curl': ['biceps'],
  'dumbbell-hammer-curl': ['biceps'],
  'rear-delt-dumbbell-fly': ['rear_delts', 'shoulders'],
  'goblet-squat': ['quads', 'glutes'],
  'dumbbell-romanian-deadlift': ['hamstrings', 'glutes', 'back'],
  'bulgarian-split-squat': ['quads', 'glutes', 'hamstrings'],
  'dumbbell-calf-raise': ['calves'],
  'hanging-leg-raise': ['abs'],
  'plank': ['abs'],
  'incline-barbell-bench-press': ['chest', 'triceps', 'shoulders'],
  'decline-dumbbell-press': ['chest', 'triceps'],
  'two-arm-dumbbell-row': ['back', 'biceps'],
  'dumbbell-pullover': ['back', 'chest'],
  'standing-dumbbell-curl': ['biceps'],
  'overhead-dumbbell-triceps-extension': ['triceps'],
  'lateral-raise-dropset': ['shoulders'],
  'barbell-romanian-deadlift': ['hamstrings', 'glutes', 'back'],
  'goblet-heels-elevated-squat': ['quads', 'glutes'],
  'dumbbell-reverse-lunge': ['quads', 'glutes', 'hamstrings'],
  'weighted-back-hyperextension': ['back', 'glutes', 'hamstrings'],
  'dumbbell-russian-twist': ['abs'],
  'weighted-crunch': ['abs'],
  'dead-bug': ['abs'],
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : buildDefaults();
  } catch {
    return buildDefaults();
  }
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
      exercises: day.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        setsCount: ex.setsCount,
        repRange: ex.repRange,
        restSeconds: ex.restSeconds,
        startWeight: ex.startWeight,
        gifUrl: ex.gifUrl,
        muscles: DEFAULT_EXERCISE_MUSCLES[ex.id] ?? [],
      })),
    })),
    recoveryHours: { ...DEFAULT_RECOVERY_HOURS },
  };
}

export function getExerciseMuscles(exerciseId, settings) {
  for (const day of settings.days) {
    const ex = day.exercises.find(e => e.id === exerciseId);
    if (ex) return ex.muscles ?? [];
  }
  return [];
}
