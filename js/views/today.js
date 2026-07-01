import { PLAN } from '../data.js';
import { mountExerciseCard } from '../components/exercise-card.js';

/**
 * Renders the Today tab into `container`.
 * `store` is the object returned by createStore(localStorage).
 */
export function renderToday(container, store) {
  const progress = store.getProgress();
  const todaySessionKey = 'leanbuild-today-session-v2';
  const inProgress = readInProgressSession();
  let sessionCompleted = false;

  if (inProgress) {
    renderExerciseFlow(inProgress.dayIndex, inProgress.exerciseIndex, inProgress.loggedExercises, inProgress.startedAt);
    return;
  }

  renderDayIntro();

  function readInProgressSession() {
    const raw = sessionStorage.getItem(todaySessionKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const { dayIndex, exerciseIndex, loggedExercises, startedAt } = parsed ?? {};
      if (
        typeof dayIndex !== 'number' || dayIndex < 0 || dayIndex >= PLAN.length ||
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
    const dayIndex = store.getNextDayIndex(PLAN.length, progress);
    const day = PLAN[dayIndex];
    container.innerHTML = `
      <div class="card" style="border-left:4px solid var(${day.colorVar})">
        <span class="muted">Up next</span>
        <h2>${day.title}</h2>
        <p class="muted">${day.tag}</p>
        <p class="muted" style="margin-top:8px">${day.focus}</p>
        <p class="muted" style="margin-top:10px">${day.exercises.length} exercises</p>
        <button class="btn-primary" id="start-workout-btn">Start Workout</button>
      </div>
    `;
    container.querySelector('#start-workout-btn').addEventListener('click', () => {
      const state = { dayIndex, exerciseIndex: 0, loggedExercises: [], startedAt: Date.now() };
      saveInProgressSession(state);
      renderExerciseFlow(state.dayIndex, state.exerciseIndex, state.loggedExercises, state.startedAt);
    });
  }

  function renderExerciseFlow(dayIndex, exerciseIndex, loggedExercises, startedAt) {
    const day = PLAN[dayIndex];

    if (exerciseIndex >= day.exercises.length) {
      renderSummary(dayIndex, loggedExercises, startedAt);
      return;
    }

    const exercise = day.exercises[exerciseIndex];
    container.innerHTML = `<div class="card" id="exercise-card-slot"></div>`;
    const slot = container.querySelector('#exercise-card-slot');
    const progressLabel = document.createElement('div');
    progressLabel.className = 'exercise-progress';
    progressLabel.textContent = `Exercise ${exerciseIndex + 1} of ${day.exercises.length}`;

    mountExerciseCard(slot, exercise, (sets) => {
      const updatedLogged = [...loggedExercises, { exerciseId: exercise.id, name: exercise.name, sets }];
      const state = { dayIndex, exerciseIndex: exerciseIndex + 1, loggedExercises: updatedLogged, startedAt };
      saveInProgressSession(state);
      renderExerciseFlow(dayIndex, exerciseIndex + 1, updatedLogged, startedAt);
    });

    slot.prepend(progressLabel);
  }

  function renderSummary(dayIndex, loggedExercises, startedAt) {
    if (sessionCompleted) return;
    sessionCompleted = true;
    const day = PLAN[dayIndex];
    const finishedAt = Date.now();
    const totalSets = loggedExercises.reduce((sum, e) => sum + e.sets.length, 0);
    const minutes = Math.max(1, Math.round((finishedAt - startedAt) / 60000));

    const session = {
      sessionId: `s_${finishedAt}`,
      dayIndex,
      dayTitle: day.title,
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
        <p class="muted">${day.title} — ${loggedExercises.length} exercises, ${totalSets} sets, ${minutes} min</p>
        <button class="btn-primary" id="back-to-today-btn">Back to Today</button>
      </div>
    `;
    container.querySelector('#back-to-today-btn').addEventListener('click', () => {
      renderToday(container, store);
    });
  }
}
