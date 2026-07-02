import { mountRestTimer } from './rest-timer.js';
import { suggestProgression } from '../progression.js';

/**
 * Renders one exercise with its sets into `container`.
 * `exercise` = { id, name, setsCount, repRange, restSeconds, startWeight, watchUrl }
 * `onExerciseComplete(loggedSets)` fires once all sets are logged and the
 * user taps "Mark Exercise Complete". `loggedSets` = [{ weight, reps }, ...]
 */
export function mountExerciseCard(container, exercise, previousSets, onExerciseComplete) {
  const loggedSets = [];
  let activeSetIndex = 0;
  let timerHandle = null;
  let completed = false;
  let restActive = false;

  function render() {
    // Stop any running rest timer before wiping the DOM — prevents a leaked
    // interval continuing to tick after innerHTML is replaced.
    if (timerHandle) {
      timerHandle.stop();
      timerHandle = null;
    }

    const rows = [];
    for (let i = 0; i < exercise.setsCount; i++) {
      if (i < loggedSets.length) {
        const s = loggedSets[i];
        rows.push(`<div class="set-row done"><span class="set-label">Set ${i + 1}</span><span>${s.weight}kg x ${s.reps}</span></div>`);
      } else if (i === activeSetIndex) {
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
    }
    const completeBtn = container.querySelector('#complete-exercise-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', () => {
        if (completed) return;
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

  render();
  return {
    destroy() {
      if (timerHandle) {
        timerHandle.stop();
        timerHandle = null;
      }
    }
  };
}
