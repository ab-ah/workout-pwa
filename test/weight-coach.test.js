import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weightCoach, proteinTarget, weeklyRatePct } from '../js/weight-coach.js';

test('proteinTarget scales 1.8–2.2 g/kg and rounds to 5s', () => {
  assert.deepEqual(proteinTarget(90), { low: 160, high: 200 }); // 162→160, 198→200
  assert.equal(proteinTarget(0), null);
  assert.equal(proteinTarget(NaN), null);
});

test('weeklyRatePct expresses change as a percent of body weight', () => {
  assert.equal(Math.round(weeklyRatePct(-0.9, 90) * 100) / 100, -1); // -1%/wk
  assert.equal(weeklyRatePct(-0.5, 0), null);
});

test('an on-target cut (0.4–1.0 %/wk loss) reads as ideal', () => {
  const c = weightCoach({ deltaKg: -0.5 }, 90); // -0.56%/wk
  assert.equal(c.level, 'ideal');
  assert.match(c.headline, /on-target/i);
});

test('losing faster than 1 %/wk warns to eat more and protect muscle', () => {
  const c = weightCoach({ deltaKg: -1.2 }, 90); // -1.33%/wk
  assert.equal(c.level, 'fast');
  assert.match(c.detail, /protect/i);
});

test('a gentle loss under 0.4 %/wk reads as slow', () => {
  const c = weightCoach({ deltaKg: -0.2 }, 90); // -0.22%/wk
  assert.equal(c.level, 'slow');
});

test('a flat trend suggests an intake nudge, not more training', () => {
  const c = weightCoach({ deltaKg: 0 }, 90);
  assert.equal(c.level, 'flat');
  assert.match(c.detail, /not more hard training/i);
});

test('gaining weight is flagged as trending up', () => {
  const c = weightCoach({ deltaKg: 0.5 }, 90);
  assert.equal(c.level, 'gaining');
});

test('no trend yet returns an unknown/keep-logging message', () => {
  const c = weightCoach(null, 90);
  assert.equal(c.level, 'unknown');
});

test('missing body weight yields no coaching', () => {
  assert.equal(weightCoach({ deltaKg: -0.5 }, 0), null);
  assert.equal(weightCoach({ deltaKg: -0.5 }, NaN), null);
});
