import { getSettings, getExerciseMuscles } from '../settings-store.js';
import { createMuscleAtlas } from '../components/muscle-atlas.js';

const MUSCLE_LABELS = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps',
  back: 'Back / Lats', biceps: 'Biceps', rear_delts: 'Rear Delts',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', abs: 'Abs / Core',
};

const DEPLETION_BY_ROLE = {
  prime_mover: 1.0,
  synergist: 0.67,
  stabilizer: 0.33,
  // Legacy compat for old primaryMuscles/secondaryMuscles format
  primary: 1.0,
  secondary: 0.5,
};

function recoveryColor(fraction) {
  const r = Math.round(255 * (1 - fraction));
  const g = Math.round(200 * fraction);
  return `rgb(${r},${g},40)`;
}

/**
 * Normalise getExerciseMuscles output to { [muscleId]: role } regardless of
 * whether settings-store has been migrated to the new format yet.
 */
function normaliseMuscles(raw) {
  if (!raw) return {};
  // New format: plain object with role string values, no 'primary'/'secondary' keys
  if (typeof raw === 'object' && !Array.isArray(raw) && !('primary' in raw) && !('secondary' in raw)) {
    return raw;
  }
  // Legacy format: { primary: string[], secondary: string[] }
  const result = {};
  for (const m of (raw.primary ?? [])) result[m] = 'prime_mover';
  for (const m of (raw.secondary ?? [])) {
    if (!result[m]) result[m] = 'synergist';
  }
  return result;
}

function getMuscleStatus(muscle, history, settings) {
  const recoveryHours = settings.recoveryHours[muscle] ?? 48;
  const now = Date.now();

  for (let i = history.length - 1; i >= 0; i--) {
    const session = history[i];
    const sessionTs = typeof session.finishedAt === 'number'
      ? session.finishedAt
      : new Date(session.date + 'T12:00:00').getTime();

    let depletion = 0;
    for (const ex of (session.exercises ?? [])) {
      const rawMuscles = getExerciseMuscles(ex.exerciseId, settings);
      const muscles = normaliseMuscles(rawMuscles);
      const role = muscles[muscle];
      if (role) depletion = Math.max(depletion, DEPLETION_BY_ROLE[role] ?? 0);
    }

    if (depletion === 0) continue;

    const hoursAgo = (now - sessionTs) / 3600000;
    const startFraction = 1 - depletion;
    const fraction = Math.min(1, startFraction + (hoursAgo / recoveryHours) * depletion);
    return { fraction, hoursAgo };
  }

  return { fraction: 1, hoursAgo: null };
}

export function renderRecovery(container, store) {
  const settings = getSettings();
  const history = store.getHistory();

  const muscleData = {};
  for (const muscle of Object.keys(MUSCLE_LABELS)) {
    const { fraction, hoursAgo } = getMuscleStatus(muscle, history, settings);
    muscleData[muscle] = {
      fraction,
      hoursAgo,
      color: recoveryColor(fraction),
      label: MUSCLE_LABELS[muscle],
      pct: Math.round(fraction * 100),
    };
  }

  const legendItems = Object.keys(MUSCLE_LABELS).map(m => {
    const d = muscleData[m];
    const statusText = d.hoursAgo === null ? 'Fresh' : `${d.pct}% recovered`;
    return `<div class="muscle-item">
      <div class="muscle-dot" style="background:${d.color}"></div>
      <span class="muscle-name">${d.label}</span>
      <span class="muscle-status">${statusText}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="recovery-view">
      <div class="recovery-header">Recovery</div>
      <div class="recovery-sub">Color shows recovery status — red to green</div>
      <div id="atlas-slot"></div>
      <div class="muscle-legend">${legendItems}</div>
    </div>
  `;

  const atlas = createMuscleAtlas(container.querySelector('#atlas-slot'), { mode: 'display' });
  for (const [muscle, data] of Object.entries(muscleData)) {
    atlas.setMuscleColor(muscle, data.color);
  }
}
