import { getSettings, saveSettings, buildDefaults } from '../settings-store.js';

const MUSCLE_NAMES = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps',
  back: 'Back', biceps: 'Biceps', rear_delts: 'Rear Delts',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', abs: 'Abs',
};
const ALL_MUSCLES = Object.keys(MUSCLE_NAMES);

export function renderSettings(container, onClose) {
  let settings = getSettings();
  let activeSection = 'exercises';
  let activeDayIndex = 0;
  let expandedExerciseIndex = null;

  function save() { saveSettings(settings); }

  function render() {
    container.innerHTML = `
      <div class="settings-view">
        <div class="settings-header">
          <button class="settings-back" id="settings-close">✕ Close</button>
          <span class="settings-title">Settings</span>
          <button class="settings-reset" id="settings-reset">Reset</button>
        </div>
        <div class="settings-tabs">
          <button class="${activeSection === 'exercises' ? 'active' : ''}" data-sec="exercises">Exercises</button>
          <button class="${activeSection === 'recovery' ? 'active' : ''}" data-sec="recovery">Recovery</button>
        </div>
        <div class="settings-body" id="settings-body"></div>
      </div>
    `;

    container.querySelector('#settings-close').addEventListener('click', onClose);
    container.querySelector('#settings-reset').addEventListener('click', () => {
      if (confirm('Reset all settings to defaults?')) {
        settings = buildDefaults();
        expandedExerciseIndex = null;
        save();
        render();
      }
    });
    container.querySelectorAll('.settings-tabs button').forEach(btn => {
      btn.addEventListener('click', () => { activeSection = btn.dataset.sec; render(); });
    });

    const body = container.querySelector('#settings-body');
    if (activeSection === 'exercises') renderExercises(body);
    else renderRecoveryTimes(body);
  }

  function muscleRole(ex, muscle) {
    if ((ex.primaryMuscles ?? []).includes(muscle)) return 'primary';
    if ((ex.secondaryMuscles ?? []).includes(muscle)) return 'secondary';
    return 'none';
  }

  function cycleMuscleTap(ex, muscle) {
    const role = muscleRole(ex, muscle);
    ex.primaryMuscles = (ex.primaryMuscles ?? []).filter(m => m !== muscle);
    ex.secondaryMuscles = (ex.secondaryMuscles ?? []).filter(m => m !== muscle);
    if (role === 'none') ex.primaryMuscles.push(muscle);
    else if (role === 'primary') ex.secondaryMuscles.push(muscle);
    // 'secondary' → neither (already removed above)
    save();
  }

  function renderExercises(body) {
    const dayTabs = settings.days.map((d, i) =>
      `<button class="day-tab ${i === activeDayIndex ? 'active' : ''}" data-day="${i}">${d.title}</button>`
    ).join('');

    const day = settings.days[activeDayIndex];

    const exCards = day.exercises.map((ex, i) => {
      const isExpanded = expandedExerciseIndex === i;
      const chipRow = ALL_MUSCLES.map(m => {
        const role = muscleRole(ex, m);
        const cls = role === 'primary' ? 'muscle-chip primary' : role === 'secondary' ? 'muscle-chip secondary' : 'muscle-chip';
        const label = role === 'primary' ? `${MUSCLE_NAMES[m]} ★` : role === 'secondary' ? `${MUSCLE_NAMES[m]} ◎` : MUSCLE_NAMES[m];
        return `<button class="${cls}" data-ex="${i}" data-muscle="${m}">${label}</button>`;
      }).join('');

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
              <input type="text" class="set-input settings-name-input" data-ex="${i}" value="${ex.name}">
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
              <label class="settings-field-label">Muscles worked <span class="muted" style="font-size:10px">tap to cycle: none → primary ★ → secondary ◎</span></label>
              <div class="muscle-chips">${chipRow}</div>
            </div>
            <button class="btn-remove-ex" data-ex="${i}">Remove Exercise</button>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');

    body.innerHTML = `
      <div class="settings-day-tabs">${dayTabs}</div>
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

    // Day tab switching
    body.querySelectorAll('.day-tab').forEach(btn => {
      btn.addEventListener('click', () => { activeDayIndex = +btn.dataset.day; expandedExerciseIndex = null; render(); });
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
        settings.days[activeDayIndex].exercises[i].name = input.value;
        save();
      });
    });

    // Other fields (setsCount, repRange, restSeconds)
    body.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('change', () => {
        const i = +input.dataset.ex;
        const field = input.dataset.field;
        const val = field === 'setsCount' || field === 'restSeconds' ? +input.value : input.value;
        settings.days[activeDayIndex].exercises[i][field] = val;
        save();
      });
    });

    // GIF save button
    body.querySelectorAll('.btn-save-gif').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.ex;
        const urlInput = body.querySelector(`.settings-gif-input[data-ex="${i}"]`);
        settings.days[activeDayIndex].exercises[i].gifUrl = urlInput.value;
        save();
        const confirm = body.querySelector(`#gif-confirm-${i}`);
        if (confirm) {
          confirm.style.display = 'block';
          setTimeout(() => { confirm.style.display = 'none'; }, 1500);
        }
      });
    });

    // Muscle chip cycling
    body.querySelectorAll('.muscle-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.ex;
        const muscle = btn.dataset.muscle;
        const ex = settings.days[activeDayIndex].exercises[i];
        cycleMuscleTap(ex, muscle);
        render();
      });
    });

    // Remove exercise
    body.querySelectorAll('.btn-remove-ex').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.ex;
        if (confirm('Remove this exercise?')) {
          settings.days[activeDayIndex].exercises.splice(i, 1);
          expandedExerciseIndex = null;
          save();
          render();
        }
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
      settings.days[activeDayIndex].exercises.push({
        id, name, setsCount: sets, repRange: reps, restSeconds: rest,
        startWeight: '—', gifUrl: '', primaryMuscles: [], secondaryMuscles: [],
      });
      save();
      render();
    });
  }

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
