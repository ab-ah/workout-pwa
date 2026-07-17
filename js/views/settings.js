import { CURRENT_PLAN_VERSION } from '../settings-store.js';
import { APP_VERSION, BUILD_DATE } from '../version.js';
import { PROGRESS_KEY, HISTORY_KEY } from '../store.js';
import { downloadBackup, restoreBackupFromFile } from '../backup-io.js';

// Settings is now app/data concerns only. The program-building editors it used
// to host — Exercises, Routines, and the weekly Schedule — moved to the Plan
// tab; per-muscle recovery-window tuning moved to the Recovery tab. What remains
// here: data backup/restore/reset, and the version + update check.

/**
 * Manually check the service worker for a new deployment. The worker calls
 * skipWaiting()/clients.claim(), so a found update activates and app.js reloads
 * the page on `controllerchange`. This just triggers the check and reports back.
 */
async function checkForUpdates(btn, statusEl) {
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };
  if (!('serviceWorker' in navigator)) {
    setStatus('Updates aren’t supported on this browser.');
    return;
  }
  btn.disabled = true;
  setStatus('Checking…');
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      setStatus('Not installed yet — reopen the app to update.');
      return;
    }
    let updateFound = false;
    reg.addEventListener('updatefound', () => {
      updateFound = true;
      setStatus('New version found — updating…'); // app.js reloads on activation
    });
    await reg.update();
    // Give the browser a moment to surface a newly-installing worker.
    setTimeout(() => {
      if (!updateFound && !reg.installing && !reg.waiting) {
        setStatus(`You’re on the latest version (v${APP_VERSION}).`);
      }
      btn.disabled = false;
    }, 2000);
  } catch {
    setStatus('Couldn’t check right now — check your connection and retry.');
    btn.disabled = false;
  }
}

export function renderSettings(container) {
  function importBackup(file) {
    restoreBackupFromFile(file)
      .then(() => {
        render();
        alert('Backup restored.');
      })
      .catch((err) => alert('Import failed: ' + err.message));
  }

  function render() {
    container.innerHTML = `
      <div class="settings-view">
        <div class="settings-header">
          <span class="settings-title">Settings</span>
        </div>

        <div class="settings-section-label">Data</div>
        <div class="settings-data-actions">
          <button class="btn-data" id="settings-export">⬇ Export Backup</button>
          <button class="btn-data" id="settings-import">⬆ Import Backup</button>
          <button class="btn-reset-data" id="settings-reset-data">🗑 Reset Data</button>
          <input type="file" id="settings-import-file" accept="application/json,.json" hidden>
        </div>

        <div class="settings-version" style="margin-top:22px">Lean Build v${APP_VERSION} · plan v${CURRENT_PLAN_VERSION} · ${BUILD_DATE}</div>
        <div class="settings-update">
          <button class="btn-data" id="settings-check-update">↻ Check for Updates</button>
          <span class="settings-update-status muted" id="settings-update-status"></span>
        </div>
      </div>
    `;

    container.querySelector('#settings-export').addEventListener('click', downloadBackup);
    const importInput = container.querySelector('#settings-import-file');
    container.querySelector('#settings-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      if (importInput.files && importInput.files[0]) importBackup(importInput.files[0]);
    });
    container.querySelector('#settings-reset-data').addEventListener('click', () => {
      if (confirm('Clear all workout history, progress, and logged data?\n\nYour exercise list and settings will be kept.')) {
        localStorage.removeItem(PROGRESS_KEY);
        localStorage.removeItem(HISTORY_KEY);
        sessionStorage.removeItem('leanbuild-today-session-v2');
        alert('User data cleared.');
      }
    });
    const checkUpdateBtn = container.querySelector('#settings-check-update');
    if (checkUpdateBtn) {
      checkUpdateBtn.addEventListener('click', () => {
        checkForUpdates(checkUpdateBtn, container.querySelector('#settings-update-status'));
      });
    }
  }

  render();
}
