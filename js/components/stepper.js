// ± stepper wrapper for a numeric set-input, so weight and reps can be adjusted
// without opening the keyboard mid-set (the app's biggest in-gym friction). The
// input stays fully editable; the buttons just nudge it by a fixed step. Weight
// steps by the exercise's own weightStep (2.5 / 2 / 1 kg); reps step by 1.

/**
 * @param {string} inputHtml  the `<input>` element markup to wrap
 * @param {{ step?: number, label?: string }} [opts]
 * @returns {string} HTML for a `.stepper` (minus / input / plus)
 */
export function stepperHtml(inputHtml, opts = {}) {
  const step = opts.step ?? 1;
  const label = opts.label ?? 'value';
  return `
    <div class="stepper">
      <button type="button" class="step-btn" data-dir="-1" data-step="${step}" aria-label="Decrease ${label}" tabindex="-1">−</button>
      ${inputHtml}
      <button type="button" class="step-btn" data-dir="1" data-step="${step}" aria-label="Increase ${label}" tabindex="-1">+</button>
    </div>`;
}

/**
 * Wire every `.step-btn` within `root`. Each button finds the `<input>` in its
 * own `.stepper`, nudges it by ±step (floored at 0), and dispatches an `input`
 * event so existing "dirty" listeners treat the change as user entry.
 * @param {HTMLElement} root
 */
export function wireSteppers(root) {
  root.querySelectorAll('.step-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.stepper')?.querySelector('input');
      if (!input) return;
      const step = parseFloat(btn.dataset.step) || 1;
      const dir = btn.dataset.dir === '-1' ? -1 : 1;
      const cur = parseFloat(input.value);
      const base = Number.isFinite(cur) ? cur : (parseFloat(input.placeholder) || 0);
      let next = base + dir * step;
      if (next < 0) next = 0;
      next = Math.round(next * 1000) / 1000; // trim float drift (e.g. 0.1+0.2)
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}
