// Adjust a muscle's recovery window from felt soreness. Pure: no DOM/storage.
// Over time this calibrates the static default recovery hours to your body.

const MIN_HOURS = 12;
const MAX_HOURS = 168; // one week
const STEP = 0.1;      // ±10% per tap
const FALLBACK_HOURS = 48;

/**
 * Nudge a recovery window.
 *   'sore'  → still sore when the app called you recovered → lengthen (+10%)
 *   'fresh' → recovered before the app said → shorten (−10%)
 * Result is rounded and clamped to [MIN_HOURS, MAX_HOURS].
 *
 * @param {number} current
 * @param {'sore'|'fresh'} direction
 * @param {{ step?: number, min?: number, max?: number }} [opts]
 * @returns {number}
 */
export function nudgeRecoveryHours(current, direction, opts = {}) {
  const base = Number.isFinite(current) && current > 0 ? current : FALLBACK_HOURS;
  const step = opts.step ?? STEP;
  const min = opts.min ?? MIN_HOURS;
  const max = opts.max ?? MAX_HOURS;

  const factor = direction === 'sore' ? 1 + step
    : direction === 'fresh' ? 1 - step
    : 1;

  const next = Math.round(base * factor);
  return Math.min(max, Math.max(min, next));
}
