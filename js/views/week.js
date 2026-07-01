import { PLAN } from '../data.js';

export function renderWeek(container, store) {
  const progress = store.getProgress();
  const nextIndex = store.getNextDayIndex(PLAN.length, progress);

  const items = PLAN.map((day, index) => {
    const isNext = index === nextIndex;
    const isDoneThisCycle = wasCompletedAfter(index);
    const status = isNext ? 'Next up' : (isDoneThisCycle ? 'Done' : 'Pending');
    return `
      <div class="week-item ${isNext ? 'is-next' : ''}" style="border-left:4px solid var(${day.colorVar})">
        <div>
          <strong>${day.title}</strong>
          <div class="muted">${day.tag} · ${day.exercises.length} exercises</div>
        </div>
        <span class="status">${status}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="week-grid">${items}</div>`;

  function wasCompletedAfter(index) {
    if (progress.lastCompletedDayIndex === -1) return false;
    if (nextIndex === 0) return true; // full cycle just completed, all days done
    return index < nextIndex;
  }
}
