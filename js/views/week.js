import { getSettings } from '../settings-store.js';
import { weeklyVolumeByMuscle, volumeStatus } from '../volume.js';
import { routineReadiness } from '../recovery-model.js';
import { MUSCLE_LABELS } from '../components/muscle-atlas-paths.js';

// A prime-mover muscle below this freshness is called out when previewing a day.
const READINESS_LOW = 0.6;

// Colour + label per volume tier (see volume.js volumeStatus).
const VOLUME_TIERS = {
  below:       { color: '#e0553a', label: 'below MEV' },
  maintenance: { color: '#e0b03a', label: 'maintenance' },
  optimal:     { color: '#46d160', label: 'optimal' },
  high:        { color: '#6a8cff', label: 'over MRV' },
  unknown:     { color: '#8a8a8a', label: '' },
};

function readinessTier(readiness) {
  if (readiness >= 0.85) return { label: 'Ready', color: '#46d160' };
  if (readiness >= 0.6) return { label: 'Mostly ready', color: '#e0b03a' };
  return { label: 'Under-recovered', color: '#e0553a' };
}

export function renderWeek(container, store) {
  const settings = getSettings();
  const history = store.getHistory();
  const todayDow = new Date().getDay();
  let expandedDow = null;

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Synergist sets count at half weight (see volume.js), so totals can land on
  // a .5 — show one decimal only when it's not a whole number.
  function formatSets(sets) {
    return Number.isInteger(sets) ? String(sets) : sets.toFixed(1);
  }

  // Muscle recovery + overall readiness for a routine, shown when a day is opened
  // so you can see what a *future* session would feel like, not just today's.
  function readinessHtml(routine) {
    const { readiness, perMuscle } = routineReadiness(routine, settings, history);
    const pct = Math.round(readiness * 100);
    const tier = readinessTier(readiness);
    const lagging = perMuscle
      .filter(m => m.role === 'prime_mover' && m.freshness < READINESS_LOW)
      .map(m => `${MUSCLE_LABELS[m.muscle] ?? m.muscle} ${Math.round(m.freshness * 100)}%`);
    const warn = lagging.length
      ? `<div class="week-readiness-warn">⚠ ${lagging.join(' · ')}</div>`
      : '';
    return `
      <div class="week-readiness">
        <div class="week-readiness-track">
          <div class="week-readiness-fill" style="width:${pct}%;background:${tier.color}"></div>
        </div>
        <div class="week-readiness-row">
          <span style="color:${tier.color};font-weight:600">${tier.label}</span>
          <span class="muted">${pct}% recovered for this routine</span>
        </div>
        ${warn}
      </div>
    `;
  }

  function volumeHtml() {
    const volume = weeklyVolumeByMuscle(settings.schedule, settings.routines, settings.exercises);
    if (!volume.length) return '';
    const rows = volume.map(({ muscle, sets }) => {
      const { tier, landmarks } = volumeStatus(muscle, sets);
      const t = VOLUME_TIERS[tier] ?? VOLUME_TIERS.unknown;
      // Scale the bar to MRV so the track represents "as much as you can recover
      // from"; a MEV tick marks the maintenance floor. Falls back to relative
      // scaling for any muscle without landmarks.
      const scaleMax = landmarks?.mrv ?? (volume[0].sets || 1);
      const pct = Math.min(100, Math.round((sets / scaleMax) * 100));
      const mevTick = landmarks
        ? `<span class="volume-mev" style="left:${Math.min(100, Math.round((landmarks.mev / scaleMax) * 100))}%" title="MEV ${landmarks.mev}"></span>`
        : '';
      const range = landmarks ? `<span class="muted volume-range">${landmarks.mev}–${landmarks.mrv}</span>` : '';
      return `
        <div class="volume-row">
          <span class="volume-label">${MUSCLE_LABELS[muscle] ?? muscle}</span>
          <div class="volume-track">
            <div class="volume-fill" style="width:${pct}%;background:${t.color}"></div>
            ${mevTick}
          </div>
          <span class="volume-count" style="color:${t.color}">${formatSets(sets)}</span>
          ${range}
        </div>
      `;
    }).join('');
    return `
      <div class="volume-section">
        <div class="volume-title">Planned Weekly Volume · sets per muscle</div>
        ${rows}
        <div class="volume-note">
          Bars scale to MRV (max recoverable); the tick marks MEV (maintenance floor). Colour:
          <span style="color:${VOLUME_TIERS.below.color}">below MEV</span> ·
          <span style="color:${VOLUME_TIERS.maintenance.color}">maintenance</span> ·
          <span style="color:${VOLUME_TIERS.optimal.color}">optimal</span> ·
          <span style="color:${VOLUME_TIERS.high.color}">over MRV</span>.
          Counts prime sets + half-credit synergist sets (planned, not logged).
        </div>
      </div>
    `;
  }

  function render() {
    // Mon–Sun display order
    const items = [1, 2, 3, 4, 5, 6, 0].map(dow => {
      const routineId = settings.schedule?.[String(dow)] ?? null;
      const routine = routineId ? settings.routines?.find(r => r.id === routineId) : null;
      const isToday = dow === todayDow;
      const isExpanded = expandedDow === dow && routine;

      const exercises = isExpanded
        ? (routine.exerciseIds ?? []).map(id => settings.exercises?.find(e => e.id === id)).filter(Boolean)
        : [];

      const exList = isExpanded && exercises.length
        ? `${readinessHtml(routine)}<ol class="week-ex-list">${exercises.map(e => `<li>${e.name}</li>`).join('')}</ol>`
        : '';

      if (!routine) {
        return `<div class="week-item is-rest${isToday ? ' is-today' : ''}" data-dow="${dow}">
          <div class="week-item-main">
            <div>
              <strong>${DAY_NAMES[dow]}</strong>
              <div class="muted">Rest Day</div>
            </div>
            ${isToday ? '<span class="status">Today</span>' : ''}
          </div>
        </div>`;
      }

      return `<div class="week-item${isToday ? ' is-today' : ''}" style="border-left:4px solid var(${routine.colorVar})" data-dow="${dow}">
        <div class="week-item-main">
          <div>
            <strong>${DAY_NAMES[dow]}</strong>
            <div class="muted">${routine.name} · ${routine.tag}</div>
          </div>
          <span class="status">${isToday ? 'Today' : (isExpanded ? '▲' : '▼')}</span>
        </div>
        ${exList}
      </div>`;
    }).join('');

    container.innerHTML = `<div class="week-grid">${items}</div>${volumeHtml()}`;

    container.querySelectorAll('.week-item:not(.is-rest)').forEach(item => {
      item.querySelector('.week-item-main').addEventListener('click', () => {
        const dow = +item.dataset.dow;
        expandedDow = expandedDow === dow ? null : dow;
        render();
      });
    });
  }

  render();
}
