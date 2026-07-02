// Export / import the full app state as a single JSON bundle. Pure functions
// (no DOM, no storage) so the assembly + validation logic is unit-testable;
// the settings view handles the actual file download / read.

export const BACKUP_VERSION = 1;
const APP_TAG = 'leanbuild';

/**
 * Assemble a backup bundle from the three storage slices.
 * @param {{ settings: object, history?: Array, progress?: object|null }} slices
 */
export function buildBackup({ settings, history = [], progress = null }) {
  return {
    app: APP_TAG,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
    history,
    progress,
  };
}

/**
 * Parse + validate backup text. Throws with a user-facing message on any
 * problem, so the caller can surface it directly.
 * @returns {{ settings: object, history: Array, progress: object|null }}
 */
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!data || typeof data !== 'object' || data.app !== APP_TAG) {
    throw new Error('That is not a Lean Build backup file.');
  }
  if (!data.settings || typeof data.settings !== 'object') {
    throw new Error('Backup is missing its settings data.');
  }
  if (!Array.isArray(data.history)) {
    throw new Error('Backup is missing its history data.');
  }
  return {
    settings: data.settings,
    history: data.history,
    progress: data.progress ?? null,
  };
}
