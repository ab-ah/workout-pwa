import { mountRestTimer } from './rest-timer.js';
import { mountWorkoutTimer, buildPhases } from './workout-timer.js';
import { suggestProgression, parseTopReps, prescribeRpe, recommendLoad, isDistanceBased } from '../progression.js';
import { warmupSets, HEAVY_BARBELL_LIFTS } from '../warmup.js';
import { bestE1RM, loadForReps, roundLoad } from '../one-rep-max.js';
import { getDeloadMode, deloadSetTarget } from '../deload-mode.js';
import { unlockAudio } from '../audio.js';
import { ensureNotifyPermission } from '../notify.js';
import { getPendingRestSeconds, clearPendingRest } from '../rest-persist.js';
import { stepperHtml, wireSteppers } from './stepper.js';
import { escapeHtml } from '../escape.js';
import { demoMediaHtml } from './demo-media.js';

/**
 * Renders one exercise with its sets into `container`.
 * `exercise` = { id, name, setsCount, repRange, restSeconds, startWeight, gifUrl,
 *   timer? } — `timer`, when present, shows a start/pause cardio countdown
 *   (interval work/rest cycling or a plain duration walk); see workout-timer.js.
 * `previousSets` = sets from the last time this exercise was done (for defaults
 *   and the progression hint), or null.
 * `initialSets` = sets already logged for this exercise THIS session (present
 *   when the user navigated back to edit, or restored after a reload), pre-filled
 *   as logged rows, or null.
 * `onExerciseComplete(loggedSets)` fires once the user taps "Mark Exercise
 *   Complete". `loggedSets` = [{ weight, reps }, ...].
 * `coach` = { stallCount?, onSetsChange? } — onSetsChange(sets) fires after every
 *   logged/edited set so the caller can persist mid-exercise progress (so a
 *   reload mid-exercise restores both the sets and the rest clock).
 */
// Heavy multi-joint barbell lifts where a warm-up ramp actually matters. Shared
// with warmup.js (which also uses the set for the routine-level movement primer)
// rather than sniffing the startWeight hint for "bar", because e.g. a preacher
// curl is a bar lift but too light to warrant ramp sets.
const BARBELL_WARMUP = HEAVY_BARBELL_LIFTS;

// Heavy dumbbell compounds also deserve a ramp, but the load is per hand, so the
// primer floor and increment differ from a barbell (see coachingBlock).
const DUMBBELL_WARMUP = new Set([
  'incline-dumbbell-press',
  'seated-dumbbell-shoulder-press',
  'dumbbell-romanian-deadlift',
  'dumbbell-push-press',
  'one-arm-dumbbell-row',
  'bulgarian-split-squat',
]);

// Exercises trained one side at a time — the logged weight × reps is PER SIDE,
// which the card makes explicit so entries and the e1RM/progression math agree.
const UNILATERAL_EXERCISES = new Set([
  'bulgarian-split-squat',
  'dumbbell-reverse-lunge',
  'one-arm-dumbbell-row',
  'renegade-row',
  'side-plank',
]);

/** 'barbell' | 'dumbbell' | null — which warm-up ramp style, if any. */
function warmupKind(exercise) {
  if (BARBELL_WARMUP.has(exercise.id)) return 'barbell';
  if (DUMBBELL_WARMUP.has(exercise.id)) return 'dumbbell';
  return null;
}

function isUnilateral(exercise) {
  return UNILATERAL_EXERCISES.has(exercise.id);
}

// Isometric holds — timed, not weight/reps. Logged as a single duration field.
const HOLD_EXERCISES = new Set(['plank', 'side-plank']);

/** Which fields the set-logger should show: 'cardio' (timer-driven treadmill
 *  work — duration + effort RPE), 'hold' (isometric — duration only), or the
 *  default 'strength' (weight x reps). Exported so history.js can exclude
 *  duration-based exercises from the weight/e1RM progress chart. */
export function exerciseLogMode(exercise) {
  if (exercise.timer) return 'cardio';
  if (HOLD_EXERCISES.has(exercise.id)) return 'hold';
  return 'strength';
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

/** Total planned seconds across every phase of a cardio timer, used as the
 *  duration field's default before any history exists. */
function cardioDefaultSeconds(exercise) {
  if (!exercise.timer) return null;
  return buildPhases(exercise.timer).reduce((sum, p) => sum + p.seconds, 0);
}

/** First number in a string like "50–60 kg bar" → 50, else null. */
function firstNumber(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Best guess of today's working weight: last session's heaviest set, falling
 *  back to the low end of the startWeight hint. Used to seed the warm-up ramp. */
function estimateWorkingWeight(exercise, previousSets) {
  if (Array.isArray(previousSets) && previousSets.length) {
    const top = Math.max(...previousSets.map(s => Number(s.weight) || 0));
    if (top > 0) return top;
  }
  return firstNumber(exercise.startWeight);
}

/** Warm-up + estimated-1RM guidance block for heavy compounds (HTML string). */
export function coachingBlock(exercise, previousSets) {
  const kind = warmupKind(exercise);
  if (!kind) return '';
  const working = estimateWorkingWeight(exercise, previousSets);
  if (!working) return '';

  // Dumbbell loads are per hand: ramp from a light DB (not an empty 20 kg bar)
  // and step by 2 kg; barbell work ramps from the empty bar by 2.5 kg.
  const perHand = kind === 'dumbbell';
  const barWeight = perHand ? 6 : 20;
  const increment = perHand ? 2 : 2.5;
  const unit = perHand ? ' / hand' : '';

  const ramp = warmupSets(working, { barWeight, increment });
  const rampHtml = ramp
    .map(s => `<span class="warmup-set">${s.weight}kg × ${s.reps}</span>`)
    .join('<span class="warmup-arrow">→</span>');

  const e1rm = bestE1RM(previousSets);
  const top = parseTopReps(exercise.repRange);
  let target = '';
  if (e1rm && top) {
    // loadForReps(e1rm, top) is the load you'd fail at exactly `top` reps. Show
    // the load for a couple more reps instead, so the target leaves ~2 in reserve
    // rather than telling you to grind to failure every session.
    const targetLoad = roundLoad(loadForReps(e1rm, top + 2), increment);
    target = `<div class="coach-e1rm">Est. 1RM ~${Math.round(e1rm)}kg${unit} · work ~${targetLoad}kg${unit} for ${top} (≈2 in reserve)</div>`;
  }

  return `
    <details class="warmup-block">
      <summary>🔥 Warm-up to ${working}kg${unit}</summary>
      <div class="warmup-sets">${rampHtml}</div>
      ${target}
    </details>
  `;
}

/** Form-cue + prescribed-RPE guidance for an exercise (HTML string). Shared by
 *  the single-exercise and superset cards so both prescribe effort, not just log
 *  it, and surface the same technique cue. */
export function cueTargetBlock(exercise) {
  const rpe = prescribeRpe(exercise);
  const cueHtml = exercise.cue
    ? `<p class="exercise-cue">📝 ${escapeHtml(exercise.cue)}</p>`
    : '';
  const rpeHtml = rpe
    ? `<p class="rpe-target">🎯 ${rpe.text}</p>`
    : '';
  return cueHtml + rpeHtml;
}

/** Prominent "use this weight today" chip, computed from the previous session's
 *  weights, reps and RPE (see progression.recommendLoad). Empty for bodyweight /
 *  time work or when there's no loaded history yet. Shared by both cards. */
export function recommendedWeightBlock(exercise, previousSets) {
  const rec = recommendLoad(previousSets, exercise.repRange, { weightStep: exercise.weightStep });
  if (!rec) return '';
  const rpeNote = rec.avgRpe != null
    ? ` <span class="weight-rec-note">from last RPE ${Math.round(rec.avgRpe * 10) / 10}</span>`
    : '';
  return `<p class="weight-rec">🏋 <span class="weight-rec-label">Recommended</span> <strong>${rec.weight}kg × ${rec.reps}</strong>${rpeNote}</p>`;
}

export function mountExerciseCard(container, exercise, previousSets, initialSets, onExerciseComplete, coach = {}) {
  // One-tap deload week: cap this exercise's working sets while a deload is
  // active (see deload-mode.js), holding the weights but trimming ~40% of volume.
  const deload = getDeloadMode();
  const effectiveSetsCount = deload.active
    ? Math.min(exercise.setsCount, deloadSetTarget(exercise.setsCount))
    : exercise.setsCount;
  const rpePlaceholder = prescribeRpe(exercise)?.placeholder ?? '';
  const perSide = isUnilateral(exercise);
  const sideTag = perSide ? ' <span class="set-side">/side</span>' : '';
  const weightStep = Number.isFinite(exercise.weightStep) ? exercise.weightStep : 2.5;
  const mode = exerciseLogMode(exercise); // 'strength' | 'cardio' | 'hold'
  // A loaded carry (Farmer's Carry) is logged in metres, not reps — label the
  // field and the logged-set text as distance so "Reps" and "28kg x 40" don't
  // read as reps of metres. Only meaningful in strength mode.
  const repUnit = (mode === 'strength' && isDistanceBased(exercise.repRange)) ? 'm' : '';
  const repsLabel = repUnit ? 'Distance (m)' : 'Reps';
  const defaultCardioSeconds = mode === 'cardio' ? cardioDefaultSeconds(exercise) : null;
  const loggedSets = Array.isArray(initialSets) ? initialSets.map(s => ({ ...s })) : [];
  let activeSetIndex = loggedSets.length;
  let editingIndex = null; // index of a logged set being corrected, or null
  let timerHandle = null;
  let workoutTimerHandle = null;
  let completed = false;
  let restActive = false;
  // Track which set we last scrolled to, so a new active set is brought into
  // view on a phone without yanking the page on every keystroke re-render.
  let lastScrolledSetIndex = -1;
  // The active-set inputs are pre-filled with the previous set's values as a
  // convenience. We only auto-log that row on "Finish Early" if the user has
  // actually typed (or stepped) into it — otherwise re-completing would silently
  // duplicate the last set.
  let activeDirty = false;

  // ── Static shell (built ONCE) ──────────────────────────────────────────────
  // Name, GIF and coaching never change during the exercise, so they live
  // outside the re-rendered region. Keeping the GIF node in place means logging
  // a set no longer wipes and re-creates it — the demo animation stops jumping
  // back to frame 0 on every log.
  // Weight/reps progression coaching only means something for loaded strength
  // work — a duration walk or a hold has no "top weight" to jump, so skip it
  // rather than let suggestProgression fall back to nonsense reps-of-zero text.
  const progHint = mode === 'strength'
    ? suggestProgression(previousSets, exercise.repRange, { weightStep: exercise.weightStep, stallCount: coach.stallCount })
    : null;
  const unilateralNote = mode === 'hold'
    ? '↔ One side at a time — log the hold time for a single side.'
    : '↔ One side at a time — log the weight &amp; reps for a single side.';
  container.innerHTML = `
    <div class="exercise-progress" id="exercise-progress"></div>
    <div class="exercise-name">${escapeHtml(exercise.name)}</div>
    ${demoMediaHtml({ gifUrl: exercise.gifUrl, className: 'exercise-gif', name: exercise.name, zoomable: true })}
    <p class="muted">${escapeHtml(exercise.repRange)}${mode === 'strength' && !repUnit ? ' reps' : ''} · rest ${exercise.restSeconds}s · start ~${escapeHtml(String(exercise.startWeight ?? ''))}</p>
    ${perSide ? `<p class="muted unilateral-note">${unilateralNote}</p>` : ''}
    ${deload.active ? `<p class="deload-tag">🌙 Deload week — ${effectiveSetsCount} of ${exercise.setsCount} sets, hold the weight</p>` : ''}
    ${mode === 'strength' ? recommendedWeightBlock(exercise, previousSets) : ''}
    ${progHint ? `<p class="progression-hint">💡 ${escapeHtml(progHint.text)}</p>` : ''}
    ${cueTargetBlock(exercise)}
    ${coachingBlock(exercise, previousSets)}
    ${exercise.timer ? '<div id="workout-timer-slot"></div>' : ''}
    <div id="exercise-dynamic"></div>
  `;

  const dynamicRoot = container.querySelector('#exercise-dynamic');

  // Cardio countdown (workout-timer.js) is mounted once here (not in the dynamic
  // region) so logging its single set never restarts the clock.
  if (exercise.timer) {
    workoutTimerHandle = mountWorkoutTimer(container.querySelector('#workout-timer-slot'), exercise.timer, () => {});
  }

  /** Fields for the active/edit row, keyed by mode. Strength keeps its existing
   *  weight+reps+RPE fields; cardio logs duration (minutes) + effort RPE; a hold
   *  logs duration (seconds) alone — none of the three share a data shape, so
   *  each renders its own field-row markup. */
  function fieldsHtml({ idPrefix, defaultWeight, defaultReps, defaultRpe, defaultDurationSeconds }) {
    if (mode === 'strength') {
      return `
        <div class="field-row">
          <label class="input-label">Weight (kg)</label>
          ${stepperHtml(`<input type="number" inputmode="decimal" class="set-input" id="${idPrefix}weight-input" placeholder="${escapeHtml(String(exercise.startWeight ?? 'kg'))}" value="${defaultWeight ?? ''}">`, { step: weightStep, label: 'weight' })}
        </div>
        <div class="field-row">
          <label class="input-label">${repsLabel}</label>
          ${stepperHtml(`<input type="number" inputmode="numeric" class="set-input" id="${idPrefix}reps-input" placeholder="${escapeHtml(String(exercise.repRange ?? ''))}" value="${defaultReps ?? ''}">`, { step: 1, label: repUnit ? 'distance' : 'reps' })}
        </div>
        <div class="field-row rpe-field">
          <label class="input-label">RPE (optional)</label>
          ${stepperHtml(`<input type="number" inputmode="decimal" step="0.5" class="set-input set-input-rpe" id="${idPrefix}rpe-input" placeholder="${rpePlaceholder || '—'}" value="${defaultRpe ?? ''}">`, { step: 0.5, min: 1, max: 10, label: 'RPE' })}
        </div>
      `;
    }
    if (mode === 'cardio') {
      const defaultMinutes = Number.isFinite(defaultDurationSeconds) ? Math.round(defaultDurationSeconds / 60) : '';
      const placeholderMinutes = Number.isFinite(defaultCardioSeconds) ? Math.round(defaultCardioSeconds / 60) : '';
      return `
        <div class="field-row">
          <label class="input-label">Duration (min)</label>
          ${stepperHtml(`<input type="number" inputmode="numeric" class="set-input" id="${idPrefix}duration-input" placeholder="${placeholderMinutes}" value="${defaultMinutes}">`, { step: 1, min: 1, label: 'duration' })}
        </div>
        <div class="field-row rpe-field">
          <label class="input-label">Effort RPE</label>
          ${stepperHtml(`<input type="number" inputmode="decimal" step="0.5" class="set-input set-input-rpe" id="${idPrefix}rpe-input" placeholder="${rpePlaceholder || '—'}" value="${defaultRpe ?? ''}">`, { step: 0.5, min: 1, max: 10, label: 'RPE' })}
        </div>
      `;
    }
    // hold
    return `
      <div class="field-row">
        <label class="input-label">Duration (sec)</label>
        ${stepperHtml(`<input type="number" inputmode="numeric" class="set-input" id="${idPrefix}duration-input" value="${defaultDurationSeconds ?? ''}">`, { step: 5, min: 5, label: 'duration' })}
      </div>
    `;
  }

  /** Human-readable summary of a logged set, keyed by mode. */
  function formatLoggedSet(s) {
    const rpeTag = Number.isFinite(s.rpe) ? ` <span class="set-rpe">@${s.rpe}</span>` : '';
    if (mode === 'cardio') return `${formatDuration(s.durationSeconds)}${rpeTag}`;
    if (mode === 'hold') return `${s.durationSeconds}s${sideTag}`;
    return `${s.weight}kg x ${s.reps}${repUnit}${sideTag}${rpeTag}`;
  }

  function setRowHtml(i) {
    if (editingIndex === i) {
      const s = loggedSets[i] ?? {};
      return `
        <div class="set-row active" id="edit-set-row">
          <span class="set-label">Set ${i + 1}</span>
          ${fieldsHtml({ idPrefix: 'edit-', defaultWeight: s.weight, defaultReps: s.reps, defaultRpe: s.rpe, defaultDurationSeconds: s.durationSeconds })}
          <button class="btn-primary" id="edit-save-btn">Save</button>
        </div>
      `;
    }
    if (i < loggedSets.length) {
      const s = loggedSets[i];
      return `<div class="set-row done editable" data-edit-index="${i}" title="Tap to correct"><span class="set-label">Set ${i + 1}</span><span>${formatLoggedSet(s)} <span class="set-edit-hint">✎</span></span></div>`;
    }
    if (i === activeSetIndex && editingIndex === null) {
      const prevSessionSet = previousSets ? previousSets[activeSetIndex] ?? previousSets[previousSets.length - 1] : null;
      const prevLoggedSet = loggedSets.length > 0 ? loggedSets[loggedSets.length - 1] : null;
      // Weight falls back to the exercise's start-weight hint on the first-ever
      // set (no logged or prior-session set to inherit), so a loaded lift never
      // opens with an empty weight field the user has to fill from scratch.
      const startWeightGuess = mode === 'strength' ? firstNumber(exercise.startWeight) : null;
      const defaultWeight = prevLoggedSet?.weight ?? prevSessionSet?.weight ?? startWeightGuess ?? '';
      const defaultReps   = prevLoggedSet?.reps   ?? prevSessionSet?.reps   ?? '';
      // RPE prefills like weight/reps so the previous effort is visible (it was
      // already inherited on Log, but the field showed blank — looked ignored).
      const defaultRpe    = prevLoggedSet?.rpe    ?? prevSessionSet?.rpe    ?? '';
      const defaultDurationSeconds = prevLoggedSet?.durationSeconds ?? prevSessionSet?.durationSeconds
        ?? (mode === 'cardio' ? defaultCardioSeconds : null);
      // The active row is still pre-filled with last set's values as a convenience,
      // but the button always reads a plain "Log" — the previous "Log same ↻"
      // wording (and its repeat hint) read as a separate action to some users.
      return `
        <div class="set-row active" id="active-set-row">
          <span class="set-label">Set ${i + 1}</span>
          ${fieldsHtml({ idPrefix: '', defaultWeight, defaultReps, defaultRpe, defaultDurationSeconds })}
          <button class="btn-primary" id="log-set-btn" ${restActive ? 'disabled style="opacity:.45"' : ''}>Log</button>
        </div>
      `;
    }
    return `<div class="set-row"><span class="set-label">Set ${i + 1}</span><span class="muted">—</span></div>`;
  }

  function completeBtnHtml() {
    const allSetsDone = loggedSets.length >= effectiveSetsCount;
    // "Finish Early" is a distinct amber outline so it never looks like the
    // accent Log button; "Mark Complete" (all sets in) stays the solid accent.
    const cls = allSetsDone ? 'btn-primary' : 'btn-primary finish-early';
    const label = allSetsDone
      ? 'Mark Exercise Complete →'
      : `Finish Early (${loggedSets.length}/${effectiveSetsCount} sets) →`;
    return `<button class="${cls}" id="complete-exercise-btn">${label}</button>`;
  }

  // ── Dynamic region (re-rendered on every logged/edited set) ────────────────
  function render() {
    // Stop any running rest timer before wiping the dynamic DOM — prevents a
    // leaked interval continuing to tick after innerHTML is replaced.
    if (timerHandle) {
      timerHandle.stop();
      timerHandle = null;
    }

    const rows = [];
    for (let i = 0; i < effectiveSetsCount; i++) rows.push(setRowHtml(i));

    // Rest timer renders ABOVE the set rows so its countdown is on-screen the
    // moment a set is logged. Placed after the rows it was pushed below the fold
    // on a phone (the tall active-entry row filled the viewport), which hid the
    // most-repeated feedback in the app.
    dynamicRoot.innerHTML = `
      <div id="rest-timer-slot"></div>
      <div id="set-rows">${rows.join('')}</div>
      ${completeBtnHtml()}
    `;

    wireSteppers(dynamicRoot);

    const logBtn = dynamicRoot.querySelector('#log-set-btn');
    if (logBtn) {
      logBtn.addEventListener('click', handleLogSet);
      const markDirty = () => { activeDirty = true; };
      if (mode === 'strength') {
        dynamicRoot.querySelector('#weight-input')?.addEventListener('input', markDirty);
        dynamicRoot.querySelector('#reps-input')?.addEventListener('input', markDirty);
      } else {
        dynamicRoot.querySelector('#duration-input')?.addEventListener('input', markDirty);
      }
    }

    // Tap a logged set to correct it.
    dynamicRoot.querySelectorAll('[data-edit-index]').forEach(row => {
      row.addEventListener('click', () => {
        // Cancel any pending rest so the editor isn't stuck behind a disabled Log.
        if (timerHandle) { timerHandle.stop(); timerHandle = null; }
        if (restActive) { restActive = false; clearPendingRest(); }
        editingIndex = +row.dataset.editIndex;
        render();
      });
    });

    const editSaveBtn = dynamicRoot.querySelector('#edit-save-btn');
    if (editSaveBtn) {
      editSaveBtn.addEventListener('click', handleSaveEdit);
    }

    const completeBtn = dynamicRoot.querySelector('#complete-exercise-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        if (completed) return;
        // Discard an in-progress correction rather than blocking completion.
        if (editingIndex !== null) { editingIndex = null; render(); return; }
        if (!captureActiveSetIfFilled()) return;
        completed = true;
        clearPendingRest(); // no rest carries past a completed exercise
        onExerciseComplete([...loggedSets]);
      });
    }

    // Bring the active input row into view when a new set becomes active, so the
    // Log field is never stranded below the fold mid-workout. Once every set is
    // logged there's no active row — fall back to the Complete button so finishing
    // the exercise gets the same auto-scroll instead of leaving it below the fold.
    if (!restActive && editingIndex === null && activeSetIndex !== lastScrolledSetIndex) {
      lastScrolledSetIndex = activeSetIndex;
      // Honour the OS "reduce motion" setting — jump instead of smooth-scrolling.
      const reduceMotion = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scrollTarget = dynamicRoot.querySelector('#active-set-row')
        ?? dynamicRoot.querySelector('#complete-exercise-btn');
      scrollTarget?.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  /** Optional RPE from an input; returns { rpe } to spread onto a set, or {}. */
  function readRpe(input) {
    if (!input) return {};
    const raw = input.value.trim();
    if (raw === '') return {};
    const rpe = parseFloat(raw);
    if (!Number.isFinite(rpe) || rpe <= 0) return {};
    return { rpe: Math.min(10, rpe) };
  }

  /** The set to inherit blank fields from: the last set logged this session,
   *  else the matching set from last session. Carries weight/reps/rpe. */
  function previousEntryFor(index) {
    const prevLoggedSet = loggedSets.length > 0 ? loggedSets[loggedSets.length - 1] : null;
    const prevSessionSet = previousSets ? (previousSets[index] ?? previousSets[previousSets.length - 1]) : null;
    return prevLoggedSet ?? prevSessionSet ?? null;
  }

  /** Notify the caller so mid-exercise progress can be persisted (survives a
   *  reload with both the logged sets and — via rest-persist — the rest clock). */
  function emitSetsChange() {
    coach.onSetsChange?.(loggedSets.map(s => ({ ...s })));
  }

  /** Build a strength set ({weight, reps, rpe?}) from the active row's inputs,
   *  inheriting any field left blank from `prev`. Returns null (and marks the
   *  offending inputs) if weight/reps can't be resolved. */
  function buildStrengthSet(prev, idPrefix) {
    const weightInput = dynamicRoot.querySelector(`#${idPrefix}weight-input`);
    const repsInput = dynamicRoot.querySelector(`#${idPrefix}reps-input`);
    let weight = parseFloat(weightInput.value);
    if (Number.isNaN(weight) && prev != null && Number.isFinite(Number(prev.weight))) weight = Number(prev.weight);
    let reps = parseInt(repsInput.value, 10);
    if (Number.isNaN(reps) && prev != null && Number.isFinite(Number(prev.reps))) reps = Number(prev.reps);
    if (Number.isNaN(weight) || Number.isNaN(reps)) {
      weightInput.style.borderColor = 'var(--push)';
      repsInput.style.borderColor = 'var(--push)';
      return null;
    }
    const typedRpe = readRpe(dynamicRoot.querySelector(`#${idPrefix}rpe-input`));
    const rpe = ('rpe' in typedRpe)
      ? typedRpe
      : (prev != null && Number.isFinite(Number(prev.rpe)) ? { rpe: Math.min(10, Number(prev.rpe)) } : {});
    return { weight, reps, ...rpe };
  }

  /** Build a cardio/hold set ({durationSeconds, rpe?}) from the active row's
   *  duration input (minutes for cardio, seconds for a hold), inheriting a
   *  blank field from `prev`. Returns null (and marks the input) if the
   *  duration can't be resolved. */
  function buildDurationSet(prev, idPrefix) {
    const durationInput = dynamicRoot.querySelector(`#${idPrefix}duration-input`);
    let raw = parseFloat(durationInput.value);
    if (Number.isNaN(raw) && prev != null && Number.isFinite(Number(prev.durationSeconds))) {
      raw = mode === 'cardio' ? Number(prev.durationSeconds) / 60 : Number(prev.durationSeconds);
    }
    if (Number.isNaN(raw) || raw <= 0) {
      durationInput.style.borderColor = 'var(--push)';
      return null;
    }
    const durationSeconds = Math.round(mode === 'cardio' ? raw * 60 : raw);
    if (mode !== 'cardio') return { durationSeconds };
    const typedRpe = readRpe(dynamicRoot.querySelector(`#${idPrefix}rpe-input`));
    const rpe = ('rpe' in typedRpe)
      ? typedRpe
      : (prev != null && Number.isFinite(Number(prev.rpe)) ? { rpe: Math.min(10, Number(prev.rpe)) } : {});
    return { durationSeconds, ...rpe };
  }

  function buildSetFromActiveRow(idPrefix) {
    const prev = previousEntryFor(activeSetIndex);
    return mode === 'strength' ? buildStrengthSet(prev, idPrefix) : buildDurationSet(prev, idPrefix);
  }

  function handleLogSet() {
    // Unlock the shared audio context on this gesture so the rest-over beep can
    // fire even after the phone is backgrounded, and offer the notification once.
    unlockAudio();
    ensureNotifyPermission();

    const set = buildSetFromActiveRow('');
    if (!set) return;
    loggedSets.push(set);
    if (navigator.vibrate) navigator.vibrate(10); // subtle confirm tick
    activeSetIndex++;
    activeDirty = false; // fresh active row for the next set
    emitSetsChange();
    render();

    if (loggedSets.length < effectiveSetsCount) {
      restActive = true;
      render(); // re-render with Log button disabled
      const slot = dynamicRoot.querySelector('#rest-timer-slot');
      timerHandle = mountRestTimer(slot, exercise.restSeconds, () => {
        restActive = false;
        slot.innerHTML = '';
        render(); // re-enable Log button
      });
    }
  }

  function handleSaveEdit() {
    const set = mode === 'strength'
      ? buildStrengthSet(null, 'edit-')
      : buildDurationSet(null, 'edit-');
    if (!set) return;
    loggedSets[editingIndex] = set;
    editingIndex = null;
    emitSetsChange();
    render();
  }

  function captureActiveSetIfFilled() {
    if (restActive || loggedSets.length >= effectiveSetsCount) return true;
    // Only capture a set the user actually entered, not untouched pre-fill.
    if (!activeDirty) return true;

    if (mode === 'strength') {
      const weightInput = dynamicRoot.querySelector('#weight-input');
      const repsInput = dynamicRoot.querySelector('#reps-input');
      if (!weightInput || !repsInput) return true;
      if (weightInput.value.trim() === '' && repsInput.value.trim() === '') return true;
    } else {
      const durationInput = dynamicRoot.querySelector('#duration-input');
      if (!durationInput || durationInput.value.trim() === '') return true;
    }

    const set = buildSetFromActiveRow('');
    if (!set) return false;
    loggedSets.push(set);
    activeSetIndex++;
    emitSetsChange();
    return true;
  }

  render();

  // Restore a rest that was running when the app was reloaded/updated: if a
  // persisted rest is still ticking and this exercise has unfinished sets, bring
  // the countdown back with the correct remaining time. If everything's already
  // logged, the pending rest is stale — drop it.
  const pendingRest = getPendingRestSeconds();
  if (pendingRest > 0 && loggedSets.length > 0 && loggedSets.length < effectiveSetsCount) {
    restActive = true;
    render();
    const slot = dynamicRoot.querySelector('#rest-timer-slot');
    timerHandle = mountRestTimer(slot, pendingRest, () => {
      restActive = false;
      slot.innerHTML = '';
      render();
    });
  } else if (pendingRest > 0 && loggedSets.length >= effectiveSetsCount) {
    clearPendingRest();
  }

  return {
    /** Current logged sets (copy), so callers can persist edits on navigation. */
    getLoggedSets() {
      return loggedSets.map(s => ({ ...s }));
    },
    destroy() {
      if (timerHandle) {
        timerHandle.stop();
        timerHandle = null;
      }
      if (workoutTimerHandle) {
        workoutTimerHandle.stop();
        workoutTimerHandle = null;
      }
    }
  };
}
