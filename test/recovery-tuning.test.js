import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nudgeRecoveryHours } from '../js/recovery-tuning.js';

test('sore lengthens the window by ~10%', () => {
  assert.equal(nudgeRecoveryHours(48, 'sore'), 53); // 48 * 1.1 = 52.8 → 53
});

test('fresh shortens the window by ~10%', () => {
  assert.equal(nudgeRecoveryHours(48, 'fresh'), 43); // 48 * 0.9 = 43.2 → 43
});

test('repeated nudges compound', () => {
  let h = 48;
  h = nudgeRecoveryHours(h, 'sore'); // 53
  h = nudgeRecoveryHours(h, 'sore'); // 58
  assert.ok(h > 55);
});

test('clamps to the minimum', () => {
  assert.equal(nudgeRecoveryHours(12, 'fresh'), 12);
  assert.equal(nudgeRecoveryHours(13, 'fresh', { min: 12 }), 12);
});

test('clamps to the maximum', () => {
  assert.equal(nudgeRecoveryHours(168, 'sore'), 168);
});

test('an unknown direction leaves the value unchanged (rounded)', () => {
  assert.equal(nudgeRecoveryHours(50, 'whatever'), 50);
});

test('falls back to 48h when current is missing or invalid', () => {
  assert.equal(nudgeRecoveryHours(undefined, 'sore'), 53);
  assert.equal(nudgeRecoveryHours(0, 'fresh'), 43);
});
