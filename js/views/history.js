import { getSettings } from '../settings-store.js';
import { buildChartSVG } from '../components/chart.js';
import { movingAverage, weightTrend, latestEntry } from '../bodyweight.js';
import { weightCoach, proteinTarget } from '../weight-coach.js';
import { e1rmSeries, isE1RMPRInSession } from '../one-rep-max.js';
import { localDateStr } from '../schedule.js';

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
      const totalSets = session.exercises.reduce((n, e) => n + (e.sets?.length ?? 0), 0);
      return `
        <div class="session-row">
          <strong>${escapeHtml(session.dayTitle)}</strong> — ${meta}
          <details class="session-details">
            <summary>${session.exercises.length} exercises · ${totalSets} sets</summary>
            <ul>
              ${session.exercises.map((e) => `<li>${escapeHtml(e.name)}: ${e.sets.map((s) => `${escapeHtml(s.weight)}kg x ${escapeHtml(s.reps)}${Number.isFinite(s.rpe) ? ` <span class="set-rpe">@${escapeHtml(s.rpe)}</span>` : ''}`).join(', ')}</li>`).join('')}
            </ul>
          </details>
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

  let metric = 'topset'; // 'topset' | 'e1rm'
  let selectedExerciseId = null; // persists across metric toggles / re-renders

  /** The exercise with the most logged sessions — a far more useful default for
   *  the Progress chart than whatever happens to be first in the list. */
  function mostTrainedExerciseId() {
    const counts = {};
    for (const s of store.getHistory()) {
      for (const e of (s.exercises ?? [])) counts[e.exerciseId] = (counts[e.exerciseId] ?? 0) + 1;
    }
    let best = null, bestN = -1;
    for (const [id, n] of Object.entries(counts)) {
      if (n > bestN) { bestN = n; best = id; }
    }
    return best;
  }

  function renderProgress(body) {
    const exercises = getSettings().exercises ?? [];
    if (selectedExerciseId == null) {
      selectedExerciseId = mostTrainedExerciseId() ?? (exercises[0]?.id ?? null);
    }
    const options = exercises.map((e) => `<option value="${escapeHtml(e.id)}"${e.id === selectedExerciseId ? ' selected' : ''}>${escapeHtml(e.name)}</option>`).join('');
    body.innerHTML = `
      ${bodyweightCardHtml()}
      <div class="progress-section-label">Exercise progress</div>
      <select id="exercise-select" class="set-input" style="width:100%;margin-bottom:10px">${options}</select>
      <div class="metric-toggle">
        <button id="metric-topset" class="${metric === 'topset' ? 'active' : ''}">Top set</button>
        <button id="metric-e1rm" class="${metric === 'e1rm' ? 'active' : ''}">Est. 1RM</button>
      </div>
      <div id="pr-badge"></div>
      <div id="chart-slot"></div>
    `;

    wireBodyweight(body);

    const select = body.querySelector('#exercise-select');
    const chartSlot = body.querySelector('#chart-slot');
    const prBadge = body.querySelector('#pr-badge');

    function drawChart() {
      const history = store.getHistory();
      const exId = select.value;
      const points = metric === 'e1rm'
        ? e1rmSeries(history, exId)
        : store.getExerciseHistory(exId);
      chartSlot.innerHTML = buildChartSVG(points, { width: 600, height: 220 });

      // PR badge: did the most recent session that trained this exercise set an
      // all-time e1RM best?
      const lastSession = [...history].reverse()
        .find(s => (s.exercises ?? []).some(e => e.exerciseId === exId));
      prBadge.innerHTML = (lastSession && isE1RMPRInSession(history, lastSession.sessionId, exId))
        ? `<div class="pr-badge">🏆 New estimated-1RM PR on your last session</div>`
        : '';
    }

    select.addEventListener('change', () => { selectedExerciseId = select.value; drawChart(); });
    body.querySelector('#metric-topset').addEventListener('click', () => { metric = 'topset'; render(); });
    body.querySelector('#metric-e1rm').addEventListener('click', () => { metric = 'e1rm'; render(); });
    drawChart();
  }

  function bodyweightCardHtml() {
    const entries = store.getBodyweights();
    const latest = latestEntry(entries);
    const ma = movingAverage(entries, 7);
    const trend = weightTrend(entries, 7, 7);

    let readout = '<p class="muted" style="font-size:13px">Log your weight to see the 7-day trend that actually tracks fat loss.</p>';
    if (latest) {
      const trendText = trend
        ? `<span class="bw-trend ${trend.deltaKg <= 0 ? 'down' : 'up'}">${trend.deltaKg > 0 ? '▲' : '▼'} ${Math.abs(trend.deltaKg)}kg / 7-day avg</span>`
        : '<span class="muted" style="font-size:12px">Keep logging to build a trend</span>';
      readout = `<div class="bw-readout"><strong>${latest.kg}kg</strong> <span class="muted">latest</span> ${trendText}</div>`;
    }

    const chart = ma.length >= 2
      ? `<div class="bw-chart">${buildChartSVG(ma, { width: 600, height: 160 })}</div>`
      : '';

    const coach = latest ? weightCoach(trend, latest.kg) : null;
    const protein = latest ? proteinTarget(latest.kg) : null;
    const coachHtml = coach
      ? `<div class="bw-coach bw-coach-${coach.level}">
           <strong>${coach.headline}</strong>
           <div class="muted">${coach.detail}</div>
           ${protein ? `<div class="bw-protein muted">Protein target: <strong>${protein.low}–${protein.high} g/day</strong> to hold muscle in the deficit.</div>` : ''}
         </div>`
      : '';

    return `
      <div class="bodyweight-card">
        <div class="progress-section-label">Body weight</div>
        ${readout}
        <div class="bw-log-row">
          <input type="number" inputmode="decimal" step="0.1" class="set-input" id="bw-input" placeholder="kg today" style="width:120px">
          <button class="btn-secondary" id="bw-log-btn">Log weight</button>
        </div>
        ${coachHtml}
        ${chart}
      </div>
    `;
  }

  function wireBodyweight(body) {
    const btn = body.querySelector('#bw-log-btn');
    const input = body.querySelector('#bw-input');
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const kg = parseFloat(input.value);
      if (!Number.isFinite(kg) || kg <= 0) {
        input.style.borderColor = 'var(--push)';
        return;
      }
      store.addBodyweight({ date: localDateStr(Date.now()), kg, at: Date.now() });
      render();
    });
  }

  render();
}
