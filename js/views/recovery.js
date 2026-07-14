import { getSettings, saveSettings } from '../settings-store.js';
import { createMuscleAtlas, MUSCLE_LABELS } from '../components/muscle-atlas.js';
import { allMuscleFreshness, hoursUntilFresh } from '../recovery-model.js';
import { nudgeRecoveryHours } from '../recovery-tuning.js';

// A muscle at/above this freshness is treated as "ready" — no ETA shown.
const READY_FRACTION = 0.9;

function recoveryColor(fraction) {
  const r = Math.round(255 * (1 - fraction));
  const g = Math.round(200 * fraction);
  return `rgb(${r},${g},40)`;
}

export function renderRecovery(container, store, justTunedMuscle = null) {
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
    let statusText;
    if (d.hoursAgo === null || d.fraction >= READY_FRACTION) {
      statusText = 'Ready';
    } else {
      const eta = hoursUntilFresh(m, history, settings, READY_FRACTION);
      statusText = eta > 0 ? `${d.pct}% · ready in ${eta}h` : `${d.pct}% recovered`;
    }
    const hrs = settings.recoveryHours?.[m] ?? 48;
    return `<div class="muscle-item">
      <div class="muscle-dot" style="background:${d.color}"></div>
      <span class="muscle-name">${d.label}</span>
      <span class="muscle-status">${statusText}</span>
      <span class="muscle-window${m === justTunedMuscle ? ' just-tuned' : ''}" title="Full recovery window — type an exact value or use + / −">
        <input type="number" class="muscle-window-input" data-muscle-hours="${m}" value="${hrs}" min="1" max="336" aria-label="${d.label} full recovery hours">h
      </span>
      <span class="muscle-tune">
        <button class="tune-btn" data-muscle="${m}" data-dir="sore" title="Still sore — recover slower">+</button>
        <button class="tune-btn" data-muscle="${m}" data-dir="fresh" title="Already fresh — recover faster">−</button>
      </span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="recovery-view">
      <div class="recovery-header">Recovery</div>
      <div class="recovery-sub">Color shows recovery status. Harder sets (higher logged RPE) and bigger sessions take longer to clear. Tap + / − to tune a muscle's window to how you actually feel.</div>
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
      renderRecovery(container, store, muscle); // re-render; pulse the changed window
    });
  });

  // Exact numeric entry (replaces the Settings-tab recovery editor). Clamp to a
  // sane 1h–14d window so a stray keystroke can't wreck the readiness model.
  container.querySelectorAll('.muscle-window-input').forEach(input => {
    input.addEventListener('change', () => {
      const muscle = input.dataset.muscleHours;
      const hours = Math.max(1, Math.min(336, Math.round(+input.value)));
      if (!Number.isFinite(hours)) { input.value = settings.recoveryHours?.[muscle] ?? 48; return; }
      settings.recoveryHours = settings.recoveryHours ?? {};
      settings.recoveryHours[muscle] = hours;
      saveSettings(settings);
      renderRecovery(container, store, muscle); // re-render; pulse the changed window
    });
  });
}
