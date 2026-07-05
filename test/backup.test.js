import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, parseBackup, BACKUP_VERSION } from '../js/backup.js';

test('buildBackup tags the bundle and carries all three slices', () => {
  const b = buildBackup({ settings: { a: 1 }, history: [{ date: '2026-07-01' }], progress: { lastCompletedDayIndex: 2 } });
  assert.equal(b.app, 'leanbuild');
  assert.equal(b.version, BACKUP_VERSION);
  assert.equal(typeof b.exportedAt, 'string');
  assert.deepEqual(b.settings, { a: 1 });
  assert.equal(b.history.length, 1);
  assert.deepEqual(b.progress, { lastCompletedDayIndex: 2 });
});

test('buildBackup defaults history to [] and progress to null', () => {
  const b = buildBackup({ settings: {} });
  assert.deepEqual(b.history, []);
  assert.equal(b.progress, null);
});

test('parseBackup round-trips a built bundle', () => {
  const original = buildBackup({ settings: { x: 5 }, history: [{ date: '2026-07-02' }], progress: null });
  const parsed = parseBackup(JSON.stringify(original));
  assert.deepEqual(parsed.settings, { x: 5 });
  assert.equal(parsed.history.length, 1);
  assert.equal(parsed.progress, null);
});

test('parseBackup rejects invalid JSON', () => {
  assert.throws(() => parseBackup('{not json'), /valid JSON/);
});

test('parseBackup rejects a foreign file', () => {
  assert.throws(() => parseBackup(JSON.stringify({ app: 'someOtherApp', settings: {}, history: [] })), /Lean Build backup/);
});

test('parseBackup rejects a bundle missing settings', () => {
  assert.throws(() => parseBackup(JSON.stringify({ app: 'leanbuild', history: [] })), /settings/);
});

test('parseBackup rejects a bundle whose history is not an array', () => {
  assert.throws(() => parseBackup(JSON.stringify({ app: 'leanbuild', settings: {}, history: 'nope' })), /history/);
});

test('parseBackup tolerates a missing progress field', () => {
  const parsed = parseBackup(JSON.stringify({ app: 'leanbuild', settings: {}, history: [] }));
  assert.equal(parsed.progress, null);
});

test('buildBackup carries the bodyweight slice', () => {
  const b = buildBackup({ settings: {}, bodyweight: [{ date: '2026-07-01', kg: 89.5, at: 1 }] });
  assert.equal(b.bodyweight.length, 1);
  assert.equal(b.bodyweight[0].kg, 89.5);
});

test('buildBackup defaults bodyweight to []', () => {
  const b = buildBackup({ settings: {} });
  assert.deepEqual(b.bodyweight, []);
});

test('parseBackup tolerates a missing bodyweight field', () => {
  const parsed = parseBackup(JSON.stringify({ app: 'leanbuild', settings: {}, history: [] }));
  assert.deepEqual(parsed.bodyweight, []);
});

// The whole point of a backup: every piece of user-owned state survives a
// round-trip. Tweaked recovery windows, custom exercises, edited routines, the
// schedule, logged history, progress and body-weight are all user data.
test('backup round-trips ALL user data — tuned recovery hours, custom exercises, routines, schedule, history, bodyweight', () => {
  const settings = {
    // A recovery window the user tuned away from the shipped default via the
    // Recovery tab — must come back exactly.
    recoveryHours: { chest: 72, quads: 55, front_delts: 40 },
    exercises: [
      { id: 'my-custom-lift', name: 'My Lift', setsCount: 5, muscles: { chest: 'prime_mover' }, weightStep: 2.5 },
    ],
    routines: [{ id: 'r1', name: 'My Split', exerciseIds: ['my-custom-lift'], colorVar: '--push' }],
    schedule: { '1': 'r1', '3': null },
    planVersion: 10,
  };
  const history = [{ sessionId: 's_1', date: '2026-07-04', routineId: 'r1', exercises: [{ exerciseId: 'my-custom-lift', name: 'My Lift', sets: [{ weight: 60, reps: 8, rpe: 9 }] }] }];
  const progress = { lastCompletedDayIndex: 'r1', lastCompletedAt: '2026-07-04' };
  const bodyweight = [{ date: '2026-07-04', kg: 88.2, at: 123 }];

  const parsed = parseBackup(JSON.stringify(buildBackup({ settings, history, progress, bodyweight })));

  assert.deepEqual(parsed.settings.recoveryHours, { chest: 72, quads: 55, front_delts: 40 }, 'tuned recovery windows preserved');
  assert.deepEqual(parsed.settings.exercises, settings.exercises, 'custom exercises preserved');
  assert.deepEqual(parsed.settings.routines, settings.routines, 'routines preserved');
  assert.deepEqual(parsed.settings.schedule, settings.schedule, 'schedule preserved');
  assert.equal(parsed.settings.planVersion, 10, 'plan version preserved');
  assert.deepEqual(parsed.history, history, 'logged history (incl. per-set RPE) preserved');
  assert.deepEqual(parsed.progress, progress, 'progress preserved');
  assert.deepEqual(parsed.bodyweight, bodyweight, 'body-weight log preserved');
});
