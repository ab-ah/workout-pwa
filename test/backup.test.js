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
