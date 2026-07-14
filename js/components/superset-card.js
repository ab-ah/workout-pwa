import { mountRestTimer } from './rest-timer.js';
import { suggestProgression, prescribeRpe } from '../progression.js';
import { coachingBlock, cueTargetBlock, recommendedWeightBlock } from './exercise-card.js';
import { buildSlotSequence, nextSlotIndex } from '../supersets.js';
import { getDeloadMode, deloadSetTarget } from '../deload-mode.js';
import { unlockAudio } from '../audio.js';
import { ensureNotifyPermission } from '../notify.js';
import { getPendingRestSeconds, clearPendingRest } from '../rest-persist.js';
import { stepperHtml, wireSteppers } from './stepper.js';
import { escapeHtml } from '../escape.js';
import { demoMediaHtml } from './demo-media.js';

// Interleaved antagonist-superset card: two exercises logged a set at a time in
// alternation (A1, B1, rest, A2, B2, rest, …) with one shared rest after each
// pair. Completing (or finishing early) returns one logged entry per side.
//
// mountSupersetCard(container, exA, exB, prevSets, initialSets, onComplete, coach)
//   exA, exB      — the two exercise objects.
//   prevSets      — [prevA, prevB]: each side's sets from last session, or null.
//   initialSets   — [initA, initB]: sets already logged this session (resume), or null.
//   onComplete(entries) — entries = [{ exerciseId, name, sets }] for sides that
//                          logged ≥1 set. Fires on "Mark Superset Complete".
//   coach         — { stall: [stallA, stallB], onSetsChange?, swapOptions?, onSwap? }.
//                   onSetsChange(entries) persists mid-superset progress; swapOptions
//                   = [optsA, optsB] of {id,name}; onSwap(side,newId) swaps a side.

/** First number in a string like "50–60 kg bar" → 50, else null. Used to seed a
 *  side's weight field from its start-weight hint on the first-ever set. */
function firstNumber(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
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

export function mountSupersetCard(container, exA, exB, prevSets = [], initialSets = [], onComplete, coach = {}) {
  const exes = [exA, exB];
  const prevs = [prevSets?.[0] ?? null, prevSets?.[1] ?? null];
  const stalls = coach.stall ?? [];
  const swapOptions = coach.swapOptions ?? [];
  const weightSteps = exes.map(ex => Number.isFinite(ex.weightStep) ? ex.weightStep : 2.5);
  const logged = [
    Array.isArray(initialSets?.[0]) ? initialSets[0].map(s => ({ ...s })) : [],
    Array.isArray(initialSets?.[1]) ? initialSets[1].map(s => ({ ...s })) : [],
  ];

  // One-tap deload week trims each side's working sets ~40% (see deload-mode.js).
  const deload = getDeloadMode();
  const effCounts = exes.map(ex => deload.active
    ? Math.min(ex.setsCount, deloadSetTarget(ex.setsCount))
    : ex.setsCount);

  const slots = buildSlotSequence(effCounts[0], effCounts[1]);
  const totalSets = effCounts[0] + effCounts[1];
  let lastScrolledSide = -1; // for bring-active-panel-into-view on side change
  let pointer = nextSlotIndex(slots, logged[0].length, logged[1].length);
  let editing = null;   // { side, index } | null
  let restActive = false;
  let restingSide = null; // which side's set we just logged (for the rest label)
  let activeDirty = false;
  let completed = false;
  let timerHandle = null;
  const swapOpen = [false, false];

  function activeSlot() {
    return pointer < slots.length ? slots[pointer] : null;
  }

  function loggedCount() {
    return logged[0].length + logged[1].length;
  }

  function setRowsHtml(side) {
    const ex = exes[side];
    const slot = activeSlot();
    const isActiveSide = slot && slot.side === side && editing === null;
    const rows = [];
    for (let i = 0; i < effCounts[side]; i++) {
      if (editing && editing.side === side && editing.index === i) {
        const s = logged[side][i] ?? {};
        rows.push(`
          <div class="set-row active">
            <span class="set-label">Set ${i + 1}</span>
            <div class="field-row"><label class="input-label">Weight (kg)</label>
              ${stepperHtml(`<input type="number" inputmode="decimal" class="set-input" data-edit-weight="${side}" value="${s.weight ?? ''}">`, { step: weightSteps[side], label: 'weight' })}</div>
            <div class="field-row"><label class="input-label">Reps</label>
              ${stepperHtml(`<input type="number" inputmode="numeric" class="set-input" data-edit-reps="${side}" value="${s.reps ?? ''}">`, { step: 1, label: 'reps' })}</div>
            <div class="field-row rpe-field"><label class="input-label">RPE (optional)</label>
              ${stepperHtml(`<input type="number" inputmode="decimal" step="0.5" class="set-input set-input-rpe" data-edit-rpe="${side}" placeholder="—" value="${s.rpe ?? ''}">`, { step: 0.5, min: 1, max: 10, label: 'RPE' })}</div>
            <button class="btn-primary" data-edit-save="${side}">Save</button>
          </div>`);
      } else if (i < logged[side].length) {
        const s = logged[side][i];
        const rpeTag = Number.isFinite(s.rpe) ? ` <span class="set-rpe">@${s.rpe}</span>` : '';
        rows.push(`<div class="set-row done editable" data-done-side="${side}" data-done-index="${i}" title="Tap to correct"><span class="set-label">Set ${i + 1}</span><span>${s.weight}kg x ${s.reps}${rpeTag} <span class="set-edit-hint">✎</span></span></div>`);
      } else if (isActiveSide && i === slot.set) {
        const prevSessionSet = prevs[side] ? (prevs[side][i] ?? prevs[side][prevs[side].length - 1]) : null;
        const prevLoggedSet = logged[side].length > 0 ? logged[side][logged[side].length - 1] : null;
        // First-ever set seeds weight from the start-weight hint so the field
        // isn't empty; RPE prefills so the previous effort is visible.
        const defWeight = prevLoggedSet?.weight ?? prevSessionSet?.weight ?? firstNumber(ex.startWeight) ?? '';
        const defReps = prevLoggedSet?.reps ?? prevSessionSet?.reps ?? '';
        const defRpe = prevLoggedSet?.rpe ?? prevSessionSet?.rpe ?? '';
        const canRepeat = defWeight !== '' && defReps !== '';
        const logLabel = (canRepeat && !activeDirty) ? 'Log same ↻' : 'Log';
        const repeatHint = canRepeat
          ? `<p class="repeat-hint muted">↻ Log repeats ${defWeight}kg × ${defReps} — adjust with ± or type</p>`
          : '';
        rows.push(`
          <div class="set-row active">
            <span class="set-label">Set ${i + 1}</span>
            <div class="field-row"><label class="input-label">Weight (kg)</label>
              ${stepperHtml(`<input type="number" inputmode="decimal" class="set-input" data-weight="${side}" placeholder="${escapeHtml(String(ex.startWeight ?? 'kg'))}" value="${defWeight}">`, { step: weightSteps[side], label: 'weight' })}</div>
            <div class="field-row"><label class="input-label">Reps</label>
              ${stepperHtml(`<input type="number" inputmode="numeric" class="set-input" data-reps="${side}" placeholder="${escapeHtml(String(ex.repRange ?? ''))}" value="${defReps}">`, { step: 1, label: 'reps' })}</div>
            <div class="field-row rpe-field"><label class="input-label">RPE (optional)</label>
              ${stepperHtml(`<input type="number" inputmode="decimal" step="0.5" class="set-input set-input-rpe" data-rpe="${side}" placeholder="${prescribeRpe(ex)?.placeholder || '—'}" value="${defRpe}">`, { step: 0.5, min: 1, max: 10, label: 'RPE' })}</div>
            ${repeatHint}
            <button class="btn-primary" data-log="${side}" ${restActive ? 'disabled style="opacity:.45"' : ''}>${logLabel}</button>
          </div>`);
      } else {
        rows.push(`<div class="set-row"><span class="set-label">Set ${i + 1}</span><span class="muted">—</span></div>`);
      }
    }
    return rows.join('');
  }

  /** In-superset swap control for one side (parity with the single-exercise
   *  card). Shown only when the caller supplied alternatives for that side. */
  function swapHtml(side) {
    const opts = swapOptions[side];
    if (!opts || opts.length === 0) return '';
    return `
      <div class="ss-swap" data-swap-side="${side}">
        <button class="swap-toggle" data-swap-toggle="${side}">⇄ Swap ${escapeHtml(exes[side].name)}</button>
        ${swapOpen[side] ? `
          <div class="swap-picker">
            <div class="muted swap-picker-hint">Same-muscle alternatives — just for today</div>
            ${opts.map(o => `<button class="swap-option" data-swap-pick="${side}" data-swap-id="${escapeHtml(o.id)}">${escapeHtml(o.name)}</button>`).join('')}
          </div>` : ''}
      </div>`;
  }

  // ── Static shell (panel heads, gifs, coaching) built ONCE ──────────────────
  // Only the progress line, set rows, active-panel highlight and complete label
  // change per render, so the small demo GIFs and coaching stay put (no flicker).
  function panelShellHtml(side) {
    const ex = exes[side];
    const hint = suggestProgression(prevs[side], ex.repRange, { weightStep: ex.weightStep, stallCount: stalls[side] });
    return `
      <div class="ss-panel" id="ss-panel-${side}">
        <div class="ss-panel-head">
          <span class="ss-tag">${side === 0 ? 'A' : 'B'}</span>
          <span class="exercise-name">${escapeHtml(ex.name)}</span>
          ${demoMediaHtml({ gifUrl: ex.gifUrl, className: 'ss-gif', name: ex.name })}
        </div>
        <p class="muted">${escapeHtml(ex.repRange)} reps · rest ${ex.restSeconds}s${ex.startWeight ? ` · start ~${escapeHtml(String(ex.startWeight))}` : ''}</p>
        ${recommendedWeightBlock(ex, prevs[side])}
        ${hint ? `<p class="progression-hint">💡 ${escapeHtml(hint.text)}</p>` : ''}
        ${cueTargetBlock(ex)}
        ${coachingBlock(ex, prevs[side])}
        <div class="ss-swap-slot" id="ss-swap-${side}"></div>
        <div class="ss-rows" id="ss-rows-${side}"></div>
      </div>`;
  }

  container.innerHTML = `
    <div class="superset-card">
      <div class="superset-badge">🔁 Superset — alternate a set of each, rest after the pair</div>
      ${deload.active ? '<div class="deload-tag">🌙 Deload week — fewer sets, hold the weight</div>' : ''}
      <div class="ss-progress muted" id="ss-progress"></div>
      <div id="ss-rest-slot"></div>
      ${panelShellHtml(0)}
      <div class="ss-divider"><span>↕</span></div>
      ${panelShellHtml(1)}
      <button class="btn-primary" id="ss-complete-btn"></button>
    </div>`;

  const progressEl = container.querySelector('#ss-progress');
  const panelEls = [container.querySelector('#ss-panel-0'), container.querySelector('#ss-panel-1')];
  const rowsEls = [container.querySelector('#ss-rows-0'), container.querySelector('#ss-rows-1')];
  const swapEls = [container.querySelector('#ss-swap-0'), container.querySelector('#ss-swap-1')];
  const restSlot = container.querySelector('#ss-rest-slot');
  const completeBtn = container.querySelector('#ss-complete-btn');

  completeBtn.addEventListener('click', () => {
    if (completed) return;
    if (editing !== null) { editing = null; render(); return; }
    captureActiveIfFilled();
    completed = true;
    clearPendingRest();
    onComplete(buildEntries());
  });

  function render() {
    const slot = activeSlot();
    const round = slot ? slot.set + 1 : Math.max(effCounts[0], effCounts[1]);
    const rounds = Math.max(effCounts[0], effCounts[1]);
    const allDone = loggedCount() >= totalSets;

    if (restActive && restingSide !== null) {
      // Make it unambiguous whose rest is running (the rest duration is the
      // just-logged side's restSeconds).
      progressEl.innerHTML = `Resting — just logged <strong>${escapeHtml(exes[restingSide].name)}</strong> (${exes[restingSide].restSeconds}s)`;
    } else if (slot) {
      progressEl.innerHTML = `Round ${round} of ${rounds} · <strong>${escapeHtml(exes[slot.side].name)}</strong>`;
    } else {
      progressEl.textContent = 'All sets logged';
    }

    for (let side = 0; side < 2; side++) {
      const isActiveSide = slot && slot.side === side && editing === null && !restActive;
      panelEls[side].classList.toggle('ss-active', !!isActiveSide);
      rowsEls[side].innerHTML = setRowsHtml(side);
      swapEls[side].innerHTML = swapHtml(side);
    }

    completeBtn.className = allDone ? 'btn-primary' : 'btn-primary finish-early';
    completeBtn.textContent = allDone
      ? 'Mark Superset Complete →'
      : `Finish Early (${loggedCount()}/${totalSets} sets) →`;

    wireSteppers(container);

    const logBtn = container.querySelector('[data-log]');
    if (logBtn) {
      const side = +logBtn.dataset.log;
      logBtn.addEventListener('click', () => handleLog(side));
      const markDirty = () => { activeDirty = true; };
      container.querySelector(`[data-weight="${side}"]`)?.addEventListener('input', markDirty);
      container.querySelector(`[data-reps="${side}"]`)?.addEventListener('input', markDirty);
    }

    container.querySelectorAll('[data-done-index]').forEach(row => {
      row.addEventListener('click', () => {
        if (timerHandle) { timerHandle.stop(); timerHandle = null; }
        if (restActive) { restActive = false; restingSide = null; clearPendingRest(); restSlot.innerHTML = ''; }
        editing = { side: +row.dataset.doneSide, index: +row.dataset.doneIndex };
        render();
      });
    });

    const saveBtn = container.querySelector('[data-edit-save]');
    if (saveBtn) saveBtn.addEventListener('click', () => handleSaveEdit(+saveBtn.dataset.editSave));

    // Swap controls (per side).
    container.querySelectorAll('[data-swap-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const side = +btn.dataset.swapToggle;
        swapOpen[side] = !swapOpen[side];
        render();
      });
    });
    container.querySelectorAll('[data-swap-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const side = +btn.dataset.swapPick;
        const newId = btn.dataset.swapId;
        coach.onSwap?.(side, newId);
      });
    });

    // When the alternation moves to the other exercise, scroll its panel into
    // view so the next active input isn't clipped off the bottom of the phone.
    if (!restActive && editing === null && slot && slot.side !== lastScrolledSide) {
      lastScrolledSide = slot.side;
      panelEls[slot.side]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /** The set to inherit blank fields from for this side: the last set logged this
   *  session, else the matching set from last session. Carries weight/reps/rpe. */
  function previousEntryFor(side) {
    const prevLoggedSet = logged[side].length > 0 ? logged[side][logged[side].length - 1] : null;
    const idx = logged[side].length;
    const prevSessionSet = prevs[side] ? (prevs[side][idx] ?? prevs[side][prevs[side].length - 1]) : null;
    return prevLoggedSet ?? prevSessionSet ?? null;
  }

  function emitSetsChange() {
    coach.onSetsChange?.(buildEntries());
  }

  function handleLog(side) {
    if (restActive) return;
    unlockAudio();
    ensureNotifyPermission();
    const weightInput = container.querySelector(`[data-weight="${side}"]`);
    const repsInput = container.querySelector(`[data-reps="${side}"]`);
    const prev = previousEntryFor(side);

    // Fill any field left blank from the previous entry, so tapping Log with an
    // unchanged field (or all of them) repeats the last set's weight / reps / RPE.
    let weight = parseFloat(weightInput.value);
    if (Number.isNaN(weight) && prev != null && Number.isFinite(Number(prev.weight))) weight = Number(prev.weight);
    let reps = parseInt(repsInput.value, 10);
    if (Number.isNaN(reps) && prev != null && Number.isFinite(Number(prev.reps))) reps = Number(prev.reps);

    if (Number.isNaN(weight) || Number.isNaN(reps)) {
      weightInput.style.borderColor = 'var(--push)';
      repsInput.style.borderColor = 'var(--push)';
      return;
    }
    const typedRpe = readRpe(container.querySelector(`[data-rpe="${side}"]`));
    const rpe = ('rpe' in typedRpe)
      ? typedRpe
      : (prev != null && Number.isFinite(Number(prev.rpe)) ? { rpe: Math.min(10, Number(prev.rpe)) } : {});
    logged[side].push({ weight, reps, ...rpe });
    if (navigator.vibrate) navigator.vibrate(10); // subtle confirm tick
    activeDirty = false;
    const restAfter = slots[pointer]?.restAfter;
    const restSecs = exes[side].restSeconds;
    pointer++;
    emitSetsChange();
    render();

    if (restAfter && pointer < slots.length && restSecs > 0) {
      restActive = true;
      restingSide = side;
      render();
      timerHandle = mountRestTimer(restSlot, restSecs, () => {
        restActive = false;
        restingSide = null;
        restSlot.innerHTML = '';
        render();
      });
      // The rest timer mounts at the top of the card, well above the panel you
      // just logged — scroll it into view so the countdown isn't stranded
      // off-screen after every set (honouring reduce-motion).
      const reduceMotion = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;
      restSlot.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  function handleSaveEdit(side) {
    const weightInput = container.querySelector(`[data-edit-weight="${side}"]`);
    const repsInput = container.querySelector(`[data-edit-reps="${side}"]`);
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) {
      weightInput.style.borderColor = 'var(--push)';
      repsInput.style.borderColor = 'var(--push)';
      return;
    }
    logged[editing.side][editing.index] = { weight, reps, ...readRpe(container.querySelector(`[data-edit-rpe="${side}"]`)) };
    editing = null;
    emitSetsChange();
    render();
  }

  /** Fold the current active input into `logged` if the user typed a full set. */
  function captureActiveIfFilled() {
    const slot = activeSlot();
    if (!slot || restActive || editing !== null || !activeDirty) return;
    const side = slot.side;
    const weightInput = container.querySelector(`[data-weight="${side}"]`);
    const repsInput = container.querySelector(`[data-reps="${side}"]`);
    if (!weightInput || !repsInput) return;
    if (weightInput.value.trim() === '' && repsInput.value.trim() === '') return;
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) return;
    logged[side].push({ weight, reps, ...readRpe(container.querySelector(`[data-rpe="${side}"]`)) });
    activeDirty = false;
    pointer++;
    emitSetsChange();
  }

  function buildEntries() {
    const entries = [];
    for (let side = 0; side < 2; side++) {
      if (logged[side].length > 0) {
        entries.push({ exerciseId: exes[side].id, name: exes[side].name, sets: logged[side].map(s => ({ ...s })) });
      }
    }
    return entries;
  }

  render();

  // Restore a rest that was running when the app was reloaded/updated.
  const pendingRest = getPendingRestSeconds();
  if (pendingRest > 0 && loggedCount() > 0 && loggedCount() < totalSets) {
    restActive = true;
    render();
    timerHandle = mountRestTimer(restSlot, pendingRest, () => {
      restActive = false;
      restingSide = null;
      restSlot.innerHTML = '';
      render();
    });
  } else if (pendingRest > 0 && loggedCount() >= totalSets) {
    clearPendingRest();
  }

  return {
    /** Logged entries so far, folding any typed-but-unlogged active set. Used by
     *  the End / Previous controls to persist exactly what's on screen. */
    snapshotEntries() {
      captureActiveIfFilled();
      const entries = buildEntries();
      render(); // reflect the folded set
      return entries;
    },
    destroy() {
      if (timerHandle) { timerHandle.stop(); timerHandle = null; }
    },
  };
}
