import { createStore } from './store.js';
import { renderToday } from './views/today.js';
import { renderWeek } from './views/week.js';
import { renderHistory } from './views/history.js';
import { renderRecovery } from './views/recovery.js';

const store = createStore(window.localStorage);
const viewRoot = document.getElementById('view-root');
const navButtons = document.querySelectorAll('#bottom-nav button');

const VIEWS = {
  today: () => renderToday(viewRoot, store),
  week: () => renderWeek(viewRoot, store),
  history: () => renderHistory(viewRoot, store),
  recovery: () => renderRecovery(viewRoot, store),
};

function setActiveTab(tab) {
  navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  VIEWS[tab]();
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
});

setActiveTab('today');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
