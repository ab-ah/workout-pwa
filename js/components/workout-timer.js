// A start/pause countdown timer for cardio exercises, distinct from
// rest-timer.js (which is the between-set rest clock for lifts). Supports two
// shapes of exercise, driven entirely by the `config` passed in:
//   - { type: 'interval', workSeconds, restSeconds, rounds } — cycles WORK/REST
//     phases with a distinct beep for each transition, e.g. treadmill HIIT.
//   - { type: 'duration', seconds } — a single countdown with one completion
//     beep, e.g. a steady incline walk.
// Mounts into `container`; returns { stop() } to cancel and clean up timers.

import { unlockAudio, playBeep } from '../audio.js';

/** Distinct two-tone beep per phase on the shared, gesture-unlocked context so
 *  phase changes still sound when the tab is backgrounded (see audio.js). */
function playTone(freqs) {
  playBeep(freqs, { gap: 0.16, dur: 0.14 });
}

const WORK_TONE = [660, 660, 990]; // rising — go
const REST_TONE = [990, 660];      // falling — ease off
const DONE_TONE = [880, 1320];

/** Build the phase sequence: interval mode alternates work/rest between
 *  rounds (no trailing rest after the final round); duration mode is one
 *  phase covering the whole walk. */
export function buildPhases(config) {
  if (config.type === 'duration') {
    return [{ label: 'Walk', seconds: config.seconds, tone: null }];
  }
  const phases = [];
  for (let round = 1; round <= config.rounds; round++) {
    phases.push({ label: 'Work', seconds: config.workSeconds, tone: WORK_TONE, round });
    if (round < config.rounds) {
      phases.push({ label: 'Rest', seconds: config.restSeconds, tone: REST_TONE, round });
    }
  }
  return phases;
}

export function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function mountWorkoutTimer(container, config, onComplete) {
  const phases = buildPhases(config);
  const totalRounds = config.type === 'interval' ? config.rounds : null;
  let phaseIndex = 0;
  let remainingMs = phases[0].seconds * 1000;
  let endTimestamp = null; // set while running; null while paused/idle
  let intervalId = null;
  let running = false;
  let done = false;

  function currentPhase() {
    return phases[phaseIndex];
  }

  function render() {
    const phase = currentPhase();
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const roundLabel = totalRounds ? `Round ${phase.round}/${totalRounds} · ` : '';
    container.innerHTML = `
      <div class="workout-timer">
        <div class="workout-timer-phase">${roundLabel}${done ? 'Done' : phase.label}</div>
        <div class="workout-timer-clock">${formatClock(remainingSeconds)}</div>
        <div class="workout-timer-actions">
          ${done ? '' : `<button class="btn-primary" id="wt-toggle">${running ? 'Pause' : 'Start'}</button>`}
          ${done ? '' : '<button class="btn-secondary" id="wt-skip">Skip phase</button>'}
        </div>
      </div>
    `;
    if (done) return;
    container.querySelector('#wt-toggle').addEventListener('click', toggle);
    container.querySelector('#wt-skip').addEventListener('click', advance);
  }

  function tick() {
    remainingMs = endTimestamp - Date.now();
    if (remainingMs <= 0) {
      advance();
      return;
    }
    render();
  }

  function pauseInterval() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function toggle() {
    if (running) {
      // Pause: freeze the remaining time.
      remainingMs = Math.max(0, endTimestamp - Date.now());
      running = false;
      pauseInterval();
      render();
    } else {
      // Resume/start: unlock the shared audio context on this gesture so phase
      // beeps sound even after the tab is backgrounded, then recompute the end
      // timestamp from the frozen remainder.
      unlockAudio();
      endTimestamp = Date.now() + remainingMs;
      running = true;
      pauseInterval();
      intervalId = setInterval(tick, 250);
      render();
    }
  }

  function advance() {
    pauseInterval();
    if (navigator.vibrate) navigator.vibrate(150);
    const finishingPhase = currentPhase();
    if (finishingPhase.tone) playTone(finishingPhase.tone);

    phaseIndex++;
    if (phaseIndex >= phases.length) {
      done = true;
      running = false;
      playTone(DONE_TONE);
      render();
      onComplete();
      return;
    }
    remainingMs = currentPhase().seconds * 1000;
    if (running) {
      endTimestamp = Date.now() + remainingMs;
      intervalId = setInterval(tick, 250);
    }
    render();
  }

  render();

  return {
    stop() {
      pauseInterval();
    },
  };
}
