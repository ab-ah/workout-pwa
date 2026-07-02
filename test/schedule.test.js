import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMissedWorkout, localDateStr } from '../js/schedule.js';

// Fixed reference: Thursday 2 July 2026, noon local.
const NOW = new Date(2026, 6, 2, 12, 0, 0).getTime();
const DAY = 86400000;

const routines = [
  { id: 'push', name: 'Push Day' },
  { id: 'pull', name: 'Pull Day' },
  { id: 'legs', name: 'Legs + Core' },
];
// Wed=3 → pull, Tue=2 → push, Mon=1 → legs
const schedule = { '1': 'legs', '2': 'push', '3': 'pull' };

test('flags yesterday’s scheduled routine when nothing was logged', () => {
  const missed = findMissedWorkout(schedule, routines, [], NOW);
  assert.ok(missed);
  assert.equal(missed.routine.id, 'pull'); // Wednesday
  assert.equal(missed.dayName, 'Wednesday');
  assert.equal(missed.daysAgo, 1);
  assert.equal(missed.dateStr, '2026-07-01');
});

test('does not flag a day you logged any session on', () => {
  const history = [{ date: '2026-07-01', dayIndex: 'pull' }];
  const missed = findMissedWorkout(schedule, routines, history, NOW);
  // Wednesday satisfied → should look further back to Tuesday (push)
  assert.equal(missed.routine.id, 'push');
  assert.equal(missed.daysAgo, 2);
});

test('does not flag a routine performed on a later make-up day', () => {
  // Missed pull on Wed but did pull today-ish (later date) → not flagged
  const history = [{ date: '2026-07-02', dayIndex: 'pull' }];
  const missed = findMissedWorkout(schedule, routines, history, NOW);
  assert.notEqual(missed?.routine.id, 'pull');
});

test('returns null when the whole lookback window is satisfied or empty', () => {
  const history = [
    { date: '2026-07-01', dayIndex: 'pull' },
    { date: '2026-06-30', dayIndex: 'push' },
    { date: '2026-06-29', dayIndex: 'legs' },
  ];
  assert.equal(findMissedWorkout(schedule, routines, history, NOW), null);
});

test('respects a shorter lookback window', () => {
  // Only look back 1 day; Wednesday was logged → nothing within window
  const history = [{ date: '2026-07-01', dayIndex: 'pull' }];
  const missed = findMissedWorkout(schedule, routines, history, NOW, { lookbackDays: 1 });
  assert.equal(missed, null);
});

test('ignores rest days (no routine scheduled)', () => {
  const restSchedule = { '3': null };
  assert.equal(findMissedWorkout(restSchedule, routines, [], NOW), null);
});

test('localDateStr formats local YYYY-MM-DD', () => {
  assert.equal(localDateStr(NOW), '2026-07-02');
  assert.equal(localDateStr(NOW - DAY), '2026-07-01');
});
