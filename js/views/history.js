import { getSettings } from '../settings-store.js';
import { buildChartSVG } from '../components/chart.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Local "HH:MM" for an epoch, or a sensible default when absent. */
function timeStr(ms) {
  if (typeof ms !== 'number') return '12:00';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function renderHistory(container, store) {
  let mode = 'log'; // 'log' | 'progress'
  let editingId = null; // sessionId currently being edited

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
    body.innerHTML = history.map((session) => {
      const isEditing = editingId === session.sessionId;
      const meta = isEditing
        ? `<div class="session-edit">
             <input type="date" class="set-input" data-edit="date" value="${escapeHtml(session.date)}">
             <input type="time" class="set-input" data-edit="time" value="${escapeHtml(timeStr(session.finishedAt))}">
             <button class="btn-primary" data-edit-save="${escapeHtml(session.sessionId)}">Save</button>
             <button class="btn-secondary" data-edit-cancel="1">Cancel</button>
           </div>`
        : `<span class="muted">${escapeHtml(session.date)}</span>
           <button class="btn-icon session-edit-btn" data-edit-open="${escapeHtml(session.sessionId)}" title="Edit date & time">✎</button>`;
      return `
        <div class="session-row">
          <strong>${escapeHtml(session.dayTitle)}</strong> — ${meta}
          <div class="muted">${session.exercises.length} exercises</div>
          <ul>
            ${session.exercises.map((e) => `<li>${escapeHtml(e.name)}: ${e.sets.map((s) => `${escapeHtml(s.weight)}kg x ${escapeHtml(s.reps)}`).join(', ')}</li>`).join('')}
          </ul>
        </div>
      `;
    }).join('');

    body.querySelectorAll('[data-edit-open]').forEach(btn => {
      btn.addEventListener('click', () => { editingId = btn.dataset.editOpen; render(); });
    });
    body.querySelectorAll('[data-edit-cancel]').forEach(btn => {
      btn.addEventListener('click', () => { editingId = null; render(); });
    });
    body.querySelectorAll('[data-edit-save]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sessionId = btn.dataset.editSave;
        const row = btn.closest('.session-row');
        const date = row.querySelector('[data-edit="date"]').value;
        const time = row.querySelector('[data-edit="time"]').value || '12:00';
        if (!date) return;
        const newFinishedAt = new Date(`${date}T${time}`).getTime();
        if (Number.isNaN(newFinishedAt)) return;
        const session = store.getHistory().find(s => s.sessionId === sessionId);
        const patch = { date, finishedAt: newFinishedAt };
        // Preserve the recorded workout duration when a startedAt exists.
        if (session && typeof session.startedAt === 'number' && typeof session.finishedAt === 'number') {
          patch.startedAt = session.startedAt + (newFinishedAt - session.finishedAt);
        }
        store.updateSession(sessionId, patch);
        editingId = null;
        render();
      });
    });
  }

  function renderProgress(body) {
    const exercises = getSettings().exercises ?? [];
    const options = exercises.map((e) => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)}</option>`).join('');
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
