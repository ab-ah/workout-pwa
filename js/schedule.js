// Detect a recently-scheduled workout that was never logged, so the Today
// screen can suggest doing it instead. Pure: no DOM, no storage.

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MS_PER_DAY = 86400000;
const DEFAULT_LOOKBACK_DAYS = 3;

/** Local-time YYYY-MM-DD for a timestamp. */
export function localDateStr(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The most recent prior scheduled workout (within the lookback window) that was
 * never logged and has not been performed since. Days closer to today win.
 *
 * A day is NOT flagged if:
 *   - nothing was scheduled that day, or
 *   - any session was logged on that date (you trained something), or
 *   - the scheduled routine was performed on/after that date.
 *
 * @param {Object<string,string|null>} schedule  dow → routineId
 * @param {Array<{id:string,name:string}>} routines
 * @param {Array<{date:string, dayIndex?:string}>} history
 * @param {number} [now]
 * @param {{ lookbackDays?: number }} [opts]
 * @returns {{ routine, dow, dayName, dateStr, daysAgo } | null}
 */
export function findMissedWorkout(schedule, routines, history, now = Date.now(), opts = {}) {
  const lookback = opts.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const routineById = new Map((routines ?? []).map(r => [r.id, r]));
  const loggedDates = new Set((history ?? []).map(s => s.date));

  for (let daysAgo = 1; daysAgo <= lookback; daysAgo++) {
    const ts = now - daysAgo * MS_PER_DAY;
    const dow = new Date(ts).getDay();
    const routineId = (schedule ?? {})[String(dow)];
    if (!routineId) continue;

    const routine = routineById.get(routineId);
    if (!routine) continue;

    const dateStr = localDateStr(ts);
    if (loggedDates.has(dateStr)) continue; // trained something that day

    // Skip if the routine itself was done on or after that day (a late make-up).
    const doneSince = (history ?? []).some(s => s.dayIndex === routineId && s.date >= dateStr);
    if (doneSince) continue;

    return { routine, dow, dayName: DAY_NAMES[dow], dateStr, daysAgo };
  }
  return null;
}
