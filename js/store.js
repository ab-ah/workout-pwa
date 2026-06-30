export const PROGRESS_KEY = 'leanbuild-plan-progress-v2';
export const HISTORY_KEY = 'leanbuild-history-v2';

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

  function getNextDayIndex(planLength, progress) {
    return (progress.lastCompletedDayIndex + 1) % planLength;
  }

  function getHistory() {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    storage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function addSession(session) {
    const history = getHistory();
    history.push(session);
    saveHistory(history);
    saveProgress({ lastCompletedDayIndex: session.dayIndex, lastCompletedAt: session.date });
    return history;
  }

  function getExerciseHistory(exerciseId) {
    const history = getHistory();
    const points = [];
    for (const session of history) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const heaviest = ex.sets.reduce((best, s) => (s.weight > best.weight ? s : best), ex.sets[0]);
        points.push({ date: session.date, weight: heaviest.weight, reps: heaviest.reps });
      }
    }
    return points;
  }

  return { getProgress, saveProgress, getNextDayIndex, getHistory, saveHistory, addSession, getExerciseHistory };
}
