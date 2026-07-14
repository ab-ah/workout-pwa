import { getSettings, saveSettings } from '../settings-store.js';
import { createMuscleAtlas, ROLE_COLORS, MUSCLE_LABELS } from '../components/muscle-atlas.js';
import { weeklyVolumeByMuscle, volumeStatus } from '../volume.js';
import { routineReadiness } from '../recovery-model.js';
import { escapeHtml } from '../escape.js';

// The Plan tab is the program-building surface: your weekly Schedule, the
// Routines that fill each day, and the Exercise library those routines draw
// from. These used to be buried under Settings sub-tabs (and the schedule was
// separately shown, read-only, on its own "Week" tab). Grouping the three
// planning editors here — and making the schedule editable in place, next to
// the volume it produces — puts "what am I training and when" where you'd look
// for it, and leaves Settings for app/data concerns only.

const MUSCLE_NAMES = MUSCLE_LABELS;

// Routine colours are just a visual label for the day — pick by colour, not by
// split name (the old "Push / Pull / Legs / Upper / Lower" labels named CSS
// tokens, which was confusing and left two options blank). Each maps to a
// defined palette token in styles.css.
const ROUTINE_COLORS = [
  { label: 'Red', value: '--push' },
  { label: 'Blue', value: '--pull' },
  { label: 'Purple', value: '--legs' },
  { label: 'Green', value: '--cardio' },
  { label: 'Amber', value: '--core' },
];
const DEFAULT_ROUTINE_COLOR = ROUTINE_COLORS[0].value;

/** Swatch button row for choosing a routine colour. `selected` is the colorVar
 *  currently chosen; `attrs` are extra attributes for the wrapping element. */
function colorSwatchesHtml(selected, attrs = '') {
  return `<div class="routine-color-swatches" ${attrs}>
    ${ROUTINE_COLORS.map(c => `<button type="button" class="routine-swatch${c.value === selected ? ' selected' : ''}" data-color="${c.value}" style="background:var(${c.value})" title="${c.label}" aria-label="${c.label}"></button>`).join('')}
  </div>`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// A prime-mover muscle below this freshness is called out when previewing a day.
const READINESS_LOW = 0.6;

// Colour + label per volume tier (see volume.js volumeStatus). Warm ramp for the
// productive path — orange (undertraining) → amber (maintenance) → green
// (optimal) — then RED for over-MRV, the actual overtraining risk.
const VOLUME_TIERS = {
  below:       { color: '#e08a3a', label: 'below MEV' },
  maintenance: { color: '#e0b03a', label: 'maintenance' },
  optimal:     { color: '#46d160', label: 'optimal' },
  high:        { color: '#e0553a', label: 'over MRV' },
  unknown:     { color: '#8a8a8a', label: '' },
};

function readinessTier(readiness) {
  if (readiness >= 0.85) return { label: 'Ready', color: '#46d160' };
  if (readiness >= 0.6) return { label: 'Mostly ready', color: '#e0b03a' };
  return { label: 'Under-recovered', color: '#e0553a' };
}

/** All exercises in the pool. */
function getAllExercises(settings) {
  return settings.exercises ?? [];
}

/** The muscles map { [muscleId]: role } for an exercise. */
function getExMuscles(ex) {
  return ex.muscles ?? {};
}

/** Save the muscles map back to the exercise object. */
function setExMuscles(ex, rolesObj) {
  ex.muscles = { ...rolesObj };
}

export function renderPlan(container, store) {
  let settings = getSettings();
  const history = store.getHistory();
  const todayDow = new Date().getDay();

  let activeSection = 'schedule';
  let expandedExerciseIndex = null;
  let expandedRoutineExKey = null; // `${routineIndex}:${exerciseId}` open in Routines
  let exerciseFilter = null;       // prime-mover muscle id filtering the Exercises list, or null
  let expandedDow = null;          // day-of-week card expanded in Schedule, or null

  function save() { saveSettings(settings); }

  function render() {
    container.innerHTML = `
      <div class="plan-view">
        <div class="plan-header">
          <span class="plan-title">Plan</span>
          <span class="plan-subtitle">Build your training week</span>
        </div>
        <div class="settings-tabs plan-tabs">
          <button class="${activeSection === 'schedule' ? 'active' : ''}" data-sec="schedule">Schedule</button>
          <button class="${activeSection === 'routines' ? 'active' : ''}" data-sec="routines">Routines</button>
          <button class="${activeSection === 'exercises' ? 'active' : ''}" data-sec="exercises">Exercises</button>
        </div>
        <div class="settings-body" id="plan-body"></div>
      </div>
    `;

    container.querySelectorAll('.plan-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSection = btn.dataset.sec;
        expandedExerciseIndex = null;
        expandedRoutineExKey = null;
        exerciseFilter = null;
        render();
      });
    });

    const body = container.querySelector('#plan-body');
    if (activeSection === 'schedule') renderSchedule(body);
    else if (activeSection === 'routines') renderRoutines(body);
    else renderExercises(body);
  }

  // ─── Schedule section ───────────────────────────────────────────────────────
  // The old read-only "Week" overview, now editable in place: each day shows the
  // routine assigned to it, expands to preview its exercises + recovery-readiness,
  // and carries an inline picker to reassign the day — with the planned weekly
  // volume the schedule produces charted directly beneath it.

  // Synergist sets count at half weight (see volume.js), so totals can land on a
  // .5 — show one decimal only when it's not a whole number.
  function formatSets(sets) {
    return Number.isInteger(sets) ? String(sets) : sets.toFixed(1);
  }

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

  function renderSchedule(body) {
    const routines = settings.routines ?? [];

    // Mon–Sun display order.
    const items = [1, 2, 3, 4, 5, 6, 0].map(dow => {
      const routineId = settings.schedule?.[String(dow)] ?? null;
      const routine = routineId ? routines.find(r => r.id === routineId) : null;
      const isToday = dow === todayDow;
      const isExpanded = expandedDow === dow && routine;

      const routineOptions = [
        `<option value="" ${!routineId ? 'selected' : ''}>Rest Day</option>`,
        ...routines.map(r => `<option value="${escapeHtml(r.id)}" ${routineId === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`),
      ].join('');
      const picker = `
        <div class="plan-day-picker">
          <select class="set-input plan-day-select" data-dow="${dow}" aria-label="${DAY_NAMES[dow]} routine">${routineOptions}</select>
        </div>`;

      if (!routine) {
        return `<div class="week-item is-rest${isToday ? ' is-today' : ''}" data-dow="${dow}">
          <div class="week-item-main">
            <div>
              <strong>${DAY_NAMES[dow]}</strong>
              <div class="muted">Rest Day</div>
            </div>
            ${isToday ? '<span class="status">Today</span>' : ''}
          </div>
          ${picker}
        </div>`;
      }

      const exercises = isExpanded
        ? (routine.exerciseIds ?? []).map(id => settings.exercises?.find(e => e.id === id)).filter(Boolean)
        : [];
      const exList = isExpanded && exercises.length
        ? `${readinessHtml(routine)}<ol class="week-ex-list">${exercises.map(e => `<li>${escapeHtml(e.name)}</li>`).join('')}</ol>`
        : '';
      const sub = routine.tag ? `${escapeHtml(routine.name)} · ${escapeHtml(routine.tag)}` : escapeHtml(routine.name);

      return `<div class="week-item${isToday ? ' is-today' : ''}${isExpanded ? ' is-open' : ''}" style="border-left:4px solid var(${routine.colorVar})" data-dow="${dow}">
        <div class="week-item-main" data-expand="${dow}">
          <div>
            <strong>${DAY_NAMES[dow]}</strong>
            <div class="muted">${sub}</div>
          </div>
          <span class="status">${isToday ? 'Today' : '▼'}</span>
        </div>
        ${exList}
        ${picker}
      </div>`;
    }).join('');

    body.innerHTML = `
      <p class="plan-hint">Assign a routine to each day, or leave it as a rest day. Tap a day to preview its exercises and recovery readiness.</p>
      <div class="week-grid">${items}</div>
      ${volumeHtml()}
    `;

    // Expand / collapse a day to preview it (only training days expand).
    body.querySelectorAll('.week-item:not(.is-rest) [data-expand]').forEach(main => {
      main.addEventListener('click', () => {
        const dow = +main.dataset.expand;
        expandedDow = expandedDow === dow ? null : dow;
        render();
      });
    });

    // Reassign a day's routine inline.
    body.querySelectorAll('.plan-day-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const dow = sel.dataset.dow;
        settings.schedule = settings.schedule ?? {};
        settings.schedule[dow] = sel.value || null;
        if (!sel.value) expandedDow = null; // a day turned to rest can't stay expanded
        save();
        render();
      });
    });
  }

  // ─── Routines section ───────────────────────────────────────────────────────

  function renderRoutines(body) {
    const routines = settings.routines ?? [];
    const allExercises = getAllExercises(settings);

    const routineCards = routines.map((r, ri) => {
      const borderColor = `var(${r.colorVar ?? '--accent'})`;
      const exListItems = (r.exerciseIds ?? []).map(exId => {
        const ex = allExercises.find(e => e.id === exId);
        if (!ex) return '';
        const key = `${ri}:${exId}`;
        const isOpen = expandedRoutineExKey === key;
        const details = isOpen ? `
          <div class="routine-ex-detail">
            <p class="muted">${ex.setsCount} sets · ${ex.repRange} reps · rest ${ex.restSeconds}s${ex.startWeight ? ` · start ${ex.startWeight}` : ''}</p>
            ${ex.gifUrl ? `<img class="routine-ex-gif" src="${escapeHtml(ex.gifUrl)}" alt="${escapeHtml(ex.name)} demonstration" loading="lazy" onerror="this.style.display='none'">` : ''}
            <div id="routine-atlas-${ri}-${exId}" class="routine-ex-atlas"></div>
          </div>` : '';
        return `<div class="routine-ex-item ${isOpen ? 'expanded' : ''}">
          <div class="routine-ex-row">
            <button class="routine-ex-toggle" data-routine="${ri}" data-ex-id="${exId}">
              <span class="routine-ex-chevron">${isOpen ? '▲' : '▼'}</span>
              <span>${escapeHtml(ex.name)}</span>
            </button>
            <button class="btn-icon danger" data-remove-routine="${ri}" data-ex-id="${exId}" title="Remove from routine">×</button>
          </div>
          ${details}
        </div>`;
      }).join('');

      const availableExercises = allExercises.filter(e => !(r.exerciseIds ?? []).includes(e.id));
      const addExOptions = availableExercises.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)}</option>`).join('');

      return `
        <div class="routine-card" style="border-left:3px solid ${borderColor}">
          <div class="settings-field">
            <label class="settings-field-label">Name</label>
            <input type="text" class="set-input routine-name-input" style="width:100%" data-routine="${ri}" value="${escapeHtml(r.name)}">
          </div>
          <div class="settings-field">
            <label class="settings-field-label">Color</label>
            ${colorSwatchesHtml(r.colorVar ?? DEFAULT_ROUTINE_COLOR, `data-routine="${ri}"`)}
          </div>
          <div class="settings-section-label" style="margin-top:10px">Exercises</div>
          <div class="routine-ex-list">${exListItems || '<div class="muted" style="font-size:12px;padding:6px 0">No exercises yet</div>'}</div>
          ${availableExercises.length > 0 ? `
          <div class="settings-field" style="margin-top:8px">
            <select class="set-input routine-add-ex-select" data-routine="${ri}">
              <option value="">+ Add exercise…</option>
              ${addExOptions}
            </select>
          </div>` : ''}
          <button class="btn-remove-ex" data-routine="${ri}" style="margin-top:10px">Delete Routine</button>
        </div>
      `;
    }).join('');

    body.innerHTML = `
      <p class="plan-hint">Routines are the reusable sessions you drop onto days in Schedule. Each is a named, ordered list of exercises.</p>
      ${routineCards || '<div class="muted" style="font-size:12px;margin-bottom:16px">No routines yet</div>'}
      <div class="settings-add-ex-section">
        <button class="btn-add-ex" id="btn-add-routine">+ Create Routine</button>
        <div id="add-routine-form" style="display:none" class="settings-add-ex-form">
          <input type="text" class="set-input" id="new-routine-name" placeholder="Routine name">
          ${colorSwatchesHtml(DEFAULT_ROUTINE_COLOR, 'id="new-routine-color"')}
          <button class="btn-primary" id="confirm-add-routine">Create</button>
        </div>
      </div>
    `;

    // Routine name change
    body.querySelectorAll('.routine-name-input').forEach(input => {
      input.addEventListener('change', () => {
        const ri = +input.dataset.routine;
        settings.routines[ri].name = input.value;
        save();
      });
    });

    // Routine color change — swatch clicks on a per-routine picker.
    body.querySelectorAll('.routine-color-swatches[data-routine] .routine-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        const ri = +sw.closest('.routine-color-swatches').dataset.routine;
        settings.routines[ri].colorVar = sw.dataset.color;
        save();
        render();
      });
    });

    // Create-form swatch selection — visual-only until "Create" reads it.
    const newColorPicker = body.querySelector('#new-routine-color');
    newColorPicker?.querySelectorAll('.routine-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        newColorPicker.querySelectorAll('.routine-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
      });
    });

    // Expand / collapse an exercise's details inside a routine
    body.querySelectorAll('.routine-ex-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = `${btn.dataset.routine}:${btn.dataset.exId}`;
        expandedRoutineExKey = expandedRoutineExKey === key ? null : key;
        render();
      });
    });

    // Mount a read-only muscle atlas for the expanded routine exercise
    if (expandedRoutineExKey) {
      const [riStr, exId] = expandedRoutineExKey.split(':');
      const ex = allExercises.find(e => e.id === exId);
      const slot = body.querySelector(`#routine-atlas-${riStr}-${exId}`);
      if (ex && slot) {
        createMuscleAtlas(slot, { mode: 'display', initialRoles: getExMuscles(ex) });
      }
    }

    // Remove exercise from routine
    body.querySelectorAll('[data-remove-routine]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ri = +btn.dataset.removeRoutine;
        const exId = btn.dataset.exId;
        settings.routines[ri].exerciseIds = (settings.routines[ri].exerciseIds ?? []).filter(id => id !== exId);
        if (expandedRoutineExKey === `${ri}:${exId}`) expandedRoutineExKey = null;
        save();
        render();
      });
    });

    // Add exercise to routine
    body.querySelectorAll('.routine-add-ex-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const ri = +sel.dataset.routine;
        const exId = sel.value;
        if (!exId) return;
        settings.routines[ri].exerciseIds = settings.routines[ri].exerciseIds ?? [];
        if (!settings.routines[ri].exerciseIds.includes(exId)) {
          settings.routines[ri].exerciseIds.push(exId);
        }
        save();
        render();
      });
    });

    // Delete routine
    body.querySelectorAll('.routine-card .btn-remove-ex').forEach(btn => {
      btn.addEventListener('click', () => {
        const ri = +btn.dataset.routine;
        if (!confirm(`Delete routine "${settings.routines[ri].name}"?`)) return;
        const removedId = settings.routines[ri].id;
        settings.routines.splice(ri, 1);
        // Clear from schedule
        if (settings.schedule) {
          for (const dow of Object.keys(settings.schedule)) {
            if (settings.schedule[dow] === removedId) settings.schedule[dow] = null;
          }
        }
        save();
        render();
      });
    });

    // Toggle create form
    body.querySelector('#btn-add-routine').addEventListener('click', () => {
      const form = body.querySelector('#add-routine-form');
      form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    });

    // Confirm create routine
    body.querySelector('#confirm-add-routine').addEventListener('click', () => {
      const name = body.querySelector('#new-routine-name').value.trim();
      if (!name) return;
      const colorVar = body.querySelector('#new-routine-color .routine-swatch.selected')?.dataset.color ?? DEFAULT_ROUTINE_COLOR;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      settings.routines = settings.routines ?? [];
      settings.routines.push({ id, name, colorVar, exerciseIds: [] });
      save();
      render();
    });
  }

  // ─── Exercises section ──────────────────────────────────────────────────────

  /** Prime-mover muscle ids for an exercise. */
  function primeMuscles(ex) {
    return Object.entries(getExMuscles(ex))
      .filter(([, role]) => role === 'prime_mover')
      .map(([m]) => m);
  }

  function renderExercises(body) {
    const exercises = getAllExercises(settings);

    // Count exercises per prime-mover muscle for the filter chips.
    const primeCounts = {};
    for (const ex of exercises) {
      for (const m of primeMuscles(ex)) primeCounts[m] = (primeCounts[m] ?? 0) + 1;
    }
    const filterMuscles = Object.keys(primeCounts)
      .sort((a, b) => (MUSCLE_NAMES[a] ?? a).localeCompare(MUSCLE_NAMES[b] ?? b));

    const filterBar = `
      <div class="ex-filter-bar">
        <button class="ex-filter-chip ${exerciseFilter === null ? 'active' : ''}" data-filter="">All <span class="ex-filter-count">${exercises.length}</span></button>
        ${filterMuscles.map(m => `<button class="ex-filter-chip ${exerciseFilter === m ? 'active' : ''}" data-filter="${m}">${MUSCLE_NAMES[m] ?? m} <span class="ex-filter-count">${primeCounts[m]}</span></button>`).join('')}
      </div>
    `;

    const matches = (ex) => !exerciseFilter || getExMuscles(ex)[exerciseFilter] === 'prime_mover';

    const exCards = exercises.map((ex, i) => {
      if (!matches(ex)) return '';
      const isExpanded = expandedExerciseIndex === i;
      const primes = primeMuscles(ex);
      // Distinguish an intentional accessory movement (has muscle tags, none a
      // prime mover) from a genuine data gap (no muscles set at all). Only the
      // latter gets the alarming dashed tag.
      const hasAnyMuscle = Object.keys(getExMuscles(ex)).length > 0;
      const tags = primes.length
        ? primes.map(m => `<span class="ex-muscle-tag">${MUSCLE_NAMES[m] ?? m}</span>`).join('')
        : hasAnyMuscle
          ? '<span class="ex-muscle-tag is-accessory">Accessory</span>'
          : '<span class="ex-muscle-tag is-empty">No muscles set</span>';
      return `
        <div class="settings-ex-card ${isExpanded ? 'expanded' : ''}">
          <div class="settings-ex-card-header" data-toggle="${i}">
            <div class="settings-ex-card-heading">
              <span class="settings-ex-card-name">${escapeHtml(ex.name)}</span>
              <div class="settings-ex-card-tags">${tags}</div>
            </div>
            <span class="settings-ex-card-chevron">${isExpanded ? '▲' : '▼'}</span>
          </div>
          ${isExpanded ? `
          <div class="settings-ex-card-body">
            <div class="settings-field">
              <label class="settings-field-label">Name</label>
              <input type="text" class="set-input settings-name-input" style="width:100%" data-ex="${i}" value="${escapeHtml(ex.name)}">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Sets</label>
              <input type="number" class="set-input" style="width:64px" data-ex="${i}" data-field="setsCount" value="${ex.setsCount}" min="1" max="10">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Rep Range</label>
              <input type="text" class="set-input" style="width:80px" data-ex="${i}" data-field="repRange" value="${escapeHtml(ex.repRange)}">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Rest (seconds)</label>
              <input type="number" class="set-input" style="width:72px" data-ex="${i}" data-field="restSeconds" value="${ex.restSeconds}" min="0">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">GIF URL</label>
              <div class="gif-url-row">
                <input type="url" class="set-input settings-gif-input" data-ex="${i}" value="${escapeHtml(ex.gifUrl ?? '')}">
                <button class="btn-save-gif" data-ex="${i}">Save</button>
              </div>
              <span class="gif-save-confirm" id="gif-confirm-${i}" style="display:none;color:var(--accent);font-size:11px;margin-top:4px">✓ Saved</span>
              <img class="settings-gif-preview" id="gif-preview-${i}" src="${escapeHtml(ex.gifUrl ?? '')}" alt="${escapeHtml(ex.name)} demonstration" loading="lazy" ${ex.gifUrl ? '' : 'style="display:none"'} onerror="this.style.display='none'">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Muscles <span class="muted" style="font-size:11px">click to cycle: none → primary → synergist → stabilizer</span></label>
              <div id="atlas-ex-${i}" style="margin-top:6px"></div>
              <div class="atlas-role-legend">
                <div class="atlas-role-legend-item"><div class="atlas-role-dot" style="background:${ROLE_COLORS.prime_mover}"></div>Prime Mover</div>
                <div class="atlas-role-legend-item"><div class="atlas-role-dot" style="background:${ROLE_COLORS.synergist}"></div>Synergist</div>
                <div class="atlas-role-legend-item"><div class="atlas-role-dot" style="background:${ROLE_COLORS.stabilizer}"></div>Stabilizer</div>
              </div>
            </div>
            <button class="btn-remove-ex" data-ex="${i}">Remove Exercise</button>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');

    body.innerHTML = `
      <p class="plan-hint">Your exercise library. Routines pull from this pool; edit an exercise here and every routine using it stays in sync.</p>
      ${filterBar}
      ${exCards || '<div class="muted" style="font-size:12px;padding:10px 0">No exercises train this muscle as a prime mover.</div>'}
      <div class="settings-add-ex-section">
        <button class="btn-add-ex" id="btn-add-ex">+ Add Exercise</button>
        <div id="add-ex-form" style="display:none" class="settings-add-ex-form">
          <input type="text" class="set-input" id="new-ex-name" placeholder="Exercise name">
          <input type="number" class="set-input" id="new-ex-sets" placeholder="Sets" min="1" max="10" value="3" style="width:70px">
          <input type="text" class="set-input" id="new-ex-reps" placeholder="Rep range" value="8–12" style="width:80px">
          <input type="number" class="set-input" id="new-ex-rest" placeholder="Rest (s)" value="90" style="width:80px">
          <button class="btn-primary" id="confirm-add-ex">Add</button>
        </div>
      </div>
    `;

    // Mount atlas widgets for expanded cards
    exercises.forEach((ex, i) => {
      if (expandedExerciseIndex !== i) return;
      const slot = body.querySelector(`#atlas-ex-${i}`);
      if (!slot) return;
      const atlas = createMuscleAtlas(slot, {
        mode: 'interactive',
        initialRoles: getExMuscles(ex),
        onChange: () => {
          setExMuscles(ex, atlas.getMuscleRoles());
          save();
        },
      });
    });

    // Filter by prime-mover muscle
    body.querySelectorAll('.ex-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        exerciseFilter = chip.dataset.filter || null;
        expandedExerciseIndex = null;
        render();
      });
    });

    // Toggle expand/collapse
    body.querySelectorAll('[data-toggle]').forEach(header => {
      header.addEventListener('click', () => {
        const i = +header.dataset.toggle;
        expandedExerciseIndex = expandedExerciseIndex === i ? null : i;
        render();
      });
    });

    // Name input
    body.querySelectorAll('.settings-name-input').forEach(input => {
      input.addEventListener('change', () => {
        const i = +input.dataset.ex;
        const ex = getAllExercises(settings)[i];
        if (ex) { ex.name = input.value; save(); }
      });
    });

    // Other fields
    body.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('change', () => {
        const i = +input.dataset.ex;
        const field = input.dataset.field;
        const ex = getAllExercises(settings)[i];
        if (!ex) return;
        ex[field] = (field === 'setsCount' || field === 'restSeconds') ? +input.value : input.value;
        save();
      });
    });

    // GIF save
    body.querySelectorAll('.btn-save-gif').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.ex;
        const urlInput = body.querySelector(`.settings-gif-input[data-ex="${i}"]`);
        const ex = getAllExercises(settings)[i];
        if (ex) { ex.gifUrl = urlInput.value; save(); }
        const previewEl = body.querySelector(`#gif-preview-${i}`);
        if (previewEl) {
          previewEl.src = urlInput.value;
          previewEl.style.display = urlInput.value ? '' : 'none';
        }
        const confirmEl = body.querySelector(`#gif-confirm-${i}`);
        if (confirmEl) {
          confirmEl.style.display = 'block';
          setTimeout(() => { confirmEl.style.display = 'none'; }, 1500);
        }
      });
    });

    // Remove exercise
    body.querySelectorAll('.btn-remove-ex[data-ex]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.ex;
        if (!confirm('Remove this exercise?')) return;
        const exercises = getAllExercises(settings);
        const removedId = exercises[i]?.id;
        settings.exercises.splice(i, 1);
        // Remove from all routines too
        for (const r of (settings.routines ?? [])) {
          r.exerciseIds = (r.exerciseIds ?? []).filter(id => id !== removedId);
        }
        expandedExerciseIndex = null;
        save();
        render();
      });
    });

    // Add exercise toggle
    body.querySelector('#btn-add-ex').addEventListener('click', () => {
      const form = body.querySelector('#add-ex-form');
      form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    });

    // Confirm add exercise
    body.querySelector('#confirm-add-ex').addEventListener('click', () => {
      const name = body.querySelector('#new-ex-name').value.trim();
      if (!name) return;
      const sets = +body.querySelector('#new-ex-sets').value || 3;
      const reps = body.querySelector('#new-ex-reps').value || '8–12';
      const rest = +body.querySelector('#new-ex-rest').value || 90;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newEx = {
        id, name, setsCount: sets, repRange: reps, restSeconds: rest,
        startWeight: '—', gifUrl: '', muscles: {},
      };
      settings.exercises = settings.exercises ?? [];
      settings.exercises.push(newEx);
      save();
      render();
    });
  }

  render();
}
