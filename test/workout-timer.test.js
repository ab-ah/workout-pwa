import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPhases, formatClock } from '../js/components/workout-timer.js';

test('buildPhases: interval mode alternates work/rest with no trailing rest', () => {
  const phases = buildPhases({ type: 'interval', workSeconds: 30, restSeconds: 60, rounds: 3 });
  assert.deepEqual(
    phases.map(p => `${p.label}:${p.seconds}:${p.round}`),
    ['Work:30:1', 'Rest:60:1', 'Work:30:2', 'Rest:60:2', 'Work:30:3'],
  );
});

test('buildPhases: a single round has no rest phase at all', () => {
  const phases = buildPhases({ type: 'interval', workSeconds: 20, restSeconds: 40, rounds: 1 });
  assert.deepEqual(phases.map(p => p.label), ['Work']);
});

test('buildPhases: duration mode is a single unlabelled-tone phase', () => {
  const phases = buildPhases({ type: 'duration', seconds: 1800 });
  assert.equal(phases.length, 1);
  assert.equal(phases[0].label, 'Walk');
  assert.equal(phases[0].seconds, 1800);
  assert.equal(phases[0].tone, null);
});

test('formatClock renders mm:ss with a zero-padded seconds field', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(5), '0:05');
  assert.equal(formatClock(65), '1:05');
  assert.equal(formatClock(1800), '30:00');
});
