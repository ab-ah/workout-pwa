import { mountRestTimer } from './rest-timer.js';
import { suggestProgression, prescribeRpe } from '../progression.js';
import { coachingBlock, cueTargetBlock } from './exercise-card.js';
import { buildSlotSequence, nextSlotIndex } from '../supersets.js';
import { getDeloadMode, deloadSetTarget } from '../deload-mode.js';

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
//   coach         — { stall: [stallA, stallB] } for the progression hints.

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
  let activeDirty = false;
  let completed = false;
  let timerHandle = null;

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
            <div class="input-group"><label class="input-label">Weight</label>
              <input type="number" inputmode="decimal" class="set-input" data-edit-weight="${side}" value="${s.weight ?? ''}"></div>
            <div class="input-group"><label class="input-label">Reps</label>
              <input type="number" inputmode="numeric" class="set-input" data-edit-reps="${side}" value="${s.reps ?? ''}"></div>
            <div class="input-group"><label class="input-label">RPE</label>
              <input type="number" inputmode="decimal" step="0.5" min="1" max="10" class="set-input set-input-rpe" data-edit-rpe="${side}" placeholder="—" value="${s.rpe ?? ''}"></div>
            <button class="btn-primary" data-edit-save="${side}">Save</button>
          </div>`);
      } else if (i < logged[side].length) {
        const s = logged[side][i];
        const rpeTag = Number.isFinite(s.rpe) ? ` <span class="set-rpe">@${s.rpe}</span>` : '';
        rows.push(`<div class="set-row done editable" data-done-side="${side}" data-done-index="${i}" title="Tap to correct"><span class="set-label">Set ${i + 1}</span><span>${s.weight}kg x ${s.reps}${rpeTag} <span class="set-edit-hint">✎</span></span></div>`);
      } else if (isActiveSide && i === slot.set) {
        const prevSessionSet = prevs[side] ? (prevs[side][i] ?? prevs[side][prevs[side].length - 1]) : null;
        const prevLoggedSet = logged[side].length > 0 ? logged[side][logged[side].length - 1] : null;
        const defWeight = prevLoggedSet?.weight ?? prevSessionSet?.weight ?? '';
        const defReps = prevLoggedSet?.reps ?? prevSessionSet?.reps ?? '';
        rows.push(`
          <div class="set-row active">
            <span class="set-label">Set ${i + 1}</span>
            <div class="input-group"><label class="input-label">Weight</label>
              <input type="number" inputmode="decimal" class="set-input" data-weight="${side}" placeholder="${ex.startWeight ?? 'kg'}" value="${defWeight}"></div>
            <div class="input-group"><label class="input-label">Reps</label>
              <input type="number" inputmode="numeric" class="set-input" data-reps="${side}" placeholder="${ex.repRange}" value="${defReps}"></div>
            <div class="input-group"><label class="input-label">RPE</label>
              <input type="number" inputmode="decimal" step="0.5" min="1" max="10" class="set-input set-input-rpe" data-rpe="${side}" placeholder="${prescribeRpe(ex)?.placeholder || '—'}" value=""></div>
            <button class="btn-primary" data-log="${side}" ${restActive ? 'disabled style="opacity:.45"' : ''}>Log</button>
          </div>`);
      } else {
        rows.push(`<div class="set-row"><span class="set-label">Set ${i + 1}</span><span class="muted">—</span></div>`);
      }
    }
    return rows.join('');
  }

  function panelHtml(side) {
    const ex = exes[side];
    const slot = activeSlot();
    const isActiveSide = slot && slot.side === side && editing === null && !restActive;
    const hint = suggestProgression(prevs[side], ex.repRange, { weightStep: ex.weightStep, stallCount: stalls[side] });
    return `
      <div class="ss-panel ${isActiveSide ? 'ss-active' : ''}">
        <div class="ss-panel-head">
          <span class="ss-tag">${side === 0 ? 'A' : 'B'}</span>
          <span class="exercise-name">${ex.name}</span>
          ${ex.gifUrl ? `<img src="${ex.gifUrl}" alt="${ex.name} demonstration" class="ss-gif" loading="lazy" onerror="this.style.display='none'">` : ''}
        </div>
        <p class="muted">${ex.repRange} reps · rest ${ex.restSeconds}s${ex.startWeight ? ` · start ~${ex.startWeight}` : ''}</p>
        ${hint ? `<p class="progression-hint">💡 ${hint.text}</p>` : ''}
        ${cueTargetBlock(ex)}
        ${coachingBlock(ex, prevs[side])}
        <div class="ss-rows">${setRowsHtml(side)}</div>
      </div>`;
  }

  function render() {
    if (timerHandle) { timerHandle.stop(); timerHandle = null; }

    const slot = activeSlot();
    const round = slot ? slot.set + 1 : Math.max(effCounts[0], effCounts[1]);
    const rounds = Math.max(effCounts[0], effCounts[1]);
    const activeName = slot ? exes[slot.side].name : null;
    const progress = slot
      ? `Round ${round} of ${rounds} · <strong>${activeName}</strong>`
      : 'All sets logged';
    const allDone = loggedCount() >= totalSets;

    container.innerHTML = `
      <div class="superset-card">
        <div class="superset-badge">🔁 Superset — alternate a set of each, rest after the pair</div>
        ${deload.active ? '<div class="deload-tag">🌙 Deload week — fewer sets, hold the weight</div>' : ''}
        <div class="ss-progress muted">${progress}</div>
        ${panelHtml(0)}
        <div class="ss-divider"><span>↕</span></div>
        ${panelHtml(1)}
        <div id="ss-rest-slot"></div>
        <button class="btn-primary" id="ss-complete-btn">${allDone
          ? 'Mark Superset Complete →'
          : `Finish Early (${loggedCount()}/${totalSets} sets) →`}</button>
      </div>`;

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
        restActive = false;
        editing = { side: +row.dataset.doneSide, index: +row.dataset.doneIndex };
        render();
      });
    });

    const saveBtn = container.querySelector('[data-edit-save]');
    if (saveBtn) saveBtn.addEventListener('click', () => handleSaveEdit(+saveBtn.dataset.editSave));

    const completeBtn = container.querySelector('#ss-complete-btn');
    completeBtn.addEventListener('click', () => {
      if (completed) return;
      if (editing !== null) { editing = null; render(); return; }
      captureActiveIfFilled();
      completed = true;
      onComplete(buildEntries());
    });

    // When the alternation moves to the other exercise, scroll its panel into
    // view so the next active input isn't clipped off the bottom of the phone.
    if (!restActive && editing === null && slot && slot.side !== lastScrolledSide) {
      lastScrolledSide = slot.side;
      container.querySelector('.ss-panel.ss-active')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function handleLog(side) {
    if (restActive) return;
    const weightInput = container.querySelector(`[data-weight="${side}"]`);
    const repsInput = container.querySelector(`[data-reps="${side}"]`);
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) {
      weightInput.style.borderColor = 'var(--push)';
      repsInput.style.borderColor = 'var(--push)';
      return;
    }
    logged[side].push({ weight, reps, ...readRpe(container.querySelector(`[data-rpe="${side}"]`)) });
    if (navigator.vibrate) navigator.vibrate(10); // subtle confirm tick
    activeDirty = false;
    const restAfter = slots[pointer]?.restAfter;
    const restSecs = exes[side].restSeconds;
    pointer++;
    render();

    if (restAfter && pointer < slots.length && restSecs > 0) {
      restActive = true;
      render();
      const restSlot = container.querySelector('#ss-rest-slot');
      timerHandle = mountRestTimer(restSlot, restSecs, () => {
        restActive = false;
        restSlot.innerHTML = '';
        render();
      });
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
