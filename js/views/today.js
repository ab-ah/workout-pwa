import { mountExerciseCard } from '../components/exercise-card.js';
import { mountSupersetCard } from '../components/superset-card.js';
import { buildFlowSteps } from '../supersets.js';
import { getSettings } from '../settings-store.js';
import { routineReadiness } from '../recovery-model.js';
import { adaptiveSuggestion } from '../adaptive.js';
import { stallCount } from '../one-rep-max.js';
import { deloadStatus } from '../deload.js';
import { mobilitySuggestions, allMobility } from '../mobility.js';
import { mountMobilityFlow } from '../components/mobility-flow.js';
import { generalPrimer } from '../warmup.js';
import { MUSCLE_LABELS } from '../components/muscle-atlas-paths.js';
import { demoMediaHtml } from '../components/demo-media.js';
import { findMissedWorkouts, localDateStr } from '../schedule.js';
import { enableWakeLock, disableWakeLock } from '../wake-lock.js';
import { downloadBackup, promptRestore } from '../backup-io.js';
import { substituteOptions } from '../substitutions.js';
import { getDeloadMode, startDeloadMode, endDeloadMode, DELOAD_DAYS } from '../deload-mode.js';
import { clearPendingRest } from '../rest-persist.js';
import { escapeHtml } from '../escape.js';

// Installed once (module scope) so re-entering the Today tab doesn't stack
// duplicate popstate listeners for the Back-gesture guard.
let backTrapInstalled = false;

const READINESS_LOW = 0.6; // prime movers below this get a warning

/** "1 exercise" / "2 exercises" — pluralise a count + noun. */
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// sessionStorage flag: the Catch-up panel is dismissed for the rest of the day.
// Module-scoped (not inside renderToday) so it's initialised before the first
// renderDayIntro() call — a function-body const would be in the temporal dead
// zone when the intro renders on entry.
const CATCHUP_DISMISS_KEY = 'leanbuild-catchup-dismissed';

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
// Three states: an ACTIVE deload week (offer to end early), a SUGGESTED deload
// (offer one-tap start), or nothing. The active-deload cap on working sets is
// applied inside the exercise/superset cards (see deload-mode.js).
function deloadBannerHtml(history) {
  const mode = getDeloadMode();
  if (mode.active) {
    return `
      <div class="deload-banner deload-banner-active">
        <div class="deload-banner-icon">🌙</div>
        <div class="deload-banner-text">
          <strong>Deload week active</strong>
          <div class="muted">${mode.daysLeft} day${mode.daysLeft === 1 ? '' : 's'} left — every exercise is trimmed to ~60% of its sets. Hold the weights and let fatigue clear.</div>
        </div>
        <button class="btn-secondary deload-end-btn" id="deload-end-btn">End early</button>
      </div>
    `;
  }
  const { deloadDue, message } = deloadStatus(history);
  if (!deloadDue) return '';
  return `
    <div class="deload-banner">
      <div class="deload-banner-icon">🌙</div>
      <div class="deload-banner-text">
        <strong>Deload suggested</strong>
        <div class="muted">${message}</div>
      </div>
      <button class="btn-primary deload-start-btn" id="deload-start-btn">Start ${DELOAD_DAYS}-day deload</button>
    </div>
  `;
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
    .map(m => `<li>
        ${demoMediaHtml({ gifUrl: m.gifUrl, className: 'mobility-gif', name: m.name })}
        <div class="mobility-item-text"><strong>${m.name}</strong> <span class="muted">${m.detail}</span></div>
      </li>`)
    .join('');
  return `
    <div class="card mobility-card">
      <span class="muted">Recovery</span>
      <h3 style="margin:4px 0 8px">Mobility &amp; easy movement</h3>
      <ul class="mobility-list">${items}</ul>
      <button class="btn-primary" id="start-mobility-btn" style="margin-top:10px">▶ Start mobility flow</button>
      <p class="muted" style="font-size:12px;margin-top:8px">Optional, follow-along — not logged and adds no training fatigue.</p>
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
    // Preserve any in-flow exercise substitutions across the many state saves
    // (advance / back / keep-training) unless the caller sets its own map.
    const existing = readInProgressSession();
    const merged = { ...state, substitutions: state.substitutions ?? existing?.substitutions ?? {} };
    localStorage.setItem(todaySessionKey, JSON.stringify(merged));
    sessionStorage.removeItem(todaySessionKey);
  }

  function clearInProgressSession() {
    localStorage.removeItem(todaySessionKey);
    sessionStorage.removeItem(todaySessionKey);
  }

  function startRoutine(routine) {
    clearPendingRest(); // no stale rest carries into a freshly started workout
    const state = { routineId: routine.id, exerciseIndex: 0, loggedExercises: [], startedAt: Date.now(), substitutions: {} };
    saveInProgressSession(state);
    renderExerciseFlow(state.routineId, state.exerciseIndex, state.loggedExercises, state.startedAt);
  }

  // Back-gesture guard (Android/One One UI): a system Back during a workout used
  // to exit the PWA. Absorb it — push a sentinel history state on entering the
  // flow and, on popstate while a session is in progress, re-push and resume the
  // Today view instead of leaving. Ending the workout releases the trap.
  function pushFlowState() {
    if (!history.state?.leanbuildFlow) history.pushState({ leanbuildFlow: true }, '');
  }
  if (!backTrapInstalled) {
    backTrapInstalled = true;
    window.addEventListener('popstate', () => {
      const raw = localStorage.getItem(todaySessionKey) ?? sessionStorage.getItem(todaySessionKey);
      if (raw) {
        history.pushState({ leanbuildFlow: true }, '');
        renderToday(container, store);
      }
    });
  }

  // The "Catch up" panel lists recently-missed scheduled sessions so you can run
  // one now. It's only worth showing once the user actually has a training history
  // (a fresh install can't have "missed" anything) and never lists a skipped
  // active-recovery day (missing an easy mobility walk isn't a debt). It's
  // dismissible for the rest of the day, and lives BELOW the day's main panel.
  function isCatchUpDismissed() {
    // localStorage (not sessionStorage) so a dismissal survives Android killing
    // the PWA process later the same day; keyed by date so it re-appears tomorrow.
    return localStorage.getItem(CATCHUP_DISMISS_KEY) === localDateStr(Date.now());
  }
  function catchUpToShow(history) {
    if (history.length === 0) return [];
    if (isCatchUpDismissed()) return [];
    const settings = getSettings();
    return findMissedWorkouts(settings.schedule, settings.routines, history)
      .filter(m => m.routine.id !== 'recovery-walk');
  }

  // A designed catch-up card: a header count, then one row per missed routine with
  // its colour accent, tag, when-it-was-due and a one-tap "Do it now".
  function catchUpCardHtml(list) {
    if (!list || list.length === 0) return '';
    const items = list.map(m => {
      const when = m.daysAgo === 1 ? 'yesterday' : `${m.daysAgo} days ago`;
      return `
        <li class="catchup-item" style="--rc:var(${escapeHtml(m.routine.colorVar)})">
          <span class="catchup-bar" aria-hidden="true"></span>
          <div class="catchup-info">
            <strong>${escapeHtml(m.routine.name)}</strong>
            <span class="muted catchup-tag">${escapeHtml(m.routine.tag)}</span>
            <span class="catchup-when">${escapeHtml(m.dayName)} · <span class="muted">${escapeHtml(when)}</span></span>
          </div>
          <button class="btn-secondary catchup-do" data-catchup-id="${escapeHtml(m.routine.id)}">Do it now</button>
        </li>`;
    }).join('');
    const n = list.length;
    return `
      <div class="card catchup-card">
        <button class="banner-dismiss" id="catchup-dismiss-btn" aria-label="Dismiss missed sessions">✕</button>
        <span class="muted">⏳ Catch up</span>
        <h3 class="catchup-title">${n} missed session${n === 1 ? '' : 's'}</h3>
        <p class="muted catchup-sub">Run one now to stay on plan — recovery permitting.</p>
        <ul class="catchup-list">${items}</ul>
      </div>
    `;
  }

  function wireDeload() {
    const startBtn = container.querySelector('#deload-start-btn');
    if (startBtn) startBtn.addEventListener('click', () => { startDeloadMode(); renderDayIntro(); });
    const endBtn = container.querySelector('#deload-end-btn');
    if (endBtn) endBtn.addEventListener('click', () => { endDeloadMode(); renderDayIntro(); });
  }

  function wireCatchUp(list) {
    const dismiss = container.querySelector('#catchup-dismiss-btn');
    if (dismiss) {
      dismiss.addEventListener('click', () => {
        localStorage.setItem(CATCHUP_DISMISS_KEY, localDateStr(Date.now()));
        renderDayIntro();
      });
    }
    if (!list || list.length === 0) return;
    container.querySelectorAll('[data-catchup-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const settings = getSettings();
        const routine = settings.routines?.find(r => r.id === btn.dataset.catchupId);
        if (routine) startRoutine(routine);
      });
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

  // Wire the mobility card's "Start mobility flow" button, where present. The
  // flow is a followed-along stepper (mobility-flow.js) — not logged and not part
  // of the recovery model — so it just takes over the screen and returns to the
  // day intro when done. Keep the screen awake while it runs.
  function wireMobilityFlow() {
    const btn = container.querySelector('#start-mobility-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      enableWakeLock();
      mountMobilityFlow(container, allMobility(), () => {
        disableWakeLock();
        renderDayIntro();
      });
    });
  }

  function renderDayIntro() {
    disableWakeLock(); // not in a session on the intro screen
    const settings = getSettings();
    const scheduled = getScheduledRoutine(settings);
    const history = store.getHistory();
    const catchUpList = catchUpToShow(history);
    const catchUp = catchUpCardHtml(catchUpList);
    const restoreBanner = restoreBannerHtml(history.length === 0);
    const deloadBanner = deloadBannerHtml(history);

    if (!scheduled) {
      container.innerHTML = `
        ${restoreBanner}
        ${deloadBanner}
        <div class="card">
          <span class="muted">Today</span>
          <h2>Rest Day</h2>
          <p class="muted">No workout scheduled for today. Recovery in progress.</p>
        </div>
        ${catchUp}
        ${mobilityCardHtml()}
      `;
      wireCatchUp(catchUpList);
      wireDeload();
      wireRestore();
      wireMobilityFlow();
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
        ${deloadBanner}
        <div class="card today-done" style="border-left:4px solid var(${escapeHtml(routine.colorVar)})">
          <span class="muted">Today · done ✓</span>
          <h2>${escapeHtml(routine.name)} complete</h2>
          <p class="muted" style="margin-top:6px">${plural((doneToday.exercises ?? []).length, 'exercise')} · ${plural(totalSets, 'set')}${mins ? ` · ${mins} min` : ''}</p>
          <p class="muted" style="margin-top:10px;font-size:13px">Nice work — recovery is underway. Check the Recovery tab for muscle status.</p>
          <button class="btn-secondary" id="repeat-workout-btn" style="margin-top:12px">Train it again</button>
        </div>
        ${catchUp}
      `;
      container.querySelector('#repeat-workout-btn').addEventListener('click', () => startRoutine(routine));
      wireCatchUp(catchUpList);
      wireDeload();
      wireRestore();
      return;
    }

    const { readiness, perMuscle } = routineReadiness(routine, settings, history);
    container.innerHTML = `
      ${restoreBanner}
      ${deloadBanner}
      <div class="card" style="border-left:4px solid var(${escapeHtml(routine.colorVar)})">
        <span class="muted">Up next</span>
        <h2>${escapeHtml(routine.name)}</h2>
        <p class="muted">${escapeHtml(routine.tag)}</p>
        <p class="muted" style="margin-top:10px">${plural(exercises.length, 'exercise')}</p>
        ${buildReadinessBlock(readiness, perMuscle)}
        ${buildAdaptiveBlock(readiness, perMuscle)}
        <button class="btn-primary" id="start-workout-btn">Start Workout</button>
      </div>
      ${catchUp}
      ${routine.id === 'recovery-walk' ? mobilityCardHtml() : ''}
    `;
    container.querySelector('#start-workout-btn').addEventListener('click', () => startRoutine(routine));
    wireCatchUp(catchUpList);
    wireDeload();
    wireRestore();
    wireMobilityFlow();
  }

  function getLastSetsForExercise(exerciseId, history) {
    for (let i = history.length - 1; i >= 0; i--) {
      const ex = history[i].exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) return ex.sets;
    }
    return null;
  }

  // Walks the routine as "steps": a step is one exercise, or a superset of two
  // adjacent ones (see supersets.js). `exerciseIndex` is any exercise position
  // within the current step — it snaps to the step start — so the saved-session
  // shape is unchanged and resume stays backward-compatible.
  function renderExerciseFlow(routineId, exerciseIndex, loggedExercises, startedAt) {
    const settings = getSettings();
    const routine = settings.routines?.find(r => r.id === routineId);
    if (!routine) {
      clearInProgressSession();
      renderDayIntro();
      return;
    }

    // In-flow substitutions: a per-position override map, persisted on the
    // session, swaps an exercise for a same-muscle alternative just for today.
    const substitutions = readInProgressSession()?.substitutions ?? {};
    const exercises = (routine.exerciseIds ?? [])
      .map((id, i) => {
        const overrideId = substitutions[i];
        const resolvedId = overrideId ?? id;
        return settings.exercises?.find(e => e.id === resolvedId)
          ?? settings.exercises?.find(e => e.id === id);
      })
      .filter(Boolean);

    if (exerciseIndex >= exercises.length) {
      renderSummary(routineId, routine, loggedExercises, startedAt);
      return;
    }

    pushFlowState(); // arm the Back-gesture guard while a workout is on screen

    // Superset pairs are declared by ORIGINAL exercise id (supersets.js). When a
    // side has been swapped, remap each declared pair onto the resolved ids at the
    // same positions so an in-superset swap keeps the two paired instead of
    // dissolving the superset into two singles.
    const origIds = routine.exerciseIds ?? [];
    const resolvedIds = exercises.map(e => e.id);
    const effectiveSupersets = (routine.supersets ?? []).map(pair =>
      pair.map(id => {
        const pos = origIds.indexOf(id);
        return pos >= 0 && resolvedIds[pos] ? resolvedIds[pos] : id;
      })
    );

    // Group into steps over the RESOLVED list so indices line up with `exercises`.
    const steps = buildFlowSteps({ exerciseIds: resolvedIds, supersets: effectiveSupersets })
      .map(s => ({ indices: s.exerciseIds.map(id => exercises.findIndex(e => e.id === id)) }));
    const stepPos = Math.max(0, steps.findIndex(st => st.indices.includes(exerciseIndex)));
    const step = steps[stepPos];
    const firstIndex = step.indices[0];
    const lastIndex = step.indices[step.indices.length - 1];
    const nextIndex = lastIndex + 1;
    const prevFirstIndex = stepPos > 0 ? steps[stepPos - 1].indices[0] : null;
    const isSuperset = step.indices.length === 2;

    enableWakeLock(); // keep the screen on while training
    const history = store.getHistory();

    // The header lives OUTSIDE the card slot so the Previous/End controls survive
    // the card re-rendering its own innerHTML on every logged set.
    container.innerHTML = `
      <div class="exercise-flow-header">
        ${prevFirstIndex !== null ? '<button class="exercise-back-btn" id="exercise-back-btn">← Previous</button>' : '<span></span>'}
        <span class="exercise-progress">${isSuperset ? 'Superset' : 'Exercise'} ${stepPos + 1} of ${steps.length}</span>
        <button class="exercise-end-btn" id="exercise-end-btn" title="End this workout">✕ End</button>
      </div>
      ${firstIndex === 0 ? primerHtml(routine) : ''}
      <div class="card" id="exercise-card-slot"></div>
      ${isSuperset ? '' : '<div id="swap-slot"></div>'}
    `;
    const slot = container.querySelector('#exercise-card-slot');
    if (!isSuperset) wireSwapControl(container.querySelector('#swap-slot'), exercises[firstIndex], firstIndex);

    // Fold logged entries for this step's exercises back into the flat
    // loggedExercises array (indexed by exercise position).
    function writeEntries(base, entries) {
      const updated = base.slice();
      for (const idx of step.indices) {
        const ex = exercises[idx];
        const entry = (entries ?? []).find(e => e.exerciseId === ex.id);
        if (entry && entry.sets.length > 0) updated[idx] = entry;
      }
      return updated;
    }

    const advance = (updated) => {
      const state = { routineId, exerciseIndex: nextIndex, loggedExercises: updated, startedAt };
      saveInProgressSession(state);
      renderExerciseFlow(routineId, nextIndex, updated, startedAt);
    };

    // `snapshot()` returns loggedExercises with anything on-screen folded in, for
    // the End prompt and the Previous control.
    let snapshot;

    // Same-muscle swap alternatives for a position, excluding anything already
    // in today's session (a duplicate id would collide in the step-index mapping).
    function swapOptionsFor(index) {
      const presentIds = new Set(exercises.map(e => e.id));
      return substituteOptions(exercises[index], settings.exercises)
        .filter(o => !presentIds.has(o.id))
        .slice(0, 8)
        .map(o => ({ id: o.id, name: o.name }));
    }

    // Record a per-position substitution for this session and restart the step on
    // the swapped-in exercise. Shared by the single-card and superset swaps.
    function applySwap(index, newId) {
      const saved = readInProgressSession() ?? {};
      const subs = { ...(saved.substitutions ?? {}), [index]: newId };
      const updated = loggedExercises.slice();
      updated[index] = undefined; // fresh start on the swapped-in exercise
      saveInProgressSession({ routineId, exerciseIndex: firstIndex, loggedExercises: updated, startedAt, substitutions: subs });
      renderExerciseFlow(routineId, firstIndex, updated, startedAt);
    }

    if (isSuperset) {
      const [exA, exB] = step.indices.map(i => exercises[i]);
      const prev = [getLastSetsForExercise(exA.id, history), getLastSetsForExercise(exB.id, history)];
      const init = [loggedExercises[step.indices[0]]?.sets ?? null, loggedExercises[step.indices[1]]?.sets ?? null];
      const stall = [stallCount(history, exA.id), stallCount(history, exB.id)];
      const card = mountSupersetCard(slot, exA, exB, prev, init,
        (entries) => advance(writeEntries(loggedExercises, entries)),
        {
          stall,
          // Persist mid-superset progress so a reload restores both sets and the rest clock.
          onSetsChange: (entries) => {
            const updated = writeEntries(loggedExercises, entries);
            saveInProgressSession({ routineId, exerciseIndex: firstIndex, loggedExercises: updated, startedAt });
          },
          swapOptions: step.indices.map(swapOptionsFor),
          onSwap: (side, newId) => applySwap(step.indices[side], newId),
        });
      snapshot = () => writeEntries(loggedExercises, card.snapshotEntries());
    } else {
      const exercise = exercises[firstIndex];
      const lastSets = getLastSetsForExercise(exercise.id, history);
      const alreadyLogged = loggedExercises[firstIndex]?.sets ?? null;
      const stall = stallCount(history, exercise.id);
      const card = mountExerciseCard(slot, exercise, lastSets, alreadyLogged, (sets) => {
        const updated = loggedExercises.slice();
        updated[firstIndex] = { exerciseId: exercise.id, name: exercise.name, sets };
        advance(updated);
      }, {
        stallCount: stall,
        // Persist mid-exercise progress so a reload restores both sets and the rest clock.
        onSetsChange: (sets) => {
          const updated = loggedExercises.slice();
          updated[firstIndex] = { exerciseId: exercise.id, name: exercise.name, sets };
          saveInProgressSession({ routineId, exerciseIndex: firstIndex, loggedExercises: updated, startedAt });
        },
      });
      snapshot = () => {
        const updated = loggedExercises.slice();
        const current = card.getLoggedSets();
        if (current.length > 0) updated[firstIndex] = { exerciseId: exercise.id, name: exercise.name, sets: current };
        return updated;
      };
    }

    const endBtn = container.querySelector('#exercise-end-btn');
    if (endBtn) {
      endBtn.addEventListener('click', () => {
        renderEndPrompt(routineId, routine, snapshot(), startedAt, firstIndex);
      });
    }

    const backBtn = container.querySelector('#exercise-back-btn');
    if (backBtn && prevFirstIndex !== null) {
      backBtn.addEventListener('click', () => {
        const updated = snapshot();
        const state = { routineId, exerciseIndex: prevFirstIndex, loggedExercises: updated, startedAt };
        saveInProgressSession(state);
        renderExerciseFlow(routineId, prevFirstIndex, updated, startedAt);
      });
    }

    // In-flow swap: offer same-muscle alternatives from the pool and, on pick,
    // record a per-position override for this session and restart the step on
    // the new exercise. Only shown for single-exercise steps.
    function wireSwapControl(swapSlot, exercise, index) {
      if (!swapSlot || !exercise) return;
      const options = swapOptionsFor(index);
      if (options.length === 0) return;

      let open = false;
      const draw = () => {
        swapSlot.innerHTML = `
          <button class="swap-toggle" id="swap-toggle-btn">⇄ Swap exercise</button>
          ${open ? `
            <div class="swap-picker">
              <div class="muted swap-picker-hint">Same-muscle alternatives — just for today</div>
              ${options.map(o => `<button class="swap-option" data-swap-id="${escapeHtml(o.id)}">${escapeHtml(o.name)}</button>`).join('')}
            </div>` : ''}
        `;
        swapSlot.querySelector('#swap-toggle-btn').addEventListener('click', () => { open = !open; draw(); });
        swapSlot.querySelectorAll('[data-swap-id]').forEach(btn => {
          btn.addEventListener('click', () => applySwap(index, btn.dataset.swapId));
        });
      };
      draw();
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
      clearPendingRest();
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
    clearPendingRest();

    container.innerHTML = `
      <div class="card">
        <h2>Workout Complete</h2>
        <p class="muted">${escapeHtml(routine.name)} — ${logged.length} exercises, ${totalSets} sets, ${minutes} min</p>
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
