// Tap-to-zoom lightbox for the exercise / mobility demo GIFs. One delegated
// listener, installed once from app.js, catches a tap on ANY demo GIF — whether
// it exists now or is rendered later — and pops the image up full-size over
// whatever is on screen. It never navigates: the overlay is appended to <body>
// as a sibling of the app root and closes on a tap anywhere (image or backdrop)
// or the Escape key, returning you to exactly where you were.

const ZOOMABLE = '.exercise-gif, .ss-gif, .mobility-gif, .mobility-flow-gif';
const OVERLAY_ID = 'gif-lightbox-overlay';

function onKeydown(e) {
  if (e.key === 'Escape') closeLightbox();
}

function closeLightbox() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();
  document.removeEventListener('keydown', onKeydown);
}

function openLightbox(src, alt) {
  closeLightbox(); // never stack two overlays

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'gif-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', alt || 'Exercise demonstration');

  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  img.className = 'gif-lightbox-img';

  const hint = document.createElement('div');
  hint.className = 'gif-lightbox-hint';
  hint.textContent = 'Tap anywhere to close';

  overlay.append(img, hint);
  // A tap anywhere on the overlay — the image or the backdrop — closes it.
  overlay.addEventListener('click', closeLightbox);
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeydown);
}

/**
 * Install the delegated tap-to-zoom handler once. Idempotent — safe to call on
 * every startup. Uses capture so the zoom fires before any card-level handlers,
 * and stops the event there so tapping a GIF never triggers a swap/log/etc.
 */
export function installGifLightbox() {
  if (window.__gifLightboxInstalled) return;
  window.__gifLightboxInstalled = true;

  document.addEventListener('click', (e) => {
    const img = e.target.closest?.(ZOOMABLE);
    if (!img || !img.getAttribute('src')) return;
    e.preventDefault();
    e.stopPropagation();
    openLightbox(img.getAttribute('src'), img.getAttribute('alt'));
  }, true);
}
