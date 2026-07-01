import { PLAN } from '../data.js';
import { buildChartSVG } from '../components/chart.js';

const ALL_EXERCISES = PLAN.flatMap((day) => day.exercises);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderHistory(container, store) {
  let mode = 'log'; // 'log' | 'progress'

  function render() {
    container.innerHTML = `
      <div class="history-toggle">
        <button id="tab-log" class="${mode === 'log' ? 'active' : ''}">Log</button>
        <button id="tab-progress" class="${mode === 'progress' ? 'active' : ''}">Progress</button>
      </div>
      <div id="history-body"></div>
    `;
    container.querySelector('#tab-log').addEventListener('click', () => { mode = 'log'; render(); });
    container.querySelector('#tab-progress').addEventListener('click', () => { mode = 'progress'; render(); });

    const body = container.querySelector('#history-body');
    if (mode === 'log') renderLog(body); else renderProgress(body);
  }

  function renderLog(body) {
    const history = [...store.getHistory()].reverse();
    if (history.length === 0) {
      body.innerHTML = '<p class="muted">No sessions logged yet.</p>';
      return;
    }
    body.innerHTML = history.map((session) => `
      <div class="session-row">
        <strong>${escapeHtml(session.dayTitle)}</strong> — <span class="muted">${escapeHtml(session.date)}</span>
        <div class="muted">${session.exercises.length} exercises</div>
        <ul>
          ${session.exercises.map((e) => `<li>${escapeHtml(e.name)}: ${e.sets.map((s) => `${escapeHtml(s.weight)}kg x ${escapeHtml(s.reps)}`).join(', ')}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  function renderProgress(body) {
    const options = ALL_EXERCISES.map((e) => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)}</option>`).join('');
    body.innerHTML = `
      <select id="exercise-select" class="set-input" style="width:100%;margin-bottom:14px">${options}</select>
      <div id="chart-slot"></div>
    `;
    const select = body.querySelector('#exercise-select');
    const chartSlot = body.querySelector('#chart-slot');

    function drawChart() {
      const points = store.getExerciseHistory(select.value);
      chartSlot.innerHTML = buildChartSVG(points, { width: 600, height: 220 });
    }

    select.addEventListener('change', drawChart);
    drawChart();
  }

  render();
}
