import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/store.js';

function makeMemoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k)
  };
}

test('getProgress returns default when nothing stored', () => {
  const store = createStore(makeMemoryStorage());
  assert.deepEqual(store.getProgress(), { lastCompletedDayIndex: -1, lastCompletedAt: null });
});

test('getProgress survives corrupted JSON', () => {
  const storage = makeMemoryStorage();
  storage.setItem('leanbuild-plan-progress-v2', '{not json');
  const store = createStore(storage);
  assert.deepEqual(store.getProgress(), { lastCompletedDayIndex: -1, lastCompletedAt: null });
});

test('getHistory returns empty array when nothing stored', () => {
  const store = createStore(makeMemoryStorage());
  assert.deepEqual(store.getHistory(), []);
});

test('addSession appends to history and advances progress', () => {
  const store = createStore(makeMemoryStorage());
  const session = {
    sessionId: 's_1',
    routineId: 2,
    dayTitle: 'Legs + Core',
    date: '2026-06-29',
    startedAt: 1,
    finishedAt: 2,
    exercises: [{ exerciseId: 'goblet-squat', name: 'Goblet Squat', sets: [{ weight: 26, reps: 9 }] }]
  };
  store.addSession(session);
  assert.deepEqual(store.getHistory(), [session]);
  assert.deepEqual(store.getProgress(), { lastCompletedDayIndex: 2, lastCompletedAt: '2026-06-29' });
});

test('addSession normalizes missing exercise lists so history consumers can render it', () => {
  const store = createStore(makeMemoryStorage());
  const session = {
    sessionId: 's_2',
    routineId: 'push',
    dayTitle: 'Push Day',
    date: '2026-07-02',
    startedAt: 1,
    finishedAt: 2,
  };

  store.addSession(session);

  assert.deepEqual(store.getHistory()[0].exercises, []);
  assert.deepEqual(store.getProgress(), { lastCompletedDayIndex: 'push', lastCompletedAt: '2026-07-02' });
});

test('getHistory normalizes malformed exercise sets from stored sessions', () => {
  const storage = makeMemoryStorage();
  storage.setItem('leanbuild-history-v2', JSON.stringify([
    {
      sessionId: 's_3',
      routineId: 'pull',
      dayTitle: 'Pull Day',
      date: '2026-07-02',
      exercises: [{ exerciseId: 'row', name: 'Row' }],
    },
  ]));
  const store = createStore(storage);

  assert.deepEqual(store.getHistory()[0].exercises[0].sets, []);
});

test('getExerciseHistory returns the heaviest set per session, sorted by insertion order', () => {
  const store = createStore(makeMemoryStorage());
  store.addSession({
    sessionId: 's_1', routineId: 2, dayTitle: 'Legs + Core', date: '2026-06-20',
    startedAt: 1, finishedAt: 2,
    exercises: [{ exerciseId: 'goblet-squat', name: 'Goblet Squat', sets: [{ weight: 24, reps: 10 }, { weight: 26, reps: 8 }] }]
  });
  store.addSession({
    sessionId: 's_2', routineId: 2, dayTitle: 'Legs + Core', date: '2026-06-27',
    startedAt: 1, finishedAt: 2,
    exercises: [{ exerciseId: 'goblet-squat', name: 'Goblet Squat', sets: [{ weight: 28, reps: 7 }] }]
  });
  assert.deepEqual(store.getExerciseHistory('goblet-squat'), [
    { date: '2026-06-20', weight: 26, reps: 8 },
    { date: '2026-06-27', weight: 28, reps: 7 }
  ]);
});

test('getExerciseHistory ignores sessions that did not include the exercise', () => {
  const store = createStore(makeMemoryStorage());
  store.addSession({
    sessionId: 's_1', routineId: 0, dayTitle: 'Push', date: '2026-06-20',
    startedAt: 1, finishedAt: 2,
    exercises: [{ exerciseId: 'flat-barbell-bench-press', name: 'Bench', sets: [{ weight: 50, reps: 8 }] }]
  });
  assert.deepEqual(store.getExerciseHistory('goblet-squat'), []);
});

test('getHistory returns empty array when JSON is corrupted', () => {
  const storage = makeMemoryStorage();
  storage.setItem('leanbuild-history-v2', '[not json');
  const store = createStore(storage);
  assert.deepEqual(store.getHistory(), []);
});
