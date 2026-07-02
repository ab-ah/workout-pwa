import { mountExerciseCard } from '../components/exercise-card.js';
import { getSettings } from '../settings-store.js';
import { routineReadiness } from '../recovery-model.js';
import { MUSCLE_LABELS } from '../components/muscle-atlas-paths.js';

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
    const scheduled = getScheduledRoutine(settings);
    // If the in-progress routine no longer exists in settings, discard it
    if (!scheduled || scheduled.routine.id !== inProgress.routineId) {
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

  function readInProgressSession() {
    const raw = sessionStorage.getItem(todaySessionKey);
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
        sessionStorage.removeItem(todaySessionKey);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function saveInProgressSession(state) {
    sessionStorage.setItem(todaySessionKey, JSON.stringify(state));
  }

  function clearInProgressSession() {
    sessionStorage.removeItem(todaySessionKey);
  }

  function renderDayIntro() {
    const settings = getSettings();
    const scheduled = getScheduledRoutine(settings);

    if (!scheduled) {
      container.innerHTML = `
        <div class="card">
          <span class="muted">Today</span>
          <h2>Rest Day</h2>
          <p class="muted">No workout scheduled for today. Recovery in progress.</p>
        </div>
      `;
      return;
    }

    const { routine, exercises } = scheduled;
    const { readiness, perMuscle } = routineReadiness(routine, settings, store.getHistory());
    container.innerHTML = `
      <div class="card" style="border-left:4px solid var(${routine.colorVar})">
        <span class="muted">Up next</span>
        <h2>${routine.name}</h2>
        <p class="muted">${routine.tag}</p>
        <p class="muted" style="margin-top:10px">${exercises.length} exercises</p>
        ${buildReadinessBlock(readiness, perMuscle)}
        <button class="btn-primary" id="start-workout-btn">Start Workout</button>
      </div>
    `;
    container.querySelector('#start-workout-btn').addEventListener('click', () => {
      const state = { routineId: routine.id, exerciseIndex: 0, loggedExercises: [], startedAt: Date.now() };
      saveInProgressSession(state);
      renderExerciseFlow(state.routineId, state.exerciseIndex, state.loggedExercises, state.startedAt);
    });
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

    const exercise = exercises[exerciseIndex];
    container.innerHTML = `<div class="card" id="exercise-card-slot"></div>`;
    const slot = container.querySelector('#exercise-card-slot');
    const progressLabel = document.createElement('div');
    progressLabel.className = 'exercise-progress';
    progressLabel.textContent = `Exercise ${exerciseIndex + 1} of ${exercises.length}`;

    const history = store.getHistory();
    const lastSets = getLastSetsForExercise(exercise.id, history);

    mountExerciseCard(slot, exercise, lastSets, (sets) => {
      const updatedLogged = [...loggedExercises, { exerciseId: exercise.id, name: exercise.name, sets }];
      const state = { routineId, exerciseIndex: exerciseIndex + 1, loggedExercises: updatedLogged, startedAt };
      saveInProgressSession(state);
      renderExerciseFlow(routineId, exerciseIndex + 1, updatedLogged, startedAt);
    });

    slot.prepend(progressLabel);
  }

  function renderSummary(routineId, routine, loggedExercises, startedAt) {
    if (sessionCompleted) return;
    sessionCompleted = true;
    const finishedAt = Date.now();
    const totalSets = loggedExercises.reduce((sum, e) => sum + e.sets.length, 0);
    const minutes = Math.max(1, Math.round((finishedAt - startedAt) / 60000));

    const session = {
      sessionId: `s_${finishedAt}`,
      dayIndex: routineId, // store routineId as dayIndex for backward-compat with history viewing
      dayTitle: routine.name,
      date: new Date().toISOString().slice(0, 10),
      startedAt,
      finishedAt,
      exercises: loggedExercises
    };
    store.addSession(session);
    clearInProgressSession();

    container.innerHTML = `
      <div class="card">
        <h2>Workout Complete</h2>
        <p class="muted">${routine.name} — ${loggedExercises.length} exercises, ${totalSets} sets, ${minutes} min</p>
        <button class="btn-primary" id="back-to-today-btn">Back to Today</button>
      </div>
    `;
    container.querySelector('#back-to-today-btn').addEventListener('click', () => {
      renderToday(container, store);
    });
  }
}
