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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
