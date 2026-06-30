import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRemainingSeconds } from '../js/components/rest-timer.js';

test('computeRemainingSeconds returns full duration when just started', () => {
  const now = 1000000;
  const endTimestamp = now + 90000;
  assert.equal(computeRemainingSeconds(endTimestamp, now), 90);
});

test('computeRemainingSeconds counts down correctly', () => {
  const now = 1000000;
  const endTimestamp = now + 30500;
  assert.equal(computeRemainingSeconds(endTimestamp, now), 31);
});

test('computeRemainingSeconds floors at zero, never negative', () => {
  const now = 1000000;
  const endTimestamp = now - 5000;
  assert.equal(computeRemainingSeconds(endTimestamp, now), 0);
});
