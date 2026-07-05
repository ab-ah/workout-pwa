import { createStore } from './store.js';
import { renderToday } from './views/today.js';
import { renderWeek } from './views/week.js';
import { renderHistory } from './views/history.js';
import { renderRecovery } from './views/recovery.js';
import { renderSettings } from './views/settings.js';
import { requestPersistentStorage } from './backup-io.js';

// Ask the browser to keep our logged data from being auto-evicted under storage
// pressure. Best-effort and fire-and-forget — never blocks app startup.
requestPersistentStorage();

const store = createStore(window.localStorage);
const viewRoot = document.getElementById('view-root');
const navButtons = document.querySelectorAll('#bottom-nav button');

const VIEWS = {
  today: () => renderToday(viewRoot, store),
  week: () => renderWeek(viewRoot, store),
  history: () => renderHistory(viewRoot, store),
  recovery: () => renderRecovery(viewRoot, store),
};

let currentTab = 'today';

function setActiveTab(tab) {
  currentTab = tab;
  navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  VIEWS[tab]();
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
});

setActiveTab('today');

// Readiness and recovery are time-based: their numbers drift while the app sits
// backgrounded. When the PWA comes back to the foreground, re-render those tabs
// so the freshness/readiness shown is current rather than frozen at blur time.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (currentTab === 'today' || currentTab === 'recovery') VIEWS[currentTab]();
});

const settingsGear = document.getElementById('settings-gear-btn');
settingsGear.addEventListener('click', () => {
  renderSettings(viewRoot, () => setActiveTab(currentTab));
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
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => { reg.update?.(); })
      .catch(() => {});
  });

  // Check for a newer worker whenever the app returns to the foreground, so a
  // long-lived installed PWA still picks up deploys promptly.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker.getRegistration().then((reg) => reg?.update?.()).catch(() => {});
  });
}
