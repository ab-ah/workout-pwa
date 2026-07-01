import { getSettings, saveSettings, buildDefaults } from '../settings-store.js';

const MUSCLE_NAMES = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps',
  back: 'Back / Lats', biceps: 'Biceps', rear_delts: 'Rear Delts',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', abs: 'Abs / Core',
};
const ALL_MUSCLES = Object.keys(MUSCLE_NAMES);

export function renderSettings(container, onClose) {
  let settings = getSettings();
  let activeSection = 'exercises';
  let activeDayIndex = 0;

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
          <button class="${activeSection === 'gifs' ? 'active' : ''}" data-sec="gifs">GIFs</button>
          <button class="${activeSection === 'muscles' ? 'active' : ''}" data-sec="muscles">Muscles</button>
          <button class="${activeSection === 'recovery' ? 'active' : ''}" data-sec="recovery">Recovery</button>
        </div>

        <div class="settings-body" id="settings-body"></div>
      </div>
    `;

    container.querySelector('#settings-close').addEventListener('click', onClose);
    container.querySelector('#settings-reset').addEventListener('click', () => {
      if (confirm('Reset all settings to defaults?')) {
        settings = buildDefaults();
        save();
        render();
      }
    });

    container.querySelectorAll('.settings-tabs button').forEach(btn => {
      btn.addEventListener('click', () => { activeSection = btn.dataset.sec; render(); });
    });

    const body = container.querySelector('#settings-body');
    if (activeSection === 'exercises') renderExercises(body);
    else if (activeSection === 'gifs') renderGifs(body);
    else if (activeSection === 'muscles') renderMuscles(body);
    else renderRecoveryTimes(body);
  }

  function renderExercises(body) {
    const dayTabs = settings.days.map((d, i) =>
      `<button class="day-tab ${i === activeDayIndex ? 'active' : ''}" data-day="${i}">${d.title}</button>`
    ).join('');

    const day = settings.days[activeDayIndex];
    const exRows = day.exercises.map((ex, i) => `
      <div class="settings-ex-row">
        <span class="settings-ex-name">${ex.name}</span>
        <div class="settings-ex-controls">
          <input type="number" class="set-input" style="width:52px" data-ex="${i}" data-field="setsCount" value="${ex.setsCount}" min="1" max="10">
          <span class="muted" style="font-size:11px">sets</span>
          <input type="text" class="set-input" style="width:72px" data-ex="${i}" data-field="repRange" value="${ex.repRange}">
          <span class="muted" style="font-size:11px">reps</span>
          <input type="number" class="set-input" style="width:60px" data-ex="${i}" data-field="restSeconds" value="${ex.restSeconds}" min="0">
          <span class="muted" style="font-size:11px">rest(s)</span>
          <button class="btn-icon danger" data-remove="${i}">✕</button>
        </div>
      </div>
    `).join('');

    body.innerHTML = `
      <div class="settings-day-tabs">${dayTabs}</div>
      <div class="settings-section-label">Exercises for ${day.title}</div>
      ${exRows}
    `;

    body.querySelectorAll('.day-tab').forEach(btn => {
      btn.addEventListener('click', () => { activeDayIndex = +btn.dataset.day; render(); });
    });
    body.querySelectorAll('[data-field]').forEach(input => {
      input.addEventListener('change', () => {
        const i = +input.dataset.ex;
        const field = input.dataset.field;
        const val = field === 'setsCount' || field === 'restSeconds' ? +input.value : input.value;
        settings.days[activeDayIndex].exercises[i][field] = val;
        save();
      });
    });
    body.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.remove;
        settings.days[activeDayIndex].exercises.splice(i, 1);
        save();
        render();
      });
    });
  }

  function renderGifs(body) {
    const allEx = settings.days.flatMap(d => d.exercises);
    const rows = allEx.map((ex, i) => `
      <div class="settings-gif-row">
        <div class="settings-ex-name">${ex.name}</div>
        <input type="url" class="set-input settings-gif-input" data-id="${ex.id}" value="${ex.gifUrl ?? ''}">
      </div>
    `).join('');
    body.innerHTML = `<div class="settings-section-label">GIF URLs</div>${rows}`;

    body.querySelectorAll('[data-id]').forEach(input => {
      input.addEventListener('change', () => {
        const id = input.dataset.id;
        for (const day of settings.days) {
          const ex = day.exercises.find(e => e.id === id);
          if (ex) { ex.gifUrl = input.value; save(); }
        }
      });
    });
  }

  function renderMuscles(body) {
    const allEx = settings.days.flatMap(d => d.exercises);
    const rows = allEx.map(ex => {
      const checks = ALL_MUSCLES.map(m => `
        <label class="muscle-check">
          <input type="checkbox" data-id="${ex.id}" data-muscle="${m}" ${(ex.muscles ?? []).includes(m) ? 'checked' : ''}>
          <span>${MUSCLE_NAMES[m]}</span>
        </label>
      `).join('');
      return `
        <div class="settings-muscle-row">
          <div class="settings-ex-name">${ex.name}</div>
          <div class="muscle-checks">${checks}</div>
        </div>
      `;
    }).join('');
    body.innerHTML = `<div class="settings-section-label">Muscles per Exercise</div>${rows}`;

    body.querySelectorAll('[data-muscle]').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        const muscle = cb.dataset.muscle;
        for (const day of settings.days) {
          const ex = day.exercises.find(e => e.id === id);
          if (ex) {
            ex.muscles = ex.muscles ?? [];
            if (cb.checked) { if (!ex.muscles.includes(muscle)) ex.muscles.push(muscle); }
            else { ex.muscles = ex.muscles.filter(m => m !== muscle); }
            save();
          }
        }
      });
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
    body.innerHTML = `<div class="settings-section-label">Full Recovery Time</div>${rows}`;

    body.querySelectorAll('[data-muscle]').forEach(input => {
      input.addEventListener('change', () => {
        settings.recoveryHours[input.dataset.muscle] = +input.value;
        save();
      });
    });
  }

  render();
}
