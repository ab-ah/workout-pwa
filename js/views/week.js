import { getSettings } from '../settings-store.js';

export function renderWeek(container, store) {
  const settings = getSettings();
  const todayDow = new Date().getDay();
  let expandedDow = null;

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
        ? `<ol class="week-ex-list">${exercises.map(e => `<li>${e.name}</li>`).join('')}</ol>`
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

    container.innerHTML = `<div class="week-grid">${items}</div>`;

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
