import { mountRestTimer } from './rest-timer.js';
import { mountWorkoutTimer } from './workout-timer.js';
import { suggestProgression, parseTopReps } from '../progression.js';
import { warmupSets } from '../warmup.js';
import { bestE1RM, loadForReps, roundLoad } from '../one-rep-max.js';

/**
 * Renders one exercise with its sets into `container`.
 * `exercise` = { id, name, setsCount, repRange, restSeconds, startWeight, gifUrl,
 *   timer? } — `timer`, when present, shows a start/pause cardio countdown
 *   (interval work/rest cycling or a plain duration walk); see workout-timer.js.
 * `previousSets` = sets from the last time this exercise was done (for defaults
 *   and the progression hint), or null.
 * `initialSets` = sets already logged for this exercise THIS session (present
 *   when the user navigated back to edit), pre-filled as logged rows, or null.
 * `onExerciseComplete(loggedSets)` fires once the user taps "Mark Exercise
 *   Complete". `loggedSets` = [{ weight, reps }, ...].
 */
/** A barbell lift loads a full bar, so warm-up ramps make sense. Detected from
 *  the startWeight hint, which reads e.g. "50–60 kg bar" for barbell moves. */
function isBarbellLift(exercise) {
  return typeof exercise.startWeight === 'string' && /\bbar\b/i.test(exercise.startWeight);
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

/** Warm-up + estimated-1RM guidance block for barbell lifts (HTML string). */
function coachingBlock(exercise, previousSets) {
  if (!isBarbellLift(exercise)) return '';
  const working = estimateWorkingWeight(exercise, previousSets);
  if (!working) return '';

  const ramp = warmupSets(working, { barWeight: 20, increment: 2.5 });
  const rampHtml = ramp
    .map(s => `<span class="warmup-set">${s.weight}kg × ${s.reps}</span>`)
    .join('<span class="warmup-arrow">→</span>');

  const e1rm = bestE1RM(previousSets);
  const top = parseTopReps(exercise.repRange);
  let target = '';
  if (e1rm && top) {
    const load = roundLoad(loadForReps(e1rm, top), 2.5);
    target = `<div class="coach-e1rm">Est. 1RM ~${Math.round(e1rm)}kg · target ≈ ${load}kg for ${top} reps</div>`;
  }

  return `
    <details class="warmup-block">
      <summary>🔥 Warm-up to ${working}kg</summary>
      <div class="warmup-sets">${rampHtml}</div>
      ${target}
    </details>
  `;
}

export function mountExerciseCard(container, exercise, previousSets, initialSets, onExerciseComplete) {
  const loggedSets = Array.isArray(initialSets) ? initialSets.map(s => ({ ...s })) : [];
  let activeSetIndex = loggedSets.length;
  let editingIndex = null; // index of a logged set being corrected, or null
  let timerHandle = null;
  // Cardio countdown (workout-timer.js) is independent of the rest timer above.
  // It is (re)mounted fresh on every render(), same as the rest timer; in
  // practice a cardio exercise's card only re-renders once (after its single
  // set is logged), by which point the countdown has already finished.
  let workoutTimerHandle = null;
  let completed = false;
  let restActive = false;
  // The active-set inputs are pre-filled with the previous set's values as a
  // convenience. We only auto-log that row on "Finish Early" if the user has
  // actually typed into it — otherwise re-completing (e.g. after going back)
  // would silently duplicate the last set.
  let activeDirty = false;

  function render() {
    // Stop any running rest timer before wiping the DOM — prevents a leaked
    // interval continuing to tick after innerHTML is replaced.
    if (timerHandle) {
      timerHandle.stop();
      timerHandle = null;
    }
    if (workoutTimerHandle) {
      workoutTimerHandle.stop();
      workoutTimerHandle = null;
    }

    const rows = [];
    for (let i = 0; i < exercise.setsCount; i++) {
      if (editingIndex === i) {
        const s = loggedSets[i] ?? {};
        rows.push(`
          <div class="set-row active" id="edit-set-row">
            <span class="set-label">Set ${i + 1}</span>
            <div class="input-group">
              <label class="input-label">Weight</label>
              <input type="number" inputmode="decimal" class="set-input" id="edit-weight-input" value="${s.weight ?? ''}">
            </div>
            <div class="input-group">
              <label class="input-label">Reps</label>
              <input type="number" inputmode="numeric" class="set-input" id="edit-reps-input" value="${s.reps ?? ''}">
            </div>
            <div class="input-group">
              <label class="input-label">RPE</label>
              <input type="number" inputmode="decimal" step="0.5" min="1" max="10" class="set-input set-input-rpe" id="edit-rpe-input" placeholder="—" value="${s.rpe ?? ''}">
            </div>
            <button class="btn-primary" id="edit-save-btn">Save</button>
          </div>
        `);
      } else if (i < loggedSets.length) {
        const s = loggedSets[i];
        const rpeTag = Number.isFinite(s.rpe) ? ` <span class="set-rpe">@${s.rpe}</span>` : '';
        rows.push(`<div class="set-row done editable" data-edit-index="${i}" title="Tap to correct"><span class="set-label">Set ${i + 1}</span><span>${s.weight}kg x ${s.reps}${rpeTag} <span class="set-edit-hint">✎</span></span></div>`);
      } else if (i === activeSetIndex && editingIndex === null) {
        const prevSessionSet = previousSets ? previousSets[activeSetIndex] ?? previousSets[previousSets.length - 1] : null;
        const prevLoggedSet = loggedSets.length > 0 ? loggedSets[loggedSets.length - 1] : null;
        const defaultWeight = prevLoggedSet?.weight ?? prevSessionSet?.weight ?? '';
        const defaultReps   = prevLoggedSet?.reps   ?? prevSessionSet?.reps   ?? '';
        rows.push(`
          <div class="set-row active" id="active-set-row">
            <span class="set-label">Set ${i + 1}</span>
            <div class="input-group">
              <label class="input-label">Weight</label>
              <input type="number" inputmode="decimal" class="set-input" id="weight-input" placeholder="${exercise.startWeight ?? 'kg'}" value="${defaultWeight}">
            </div>
            <div class="input-group">
              <label class="input-label">Reps</label>
              <input type="number" inputmode="numeric" class="set-input" id="reps-input" placeholder="${exercise.repRange}" value="${defaultReps}">
            </div>
            <div class="input-group">
              <label class="input-label">RPE</label>
              <input type="number" inputmode="decimal" step="0.5" min="1" max="10" class="set-input set-input-rpe" id="rpe-input" placeholder="—" value="">
            </div>
            <button class="btn-primary" id="log-set-btn" ${restActive ? 'disabled style="opacity:.45"' : ''}>Log</button>
          </div>
        `);
      } else {
        rows.push(`<div class="set-row"><span class="set-label">Set ${i + 1}</span><span class="muted">—</span></div>`);
      }
    }

    container.innerHTML = `
      <div class="exercise-progress" id="exercise-progress"></div>
      <div class="exercise-name">${exercise.name}</div>
      <img
        src="${exercise.gifUrl}"
        alt="${exercise.name} demonstration"
        class="exercise-gif"
        loading="lazy"
        onerror="this.style.display='none'"
      >
      <p class="muted">${exercise.repRange} reps · rest ${exercise.restSeconds}s · start ~${exercise.startWeight}</p>
      ${(() => {
        const hint = suggestProgression(previousSets, exercise.repRange, { weightStep: exercise.weightStep });
        return hint ? `<p class="progression-hint">💡 ${hint.text}</p>` : '';
      })()}
      ${coachingBlock(exercise, previousSets)}
      ${exercise.timer ? '<div id="workout-timer-slot"></div>' : ''}
      <div id="set-rows">${rows.join('')}</div>
      <div id="rest-timer-slot"></div>
      <button class="btn-primary" id="complete-exercise-btn">${(() => {
        const allSetsDone = loggedSets.length >= exercise.setsCount;
        return allSetsDone
          ? 'Mark Exercise Complete →'
          : `Finish Early (${loggedSets.length}/${exercise.setsCount} sets) →`;
      })()}</button>
    `;

    if (exercise.timer) {
      const wtSlot = container.querySelector('#workout-timer-slot');
      workoutTimerHandle = mountWorkoutTimer(wtSlot, exercise.timer, () => {});
    }

    const logBtn = container.querySelector('#log-set-btn');
    if (logBtn) {
      logBtn.addEventListener('click', handleLogSet);
      const markDirty = () => { activeDirty = true; };
      container.querySelector('#weight-input')?.addEventListener('input', markDirty);
      container.querySelector('#reps-input')?.addEventListener('input', markDirty);
    }

    // Tap a logged set to correct it.
    container.querySelectorAll('[data-edit-index]').forEach(row => {
      row.addEventListener('click', () => {
        // Cancel any pending rest so the editor isn't stuck behind a disabled Log.
        if (timerHandle) { timerHandle.stop(); timerHandle = null; }
        restActive = false;
        editingIndex = +row.dataset.editIndex;
        render();
      });
    });

    const editSaveBtn = container.querySelector('#edit-save-btn');
    if (editSaveBtn) {
      editSaveBtn.addEventListener('click', handleSaveEdit);
    }

    const completeBtn = container.querySelector('#complete-exercise-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        if (completed) return;
        // Discard an in-progress correction rather than blocking completion.
        if (editingIndex !== null) { editingIndex = null; render(); return; }
        if (!captureActiveSetIfFilled()) return;
        completed = true;
        onExerciseComplete([...loggedSets]);
      });
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

  function handleLogSet() {
    const weightInput = container.querySelector('#weight-input');
    const repsInput = container.querySelector('#reps-input');
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) {
      weightInput.style.borderColor = 'var(--push)';
      repsInput.style.borderColor = 'var(--push)';
      return;
    }
    loggedSets.push({ weight, reps, ...readRpe(container.querySelector('#rpe-input')) });
    activeSetIndex++;
    activeDirty = false; // fresh active row for the next set
    render();

    if (loggedSets.length < exercise.setsCount) {
      restActive = true;
      render(); // re-render with Log button disabled
      const slot = container.querySelector('#rest-timer-slot');
      timerHandle = mountRestTimer(slot, exercise.restSeconds, () => {
        restActive = false;
        slot.innerHTML = '';
        render(); // re-enable Log button
      });
    }
  }

  function handleSaveEdit() {
    const weightInput = container.querySelector('#edit-weight-input');
    const repsInput = container.querySelector('#edit-reps-input');
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) {
      weightInput.style.borderColor = 'var(--push)';
      repsInput.style.borderColor = 'var(--push)';
      return;
    }
    loggedSets[editingIndex] = { weight, reps, ...readRpe(container.querySelector('#edit-rpe-input')) };
    editingIndex = null;
    render();
  }

  function captureActiveSetIfFilled() {
    if (restActive || loggedSets.length >= exercise.setsCount) return true;
    // Only capture a set the user actually entered, not untouched pre-fill.
    if (!activeDirty) return true;

    const weightInput = container.querySelector('#weight-input');
    const repsInput = container.querySelector('#reps-input');
    if (!weightInput || !repsInput) return true;

    const hasWeight = weightInput.value.trim() !== '';
    const hasReps = repsInput.value.trim() !== '';
    if (!hasWeight && !hasReps) return true;

    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) {
      weightInput.style.borderColor = 'var(--push)';
      repsInput.style.borderColor = 'var(--push)';
      return false;
    }

    loggedSets.push({ weight, reps, ...readRpe(container.querySelector('#rpe-input')) });
    activeSetIndex++;
    return true;
  }

  render();
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
