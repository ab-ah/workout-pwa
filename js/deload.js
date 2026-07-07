// Meso-cycle deload detector. Pure: no DOM/storage.
//
// The per-muscle recovery model autoregulates ACUTE fatigue day to day, but it
// says nothing about the chronic fatigue that piles up across weeks of hard
// training — especially in a calorie deficit, where recovery capacity is lower.
// This module answers a coarser question: "have you trained enough consecutive
// hard weeks that a deload is due?" A deload week (cut volume ~40%, hold the
// weights) sheds that accumulated fatigue so progress can resume.

const MS_PER_DAY = 86400000;

// A calendar week needs at least this many logged sessions to count as a "hard"
// training week. Fewer than this reads as a natural light week / break, which
// itself resets the streak (you already deloaded by circumstance).
const MIN_TRAINING_SESSIONS = 3;

// Recommend a deload once this many consecutive hard weeks have stacked up.
const DELOAD_AFTER_WEEKS = 5;

/** ISO-8601 week key ("2026-W27") for a timestamp — weeks start Monday. */
export function isoWeekKey(ts) {
  const d = new Date(ts);
  // Shift to the Thursday of this week: ISO weeks are numbered by their Thursday.
  const day = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const week = 1 + Math.round(
    ((thursday - firstThursday) / MS_PER_DAY - 3 + ((firstThursday.getDay() + 6) % 7)) / 7
  );
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function sessionTimestamp(session) {
  if (typeof session.finishedAt === 'number') return session.finishedAt;
  const t = new Date(String(session.date) + 'T12:00:00').getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Count of hard training weeks the log ends on, and whether a deload is due.
 *
 * Weeks are walked backward from `now`. The current (possibly unfinished) week
 * is skipped if it hasn't yet reached MIN_TRAINING_SESSIONS — it isn't over, so
 * it can't break the streak. Any earlier week below the threshold DOES break it
 * (that was a light week / break, which counts as a de facto deload).
 *
 * @param {Array<{date:string, finishedAt?:number}>} history
 * @param {number} [now]
 * @param {{ minSessions?:number, deloadAfterWeeks?:number }} [opts]
 * @returns {{ weeksTrained:number, deloadDue:boolean, message:string|null }}
 */
export function deloadStatus(history, now = Date.now(), opts = {}) {
  const minSessions = opts.minSessions ?? MIN_TRAINING_SESSIONS;
  const deloadAfter = opts.deloadAfterWeeks ?? DELOAD_AFTER_WEEKS;

  // Tally sessions per ISO week.
  const perWeek = new Map();
  for (const s of (history ?? [])) {
    const ts = sessionTimestamp(s);
    if (ts == null || ts > now) continue;
    const key = isoWeekKey(ts);
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
  }

  let weeksTrained = 0;
  const currentKey = isoWeekKey(now);
  let cursor = now;
  let isCurrentWeek = true;

  // Walk back week by week (step 7 days) counting the consecutive hard-week run.
  for (let guard = 0; guard < 104; guard++) {
    const key = isoWeekKey(cursor);
    const count = perWeek.get(key) ?? 0;

    if (count >= minSessions) {
      weeksTrained++;
    } else if (!(isCurrentWeek && key === currentKey)) {
      break; // a completed light/break week ends the streak
    }

    cursor -= 7 * MS_PER_DAY;
    isCurrentWeek = false;
  }

  const deloadDue = weeksTrained >= deloadAfter;
  const message = deloadDue
    ? `You've trained ${weeksTrained} hard weeks straight. Consider a deload this week — cut each exercise to ~2 sets, hold the weights, and let accumulated fatigue clear.`
    : null;

  return { weeksTrained, deloadDue, message };
}
