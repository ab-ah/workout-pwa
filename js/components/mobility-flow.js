// Followable mobility flow: a gif-by-gif stepper through the recovery movements.
//
// Deliberately NOT a logged workout — no history, no in-progress session, no
// fatigue. It's the "just follow along" companion to the tracked Active Recovery
// routine, so stretches stay out of the training math while still being a single
// coherent thing to do. Purely ephemeral DOM; leaving the tab simply drops it.
//
// mountMobilityFlow(container, items, onExit)
//   items  — [{ name, detail, gifUrl? }] in order.
//   onExit — called when the user finishes ("Done") or taps Exit.

import { demoMediaHtml } from './demo-media.js';

/**
 * @param {HTMLElement} container
 * @param {Array<{name:string, detail:string, gifUrl?:string}>} items
 * @param {() => void} onExit
 */
export function mountMobilityFlow(container, items, onExit) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  if (total === 0) { onExit(); return; }

  let index = 0;

  function render() {
    const m = list[index];
    const isLast = index === total - 1;
    container.innerHTML = `
      <div class="mobility-flow">
        <div class="exercise-flow-header">
          <span></span>
          <span class="exercise-progress">Mobility · ${index + 1} of ${total}</span>
          <button class="exercise-end-btn" id="mobility-exit-btn" title="Exit mobility">✕ Exit</button>
        </div>
        <div class="card mobility-flow-card">
          ${demoMediaHtml({ gifUrl: m.gifUrl, className: 'mobility-flow-gif', name: m.name })}
          <h2 class="mobility-flow-name">${m.name}</h2>
          <p class="muted mobility-flow-detail">${m.detail}</p>
          <div class="mobility-flow-actions">
            ${index > 0 ? '<button class="btn-secondary" id="mobility-prev-btn">← Back</button>' : ''}
            <button class="btn-primary" id="mobility-next-btn">${isLast ? 'Done ✓' : 'Next →'}</button>
          </div>
        </div>
        <p class="muted mobility-flow-note">Optional recovery — nothing here is logged or counts toward fatigue.</p>
      </div>
    `;

    container.querySelector('#mobility-exit-btn').addEventListener('click', onExit);
    const prevBtn = container.querySelector('#mobility-prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => { index = Math.max(0, index - 1); render(); });
    container.querySelector('#mobility-next-btn').addEventListener('click', () => {
      if (isLast) { onExit(); return; }
      index = Math.min(total - 1, index + 1);
      render();
    });
  }

  render();
}
