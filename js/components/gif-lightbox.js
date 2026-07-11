// Tap-to-zoom lightbox for the exercise / mobility demos. One delegated
// listener, installed once from app.js, catches a tap on ANY demo — whether it
// exists now or is rendered later — and pops it up full-size over whatever is on
// screen. Demos are <video> now (see demo-media.js), with a plain <img> only for
// custom/user URLs, so the overlay handles both. It never navigates: the overlay
// is appended to <body> as a sibling of the app root and closes on a tap
// anywhere (media or backdrop) or the Escape key, returning you where you were.

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

function openOverlay(mediaNode, alt) {
  closeLightbox(); // never stack two overlays

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'gif-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', alt || 'Exercise demonstration');

  const hint = document.createElement('div');
  hint.className = 'gif-lightbox-hint';
  hint.textContent = 'Tap anywhere to close';

  overlay.append(mediaNode, hint);
  // A tap anywhere on the overlay — the media or the backdrop — closes it.
  overlay.addEventListener('click', closeLightbox);
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeydown);
}

// Enlarged looping video built from the demo's .gif path (its .webm/.mp4 siblings).
function videoNode(gifUrl, alt) {
  const video = document.createElement('video');
  video.className = 'gif-lightbox-img';
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('aria-label', alt || '');
  for (const [ext, type] of [['.webm', 'video/webm'], ['.mp4', 'video/mp4']]) {
    const source = document.createElement('source');
    source.src = gifUrl.replace(/\.gif$/i, ext);
    source.type = type;
    video.appendChild(source);
  }
  return video;
}

function imageNode(src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  img.className = 'gif-lightbox-img';
  return img;
}

/**
 * Install the delegated tap-to-zoom handler once. Idempotent — safe to call on
 * every startup. Uses capture so the zoom fires before any card-level handlers,
 * and stops the event there so tapping a demo never triggers a swap/log/etc.
 */
export function installGifLightbox() {
  if (window.__gifLightboxInstalled) return;
  window.__gifLightboxInstalled = true;

  document.addEventListener('click', (e) => {
    const el = e.target.closest?.(ZOOMABLE);
    if (!el) return;
    const alt = el.getAttribute('aria-label') || el.getAttribute('alt') || '';
    // Video demos carry the original gif path; images (custom URLs) use src.
    const gifUrl = el.dataset?.demoGif;
    const src = el.getAttribute('src');
    if (!gifUrl && !src) return;
    e.preventDefault();
    e.stopPropagation();
    openOverlay(gifUrl ? videoNode(gifUrl, alt) : imageNode(src, alt), alt);
  }, true);
}
