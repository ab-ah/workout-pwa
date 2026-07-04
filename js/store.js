export const PROGRESS_KEY = 'leanbuild-plan-progress-v2';
export const HISTORY_KEY = 'leanbuild-history-v2';
export const BODYWEIGHT_KEY = 'leanbuild-bodyweight-v1';

const DEFAULT_PROGRESS = { lastCompletedDayIndex: -1, lastCompletedAt: null };

export function createStore(storage) {
  function getProgress() {
    const raw = storage.getItem(PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    try {
      return JSON.parse(raw);
    } catch {
      return { ...DEFAULT_PROGRESS };
    }
  }

  function saveProgress(progress) {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function getHistory() {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normalizeSession) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    storage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function addSession(session) {
    const normalized = normalizeSession(session);
    const history = [...getHistory(), normalized];
    saveHistory(history);
    saveProgress({ lastCompletedDayIndex: normalized.routineId, lastCompletedAt: normalized.date });
    return history;
  }

  /**
   * Patch a stored session in place (matched by sessionId) and persist.
   * Used by the History tab to edit a logged workout's date/time.
   */
  function updateSession(sessionId, patch) {
    const history = getHistory().map((s) =>
      s.sessionId === sessionId ? normalizeSession({ ...s, ...patch }) : s
    );
    saveHistory(history);
    return history;
  }

  function getExerciseHistory(exerciseId) {
    const history = getHistory();
    const points = [];
    for (const session of history) {
      const ex = (session.exercises ?? []).find((e) => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const heaviest = ex.sets.reduce((best, s) => (s.weight > best.weight ? s : best), ex.sets[0]);
        points.push({ date: session.date, weight: heaviest.weight, reps: heaviest.reps });
      }
    }
    return points;
  }

  function getBodyweights() {
    const raw = storage.getItem(BODYWEIGHT_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Record a weigh-in. One entry per calendar date — logging again the same day
   * overwrites it (the latest reading wins) rather than stacking duplicates.
   * @param {{ date: string, kg: number, at?: number }} entry
   */
  function addBodyweight(entry) {
    const kg = Number(entry?.kg);
    if (!Number.isFinite(kg) || kg <= 0) return getBodyweights();
    const date = entry.date;
    const at = typeof entry.at === 'number' ? entry.at : Date.now();
    const rest = getBodyweights().filter((e) => e.date !== date);
    const next = [...rest, { date, kg, at }].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    storage.setItem(BODYWEIGHT_KEY, JSON.stringify(next));
    return next;
  }

  return {
    getProgress, saveProgress, getHistory, saveHistory, addSession, updateSession,
    getExerciseHistory, getBodyweights, addBodyweight,
  };
}

function normalizeSession(session) {
  const exercises = Array.isArray(session?.exercises)
    ? session.exercises.map(ex => ({
        ...ex,
        sets: Array.isArray(ex?.sets) ? ex.sets : [],
      }))
    : [];
  return { ...session, exercises };
}
