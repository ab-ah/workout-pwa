import { PLAN } from '../data.js';

// Recovery window in hours per muscle group
const RECOVERY_HOURS = {
  chest:      60,
  shoulders:  48,
  triceps:    48,
  back:       72,
  biceps:     48,
  rear_delts: 48,
  quads:      72,
  hamstrings: 72,
  glutes:     72,
  calves:     48,
  abs:        36,
};

// Which muscle groups each plan day trains
const DAY_MUSCLES = [
  ['chest', 'shoulders', 'triceps'],           // Day 0: Push
  ['back', 'biceps', 'rear_delts'],            // Day 1: Pull
  ['quads', 'hamstrings', 'glutes', 'calves', 'abs'], // Day 2: Legs+Core
  ['chest', 'back', 'biceps', 'triceps', 'shoulders'], // Day 3: Upper
  ['hamstrings', 'glutes', 'quads', 'abs'],    // Day 4: Lower+Core
];

const MUSCLE_LABELS = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps',
  back: 'Back / Lats', biceps: 'Biceps', rear_delts: 'Rear Delts',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', abs: 'Abs / Core',
};

// Which muscles are front-visible vs back-visible
const FRONT_MUSCLES = ['chest', 'shoulders', 'biceps', 'triceps', 'quads', 'calves', 'abs'];
const BACK_MUSCLES  = ['back', 'rear_delts', 'glutes', 'hamstrings', 'calves', 'shoulders', 'triceps'];

function recoveryColor(fraction) {
  // 0 = fully trained (red), 1 = fully recovered (green)
  const r = Math.round(255 * (1 - fraction));
  const g = Math.round(200 * fraction);
  return `rgb(${r},${g},40)`;
}

function getMuscleStatus(muscle, history) {
  // Find the most recent session that trained this muscle
  const now = Date.now();
  let lastTrainedMs = null;

  for (let i = history.length - 1; i >= 0; i--) {
    const session = history[i];
    const muscles = DAY_MUSCLES[session.dayIndex] ?? [];
    if (muscles.includes(muscle)) {
      lastTrainedMs = new Date(session.date + 'T00:00:00').getTime();
      break;
    }
  }

  if (lastTrainedMs === null) return { fraction: 1, hoursAgo: null }; // never trained → fully green

  const hoursAgo = (now - lastTrainedMs) / 3600000;
  const fraction = Math.min(1, hoursAgo / RECOVERY_HOURS[muscle]);
  return { fraction, hoursAgo };
}

function buildBodySVG(side, muscleColors) {
  if (side === 'front') {
    return `<svg class="body-diagram" viewBox="0 0 200 480" xmlns="http://www.w3.org/2000/svg">
  <!-- Outline -->
  <ellipse cx="100" cy="42" rx="28" ry="32" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="68" y="72" width="64" height="10" rx="5" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="60" y="80" width="80" height="110" rx="12" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="60" y="188" width="80" height="90" rx="8" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <!-- Arms -->
  <rect x="22" y="82" width="36" height="100" rx="16" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="22" y="180" width="32" height="80" rx="14" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="142" y="82" width="36" height="100" rx="16" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="146" y="180" width="32" height="80" rx="14" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <!-- Legs -->
  <rect x="64" y="276" width="34" height="120" rx="14" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="64" y="394" width="30" height="72" rx="12" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="102" y="276" width="34" height="120" rx="14" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="104" y="394" width="30" height="72" rx="12" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>

  <!-- Muscle regions -->
  <!-- Chest -->
  <ellipse cx="83" cy="106" rx="18" ry="22" fill="${muscleColors.chest}" opacity="0.75"/>
  <ellipse cx="117" cy="106" rx="18" ry="22" fill="${muscleColors.chest}" opacity="0.75"/>
  <!-- Shoulders -->
  <ellipse cx="54" cy="90" rx="16" ry="14" fill="${muscleColors.shoulders}" opacity="0.75"/>
  <ellipse cx="146" cy="90" rx="16" ry="14" fill="${muscleColors.shoulders}" opacity="0.75"/>
  <!-- Biceps -->
  <ellipse cx="33" cy="130" rx="12" ry="22" fill="${muscleColors.biceps}" opacity="0.75"/>
  <ellipse cx="167" cy="130" rx="12" ry="22" fill="${muscleColors.biceps}" opacity="0.75"/>
  <!-- Triceps (side) -->
  <ellipse cx="24" cy="130" rx="8" ry="20" fill="${muscleColors.triceps}" opacity="0.6"/>
  <ellipse cx="176" cy="130" rx="8" ry="20" fill="${muscleColors.triceps}" opacity="0.6"/>
  <!-- Abs -->
  <rect x="78" y="148" width="44" height="50" rx="8" fill="${muscleColors.abs}" opacity="0.7"/>
  <!-- Quads -->
  <ellipse cx="81" cy="320" rx="16" ry="44" fill="${muscleColors.quads}" opacity="0.75"/>
  <ellipse cx="119" cy="320" rx="16" ry="44" fill="${muscleColors.quads}" opacity="0.75"/>
  <!-- Calves -->
  <ellipse cx="79" cy="418" rx="13" ry="30" fill="${muscleColors.calves}" opacity="0.75"/>
  <ellipse cx="119" cy="418" rx="13" ry="30" fill="${muscleColors.calves}" opacity="0.75"/>
</svg>`;
  }

  // Back view
  return `<svg class="body-diagram" viewBox="0 0 200 480" xmlns="http://www.w3.org/2000/svg">
  <!-- Outline (same structure, mirrored) -->
  <ellipse cx="100" cy="42" rx="28" ry="32" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="68" y="72" width="64" height="10" rx="5" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="60" y="80" width="80" height="110" rx="12" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="60" y="188" width="80" height="90" rx="8" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="22" y="82" width="36" height="100" rx="16" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="22" y="180" width="32" height="80" rx="14" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="142" y="82" width="36" height="100" rx="16" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="146" y="180" width="32" height="80" rx="14" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="64" y="276" width="34" height="120" rx="14" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="64" y="394" width="30" height="72" rx="12" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="102" y="276" width="34" height="120" rx="14" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>
  <rect x="104" y="394" width="30" height="72" rx="12" fill="#1d222b" stroke="#2a313d" stroke-width="1.5"/>

  <!-- Muscle regions — back -->
  <!-- Traps / Upper back -->
  <ellipse cx="100" cy="85" rx="30" ry="14" fill="${muscleColors.back}" opacity="0.75"/>
  <!-- Lats / Back -->
  <ellipse cx="78" cy="120" rx="18" ry="34" fill="${muscleColors.back}" opacity="0.75"/>
  <ellipse cx="122" cy="120" rx="18" ry="34" fill="${muscleColors.back}" opacity="0.75"/>
  <!-- Rear Delts -->
  <ellipse cx="52" cy="88" rx="16" ry="13" fill="${muscleColors.rear_delts}" opacity="0.75"/>
  <ellipse cx="148" cy="88" rx="16" ry="13" fill="${muscleColors.rear_delts}" opacity="0.75"/>
  <!-- Triceps (back of arm) -->
  <ellipse cx="31" cy="130" rx="12" ry="24" fill="${muscleColors.triceps}" opacity="0.75"/>
  <ellipse cx="169" cy="130" rx="12" ry="24" fill="${muscleColors.triceps}" opacity="0.75"/>
  <!-- Glutes -->
  <ellipse cx="82" cy="210" rx="20" ry="24" fill="${muscleColors.glutes}" opacity="0.75"/>
  <ellipse cx="118" cy="210" rx="20" ry="24" fill="${muscleColors.glutes}" opacity="0.75"/>
  <!-- Hamstrings -->
  <ellipse cx="81" cy="316" rx="16" ry="42" fill="${muscleColors.hamstrings}" opacity="0.75"/>
  <ellipse cx="119" cy="316" rx="16" ry="42" fill="${muscleColors.hamstrings}" opacity="0.75"/>
  <!-- Calves -->
  <ellipse cx="79" cy="418" rx="13" ry="30" fill="${muscleColors.calves}" opacity="0.75"/>
  <ellipse cx="119" cy="418" rx="13" ry="30" fill="${muscleColors.calves}" opacity="0.75"/>
</svg>`;
}

export function renderRecovery(container, store) {
  let side = 'front';
  const history = store.getHistory();

  // Compute recovery status for all muscles
  const muscleData = {};
  for (const muscle of Object.keys(RECOVERY_HOURS)) {
    const { fraction, hoursAgo } = getMuscleStatus(muscle, history);
    muscleData[muscle] = {
      fraction,
      hoursAgo,
      color: recoveryColor(fraction),
      label: MUSCLE_LABELS[muscle],
      pct: Math.round(fraction * 100),
    };
  }

  function render() {
    const muscleColors = {};
    for (const [m, d] of Object.entries(muscleData)) muscleColors[m] = d.color;

    const visibleMuscles = side === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;
    const legendItems = [...new Set(visibleMuscles)].map((m) => {
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
        <div class="recovery-sub">Tap a view to see muscle status</div>
        <div class="body-toggle">
          <button id="btn-front" class="${side === 'front' ? 'active' : ''}">Front</button>
          <button id="btn-back" class="${side === 'back' ? 'active' : ''}">Back</button>
        </div>
        ${buildBodySVG(side, muscleColors)}
        <div class="muscle-legend">${legendItems}</div>
      </div>
    `;

    container.querySelector('#btn-front').addEventListener('click', () => { side = 'front'; render(); });
    container.querySelector('#btn-back').addEventListener('click', () => { side = 'back'; render(); });
  }

  render();
}
