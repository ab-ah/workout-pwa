import { getSettings } from '../settings-store.js';
import { buildChartSVG } from '../components/chart.js';
import { movingAverage, weightTrend, latestEntry } from '../bodyweight.js';
import { weightCoach, proteinTarget } from '../weight-coach.js';
import { e1rmSeries, isE1RMPRInSession, bestE1RM } from '../one-rep-max.js';
import { localDateStr } from '../schedule.js';
import { exerciseLogMode, formatDuration } from '../components/exercise-card.js';

/** One logged set, formatted for the session log. `exMode` ('strength' |
 *  'cardio' | 'hold' | undefined) comes from the matching exercise's own
 *  definition — duration-based sets carry no weight/reps so they need their
 *  own summary instead of "undefinedkg x undefined". Falls back to guessing
 *  from the set shape if the exercise def is no longer in the catalog. */
function formatHistorySet(s, exMode) {
  const rpeTag = Number.isFinite(s.rpe) ? ` <span class="set-rpe">@${escapeHtml(s.rpe)}</span>` : '';
  const mode = exMode ?? (Number.isFinite(s.durationSeconds) ? 'cardio' : 'strength');
  if (mode === 'cardio') return `${formatDuration(s.durationSeconds)}${rpeTag}`;
  if (mode === 'hold') return `${s.durationSeconds}s`;
  return `${escapeHtml(s.weight)}kg x ${escapeHtml(s.reps)}${rpeTag}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "1 exercise" / "2 exercises" — pluralise a count + noun. */
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Local "HH:MM" for an epoch, or a sensible default when absent. */
function timeStr(ms) {
  if (typeof ms !== 'number') return '12:00';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** A logged exercise's mode for the editor: use its catalog definition's mode
 *  when known, else infer from set shape (duration-carrying = cardio). Mirrors
 *  formatHistorySet's fallback so display and edit agree. */
function resolveLogMode(exEntry, exMode) {
  if (exMode) return exMode;
  return (exEntry.sets ?? []).some(s => Number.isFinite(s.durationSeconds)) ? 'cardio' : 'strength';
}

/** One editable set inside the history editor. Inputs are addressed on save by
 *  their data-ex / data-set / data-k attributes. */
function setEditorHtml(s, mode, ei, si) {
  const label = `<span class="hist-edit-set-label">Set ${si + 1}</span>`;
  const field = (k, val, ph) =>
    `<label class="hist-edit-field"><input type="number" inputmode="decimal" class="set-input hist-edit-input" data-ex="${ei}" data-set="${si}" data-k="${k}" value="${val ?? ''}" placeholder="${ph}"><span>${ph}</span></label>`;
  if (mode === 'cardio') {
    const min = Number.isFinite(s.durationSeconds) ? Math.round(s.durationSeconds / 60) : '';
    return `<div class="hist-edit-set">${label}${field('duration', min, 'min')}${field('rpe', s.rpe, 'RPE')}</div>`;
  }
  if (mode === 'hold') {
    return `<div class="hist-edit-set">${label}${field('duration', s.durationSeconds, 'sec')}</div>`;
  }
  return `<div class="hist-edit-set">${label}${field('weight', s.weight, 'kg')}${field('reps', s.reps, 'reps')}${field('rpe', s.rpe, 'RPE')}</div>`;
}

/** The expanded, in-place editor for one session: date/time plus every logged
 *  set's weight/reps/RPE (or duration/RPE for cardio, duration for holds). */
function sessionEditorHtml(session, modeByExerciseId) {
  const exBlocks = session.exercises.map((e, ei) => {
    const mode = resolveLogMode(e, modeByExerciseId.get(e.exerciseId));
    const rows = e.sets.map((s, si) => setEditorHtml(s, mode, ei, si)).join('');
    return `<div class="hist-edit-ex">
      <div class="hist-edit-ex-name">${escapeHtml(e.name)}</div>
      ${rows || '<span class="muted" style="font-size:12px">No sets logged</span>'}
    </div>`;
  }).join('');
  return `
    <div class="session-row is-editing">
      <div class="session-row-head"><strong>${escapeHtml(session.dayTitle)}</strong></div>
      <div class="hist-edit-datetime">
        <label class="hist-edit-field"><input type="date" class="set-input" data-edit="date" value="${escapeHtml(session.date)}"><span>Date</span></label>
        <label class="hist-edit-field"><input type="time" class="set-input" data-edit="time" value="${escapeHtml(timeStr(session.finishedAt))}"><span>Time</span></label>
      </div>
      <div class="hist-edit-body">${exBlocks}</div>
      <div class="hist-edit-actions">
        <button class="btn-primary" data-edit-save="${escapeHtml(session.sessionId)}">Save changes</button>
        <button class="btn-secondary" data-edit-cancel="1">Cancel</button>
      </div>
    </div>
  `;
}

/** Rebuild one set from the editor's string inputs, preserving fields the editor
 *  doesn't surface. `getVal(key)` returns the raw input value (or ''). An empty
 *  weight/reps/duration keeps the original value; an empty/zero RPE clears it. */
function buildEditedSet(orig, mode, getVal) {
  const num = (k) => { const v = parseFloat(getVal(k)); return Number.isFinite(v) ? v : null; };
  const out = { ...orig };
  const applyRpe = () => {
    const rpe = num('rpe');
    if (rpe != null && rpe > 0) out.rpe = Math.min(10, rpe);
    else delete out.rpe;
  };
  if (mode === 'cardio') {
    const min = num('duration');
    if (min != null && min > 0) out.durationSeconds = Math.round(min * 60);
    applyRpe();
    return out;
  }
  if (mode === 'hold') {
    const sec = num('duration');
    if (sec != null && sec > 0) out.durationSeconds = Math.round(sec);
    return out;
  }
  const weight = num('weight');
  const reps = num('reps');
  if (weight != null) out.weight = weight;
  if (reps != null) out.reps = Math.round(reps);
  applyRpe();
  return out;
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
    // Exercise id → log mode, so a session's sets render with the right summary
    // (weight x reps / duration + effort / duration) regardless of which
    // exercise they belong to.
    const modeByExerciseId = new Map(
      (getSettings().exercises ?? []).map((ex) => [ex.id, exerciseLogMode(ex)])
    );
    body.innerHTML = history.map((session) => {
      if (editingId === session.sessionId) return sessionEditorHtml(session, modeByExerciseId);
      const totalSets = session.exercises.reduce((n, e) => n + (e.sets?.length ?? 0), 0);
      return `
        <div class="session-row">
          <div class="session-row-head">
            <strong>${escapeHtml(session.dayTitle)}</strong>
            <span class="session-row-meta">
              <span class="muted">${escapeHtml(session.date)}</span>
              <button class="btn-icon session-edit-btn" data-edit-open="${escapeHtml(session.sessionId)}" title="Edit date, time & sets">✎</button>
            </span>
          </div>
          <details class="session-details">
            <summary>${plural(session.exercises.length, 'exercise')} · ${plural(totalSets, 'set')}</summary>
            <ul>
              ${session.exercises.map((e) => `<li>${escapeHtml(e.name)}: ${e.sets.map((s) => formatHistorySet(s, modeByExerciseId.get(e.exerciseId))).join(', ')}</li>`).join('')}
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
      btn.addEventListener('click', () => saveEdit(btn, modeByExerciseId));
    });
  }

  /** Persist an edited session: date/time AND every set's weight/reps/RPE (or
   *  duration/RPE for cardio, duration for holds). Shifts startedAt with
   *  finishedAt so the recorded workout duration is preserved. */
  function saveEdit(btn, modeByExerciseId) {
    const sessionId = btn.dataset.editSave;
    const row = btn.closest('.session-row');
    const date = row.querySelector('[data-edit="date"]').value;
    const time = row.querySelector('[data-edit="time"]').value || '12:00';
    if (!date) return;
    const newFinishedAt = new Date(`${date}T${time}`).getTime();
    if (Number.isNaN(newFinishedAt)) return;
    const session = store.getHistory().find(s => s.sessionId === sessionId);
    if (!session) return;

    const exercises = session.exercises.map((e, ei) => {
      const mode = resolveLogMode(e, modeByExerciseId.get(e.exerciseId));
      const sets = (e.sets ?? []).map((s, si) => {
        const getVal = (k) => row.querySelector(`[data-ex="${ei}"][data-set="${si}"][data-k="${k}"]`)?.value ?? '';
        return buildEditedSet(s, mode, getVal);
      });
      return { ...e, sets };
    });

    const patch = { date, finishedAt: newFinishedAt, exercises };
    // Preserve the recorded workout duration when a startedAt exists.
    if (typeof session.startedAt === 'number' && typeof session.finishedAt === 'number') {
      patch.startedAt = session.startedAt + (newFinishedAt - session.finishedAt);
    }
    store.updateSession(sessionId, patch);
    editingId = null;
    render();
  }

  let metric = 'topset'; // 'topset' | 'e1rm'
  let selectedExerciseId = null; // persists across metric toggles / re-renders

  /** The exercise (among `allowedIds`) with the most logged sessions — a far
   *  more useful default for the Progress chart than whatever happens to be
   *  first in the list. */
  function mostTrainedExerciseId(allowedIds) {
    const counts = {};
    for (const s of store.getHistory()) {
      for (const e of (s.exercises ?? [])) {
        if (allowedIds.has(e.exerciseId)) counts[e.exerciseId] = (counts[e.exerciseId] ?? 0) + 1;
      }
    }
    let best = null, bestN = -1;
    for (const [id, n] of Object.entries(counts)) {
      if (n > bestN) { bestN = n; best = id; }
    }
    return best;
  }

  function renderProgress(body) {
    // Weight/est.-1RM trend only means something for loaded strength work —
    // cardio (duration + effort) and holds (duration) don't have a "top set"
    // to chart, so they're left off this picker entirely.
    const exercises = (getSettings().exercises ?? []).filter((ex) => exerciseLogMode(ex) === 'strength');
    const allowedIds = new Set(exercises.map((ex) => ex.id));
    if (selectedExerciseId == null || !exercises.some((ex) => ex.id === selectedExerciseId)) {
      selectedExerciseId = mostTrainedExerciseId(allowedIds) ?? (exercises[0]?.id ?? null);
    }

    // Sort the picker so exercises you've actually logged sit at the top (with a
    // session count), and the long tail of not-yet-trained movements — which all
    // chart as "No data yet" — is grouped separately below, so opening the picker
    // rewards exploration instead of dead-ending on the first alphabetical entry.
    const sessionCounts = {};
    for (const s of store.getHistory()) {
      for (const e of (s.exercises ?? [])) {
        if (allowedIds.has(e.exerciseId)) sessionCounts[e.exerciseId] = (sessionCounts[e.exerciseId] ?? 0) + 1;
      }
    }
    const trained = exercises
      .filter((e) => sessionCounts[e.id])
      .sort((a, b) => (sessionCounts[b.id] - sessionCounts[a.id]) || a.name.localeCompare(b.name));
    const untrained = exercises
      .filter((e) => !sessionCounts[e.id])
      .sort((a, b) => a.name.localeCompare(b.name));
    const optionHtml = (e, suffix = '') =>
      `<option value="${escapeHtml(e.id)}"${e.id === selectedExerciseId ? ' selected' : ''}>${escapeHtml(e.name)}${suffix}</option>`;
    const options = `
      ${trained.length ? `<optgroup label="Your exercises">${trained.map((e) => optionHtml(e, ` (${sessionCounts[e.id]})`)).join('')}</optgroup>` : ''}
      ${untrained.length ? `<optgroup label="Not logged yet">${untrained.map((e) => optionHtml(e)).join('')}</optgroup>` : ''}
    `;
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
      // all-time e1RM best? Require at least one EARLIER session with a loggable
      // e1RM — otherwise the very first time you log an exercise "beats" an empty
      // history and false-flags a PR. Name the exercise so the badge is clearly
      // tied to the current selection, not whatever's charted.
      const lastSession = [...history].reverse()
        .find(s => (s.exercises ?? []).some(e => e.exerciseId === exId));
      const hasPriorE1RM = lastSession && history.some(s =>
        s.sessionId !== lastSession.sessionId &&
        (s.exercises ?? []).some(e => e.exerciseId === exId && bestE1RM(e.sets) != null));
      const exName = exercises.find(e => e.id === exId)?.name ?? '';
      prBadge.innerHTML = (hasPriorE1RM && isE1RMPRInSession(history, lastSession.sessionId, exId))
        ? `<div class="pr-badge">🏆 New Est. 1RM PR — ${escapeHtml(exName)}</div>`
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
