import { getSettings, saveSettings } from '../settings-store.js';
import { createMuscleAtlas, MUSCLE_LABELS } from '../components/muscle-atlas.js';
import { allMuscleFreshness } from '../recovery-model.js';
import { nudgeRecoveryHours } from '../recovery-tuning.js';

function recoveryColor(fraction) {
  const r = Math.round(255 * (1 - fraction));
  const g = Math.round(200 * fraction);
  return `rgb(${r},${g},40)`;
}

export function renderRecovery(container, store) {
  const settings = getSettings();
  const history = store.getHistory();

  const muscleIds = Object.keys(MUSCLE_LABELS);
  const freshness = allMuscleFreshness(muscleIds, history, settings);

  const muscleData = {};
  for (const muscle of muscleIds) {
    const { fraction, hoursAgo } = freshness[muscle];
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
    const hrs = settings.recoveryHours?.[m] ?? 48;
    return `<div class="muscle-item">
      <div class="muscle-dot" style="background:${d.color}"></div>
      <span class="muscle-name">${d.label}</span>
      <span class="muscle-status">${statusText}</span>
      <span class="muscle-window" title="Full recovery window">${hrs}h</span>
      <span class="muscle-tune">
        <button class="tune-btn" data-muscle="${m}" data-dir="sore" title="Still sore — recover slower">+</button>
        <button class="tune-btn" data-muscle="${m}" data-dir="fresh" title="Already fresh — recover faster">−</button>
      </span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="recovery-view">
      <div class="recovery-header">Recovery</div>
      <div class="recovery-sub">Color shows recovery status. Tap + / − to tune a muscle's window to how you actually feel.</div>
      <div id="atlas-slot"></div>
      <div class="muscle-legend">${legendItems}</div>
    </div>
  `;

  const atlas = createMuscleAtlas(container.querySelector('#atlas-slot'), { mode: 'display' });
  for (const [muscle, data] of Object.entries(muscleData)) {
    atlas.setMuscleColor(muscle, data.color);
  }

  container.querySelectorAll('.tune-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const muscle = btn.dataset.muscle;
      const current = settings.recoveryHours?.[muscle] ?? 48;
      settings.recoveryHours = settings.recoveryHours ?? {};
      settings.recoveryHours[muscle] = nudgeRecoveryHours(current, btn.dataset.dir);
      saveSettings(settings);
      renderRecovery(container, store); // re-render with the updated window
    });
  });
}
