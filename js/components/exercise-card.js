import { mountRestTimer } from './rest-timer.js';
import { suggestProgression } from '../progression.js';

/**
 * Renders one exercise with its sets into `container`.
 * `exercise` = { id, name, setsCount, repRange, restSeconds, startWeight, gifUrl }
 * `previousSets` = sets from the last time this exercise was done (for defaults
 *   and the progression hint), or null.
 * `initialSets` = sets already logged for this exercise THIS session (present
 *   when the user navigated back to edit), pre-filled as logged rows, or null.
 * `onExerciseComplete(loggedSets)` fires once the user taps "Mark Exercise
 *   Complete". `loggedSets` = [{ weight, reps }, ...].
 */
export function mountExerciseCard(container, exercise, previousSets, initialSets, onExerciseComplete) {
  const loggedSets = Array.isArray(initialSets) ? initialSets.map(s => ({ ...s })) : [];
  let activeSetIndex = loggedSets.length;
  let editingIndex = null; // index of a logged set being corrected, or null
  let timerHandle = null;
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
            <button class="btn-primary" id="edit-save-btn">Save</button>
          </div>
        `);
      } else if (i < loggedSets.length) {
        const s = loggedSets[i];
        rows.push(`<div class="set-row done editable" data-edit-index="${i}" title="Tap to correct"><span class="set-label">Set ${i + 1}</span><span>${s.weight}kg x ${s.reps} <span class="set-edit-hint">✎</span></span></div>`);
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
        const hint = suggestProgression(previousSets, exercise.repRange);
        return hint ? `<p class="progression-hint">💡 ${hint.text}</p>` : '';
      })()}
      <div id="set-rows">${rows.join('')}</div>
      <div id="rest-timer-slot"></div>
      <button class="btn-primary" id="complete-exercise-btn">${(() => {
        const allSetsDone = loggedSets.length >= exercise.setsCount;
        return allSetsDone
          ? 'Mark Exercise Complete →'
          : `Finish Early (${loggedSets.length}/${exercise.setsCount} sets) →`;
      })()}</button>
    `;

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
    loggedSets.push({ weight, reps });
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
    loggedSets[editingIndex] = { weight, reps };
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

    loggedSets.push({ weight, reps });
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
    }
  };
}
