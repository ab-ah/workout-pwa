import { mountRestTimer } from './rest-timer.js';

/**
 * Renders one exercise with its sets into `container`.
 * `exercise` = { id, name, setsCount, repRange, restSeconds, startWeight, watchUrl }
 * `onExerciseComplete(loggedSets)` fires once all sets are logged and the
 * user taps "Mark Exercise Complete". `loggedSets` = [{ weight, reps }, ...]
 */
export function mountExerciseCard(container, exercise, onExerciseComplete) {
  const loggedSets = [];
  let activeSetIndex = 0;
  let timerHandle = null;
  let completed = false;

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
        rows.push(`
          <div class="set-row active" id="active-set-row">
            <span class="set-label">Set ${i + 1}</span>
            <input type="number" inputmode="decimal" class="set-input" id="weight-input" placeholder="${exercise.startWeight}">
            <input type="number" inputmode="numeric" class="set-input" id="reps-input" placeholder="${exercise.repRange}">
            <button class="btn-primary" id="log-set-btn">Log set</button>
          </div>
        `);
      } else {
        rows.push(`<div class="set-row"><span class="set-label">Set ${i + 1}</span><span class="muted">—</span></div>`);
      }
    }

    container.innerHTML = `
      <div class="exercise-progress" id="exercise-progress"></div>
      <div class="exercise-name">${exercise.name}</div>
      <p class="muted">${exercise.repRange} reps · rest ${exercise.restSeconds}s · start ~${exercise.startWeight}</p>
      <div id="set-rows">${rows.join('')}</div>
      <div id="rest-timer-slot"></div>
      <button class="btn-primary" id="complete-exercise-btn" ${loggedSets.length < exercise.setsCount ? 'disabled' : ''}>Mark Exercise Complete →</button>
    `;

    const logBtn = container.querySelector('#log-set-btn');
    if (logBtn) {
      logBtn.addEventListener('click', handleLogSet);
    }
    container.querySelector('#complete-exercise-btn').addEventListener('click', () => {
      if (!completed && loggedSets.length >= exercise.setsCount) {
        completed = true;
        onExerciseComplete([...loggedSets]);
      }
    });
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
      const slot = container.querySelector('#rest-timer-slot');
      timerHandle = mountRestTimer(slot, exercise.restSeconds, () => {
        slot.innerHTML = '';
        timerHandle = null;
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
