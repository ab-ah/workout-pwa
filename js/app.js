import { createStore } from './store.js';
import { renderToday } from './views/today.js';
import { renderPlan } from './views/plan.js';
import { renderHistory } from './views/history.js';
import { renderRecovery } from './views/recovery.js';
import { renderSettings } from './views/settings.js';
import { requestPersistentStorage } from './backup-io.js';
import { installGifLightbox } from './components/gif-lightbox.js';
import { installFormPopup } from './components/form-popup.js';

// Tap any demo GIF to zoom it full-size (closes on tap/Escape). Installed once;
// works across every re-render via event delegation.
installGifLightbox();

// Tap the "ⓘ Form" button on any exercise demo to pop up its written technique
// guidance. Delegated + installed once, same as the lightbox.
installFormPopup();

// Ask the browser to keep our logged data from being auto-evicted under storage
// pressure. Best-effort and fire-and-forget — never blocks app startup.
requestPersistentStorage();

const store = createStore(window.localStorage);
const viewRoot = document.getElementById('view-root');
const bottomNav = document.getElementById('bottom-nav');
const navButtons = document.querySelectorAll('#bottom-nav button');

// Publish the fixed bottom nav's real rendered height (content + safe-area) to a
// CSS variable, so sticky in-workout controls (the active-set row and the
// Complete/Finish button) sit exactly above it instead of relying on a
// hand-tuned magic number that tucked a few px under the nav. Re-measured on
// resize / rotation / safe-area changes.
function syncNavHeight() {
  if (!bottomNav) return;
  const h = bottomNav.offsetHeight;
  if (h > 0) document.documentElement.style.setProperty('--nav-h', `${h}px`);
}
syncNavHeight();
window.addEventListener('resize', syncNavHeight);
window.addEventListener('orientationchange', syncNavHeight);

const VIEWS = {
  today: () => renderToday(viewRoot, store),
  plan: () => renderPlan(viewRoot, store),
  history: () => renderHistory(viewRoot, store),
  recovery: () => renderRecovery(viewRoot, store),
  // Settings is now a bottom-nav tab (moved off the floating top-right gear,
  // the worst thumb-zone on a tall phone). Its own ✕ Close returns to Today.
  settings: () => renderSettings(viewRoot),
};

let currentTab = 'today';

// A new service worker may take control while a workout is in progress. Reloading
// then would drop a half-typed set and reset the rest timer, so we defer the
// update until no in-progress session exists (checked on tab changes and when the
// app returns to the foreground). Logged sets are already persisted regardless.
const IN_PROGRESS_KEY = 'leanbuild-today-session-v2';
let swUpdatePending = false;
function hasActiveWorkout() {
  return !!(localStorage.getItem(IN_PROGRESS_KEY) || sessionStorage.getItem(IN_PROGRESS_KEY));
}
function applyPendingUpdate() {
  if (swUpdatePending && !hasActiveWorkout()) {
    swUpdatePending = false;
    window.location.reload();
  }
}

function setActiveTab(tab) {
  currentTab = tab;
  navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  VIEWS[tab]();
  applyPendingUpdate();
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
});

// Honour a ?tab= deep-link (used by the manifest app shortcuts), falling back to
// Today for anything unrecognised.
const initialTab = new URLSearchParams(location.search).get('tab');
setActiveTab(VIEWS[initialTab] ? initialTab : 'today');

// Readiness and recovery are time-based: their numbers drift while the app sits
// backgrounded. When the PWA comes back to the foreground, re-render those tabs
// so the freshness/readiness shown is current rather than frozen at blur time.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (currentTab === 'today' || currentTab === 'recovery') VIEWS[currentTab]();
});

// Service worker + auto-update. The worker calls skipWaiting()/clients.claim(),
// so a freshly deployed version activates immediately and takes control. When it
// does, the browser fires `controllerchange`; we reload once to swap the running
// page onto the new code. This guarantees every deployment refreshes the PWA
// without a manual hard-reload. In-progress workout state is persisted to
// localStorage, so the reload restores it rather than losing it.
if ('serviceWorker' in navigator) {
  // True only when a worker is already in control (a repeat visit / update),
  // so we skip the reload on the very first install (initial claim).
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    // Mid-workout: defer the reload until the session ends (see applyPendingUpdate).
    if (hasActiveWorkout()) { swUpdatePending = true; return; }
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => { reg.update?.(); })
      .catch(() => {});
  });

  // Check for a newer worker whenever the app returns to the foreground, so a
  // long-lived installed PWA still picks up deploys promptly — and apply any
  // reload that was deferred because a workout was running.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration().then((reg) => reg?.update?.()).catch(() => {});
    applyPendingUpdate();
  });
}
