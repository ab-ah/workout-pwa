// Shared exercise-demo media. The demos ship as short looping VIDEO (WebM+MP4),
// not GIFs: the source art is the same © Gym Visual render, but the GIFs were a
// 12-frame, 4 fps slideshow. We motion-interpolate them to 16 fps and encode to
// video — smoother playback at ~a quarter of the file size, and (unlike a GIF)
// it can honour "reduce motion" by holding on the first frame.
//
// Every local demo has a sibling .webm and .mp4 next to its .gif. This helper
// derives those paths and emits a <video> with the original .gif as the final
// in-element fallback for any browser that can't play either video source. For
// non-local or user-supplied gifUrls (e.g. a custom URL typed in Settings) there
// is no matching video, so it falls back to a plain <img> — the old behaviour.

import { escapeHtml } from '../escape.js';

// Matches the bundled demos: 'assets/exercise-gifs/<name>.gif' with an optional
// leading './'. Anything else (absolute URLs, other folders) stays an <img>.
const LOCAL_GIF = /^(\.\/)?assets\/exercise-gifs\/[^/]+\.gif$/i;

function isLocalDemoGif(gifUrl) {
  return typeof gifUrl === 'string' && LOCAL_GIF.test(gifUrl.trim());
}

// True when the OS asks to reduce motion. Checked per render so demos can hold
// on their first frame instead of looping (a GIF could never do this).
function prefersReducedMotion() {
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * HTML for one exercise-demo player.
 *
 * @param {object} opts
 * @param {string} opts.gifUrl    the demo's .gif path (source of truth in data)
 * @param {string} opts.className CSS class shared with the old <img> styling
 * @param {string} opts.name      exercise name, for the accessible label
 * @returns {string} a <video> for bundled demos, else an <img> (or '' if no url)
 */
export function demoMediaHtml({ gifUrl, className, name }) {
  const url = String(gifUrl ?? '').trim();
  if (!url) return '';

  const label = `${escapeHtml(name ?? '')} demonstration`;
  const cls = escapeHtml(className);

  if (!isLocalDemoGif(url)) {
    // User URL or non-bundled asset — keep the plain image behaviour.
    return `<img src="${escapeHtml(url)}" alt="${label}" class="${cls}" loading="lazy" onerror="this.style.display='none'">`;
  }

  const safe = escapeHtml(url);
  const webm = safe.replace(/\.gif$/i, '.webm');
  const mp4 = safe.replace(/\.gif$/i, '.mp4');
  // autoplay+loop+muted+playsinline = GIF-like ambient playback on mobile.
  // Under "reduce motion" we drop autoplay so the demo holds on its first frame
  // (preload=auto so that frame is actually painted). The trailing <img> only
  // renders if neither <source> can play.
  const reduce = prefersReducedMotion();
  const playback = reduce ? 'preload="auto"' : 'autoplay loop muted playsinline preload="metadata"';
  return (
    `<video class="${cls}" ${playback} ` +
    `aria-label="${label}" data-demo-gif="${safe}">` +
    `<source src="${webm}" type="video/webm">` +
    `<source src="${mp4}" type="video/mp4">` +
    `<img src="${safe}" alt="${label}" class="${cls}" loading="lazy">` +
    `</video>`
  );
}
