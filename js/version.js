// Single source of truth for the human-facing app version. Shown in Settings so
// you can confirm the phone is running the latest build (PWAs cache aggressively).
//
// Release convention: every deploy bumps APP_VERSION (and the service worker's
// CACHE_NAME in sw.js, in lock-step) so an updated number on screen == fresh code.
export const APP_VERSION = '1.12.2';
export const BUILD_DATE = '2026-07-10';
