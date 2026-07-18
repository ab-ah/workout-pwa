// Form-cue popup + Google-form-search icons that sit next to an exercise demo.
//
// formInfoButtonsHtml(exercise) returns two compact controls to render beside a
// gif: a "Form" button (opens a modal with the exercise's written technique
// guidance) and a "Search" link (opens a Google search for the exercise + form).
//
// The modal is opened by a single delegated handler installed once from app.js
// (installFormPopup), so it works for any card rendered now or later — the same
// pattern as gif-lightbox.js. The button carries the form text in data-* so the
// handler needs no lookup back into settings.

import { escapeHtml } from '../escape.js';

const OVERLAY_ID = 'form-popup-overlay';

/** The written form guidance for an exercise: its dedicated `form` text, falling
 *  back to the shorter `cue` tip, else empty (no Form button rendered). */
function formTextOf(exercise) {
  return (exercise?.form ?? exercise?.cue ?? '').trim();
}

/**
 * The two demo-side controls (HTML string). The Form button is omitted when the
 * exercise has no written guidance; the Search link is always available.
 * @param {{ name?: string, form?: string, cue?: string }} exercise
 */
export function formInfoButtonsHtml(exercise) {
  const name = exercise?.name ?? '';
  const form = formTextOf(exercise);
  const query = encodeURIComponent(`${name} proper form technique`);
  const searchUrl = `https://www.google.com/search?q=${query}`;

  const formBtn = form
    ? `<button type="button" class="gif-info-btn form-info-btn"
         title="How to perform with correct form"
         aria-label="Correct form for ${escapeHtml(name)}"
         data-form-title="${escapeHtml(name)}" data-form-text="${escapeHtml(form)}">
         <span class="gif-info-icon" aria-hidden="true">ⓘ</span> Form
       </button>`
    : '';
  const searchBtn = name
    ? `<a class="gif-info-btn gif-search-btn" href="${escapeHtml(searchUrl)}"
         target="_blank" rel="noopener noreferrer"
         title="Search Google for this exercise's form"
         aria-label="Search Google for ${escapeHtml(name)} form">
         <span class="gif-info-icon" aria-hidden="true">🔍</span> Search
       </a>`
    : '';

  if (!formBtn && !searchBtn) return '';
  return `<div class="gif-info-row">${formBtn}${searchBtn}</div>`;
}

function closePopup() {
  document.getElementById(OVERLAY_ID)?.remove();
  document.removeEventListener('keydown', onKeydown);
}

function onKeydown(e) {
  if (e.key === 'Escape') closePopup();
}

function openPopup(title, text) {
  closePopup(); // never stack two

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'form-popup';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${title || 'Exercise'} — correct form`);

  const card = document.createElement('div');
  card.className = 'form-popup-card';
  // Tapping the card itself must NOT close the popup (only the backdrop / ✕).
  card.addEventListener('click', (e) => e.stopPropagation());
  card.innerHTML = `
    <div class="form-popup-head">
      <span class="form-popup-title">${escapeHtml(title || 'Correct form')}</span>
      <button type="button" class="form-popup-close" aria-label="Close">✕</button>
    </div>
    <p class="form-popup-body">${escapeHtml(text || '')}</p>
  `;
  card.querySelector('.form-popup-close').addEventListener('click', closePopup);

  overlay.appendChild(card);
  overlay.addEventListener('click', closePopup); // backdrop tap closes
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeydown);
}

/** Install the delegated Form-button handler once (idempotent). */
export function installFormPopup() {
  if (window.__formPopupInstalled) return;
  window.__formPopupInstalled = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.form-info-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    openPopup(btn.dataset.formTitle, btn.dataset.formText);
  }, true);
}
