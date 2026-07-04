// Body-weight series math. Pure: no DOM/storage (persistence lives in store.js).
//
// The raw scale reading bounces day to day from water, food, and sodium, so the
// signal that matters for fat loss is the smoothed average, not any one weigh-in.
// A trailing moving average filters that noise; the trend compares the latest
// smoothed value to one a chosen span earlier.

const DEFAULT_WINDOW_DAYS = 7;

/** Entries sorted oldest→newest by date (stable for same-day entries). */
function sortedByDate(entries) {
  return [...(entries ?? [])]
    .filter(e => e && Number.isFinite(Number(e.kg)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/**
 * Trailing simple moving average. Each point averages up to `windowDays`
 * entries ending at that point (fewer near the start, so the line still begins
 * at the first weigh-in rather than after a full window).
 *
 * @param {Array<{date:string, kg:number}>} entries
 * @param {number} [windowDays]
 * @returns {Array<{ date:string, weight:number }>}
 */
export function movingAverage(entries, windowDays = DEFAULT_WINDOW_DAYS) {
  const rows = sortedByDate(entries);
  const win = windowDays > 0 ? windowDays : DEFAULT_WINDOW_DAYS;
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const start = Math.max(0, i - win + 1);
    let sum = 0;
    for (let j = start; j <= i; j++) sum += Number(rows[j].kg);
    const avg = sum / (i - start + 1);
    out.push({ date: rows[i].date, weight: Math.round(avg * 10) / 10 });
  }
  return out;
}

/**
 * Latest raw weigh-in, or null.
 * @param {Array<{date:string, kg:number}>} entries
 * @returns {{ date:string, kg:number } | null}
 */
export function latestEntry(entries) {
  const rows = sortedByDate(entries);
  return rows.length ? rows[rows.length - 1] : null;
}

/**
 * Change in the smoothed average over the last `spanDays` of data. Positive =
 * gaining, negative = losing. Null when there isn't enough history to compare.
 *
 * @param {Array<{date:string, kg:number}>} entries
 * @param {number} [spanDays]
 * @param {number} [windowDays]
 * @returns {{ deltaKg:number, fromDate:string, toDate:string } | null}
 */
export function weightTrend(entries, spanDays = 7, windowDays = DEFAULT_WINDOW_DAYS) {
  const ma = movingAverage(entries, windowDays);
  if (ma.length < 2) return null;
  const latest = ma[ma.length - 1];
  const cutoff = daysBefore(latest.date, spanDays);
  // Newest smoothed point at or before the cutoff; fall back to the oldest.
  let ref = ma[0];
  for (const p of ma) {
    if (p.date <= cutoff) ref = p; else break;
  }
  if (ref.date === latest.date) return null;
  return {
    deltaKg: Math.round((latest.weight - ref.weight) * 10) / 10,
    fromDate: ref.date,
    toDate: latest.date,
  };
}

/** 'YYYY-MM-DD' shifted back `days`, in UTC (dates are calendar-only). */
function daysBefore(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
