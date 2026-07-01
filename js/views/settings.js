import { getSettings, saveSettings } from '../settings-store.js';
import { PROGRESS_KEY, HISTORY_KEY } from '../store.js';
import { createMuscleAtlas, ROLE_COLORS } from '../components/muscle-atlas.js';

const MUSCLE_NAMES = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps',
  back: 'Back', biceps: 'Biceps', rear_delts: 'Rear Delts',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', abs: 'Abs',
};
const ALL_MUSCLES = Object.keys(MUSCLE_NAMES);

const ROUTINE_COLOR_OPTIONS = [
  { label: 'Push', value: '--push' },
  { label: 'Pull', value: '--pull' },
  { label: 'Legs', value: '--legs' },
  { label: 'Upper', value: '--upper' },
  { label: 'Lower', value: '--lower' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Flatten all exercises from the days-based model (or from settings.exercises
 * if the new format is in use) into a single array.
 */
function getAllExercises(settings) {
  if (Array.isArray(settings.exercises)) return settings.exercises;
  // Legacy days-based model
  const seen = new Set();
  const out = [];
  for (const day of (settings.days ?? [])) {
    for (const ex of (day.exercises ?? [])) {
      if (!seen.has(ex.id)) {
        seen.add(ex.id);
        out.push(ex);
      }
    }
  }
  return out;
}

/**
 * Get the muscles map for an exercise, normalising old primaryMuscles/secondaryMuscles
 * to the new { [muscleId]: role } format.
 */
function getExMuscles(ex) {
  if (ex.muscles && typeof ex.muscles === 'object' && !Array.isArray(ex.muscles)) {
    return ex.muscles;
  }
  const result = {};
  for (const m of (ex.primaryMuscles ?? [])) result[m] = 'prime_mover';
  for (const m of (ex.secondaryMuscles ?? [])) {
    if (!result[m]) result[m] = 'synergist';
  }
  return result;
}

/**
 * Save back muscles to the exercise object, maintaining compat with both formats.
 */
function setExMuscles(ex, rolesObj, settings) {
  if (Array.isArray(settings.exercises)) {
    // New format
    ex.muscles = { ...rolesObj };
  } else {
    // Legacy format
    ex.muscles = undefined;
    ex.primaryMuscles = Object.entries(rolesObj).filter(([, r]) => r === 'prime_mover').map(([m]) => m);
    ex.secondaryMuscles = Object.entries(rolesObj).filter(([, r]) => r === 'synergist').map(([m]) => m);
  }
}

export function renderSettings(container, onClose) {
  let settings = getSettings();
  let activeSection = 'exercises';
  let expandedExerciseIndex = null;

  function save() { saveSettings(settings); }

  function render() {
    container.innerHTML = `
      <div class="settings-view">
        <div class="settings-header">
          <button class="settings-back" id="settings-close">✕ Close</button>
          <span class="settings-title">Settings</span>
        </div>
        <button class="btn-reset-data" id="settings-reset-data">🗑 Reset User Data</button>
        <div class="settings-tabs">
          <button class="${activeSection === 'exercises' ? 'active' : ''}" data-sec="exercises">Exercises</button>
          <button class="${activeSection === 'routines' ? 'active' : ''}" data-sec="routines">Routines</button>
          <button class="${activeSection === 'schedule' ? 'active' : ''}" data-sec="schedule">Schedule</button>
          <button class="${activeSection === 'recovery' ? 'active' : ''}" data-sec="recovery">Recovery</button>
        </div>
        <div class="settings-body" id="settings-body"></div>
      </div>
    `;

    container.querySelector('#settings-close').addEventListener('click', onClose);
    container.querySelector('#settings-reset-data').addEventListener('click', () => {
      if (confirm('Clear all workout history, progress, and logged data?\n\nYour exercise list and settings will be kept.')) {
        localStorage.removeItem(PROGRESS_KEY);
        localStorage.removeItem(HISTORY_KEY);
        sessionStorage.removeItem('leanbuild-today-session-v2');
        alert('User data cleared.');
      }
    });
    container.querySelectorAll('.settings-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSection = btn.dataset.sec;
        expandedExerciseIndex = null;
        render();
      });
    });

    const body = container.querySelector('#settings-body');
    if (activeSection === 'exercises') renderExercises(body);
    else if (activeSection === 'routines') renderRoutines(body);
    else if (activeSection === 'schedule') renderSchedule(body);
    else renderRecoveryTimes(body);
  }

  // ─── Exercises tab ──────────────────────────────────────────────────────────

  function renderExercises(body) {
    const exercises = getAllExercises(settings);

    const exCards = exercises.map((ex, i) => {
      const isExpanded = expandedExerciseIndex === i;
      return `
        <div class="settings-ex-card ${isExpanded ? 'expanded' : ''}">
          <div class="settings-ex-card-header" data-toggle="${i}">
            <span class="settings-ex-card-name">${ex.name}</span>
            <span class="settings-ex-card-chevron">${isExpanded ? '▲' : '▼'}</span>
          </div>
          ${isExpanded ? `
          <div class="settings-ex-card-body">
            <div class="settings-field">
              <label class="settings-field-label">Name</label>
              <input type="text" class="set-input settings-name-input" style="width:100%" data-ex="${i}" value="${ex.name}">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Sets</label>
              <input type="number" class="set-input" style="width:64px" data-ex="${i}" data-field="setsCount" value="${ex.setsCount}" min="1" max="10">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Rep Range</label>
              <input type="text" class="set-input" style="width:80px" data-ex="${i}" data-field="repRange" value="${ex.repRange}">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Rest (seconds)</label>
              <input type="number" class="set-input" style="width:72px" data-ex="${i}" data-field="restSeconds" value="${ex.restSeconds}" min="0">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">GIF URL</label>
              <div class="gif-url-row">
                <input type="url" class="set-input settings-gif-input" data-ex="${i}" value="${ex.gifUrl ?? ''}">
                <button class="btn-save-gif" data-ex="${i}">Save</button>
              </div>
              <span class="gif-save-confirm" id="gif-confirm-${i}" style="display:none;color:var(--accent);font-size:11px;margin-top:4px">✓ Saved</span>
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Muscles <span class="muted" style="font-size:10px">click to cycle: none → primary → synergist → stabilizer</span></label>
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
      ${exCards}
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
        onChange: ({ muscle, role }) => {
          const currentRoles = atlas.getMuscleRoles();
          setExMuscles(ex, currentRoles, settings);
          save();
        },
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
        const confirmEl = body.querySelector(`#gif-confirm-${i}`);
        if (confirmEl) {
          confirmEl.style.display = 'block';
          setTimeout(() => { confirmEl.style.display = 'none'; }, 1500);
        }
      });
    });

    // Remove exercise
    body.querySelectorAll('.btn-remove-ex').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.ex;
        if (!confirm('Remove this exercise?')) return;
        const exercises = getAllExercises(settings);
        const removedId = exercises[i]?.id;
        if (Array.isArray(settings.exercises)) {
          settings.exercises.splice(i, 1);
        } else {
          // Remove from every day in legacy format
          for (const day of (settings.days ?? [])) {
            day.exercises = (day.exercises ?? []).filter(e => e.id !== removedId);
          }
        }
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
        primaryMuscles: [], secondaryMuscles: [],
      };
      if (Array.isArray(settings.exercises)) {
        settings.exercises.push(newEx);
      } else {
        // Legacy: add to first day
        if (settings.days && settings.days.length > 0) {
          settings.days[0].exercises.push(newEx);
        }
      }
      save();
      render();
    });
  }

  // ─── Routines tab ───────────────────────────────────────────────────────────

  function renderRoutines(body) {
    const routines = settings.routines ?? [];
    const allExercises = getAllExercises(settings);

    const routineCards = routines.map((r, ri) => {
      const borderColor = `var(${r.colorVar ?? '--accent'})`;
      const exListItems = (r.exerciseIds ?? []).map(exId => {
        const ex = allExercises.find(e => e.id === exId);
        if (!ex) return '';
        return `<div class="routine-ex-item">
          <span>${ex.name}</span>
          <button class="btn-icon danger" data-routine="${ri}" data-ex-id="${exId}" title="Remove from routine">×</button>
        </div>`;
      }).join('');

      const availableExercises = allExercises.filter(e => !(r.exerciseIds ?? []).includes(e.id));
      const addExOptions = availableExercises.map(e => `<option value="${e.id}">${e.name}</option>`).join('');

      return `
        <div class="routine-card" style="border-left:3px solid ${borderColor}">
          <div class="settings-field">
            <label class="settings-field-label">Name</label>
            <input type="text" class="set-input routine-name-input" style="width:100%" data-routine="${ri}" value="${r.name}">
          </div>
          <div class="settings-field">
            <label class="settings-field-label">Color</label>
            <select class="set-input routine-color-select" data-routine="${ri}">
              ${ROUTINE_COLOR_OPTIONS.map(opt => `<option value="${opt.value}" ${r.colorVar === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
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
      <div class="settings-section-label">Routines</div>
      ${routineCards || '<div class="muted" style="font-size:12px;margin-bottom:16px">No routines yet</div>'}
      <div class="settings-add-ex-section">
        <button class="btn-add-ex" id="btn-add-routine">+ Create Routine</button>
        <div id="add-routine-form" style="display:none" class="settings-add-ex-form">
          <input type="text" class="set-input" id="new-routine-name" placeholder="Routine name">
          <select class="set-input" id="new-routine-color">
            ${ROUTINE_COLOR_OPTIONS.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
          </select>
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

    // Routine color change
    body.querySelectorAll('.routine-color-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const ri = +sel.dataset.routine;
        settings.routines[ri].colorVar = sel.value;
        save();
        render();
      });
    });

    // Remove exercise from routine
    body.querySelectorAll('.routine-ex-item .btn-icon.danger').forEach(btn => {
      btn.addEventListener('click', () => {
        const ri = +btn.dataset.routine;
        const exId = btn.dataset.exId;
        settings.routines[ri].exerciseIds = (settings.routines[ri].exerciseIds ?? []).filter(id => id !== exId);
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
      const colorVar = body.querySelector('#new-routine-color').value;
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
      settings.routines = settings.routines ?? [];
      settings.routines.push({ id, name, colorVar, exerciseIds: [] });
      save();
      render();
    });
  }

  // ─── Schedule tab ───────────────────────────────────────────────────────────

  function renderSchedule(body) {
    const routines = settings.routines ?? [];
    const schedule = settings.schedule ?? {};

    const dayRows = DAY_NAMES.map((dayName, dow) => {
      const currentRoutineId = schedule[dow] ?? null;
      const options = [
        `<option value="" ${!currentRoutineId ? 'selected' : ''}>Rest Day</option>`,
        ...routines.map(r => `<option value="${r.id}" ${currentRoutineId === r.id ? 'selected' : ''}>${r.name}</option>`),
      ].join('');
      return `
        <div class="schedule-day">
          <span class="schedule-day-name">${dayName}</span>
          <select class="set-input schedule-select" data-dow="${dow}">${options}</select>
        </div>
      `;
    }).join('');

    body.innerHTML = `
      <div class="settings-section-label">Weekly Schedule</div>
      <div class="schedule-grid">${dayRows}</div>
    `;

    body.querySelectorAll('.schedule-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const dow = sel.dataset.dow;
        settings.schedule = settings.schedule ?? {};
        settings.schedule[dow] = sel.value || null;
        save();
      });
    });
  }

  // ─── Recovery times tab ─────────────────────────────────────────────────────

  function renderRecoveryTimes(body) {
    const rows = ALL_MUSCLES.map(m => `
      <div class="settings-recovery-row">
        <span class="settings-ex-name">${MUSCLE_NAMES[m]}</span>
        <input type="number" class="set-input" style="width:72px" data-muscle="${m}" value="${settings.recoveryHours[m] ?? 48}" min="1">
        <span class="muted" style="font-size:11px">hours</span>
      </div>
    `).join('');
    body.innerHTML = `<div class="settings-section-label">Full Recovery Time per Muscle</div>${rows}`;
    body.querySelectorAll('[data-muscle]').forEach(input => {
      input.addEventListener('change', () => {
        settings.recoveryHours[input.dataset.muscle] = +input.value;
        save();
      });
    });
  }

  render();
}
