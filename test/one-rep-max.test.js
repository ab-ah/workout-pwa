import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  epley1RM, bestE1RM, loadForReps, loadForPercent, roundLoad,
  bestE1RMForExercise, e1rmSeries, isE1RMPRInSession, stallCount,
} from '../js/one-rep-max.js';

test('epley1RM returns raw weight for a single', () => {
  assert.equal(epley1RM(100, 1), 100);
});

test('epley1RM applies the 1 + reps/30 factor', () => {
  assert.equal(epley1RM(100, 5), 100 * (1 + 5 / 30));
});

test('epley1RM rejects bodyweight and bad input', () => {
  assert.equal(epley1RM(0, 12), null);
  assert.equal(epley1RM(50, 0), null);
  assert.equal(epley1RM(NaN, 5), null);
});

test('bestE1RM picks the highest estimate across sets', () => {
  const sets = [{ weight: 60, reps: 8 }, { weight: 80, reps: 3 }, { weight: 70, reps: 5 }];
  // 80x3 = 88, 70x5 = 81.67, 60x8 = 76 → 88 wins
  assert.equal(Math.round(bestE1RM(sets)), 88);
});

test('bestE1RM is null when no set has load', () => {
  assert.equal(bestE1RM([{ weight: 0, reps: 60 }]), null);
});

test('loadForReps inverts epley', () => {
  const e = epley1RM(100, 5);
  assert.equal(Math.round(loadForReps(e, 5)), 100);
});

test('loadForPercent scales the estimate', () => {
  assert.equal(loadForPercent(100, 0.5), 50);
  assert.equal(loadForPercent(100, 0), null);
});

test('roundLoad snaps to the increment', () => {
  assert.equal(roundLoad(41, 2.5), 40);
  assert.equal(roundLoad(43.9, 2.5), 45);
  assert.equal(roundLoad(41.2, 0.5), 41);
});

test('bestE1RMForExercise scans all sessions', () => {
  const history = [
    { exercises: [{ exerciseId: 'bench', sets: [{ weight: 60, reps: 5 }] }] },
    { exercises: [{ exerciseId: 'bench', sets: [{ weight: 70, reps: 5 }] }] },
    { exercises: [{ exerciseId: 'row', sets: [{ weight: 90, reps: 5 }] }] },
  ];
  assert.equal(Math.round(bestE1RMForExercise(history, 'bench')), Math.round(epley1RM(70, 5)));
  assert.equal(bestE1RMForExercise(history, 'nope'), null);
});

test('e1rmSeries yields one point per session that trained the exercise', () => {
  const history = [
    { date: '2026-01-01', exercises: [{ exerciseId: 'bench', sets: [{ weight: 60, reps: 5 }] }] },
    { date: '2026-01-03', exercises: [{ exerciseId: 'row', sets: [{ weight: 90, reps: 5 }] }] },
    { date: '2026-01-05', exercises: [{ exerciseId: 'bench', sets: [{ weight: 65, reps: 5 }] }] },
  ];
  const series = e1rmSeries(history, 'bench');
  assert.equal(series.length, 2);
  assert.equal(series[0].date, '2026-01-01');
  assert.equal(series[1].date, '2026-01-05');
});

test('isE1RMPRInSession flags a session that beat all earlier ones', () => {
  const history = [
    { sessionId: 's1', exercises: [{ exerciseId: 'bench', sets: [{ weight: 60, reps: 5 }] }] },
    { sessionId: 's2', exercises: [{ exerciseId: 'bench', sets: [{ weight: 70, reps: 5 }] }] },
    { sessionId: 's3', exercises: [{ exerciseId: 'bench', sets: [{ weight: 65, reps: 5 }] }] },
  ];
  assert.equal(isE1RMPRInSession(history, 's1', 'bench'), true);  // first is a PR
  assert.equal(isE1RMPRInSession(history, 's2', 'bench'), true);  // beat s1
  assert.equal(isE1RMPRInSession(history, 's3', 'bench'), false); // below s2
});

test('stallCount is zero when the latest session set a new e1RM best', () => {
  const history = [
    { date: '2026-01-01', exercises: [{ exerciseId: 'bench', sets: [{ weight: 60, reps: 5 }] }] },
    { date: '2026-01-08', exercises: [{ exerciseId: 'bench', sets: [{ weight: 65, reps: 5 }] }] },
  ];
  assert.equal(stallCount(history, 'bench'), 0);
});

test('stallCount counts trailing sessions that never beat the running best', () => {
  const history = [
    { date: 'a', exercises: [{ exerciseId: 'bench', sets: [{ weight: 70, reps: 5 }] }] }, // best
    { date: 'b', exercises: [{ exerciseId: 'bench', sets: [{ weight: 60, reps: 5 }] }] },
    { date: 'c', exercises: [{ exerciseId: 'bench', sets: [{ weight: 65, reps: 5 }] }] },
    { date: 'd', exercises: [{ exerciseId: 'bench', sets: [{ weight: 60, reps: 5 }] }] },
  ];
  assert.equal(stallCount(history, 'bench'), 3); // b, c, d all below the 70 set at a
});

test('stallCount needs at least two data points', () => {
  const history = [{ date: 'a', exercises: [{ exerciseId: 'bench', sets: [{ weight: 60, reps: 5 }] }] }];
  assert.equal(stallCount(history, 'bench'), 0);
  assert.equal(stallCount([], 'bench'), 0);
});
