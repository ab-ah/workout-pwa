import { mountExerciseCard } from '../components/exercise-card.js';
import { getSettings } from '../settings-store.js';
import { routineReadiness } from '../recovery-model.js';
import { adaptiveSuggestion } from '../adaptive.js';
import { stallCount } from '../one-rep-max.js';
import { deloadStatus } from '../deload.js';
import { mobilitySuggestions } from '../mobility.js';
import { generalPrimer } from '../warmup.js';
import { MUSCLE_LABELS } from '../components/muscle-atlas-paths.js';
import { findMissedWorkout, localDateStr } from '../schedule.js';
import { enableWakeLock, disableWakeLock } from '../wake-lock.js';
import { downloadBackup, promptRestore } from '../backup-io.js';

const READINESS_LOW = 0.6; // prime movers below this get a warning

// Tiers mirror the adaptive-suggestion bands (adaptive.js READY 0.85 / CAUTION
// 0.60) so the bar's colour/label and the advice below it never disagree:
// green "Ready" = train as planned, amber "Mostly ready" = trim a set, red
// "Under-recovered" = go light / swap.
function readinessTier(readiness) {
  if (readiness >= 0.85) return { label: 'Ready', color: '#46d160' };
  if (readiness >= 0.6) return { label: 'Mostly ready', color: '#e0b03a' };
  return { label: 'Under-recovered', color: '#e0553a' };
}

function buildAdaptiveBlock(readiness, perMuscle) {
  const s = adaptiveSuggestion(readiness, perMuscle);
  if (s.level === 'ready') return ''; // nothing to warn about when fully recovered
  const lagging = s.laggingMuscles.length
    ? `<span class="adaptive-muscles">${s.laggingMuscles.map(m => MUSCLE_LABELS[m] ?? m).join(' · ')}</span>`
    : '';
  return `
    <div class="adaptive-suggestion adaptive-${s.level}">
      <div class="adaptive-headline">${s.headline}</div>
      <div class="adaptive-detail">${s.detail} ${lagging}</div>
    </div>
  `;
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

// Multi-week deload nudge (recovery-model handles day-to-day; this is the
// meso-cycle layer). Rendered on the Today intro when a run of hard weeks stacks.
function deloadBannerHtml(history) {
  const { deloadDue, message } = deloadStatus(history);
  if (!deloadDue) return '';
  return `
    <div class="deload-banner">
      <div class="deload-banner-icon">🌙</div>
      <div class="deload-banner-text">
        <strong>Deload suggested</strong>
        <div class="muted">${message}</div>
      </div>
    </div>
  `;
}

// Name of an exercise's antagonist-superset partner in a routine, or null. The
// routine's `supersets` are [idA, idB] pairs; the partner is the other id.
function supersetPartnerName(routine, exerciseId, exercises) {
  const pair = (routine?.supersets ?? []).find(p => p.includes(exerciseId));
  if (!pair) return null;
  const partnerId = pair[0] === exerciseId ? pair[1] : pair[0];
  return exercises.find(e => e.id === partnerId)?.name ?? null;
}

// Movement-prep primer, shown once above the first exercise on a routine that
// opens with a heavy barbell lift (cold-start injury guard, see warmup.js).
function primerHtml(routine) {
  const primer = generalPrimer(routine);
  if (!primer) return '';
  const items = primer.items
    .map(i => `<li><strong>${i.name}</strong> <span class="muted">${i.detail}</span></li>`)
    .join('');
  return `
    <details class="primer-block">
      <summary>🩹 Prime first — ~5 min before you load the bar</summary>
      <ul class="primer-list">${items}</ul>
    </details>
  `;
}

// Rest-day mobility card: turns a blank rest slot into a light recovery nudge.
function mobilityCardHtml() {
  const items = mobilitySuggestions(new Date().getDate(), 4)
    .map(m => `<li><strong>${m.name}</strong> <span class="muted">${m.detail}</span></li>`)
    .join('');
  return `
    <div class="card mobility-card">
      <span class="muted">Recovery</span>
      <h3 style="margin:4px 0 8px">Mobility &amp; easy movement</h3>
      <ul class="mobility-list">${items}</ul>
      <p class="muted" style="font-size:12px;margin-top:6px">Optional — keeps you loose without adding training fatigue.</p>
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

  // Shown when no workouts have been logged yet — e.g. a fresh install or a
  // phone whose storage was wiped — so a saved backup can be pulled back in.
  function restoreBannerHtml(show) {
    if (!show) return '';
    return `
      <div class="missed-banner">
        <div class="missed-banner-text">
          <span class="muted">No workouts logged yet</span>
          <div>Have a backup file? <strong>Restore your data.</strong></div>
        </div>
        <div class="missed-banner-actions">
          <button class="btn-secondary" id="restore-backup-btn">⬆ Restore Backup</button>
        </div>
      </div>
    `;
  }

  function wireRestore() {
    const btn = container.querySelector('#restore-backup-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      promptRestore()
        .then(() => renderToday(container, store))
        .catch((err) => alert('Restore failed: ' + err.message));
    });
  }

  function renderDayIntro() {
    disableWakeLock(); // not in a session on the intro screen
    const settings = getSettings();
    const scheduled = getScheduledRoutine(settings);
    const history = store.getHistory();
    const missed = findMissedWorkout(settings.schedule, settings.routines, history);
    const banner = missedBannerHtml(missed, settings.routines);
    const restoreBanner = restoreBannerHtml(history.length === 0);
    const deloadBanner = deloadBannerHtml(history);

    if (!scheduled) {
      container.innerHTML = `
        ${restoreBanner}
        ${banner}
        ${deloadBanner}
        <div class="card">
          <span class="muted">Today</span>
          <h2>Rest Day</h2>
          <p class="muted">No workout scheduled for today. Recovery in progress.</p>
        </div>
        ${mobilityCardHtml()}
      `;
      wireMissed(missed);
      wireRestore();
      return;
    }

    const { routine, exercises } = scheduled;

    // Already trained today's scheduled routine? Show a completed card instead of
    // an "Up next" prompt with (now tanked) readiness that reads as a warning.
    const todayStr = localDateStr(Date.now());
    const doneToday = history.find(s => s.date === todayStr && s.routineId === routine.id);
    if (doneToday) {
      const totalSets = (doneToday.exercises ?? []).reduce((n, e) => n + (e.sets?.length ?? 0), 0);
      const mins = (typeof doneToday.startedAt === 'number' && typeof doneToday.finishedAt === 'number')
        ? Math.max(1, Math.round((doneToday.finishedAt - doneToday.startedAt) / 60000))
        : null;
      container.innerHTML = `
        ${restoreBanner}
        ${banner}
        ${deloadBanner}
        <div class="card today-done" style="border-left:4px solid var(${routine.colorVar})">
          <span class="muted">Today · done ✓</span>
          <h2>${routine.name} complete</h2>
          <p class="muted" style="margin-top:6px">${(doneToday.exercises ?? []).length} exercises · ${totalSets} sets${mins ? ` · ${mins} min` : ''}</p>
          <p class="muted" style="margin-top:10px;font-size:13px">Nice work — recovery is underway. Check the Recovery tab for muscle status.</p>
          <button class="btn-secondary" id="repeat-workout-btn" style="margin-top:12px">Train it again</button>
        </div>
      `;
      container.querySelector('#repeat-workout-btn').addEventListener('click', () => startRoutine(routine));
      wireMissed(missed);
      wireRestore();
      return;
    }

    const { readiness, perMuscle } = routineReadiness(routine, settings, history);
    container.innerHTML = `
      ${restoreBanner}
      ${banner}
      ${deloadBanner}
      <div class="card" style="border-left:4px solid var(${routine.colorVar})">
        <span class="muted">Up next</span>
        <h2>${routine.name}</h2>
        <p class="muted">${routine.tag}</p>
        <p class="muted" style="margin-top:10px">${exercises.length} exercises</p>
        ${buildReadinessBlock(readiness, perMuscle)}
        ${buildAdaptiveBlock(readiness, perMuscle)}
        <button class="btn-primary" id="start-workout-btn">Start Workout</button>
      </div>
      ${routine.id === 'recovery-walk' ? mobilityCardHtml() : ''}
    `;
    container.querySelector('#start-workout-btn').addEventListener('click', () => startRoutine(routine));
    wireMissed(missed);
    wireRestore();
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
    // The header lives OUTSIDE the card slot so the Previous/End controls survive
    // the card re-rendering its own innerHTML on every logged set.
    container.innerHTML = `
      <div class="exercise-flow-header">
        ${exerciseIndex > 0 ? '<button class="exercise-back-btn" id="exercise-back-btn">← Previous</button>' : '<span></span>'}
        <span class="exercise-progress">Exercise ${exerciseIndex + 1} of ${exercises.length}</span>
        <button class="exercise-end-btn" id="exercise-end-btn" title="End this workout">✕ End</button>
      </div>
      ${exerciseIndex === 0 ? primerHtml(routine) : ''}
      <div class="card" id="exercise-card-slot"></div>
    `;
    const slot = container.querySelector('#exercise-card-slot');

    const history = store.getHistory();
    const lastSets = getLastSetsForExercise(exercise.id, history);
    // Sets already logged for this exercise this session (present when the user
    // navigated back), so the card can pre-fill them for editing.
    const alreadyLogged = loggedExercises[exerciseIndex]?.sets ?? null;
    // Plateau length for this lift, so the coach can reframe a stall instead of
    // pushing a load jump that isn't there.
    const stall = stallCount(history, exercise.id);
    const supersetPartner = supersetPartnerName(routine, exercise.id, exercises);

    const card = mountExerciseCard(slot, exercise, lastSets, alreadyLogged, (sets) => {
      const updatedLogged = loggedExercises.slice();
      updatedLogged[exerciseIndex] = { exerciseId: exercise.id, name: exercise.name, sets };
      const state = { routineId, exerciseIndex: exerciseIndex + 1, loggedExercises: updatedLogged, startedAt };
      saveInProgressSession(state);
      renderExerciseFlow(routineId, exerciseIndex + 1, updatedLogged, startedAt);
    }, { stallCount: stall, supersetPartner });

    // Snapshot everything logged so far, folding in any sets typed on the current
    // card (even if not yet "logged"), so an early exit can save exactly what's on
    // screen. Used by both the End prompt and its "Save & finish" action.
    function snapshotLogged() {
      const updated = loggedExercises.slice();
      const current = card.getLoggedSets();
      if (current.length > 0) {
        updated[exerciseIndex] = { exerciseId: exercise.id, name: exercise.name, sets: current };
      }
      return updated;
    }

    const endBtn = container.querySelector('#exercise-end-btn');
    if (endBtn) {
      endBtn.addEventListener('click', () => {
        renderEndPrompt(routineId, routine, snapshotLogged(), startedAt, exerciseIndex);
      });
    }

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

  // End-workout prompt: reached from the ✕ End control mid-session. Offers to
  // save what's been logged so far (as a normal, shorter session) or throw the
  // whole thing away, plus a way back into the flow.
  function renderEndPrompt(routineId, routine, loggedExercises, startedAt, exerciseIndex) {
    disableWakeLock();
    const logged = loggedExercises.filter(Boolean);
    const totalSets = logged.reduce((n, e) => n + (e.sets?.length ?? 0), 0);
    const nothingLogged = totalSets === 0;

    container.innerHTML = `
      <div class="card end-prompt">
        <h2>End workout?</h2>
        <p class="muted">${nothingLogged
          ? 'Nothing logged yet — there is nothing to save.'
          : `You've logged <strong>${totalSets} set${totalSets === 1 ? '' : 's'}</strong> across <strong>${logged.length} exercise${logged.length === 1 ? '' : 's'}</strong>.`}</p>
        <div class="end-prompt-actions">
          ${nothingLogged ? '' : '<button class="btn-primary" id="end-save-btn">Save logged sets &amp; finish</button>'}
          <button class="btn-secondary end-discard" id="end-discard-btn">Discard workout</button>
          <button class="btn-secondary" id="end-keep-btn">Keep training</button>
        </div>
      </div>
    `;

    const saveBtn = container.querySelector('#end-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => renderSummary(routineId, routine, loggedExercises, startedAt));
    }
    container.querySelector('#end-discard-btn').addEventListener('click', () => {
      clearInProgressSession();
      renderDayIntro();
    });
    container.querySelector('#end-keep-btn').addEventListener('click', () => {
      const state = { routineId, exerciseIndex, loggedExercises, startedAt };
      saveInProgressSession(state);
      renderExerciseFlow(routineId, exerciseIndex, loggedExercises, startedAt);
    });
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
        <button class="btn-secondary" id="backup-btn" style="margin-top:10px">⬇ Back up my data</button>
        <p class="muted" style="margin-top:8px;font-size:13px">Save a backup file so a phone wipe never loses your log.</p>
      </div>
    `;
    container.querySelector('#back-to-today-btn').addEventListener('click', () => {
      renderToday(container, store);
    });
    container.querySelector('#backup-btn').addEventListener('click', downloadBackup);
  }
}
