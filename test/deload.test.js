import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deloadStatus, isoWeekKey } from '../js/deload.js';

const DAY = 86400000;

// A Thursday anchor keeps each week's 3 sessions (Thu/Wed/Tue) inside one ISO
// week, and stepping back 7 days lands on the previous Thursday.
function thursday(ts) {
  const dow = new Date(ts).getDay(); // 0 Sun … 6 Sat
  return ts + (4 - dow) * DAY;
}

/** `numWeeks` consecutive weeks ending at `now`, each with `perWeek` sessions. */
function weeksOfTraining(now, numWeeks, perWeek = 3) {
  const h = [];
  for (let w = 0; w < numWeeks; w++) {
    for (let d = 0; d < perWeek; d++) {
      const ts = now - w * 7 * DAY - d * DAY;
      h.push({ date: new Date(ts).toISOString().slice(0, 10), finishedAt: ts });
    }
  }
  return h;
}

test('isoWeekKey is stable within a week and rolls over between weeks', () => {
  const now = thursday(new Date('2026-07-15T12:00:00').getTime());
  assert.equal(isoWeekKey(now), isoWeekKey(now - 2 * DAY)); // Thu vs Tue, same week
  assert.notEqual(isoWeekKey(now), isoWeekKey(now - 7 * DAY));
});

test('deloadStatus flags a deload after 5 hard weeks straight', () => {
  const now = thursday(new Date('2026-07-15T12:00:00').getTime());
  const { weeksTrained, deloadDue, message } = deloadStatus(weeksOfTraining(now, 5), now);
  assert.ok(weeksTrained >= 5);
  assert.equal(deloadDue, true);
  assert.match(message, /deload/i);
});

test('deloadStatus does not flag a short training block', () => {
  const now = thursday(new Date('2026-07-15T12:00:00').getTime());
  const { deloadDue, message } = deloadStatus(weeksOfTraining(now, 3), now);
  assert.equal(deloadDue, false);
  assert.equal(message, null);
});

test('a light/break week resets the streak', () => {
  const now = thursday(new Date('2026-07-15T12:00:00').getTime());
  // Weeks 0 and 1 are hard; week 2 is a break (skipped); weeks 3–5 are hard.
  const recent = weeksOfTraining(now, 2);
  const older = weeksOfTraining(now - 3 * 7 * DAY, 3);
  const { weeksTrained, deloadDue } = deloadStatus([...older, ...recent], now);
  assert.equal(weeksTrained, 2); // streak stops at the break week
  assert.equal(deloadDue, false);
});

test('an unfinished current week does not break the streak', () => {
  const now = thursday(new Date('2026-07-15T12:00:00').getTime());
  // Only 1 session so far this week, but 5 full weeks behind it.
  const current = [{ date: new Date(now).toISOString().slice(0, 10), finishedAt: now }];
  const prior = weeksOfTraining(now - 7 * DAY, 5);
  const { deloadDue } = deloadStatus([...current, ...prior], now);
  assert.equal(deloadDue, true);
});

test('deloadStatus handles empty history', () => {
  const { weeksTrained, deloadDue } = deloadStatus([], Date.now());
  assert.equal(weeksTrained, 0);
  assert.equal(deloadDue, false);
});

/** Weeks ending `weeksBack` from `now`, each with `sessions` sessions of
 *  `setsEach` logged sets — so the volume-aware detector has real set data. */
function weeksWithSets(now, specs) {
  const h = [];
  for (const { weeksBack, sessions = 3, setsEach } of specs) {
    for (let d = 0; d < sessions; d++) {
      const ts = now - weeksBack * 7 * DAY - d * DAY;
      h.push({
        date: new Date(ts).toISOString().slice(0, 10),
        finishedAt: ts,
        exercises: [{ exerciseId: 'x', sets: Array.from({ length: setsEach }, () => ({ weight: 50, reps: 8 })) }],
      });
    }
  }
  return h;
}

test('a completed deload week (same sessions, ~half the sets) resets the streak', () => {
  const now = thursday(new Date('2026-07-15T12:00:00').getTime());
  const history = weeksWithSets(now, [
    { weeksBack: 1, setsEach: 2 },  // most recent COMPLETED week: deload volume
    { weeksBack: 2, setsEach: 15 }, // five hard weeks before it
    { weeksBack: 3, setsEach: 15 },
    { weeksBack: 4, setsEach: 15 },
    { weeksBack: 5, setsEach: 15 },
    { weeksBack: 6, setsEach: 15 },
  ]);
  const { weeksTrained, deloadDue } = deloadStatus(history, now);
  assert.equal(deloadDue, false, 'the deload week breaks the streak');
  assert.equal(weeksTrained, 0, 'streak counted back only to the deload dip');
});

test('same layout but a full-volume recent week keeps the deload due', () => {
  const now = thursday(new Date('2026-07-15T12:00:00').getTime());
  const history = weeksWithSets(now, [
    { weeksBack: 1, setsEach: 15 }, // recent week trained at full volume
    { weeksBack: 2, setsEach: 15 },
    { weeksBack: 3, setsEach: 15 },
    { weeksBack: 4, setsEach: 15 },
    { weeksBack: 5, setsEach: 15 },
    { weeksBack: 6, setsEach: 15 },
  ]);
  const { deloadDue } = deloadStatus(history, now);
  assert.equal(deloadDue, true, 'six full-volume weeks still flags a deload');
});
