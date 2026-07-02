import { mountExerciseCard } from '../components/exercise-card.js';
import { getSettings } from '../settings-store.js';
import { routineReadiness } from '../recovery-model.js';
import { MUSCLE_LABELS } from '../components/muscle-atlas-paths.js';
import { findMissedWorkout, localDateStr } from '../schedule.js';
import { enableWakeLock, disableWakeLock } from '../wake-lock.js';

const READINESS_LOW = 0.6; // prime movers below this get a warning

function readinessTier(readiness) {
  if (readiness >= 0.85) return { label: 'Ready', color: '#46d160' };
  if (readiness >= 0.65) return { label: 'Mostly ready', color: '#e0b03a' };
  return { label: 'Under-recovered', color: '#e0553a' };
}

function buildReadinessBlock(readiness, perMuscle) {
  const pct = Math.round(readiness * 100);
  const tier = readinessTier(readiness);
  const lagging = perMuscle.filter(m => m.role === 'prime_mover' && m.freshness < READINESS_LOW);
  const warn = lagging.length
    ? `<p class="today-readiness-warn">⚠ ${lagging
        .map(m => `${MUSCLE_LABELS[m.muscle] ?? m.muscle} ${Math.round(m.freshness * 100)}%`)
        .join(' · ')}</p>`
    : '';
  return `
    <div class="today-readiness">
      <div class="today-readiness-track">
        <div class="today-readiness-fill" style="width:${pct}%;background:${tier.color}"></div>
      </div>
      <div class="today-readiness-row">
        <span class="today-readiness-label" style="color:${tier.color}">${tier.label}</span>
        <span class="today-readiness-pct">${pct}% recovered</span>
      </div>
      ${warn}
    </div>
  `;
}

/**
 * Renders the Today tab into `container`.
 * `store` is the object returned by createStore(localStorage).
 */
export function renderToday(container, store) {
  const todaySessionKey = 'leanbuild-today-session-v2';
  const inProgress = readInProgressSession();
  let sessionCompleted = false;

  if (inProgress) {
    const settings = getSettings();
    // If the in-progress routine no longer exists in settings, discard it.
    // It does not have to match today's schedule; missed workouts can be run
    // from the Today screen too.
    if (!getRoutineById(settings, inProgress.routineId)) {
      clearInProgressSession();
    } else {
      renderExerciseFlow(inProgress.routineId, inProgress.exerciseIndex, inProgress.loggedExercises, inProgress.startedAt);
      return;
    }
  }

  renderDayIntro();

  function getScheduledRoutine(settings) {
    const dow = new Date().getDay(); // 0=Sun to 6=Sat
    const routineId = settings.schedule?.[String(dow)] ?? null;
    if (!routineId) return null;
    const routine = settings.routines?.find(r => r.id === routineId);
    if (!routine) return null;
    const exercises = (routine.exerciseIds ?? [])
      .map(id => settings.exercises?.find(e => e.id === id))
      .filter(Boolean);
    return { routine, exercises };
  }

  function getRoutineById(settings, routineId) {
    return settings.routines?.find(r => r.id === routineId) ?? null;
  }

  function readInProgressSession() {
    const raw = localStorage.getItem(todaySessionKey) ?? sessionStorage.getItem(todaySessionKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const { routineId, exerciseIndex, loggedExercises, startedAt } = parsed ?? {};
      if (
        typeof routineId !== 'string' || !routineId ||
        typeof exerciseIndex !== 'number' || exerciseIndex < 0 ||
        !Array.isArray(loggedExercises) ||
        typeof startedAt !== 'number'
      ) {
        clearInProgressSession();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function saveInProgressSession(state) {
    localStorage.setItem(todaySessionKey, JSON.stringify(state));
    sessionStorage.removeItem(todaySessionKey);
  }

  function clearInProgressSession() {
    localStorage.removeItem(todaySessionKey);
    sessionStorage.removeItem(todaySessionKey);
  }

  function startRoutine(routine) {
    const state = { routineId: routine.id, exerciseIndex: 0, loggedExercises: [], startedAt: Date.now() };
    saveInProgressSession(state);
    renderExerciseFlow(state.routineId, state.exerciseIndex, state.loggedExercises, state.startedAt);
  }

  function missedBannerHtml(missed, routines) {
    if (!missed) return '';
    const options = (routines ?? [])
      .map(r => `<option value="${r.id}" ${r.id === missed.routine.id ? 'selected' : ''}>${r.name}</option>`)
      .join('');
    return `
      <div class="missed-banner">
        <div class="missed-banner-text">
          <span class="muted">Missed workout</span>
          <div><strong>${missed.routine.name}</strong> <span class="muted">was scheduled ${missed.dayName}</span></div>
        </div>
        <div class="missed-banner-actions">
          <select class="set-input" id="missed-routine-select" aria-label="Choose a routine to do now">${options}</select>
          <button class="btn-secondary" id="do-missed-btn">Do it now</button>
        </div>
      </div>
    `;
  }

  function wireMissed(missed) {
    if (!missed) return;
    const btn = container.querySelector('#do-missed-btn');
    const select = container.querySelector('#missed-routine-select');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const settings = getSettings();
      const chosenId = select?.value ?? missed.routine.id;
      const routine = settings.routines?.find(r => r.id === chosenId) ?? missed.routine;
      startRoutine(routine);
    });
  }

  function renderDayIntro() {
    disableWakeLock(); // not in a session on the intro screen
    const settings = getSettings();
    const scheduled = getScheduledRoutine(settings);
    const missed = findMissedWorkout(settings.schedule, settings.routines, store.getHistory());
    const banner = missedBannerHtml(missed, settings.routines);

    if (!scheduled) {
      container.innerHTML = `
        ${banner}
        <div class="card">
          <span class="muted">Today</span>
          <h2>Rest Day</h2>
          <p class="muted">No workout scheduled for today. Recovery in progress.</p>
        </div>
      `;
      wireMissed(missed);
      return;
    }

    const { routine, exercises } = scheduled;
    const { readiness, perMuscle } = routineReadiness(routine, settings, store.getHistory());
    container.innerHTML = `
      ${banner}
      <div class="card" style="border-left:4px solid var(${routine.colorVar})">
        <span class="muted">Up next</span>
        <h2>${routine.name}</h2>
        <p class="muted">${routine.tag}</p>
        <p class="muted" style="margin-top:10px">${exercises.length} exercises</p>
        ${buildReadinessBlock(readiness, perMuscle)}
        <button class="btn-primary" id="start-workout-btn">Start Workout</button>
      </div>
    `;
    container.querySelector('#start-workout-btn').addEventListener('click', () => startRoutine(routine));
    wireMissed(missed);
  }

  function getLastSetsForExercise(exerciseId, history) {
    for (let i = history.length - 1; i >= 0; i--) {
      const ex = history[i].exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) return ex.sets;
    }
    return null;
  }

  function renderExerciseFlow(routineId, exerciseIndex, loggedExercises, startedAt) {
    const settings = getSettings();
    const routine = settings.routines?.find(r => r.id === routineId);
    if (!routine) {
      clearInProgressSession();
      renderDayIntro();
      return;
    }

    const exercises = (routine.exerciseIds ?? [])
      .map(id => settings.exercises?.find(e => e.id === id))
      .filter(Boolean);

    if (exerciseIndex >= exercises.length) {
      renderSummary(routineId, routine, loggedExercises, startedAt);
      return;
    }

    enableWakeLock(); // keep the screen on while training
    const exercise = exercises[exerciseIndex];
    container.innerHTML = `<div class="card" id="exercise-card-slot"></div>`;
    const slot = container.querySelector('#exercise-card-slot');

    const header = document.createElement('div');
    header.className = 'exercise-flow-header';
    header.innerHTML = `
      ${exerciseIndex > 0 ? '<button class="exercise-back-btn" id="exercise-back-btn">← Previous</button>' : '<span></span>'}
      <span class="exercise-progress">Exercise ${exerciseIndex + 1} of ${exercises.length}</span>
    `;

    const history = store.getHistory();
    const lastSets = getLastSetsForExercise(exercise.id, history);
    // Sets already logged for this exercise this session (present when the user
    // navigated back), so the card can pre-fill them for editing.
    const alreadyLogged = loggedExercises[exerciseIndex]?.sets ?? null;

    const card = mountExerciseCard(slot, exercise, lastSets, alreadyLogged, (sets) => {
      const updatedLogged = loggedExercises.slice();
      updatedLogged[exerciseIndex] = { exerciseId: exercise.id, name: exercise.name, sets };
      const state = { routineId, exerciseIndex: exerciseIndex + 1, loggedExercises: updatedLogged, startedAt };
      saveInProgressSession(state);
      renderExerciseFlow(routineId, exerciseIndex + 1, updatedLogged, startedAt);
    });

    slot.prepend(header);

    const backBtn = container.querySelector('#exercise-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        // Keep everything logged so far — including any sets entered or corrected
        // on this exercise — then step back to review/correct the previous one.
        const updatedLogged = loggedExercises.slice();
        const current = card.getLoggedSets();
        if (current.length > 0) {
          updatedLogged[exerciseIndex] = { exerciseId: exercise.id, name: exercise.name, sets: current };
        }
        const state = { routineId, exerciseIndex: exerciseIndex - 1, loggedExercises: updatedLogged, startedAt };
        saveInProgressSession(state);
        renderExerciseFlow(routineId, exerciseIndex - 1, updatedLogged, startedAt);
      });
    }
  }

  function renderSummary(routineId, routine, loggedExercises, startedAt) {
    if (sessionCompleted) return;
    sessionCompleted = true;
    disableWakeLock(); // workout finished
    const finishedAt = Date.now();
    const logged = loggedExercises.filter(Boolean);
    const totalSets = logged.reduce((sum, e) => sum + e.sets.length, 0);
    const minutes = Math.max(1, Math.round((finishedAt - startedAt) / 60000));

    const session = {
      sessionId: `s_${finishedAt}`,
      routineId,
      dayTitle: routine.name,
      date: localDateStr(finishedAt),
      startedAt,
      finishedAt,
      exercises: logged
    };
    store.addSession(session);
    clearInProgressSession();

    container.innerHTML = `
      <div class="card">
        <h2>Workout Complete</h2>
        <p class="muted">${routine.name} — ${logged.length} exercises, ${totalSets} sets, ${minutes} min</p>
        <button class="btn-primary" id="back-to-today-btn">Back to Today</button>
      </div>
    `;
    container.querySelector('#back-to-today-btn').addEventListener('click', () => {
      renderToday(container, store);
    });
  }
}
