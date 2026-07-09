import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deloadModeFrom, deloadSetTarget, DELOAD_DAYS } from '../js/deload-mode.js';

const MS_PER_DAY = 86400000;

test('deloadSetTarget cuts ~40% of sets, floored at 1', () => {
  assert.equal(deloadSetTarget(4), 2);
  assert.equal(deloadSetTarget(3), 2);
  assert.equal(deloadSetTarget(2), 1);
  assert.equal(deloadSetTarget(1), 1);
});

test('deloadModeFrom: null record is inactive', () => {
  const s = deloadModeFrom(null, 1000);
  assert.equal(s.active, false);
  assert.equal(s.startedAt, null);
  assert.equal(s.daysLeft, 0);
});

test('deloadModeFrom: fresh start is active with full days left', () => {
  const now = 1_000_000_000_000;
  const s = deloadModeFrom({ startedAt: now }, now);
  assert.equal(s.active, true);
  assert.equal(s.daysLeft, DELOAD_DAYS);
  assert.equal(s.endsAt, now + DELOAD_DAYS * MS_PER_DAY);
});

test('deloadModeFrom: mid-week reports remaining days', () => {
  const start = 1_000_000_000_000;
  const now = start + 2 * MS_PER_DAY; // two days in
  const s = deloadModeFrom({ startedAt: start }, now);
  assert.equal(s.active, true);
  assert.equal(s.daysLeft, DELOAD_DAYS - 2);
});

test('deloadModeFrom: expired after DELOAD_DAYS', () => {
  const start = 1_000_000_000_000;
  const now = start + (DELOAD_DAYS + 1) * MS_PER_DAY;
  const s = deloadModeFrom({ startedAt: start }, now);
  assert.equal(s.active, false);
  assert.equal(s.daysLeft, 0);
});
