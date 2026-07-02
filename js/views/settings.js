import { getSettings, saveSettings } from '../settings-store.js';
import { PROGRESS_KEY, HISTORY_KEY } from '../store.js';
import { createMuscleAtlas, ROLE_COLORS, MUSCLE_LABELS } from '../components/muscle-atlas.js';
import { buildBackup, parseBackup } from '../backup.js';

const MUSCLE_NAMES = MUSCLE_LABELS;
const ALL_MUSCLES = Object.keys(MUSCLE_NAMES);

const ROUTINE_COLOR_OPTIONS = [
  { label: 'Push', value: '--push' },
  { label: 'Pull', value: '--pull' },
  { label: 'Legs', value: '--legs' },
  { label: 'Upper', value: '--upper' },
  { label: 'Lower', value: '--lower' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

export function renderSettings(container, onClose) {
  let settings = getSettings();
  let activeSection = 'exercises';
  let expandedExerciseIndex = null;
  let expandedRoutineExKey = null; // `${routineIndex}:${exerciseId}` currently expanded in Routines
  let exerciseFilter = null; // prime-mover muscle id to filter the Exercises list by, or null for all

  function save() { saveSettings(settings); }

  function exportBackup() {
    let history = [];
    let progress = null;
    try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { /* keep [] */ }
    try { progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); } catch { /* keep null */ }
    const bundle = buildBackup({ settings: getSettings(), history, progress });
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leanbuild-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const restored = parseBackup(reader.result);
        saveSettings(restored.settings);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(restored.history));
        if (restored.progress) localStorage.setItem(PROGRESS_KEY, JSON.stringify(restored.progress));
        settings = getSettings();
        render();
        alert('Backup restored.');
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function render() {
    container.innerHTML = `
      <div class="settings-view">
        <div class="settings-header">
          <button class="settings-back" id="settings-close">✕ Close</button>
          <span class="settings-title">Settings</span>
        </div>
        <div class="settings-data-actions">
          <button class="btn-data" id="settings-export">⬇ Export Backup</button>
          <button class="btn-data" id="settings-import">⬆ Import Backup</button>
          <button class="btn-reset-data" id="settings-reset-data">🗑 Reset Data</button>
          <input type="file" id="settings-import-file" accept="application/json,.json" hidden>
        </div>
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
    container.querySelector('#settings-export').addEventListener('click', exportBackup);
    const importInput = container.querySelector('#settings-import-file');
    container.querySelector('#settings-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      if (importInput.files && importInput.files[0]) importBackup(importInput.files[0]);
    });
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
        expandedRoutineExKey = null;
        exerciseFilter = null;
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
      const tags = primes.length
        ? primes.map(m => `<span class="ex-muscle-tag">${MUSCLE_NAMES[m] ?? m}</span>`).join('')
        : '<span class="ex-muscle-tag is-empty">No prime muscle</span>';
      return `
        <div class="settings-ex-card ${isExpanded ? 'expanded' : ''}">
          <div class="settings-ex-card-header" data-toggle="${i}">
            <div class="settings-ex-card-heading">
              <span class="settings-ex-card-name">${ex.name}</span>
              <div class="settings-ex-card-tags">${tags}</div>
            </div>
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
              <img class="settings-gif-preview" id="gif-preview-${i}" src="${ex.gifUrl ?? ''}" alt="${ex.name} demonstration" loading="lazy" ${ex.gifUrl ? '' : 'style="display:none"'} onerror="this.style.display='none'">
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
        onChange: ({ muscle, role }) => {
          const currentRoles = atlas.getMuscleRoles();
          setExMuscles(ex, currentRoles);
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
    body.querySelectorAll('.btn-remove-ex').forEach(btn => {
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

  // ─── Routines tab ───────────────────────────────────────────────────────────

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
            ${ex.gifUrl ? `<img class="routine-ex-gif" src="${ex.gifUrl}" alt="${ex.name} demonstration" loading="lazy" onerror="this.style.display='none'">` : ''}
            <div id="routine-atlas-${ri}-${exId}" class="routine-ex-atlas"></div>
          </div>` : '';
        return `<div class="routine-ex-item ${isOpen ? 'expanded' : ''}">
          <div class="routine-ex-row">
            <button class="routine-ex-toggle" data-routine="${ri}" data-ex-id="${exId}">
              <span class="routine-ex-chevron">${isOpen ? '▲' : '▼'}</span>
              <span>${ex.name}</span>
            </button>
            <button class="btn-icon danger" data-remove-routine="${ri}" data-ex-id="${exId}" title="Remove from routine">×</button>
          </div>
          ${details}
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
