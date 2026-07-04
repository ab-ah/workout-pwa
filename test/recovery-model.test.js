import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FULL_DEPLETION_SETS,
  sessionDepletion,
  muscleFreshness,
  routineReadiness,
  hoursUntilFresh,
} from '../js/recovery-model.js';

const HOUR = 3600000;

// Build a settings object the pure model can read (no localStorage needed).
function makeSettings(exercises, recoveryHours = {}) {
  return { exercises, recoveryHours };
}

function sets(n) {
  return Array.from({ length: n }, () => ({ weight: 20, reps: 10 }));
}

// ─── sessionDepletion: volume weighting ──────────────────────────────────────

test('sessionDepletion scales with set count and saturates', () => {
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }]);
  const oneSet = sessionDepletion('chest', { exercises: [{ exerciseId: 'bench', sets: sets(1) }] }, settings);
  const fourSets = sessionDepletion('chest', { exercises: [{ exerciseId: 'bench', sets: sets(4) }] }, settings);
  const eightSets = sessionDepletion('chest', { exercises: [{ exerciseId: 'bench', sets: sets(8) }] }, settings);

  assert.ok(oneSet < fourSets, 'more sets deplete more');
  // FULL_DEPLETION_SETS of a prime mover leaves ~10% freshness
  assert.ok(Math.abs(fourSets - 0.9) < 0.02, `4 prime-mover sets ~= 0.9, got ${fourSets}`);
  // Diminishing returns: 4→8 adds far less than 0→4
  assert.ok(eightSets - fourSets < fourSets - oneSet, 'diminishing returns');
});

test('sessionDepletion ranks roles: stabilizer < synergist < prime_mover for equal sets', () => {
  const settings = makeSettings([
    { id: 'a', muscles: { m: 'prime_mover' } },
    { id: 'b', muscles: { m: 'synergist' } },
    { id: 'c', muscles: { m: 'stabilizer' } },
  ]);
  const prime = sessionDepletion('m', { exercises: [{ exerciseId: 'a', sets: sets(3) }] }, settings);
  const syn = sessionDepletion('m', { exercises: [{ exerciseId: 'b', sets: sets(3) }] }, settings);
  const stab = sessionDepletion('m', { exercises: [{ exerciseId: 'c', sets: sets(3) }] }, settings);
  assert.ok(stab < syn && syn < prime, `expected stab<syn<prime, got ${stab},${syn},${prime}`);
});

test('sessionDepletion accumulates across exercises hitting the same muscle', () => {
  const settings = makeSettings([
    { id: 'bench', muscles: { chest: 'prime_mover' } },
    { id: 'fly', muscles: { chest: 'synergist' } },
  ]);
  const both = sessionDepletion('chest', {
    exercises: [
      { exerciseId: 'bench', sets: sets(2) },
      { exerciseId: 'fly', sets: sets(2) },
    ],
  }, settings);
  const benchOnly = sessionDepletion('chest', { exercises: [{ exerciseId: 'bench', sets: sets(2) }] }, settings);
  assert.ok(both > benchOnly, 'second exercise on same muscle adds depletion');
});

test('sessionDepletion is 0 for an uninvolved muscle', () => {
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }]);
  const d = sessionDepletion('quads', { exercises: [{ exerciseId: 'bench', sets: sets(4) }] }, settings);
  assert.equal(d, 0);
});

// ─── muscleFreshness: recovery curve + accumulation ──────────────────────────

test('muscleFreshness with no history is fully fresh', () => {
  const settings = makeSettings([], { chest: 48 });
  const { fraction, hoursAgo } = muscleFreshness('chest', [], settings);
  assert.equal(fraction, 1);
  assert.equal(hoursAgo, null);
});

test('muscleFreshness just after a session equals 1 - depletion', () => {
  const now = 1_000_000_000_000;
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }], { chest: 48 });
  const history = [{ finishedAt: now, exercises: [{ exerciseId: 'bench', sets: sets(4) }] }];
  const { fraction } = muscleFreshness('chest', history, settings, now);
  // 4 prime-mover sets ~ 0.9 depletion → ~0.1 freshness
  assert.ok(Math.abs(fraction - 0.1) < 0.02, `got ${fraction}`);
});

test('muscleFreshness recovers linearly toward 1 over the recovery window', () => {
  const now = 1_000_000_000_000;
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }], { chest: 48 });
  const finishedAt = now - 24 * HOUR; // half of 48h window
  const history = [{ finishedAt, exercises: [{ exerciseId: 'bench', sets: sets(4) }] }];
  const { fraction } = muscleFreshness('chest', history, settings, now);
  // depletion ~0.9, half recovered → residual ~0.45 → freshness ~0.55
  assert.ok(Math.abs(fraction - 0.55) < 0.03, `got ${fraction}`);
});

test('muscleFreshness returns fully fresh once the window has fully elapsed', () => {
  const now = 1_000_000_000_000;
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }], { chest: 48 });
  const history = [{ finishedAt: now - 60 * HOUR, exercises: [{ exerciseId: 'bench', sets: sets(4) }] }];
  const { fraction } = muscleFreshness('chest', history, settings, now);
  assert.equal(fraction, 1);
});

test('muscleFreshness accumulates fatigue across multiple recent sessions', () => {
  const now = 1_000_000_000_000;
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }], { chest: 48 });
  const single = [{ finishedAt: now - 24 * HOUR, exercises: [{ exerciseId: 'bench', sets: sets(3) }] }];
  const doubled = [
    { finishedAt: now - 24 * HOUR, exercises: [{ exerciseId: 'bench', sets: sets(3) }] },
    { finishedAt: now - 12 * HOUR, exercises: [{ exerciseId: 'bench', sets: sets(3) }] },
  ];
  const one = muscleFreshness('chest', single, settings, now).fraction;
  const two = muscleFreshness('chest', doubled, settings, now).fraction;
  assert.ok(two < one, 'two sessions leave the muscle less fresh than one');
  assert.ok(two >= 0, 'freshness never goes negative');
});

test('muscleFreshness hoursAgo reports the most recent hit', () => {
  const now = 1_000_000_000_000;
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }], { chest: 48 });
  const history = [
    { finishedAt: now - 30 * HOUR, exercises: [{ exerciseId: 'bench', sets: sets(2) }] },
    { finishedAt: now - 6 * HOUR, exercises: [{ exerciseId: 'bench', sets: sets(2) }] },
  ];
  const { hoursAgo } = muscleFreshness('chest', history, settings, now);
  assert.ok(Math.abs(hoursAgo - 6) < 0.001, `got ${hoursAgo}`);
});

// ─── routineReadiness ────────────────────────────────────────────────────────

test('routineReadiness is 1 when fresh and weights muscles by projected volume', () => {
  const settings = makeSettings([
    { id: 'bench', setsCount: 4, muscles: { chest: 'prime_mover', triceps: 'synergist' } },
    { id: 'ohp', setsCount: 3, muscles: { shoulders: 'prime_mover', triceps: 'synergist' } },
  ], { chest: 48, triceps: 48, shoulders: 48 });
  const routine = { exerciseIds: ['bench', 'ohp'] };
  const { readiness, perMuscle } = routineReadiness(routine, settings, [], 1_000_000_000_000);
  assert.equal(readiness, 1, 'all muscles fresh → fully ready');

  const chest = perMuscle.find(p => p.muscle === 'chest');
  const shoulders = perMuscle.find(p => p.muscle === 'shoulders');
  const triceps = perMuscle.find(p => p.muscle === 'triceps');

  // weight is now projected depletion for today's planned sets, in (0, 1)
  assert.ok(chest.weight > 0 && chest.weight < 1, `got ${chest.weight}`);
  // triceps is worked by BOTH exercises, but only as a synergist.
  assert.ok(triceps.weight > 0 && triceps.weight < chest.weight, `triceps ${triceps.weight} should be below chest ${chest.weight}`);
  // chest gets 4 prime sets vs shoulders 3 → chest weighted heavier
  assert.ok(chest.weight > shoulders.weight, `chest ${chest.weight} <= shoulders ${shoulders.weight}`);
});

test('routineReadiness weights a heavily-worked muscle above a lightly-worked one', () => {
  // Both prime movers, so the OLD role-weight model would weight them equally.
  // Load-weighting must weight the 5-set muscle above the 1-set muscle.
  const settings = makeSettings([
    { id: 'press', setsCount: 5, muscles: { chest: 'prime_mover' } },
    { id: 'curl', setsCount: 1, muscles: { biceps: 'prime_mover' } },
  ], { chest: 48, biceps: 48 });
  const routine = { exerciseIds: ['press', 'curl'] };
  const { perMuscle } = routineReadiness(routine, settings, [], 1_000_000_000_000);
  const chest = perMuscle.find(p => p.muscle === 'chest');
  const biceps = perMuscle.find(p => p.muscle === 'biceps');
  assert.ok(chest.weight > biceps.weight, `chest ${chest.weight} should exceed biceps ${biceps.weight}`);
});

test('routineReadiness drops when a prime mover is depleted, sorted worst-first', () => {
  const now = 1_000_000_000_000;
  const settings = makeSettings([
    { id: 'bench', setsCount: 4, muscles: { chest: 'prime_mover', triceps: 'synergist' } },
  ], { chest: 48, triceps: 48 });
  const routine = { exerciseIds: ['bench'] };
  const history = [{ finishedAt: now - 2 * HOUR, exercises: [{ exerciseId: 'bench', sets: sets(4) }] }];
  const { readiness, perMuscle } = routineReadiness(routine, settings, history, now);
  assert.ok(readiness < 0.6, `depleted routine should read low, got ${readiness}`);
  assert.equal(perMuscle[0].muscle, 'chest', 'least-fresh muscle sorted first');
  assert.ok(perMuscle[0].freshness <= perMuscle[perMuscle.length - 1].freshness);
});

test('routineReadiness uses the strongest role when a muscle appears in several exercises', () => {
  const settings = makeSettings([
    { id: 'row', setsCount: 4, muscles: { lats: 'prime_mover' } },
    { id: 'pullover', setsCount: 3, muscles: { lats: 'synergist' } },
  ], { lats: 72 });
  const routine = { exerciseIds: ['pullover', 'row'] };
  const { perMuscle } = routineReadiness(routine, settings, [], 1_000_000_000_000);
  const lats = perMuscle.find(p => p.muscle === 'lats');
  assert.equal(lats.role, 'prime_mover', 'takes the highest role across the routine');
});

test('FULL_DEPLETION_SETS is a sane reference constant', () => {
  assert.ok(FULL_DEPLETION_SETS >= 3 && FULL_DEPLETION_SETS <= 6);
});

// ─── hoursUntilFresh ─────────────────────────────────────────────────────────

test('hoursUntilFresh is 0 for a fully rested muscle', () => {
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }], { chest: 48 });
  assert.equal(hoursUntilFresh('chest', [], settings, 0.9, 1_000_000_000_000), 0);
});

test('hoursUntilFresh returns a positive ETA right after a hard session', () => {
  const now = 1_000_000_000_000;
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }], { chest: 48 });
  const history = [{ finishedAt: now, exercises: [{ exerciseId: 'bench', sets: sets(4) }] }];
  const eta = hoursUntilFresh('chest', history, settings, 0.9, now);
  assert.ok(eta > 0 && eta <= 48, `expected 0<eta<=48, got ${eta}`);
});

test('hoursUntilFresh shrinks as recovery progresses', () => {
  const now = 1_000_000_000_000;
  const settings = makeSettings([{ id: 'bench', muscles: { chest: 'prime_mover' } }], { chest: 48 });
  const fresh = [{ finishedAt: now, exercises: [{ exerciseId: 'bench', sets: sets(4) }] }];
  const older = [{ finishedAt: now - 24 * HOUR, exercises: [{ exerciseId: 'bench', sets: sets(4) }] }];
  const etaFresh = hoursUntilFresh('chest', fresh, settings, 0.9, now);
  const etaOlder = hoursUntilFresh('chest', older, settings, 0.9, now);
  assert.ok(etaOlder < etaFresh, `older session should have smaller ETA (${etaOlder} < ${etaFresh})`);
});
