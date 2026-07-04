// Storage-side backup helpers shared by Settings, the workout-complete screen,
// and the empty-state restore prompt. Keeps the file-download / file-read /
// persist plumbing in one place; the pure assembly + validation lives in
// backup.js.
import { getSettings, saveSettings } from './settings-store.js';
import { PROGRESS_KEY, HISTORY_KEY, BODYWEIGHT_KEY } from './store.js';
import { buildBackup, parseBackup } from './backup.js';

const IN_PROGRESS_KEY = 'leanbuild-today-session-v2';

/**
 * Ask the browser to exempt our storage from automatic eviction. Best-effort:
 * unsupported browsers and denials resolve to false rather than throwing.
 * @returns {Promise<boolean>} whether storage is persisted after the call
 */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return false;
    if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Trigger a download of the full app state as a dated JSON backup file. */
export function downloadBackup() {
  let history = [];
  let progress = null;
  let bodyweight = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { /* keep [] */ }
  try { progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); } catch { /* keep null */ }
  try { bodyweight = JSON.parse(localStorage.getItem(BODYWEIGHT_KEY) || '[]'); } catch { /* keep [] */ }
  const bundle = buildBackup({ settings: getSettings(), history, progress, bodyweight });
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leanbuild-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Read a backup file and write its slices back into storage. Also clears any
 * stale in-progress session, which no longer matches the restored data.
 * @param {File} file
 * @returns {Promise<void>} rejects with a user-facing Error on any problem
 */
export function restoreBackupFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      try {
        const restored = parseBackup(reader.result);
        saveSettings(restored.settings);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(restored.history));
        if (restored.progress) localStorage.setItem(PROGRESS_KEY, JSON.stringify(restored.progress));
        if (Array.isArray(restored.bodyweight)) localStorage.setItem(BODYWEIGHT_KEY, JSON.stringify(restored.bodyweight));
        localStorage.removeItem(IN_PROGRESS_KEY);
        sessionStorage.removeItem(IN_PROGRESS_KEY);
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.readAsText(file);
  });
}

/**
 * Open a file picker and restore the chosen backup. Resolves only after a
 * successful restore; if the user cancels the picker it simply never resolves.
 * @returns {Promise<void>} rejects with a user-facing Error if the file is bad
 */
export function promptRestore() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return; // cancelled — leave the promise pending
      restoreBackupFromFile(file).then(resolve, reject);
    });
    input.click();
  });
}
