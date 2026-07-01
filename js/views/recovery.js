import { getSettings, getExerciseMuscles } from '../settings-store.js';

const MUSCLE_LABELS = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps',
  back: 'Back / Lats', biceps: 'Biceps', rear_delts: 'Rear Delts',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', abs: 'Abs / Core',
};

function recoveryColor(fraction) {
  const r = Math.round(255 * (1 - fraction));
  const g = Math.round(200 * fraction);
  return `rgb(${r},${g},40)`;
}

function getMuscleStatus(muscle, history, settings) {
  const recoveryHours = settings.recoveryHours[muscle] ?? 48;
  const now = Date.now();

  for (let i = history.length - 1; i >= 0; i--) {
    const session = history[i];
    // Use actual finish timestamp; fall back to noon of session date if missing
    const sessionTs = typeof session.finishedAt === 'number'
      ? session.finishedAt
      : new Date(session.date + 'T12:00:00').getTime();

    let depletion = 0;
    for (const ex of (session.exercises ?? [])) {
      const { primary, secondary } = getExerciseMuscles(ex.exerciseId, settings);
      if (primary.includes(muscle)) { depletion = 1.0; break; }
      if (secondary.includes(muscle)) depletion = Math.max(depletion, 0.5);
    }

    if (depletion === 0) continue;

    const hoursAgo = (now - sessionTs) / 3600000;
    // Primary: full recovery time. Secondary: recovers twice as fast.
    const adjustedHours = recoveryHours * depletion;
    const fraction = Math.min(1, hoursAgo / adjustedHours);
    return { fraction, hoursAgo };
  }

  return { fraction: 1, hoursAgo: null }; // never trained
}

function buildFrontSVG(muscleColors) {
  const c = muscleColors;
  return `<svg class="body-diagram" viewBox="0 0 200 480" xmlns="http://www.w3.org/2000/svg">
  <title>Front view</title>
  <!-- Head -->
  <ellipse cx="100" cy="42" rx="28" ry="32" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Neck -->
  <rect x="88" y="72" width="24" height="14" rx="5" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Torso -->
  <path d="M62 84 Q62 78 70 78 L130 78 Q138 78 138 84 L140 190 Q140 198 132 198 L68 198 Q60 198 60 190 Z" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Hips -->
  <path d="M60 194 Q60 276 68 278 L132 278 Q140 276 140 194 Z" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Upper arms -->
  <rect x="20" y="82" width="38" height="98" rx="18" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <rect x="142" y="82" width="38" height="98" rx="18" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Forearms -->
  <rect x="22" y="178" width="32" height="82" rx="14" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <rect x="146" y="178" width="32" height="82" rx="14" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Thighs -->
  <rect x="62" y="274" width="36" height="118" rx="16" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <rect x="102" y="274" width="36" height="118" rx="16" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Shins -->
  <rect x="64" y="390" width="30" height="76" rx="12" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <rect x="106" y="390" width="30" height="76" rx="12" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>

  <!-- Muscle overlays: Front -->
  <!-- Chest -->
  <ellipse cx="83" cy="108" rx="20" ry="24" fill="${c.chest}" opacity="0.72"/>
  <ellipse cx="117" cy="108" rx="20" ry="24" fill="${c.chest}" opacity="0.72"/>
  <!-- Shoulders -->
  <ellipse cx="51" cy="90" rx="17" ry="14" fill="${c.shoulders}" opacity="0.72"/>
  <ellipse cx="149" cy="90" rx="17" ry="14" fill="${c.shoulders}" opacity="0.72"/>
  <!-- Biceps -->
  <ellipse cx="33" cy="128" rx="13" ry="24" fill="${c.biceps}" opacity="0.72"/>
  <ellipse cx="167" cy="128" rx="13" ry="24" fill="${c.biceps}" opacity="0.72"/>
  <!-- Triceps sides -->
  <ellipse cx="23" cy="126" rx="8" ry="20" fill="${c.triceps}" opacity="0.55"/>
  <ellipse cx="177" cy="126" rx="8" ry="20" fill="${c.triceps}" opacity="0.55"/>
  <!-- Abs -->
  <rect x="80" y="148" width="40" height="52" rx="8" fill="${c.abs}" opacity="0.68"/>
  <!-- Quads -->
  <ellipse cx="80" cy="322" rx="17" ry="46" fill="${c.quads}" opacity="0.72"/>
  <ellipse cx="120" cy="322" rx="17" ry="46" fill="${c.quads}" opacity="0.72"/>
  <!-- Calves front -->
  <ellipse cx="79" cy="418" rx="13" ry="30" fill="${c.calves}" opacity="0.68"/>
  <ellipse cx="121" cy="418" rx="13" ry="30" fill="${c.calves}" opacity="0.68"/>

  <text x="100" y="475" text-anchor="middle" fill="#4a5568" font-size="10" font-family="sans-serif">FRONT</text>
</svg>`;
}

function buildBackSVG(muscleColors) {
  const c = muscleColors;
  return `<svg class="body-diagram" viewBox="0 0 200 480" xmlns="http://www.w3.org/2000/svg">
  <title>Back view</title>
  <!-- Head -->
  <ellipse cx="100" cy="42" rx="28" ry="32" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Neck -->
  <rect x="88" y="72" width="24" height="14" rx="5" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Torso -->
  <path d="M62 84 Q62 78 70 78 L130 78 Q138 78 138 84 L140 190 Q140 198 132 198 L68 198 Q60 198 60 190 Z" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Hips -->
  <path d="M60 194 Q60 276 68 278 L132 278 Q140 276 140 194 Z" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Upper arms -->
  <rect x="20" y="82" width="38" height="98" rx="18" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <rect x="142" y="82" width="38" height="98" rx="18" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Forearms -->
  <rect x="22" y="178" width="32" height="82" rx="14" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <rect x="146" y="178" width="32" height="82" rx="14" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Thighs -->
  <rect x="62" y="274" width="36" height="118" rx="16" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <rect x="102" y="274" width="36" height="118" rx="16" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <!-- Shins -->
  <rect x="64" y="390" width="30" height="76" rx="12" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>
  <rect x="106" y="390" width="30" height="76" rx="12" fill="#252d3a" stroke="#3a4556" stroke-width="1.5"/>

  <!-- Muscle overlays: Back -->
  <!-- Traps -->
  <ellipse cx="100" cy="86" rx="32" ry="14" fill="${c.back}" opacity="0.72"/>
  <!-- Lats -->
  <ellipse cx="76" cy="124" rx="20" ry="36" fill="${c.back}" opacity="0.72"/>
  <ellipse cx="124" cy="124" rx="20" ry="36" fill="${c.back}" opacity="0.72"/>
  <!-- Rear Delts -->
  <ellipse cx="51" cy="90" rx="17" ry="13" fill="${c.rear_delts}" opacity="0.72"/>
  <ellipse cx="149" cy="90" rx="17" ry="13" fill="${c.rear_delts}" opacity="0.72"/>
  <!-- Triceps back of arm -->
  <ellipse cx="30" cy="128" rx="13" ry="26" fill="${c.triceps}" opacity="0.72"/>
  <ellipse cx="170" cy="128" rx="13" ry="26" fill="${c.triceps}" opacity="0.72"/>
  <!-- Glutes -->
  <ellipse cx="82" cy="212" rx="22" ry="26" fill="${c.glutes}" opacity="0.72"/>
  <ellipse cx="118" cy="212" rx="22" ry="26" fill="${c.glutes}" opacity="0.72"/>
  <!-- Hamstrings -->
  <ellipse cx="80" cy="320" rx="17" ry="44" fill="${c.hamstrings}" opacity="0.72"/>
  <ellipse cx="120" cy="320" rx="17" ry="44" fill="${c.hamstrings}" opacity="0.72"/>
  <!-- Calves back -->
  <ellipse cx="79" cy="418" rx="13" ry="30" fill="${c.calves}" opacity="0.68"/>
  <ellipse cx="121" cy="418" rx="13" ry="30" fill="${c.calves}" opacity="0.68"/>

  <text x="100" y="475" text-anchor="middle" fill="#4a5568" font-size="10" font-family="sans-serif">BACK</text>
</svg>`;
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

  const muscleColors = {};
  for (const [m, d] of Object.entries(muscleData)) muscleColors[m] = d.color;

  const legendItems = Object.keys(MUSCLE_LABELS).map((m) => {
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
      <div class="body-diagrams-row">
        ${buildFrontSVG(muscleColors)}
        ${buildBackSVG(muscleColors)}
      </div>
      <div class="muscle-legend">${legendItems}</div>
    </div>
  `;
}
