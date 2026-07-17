import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateRoutineMinutes } from '../js/duration-estimate.js';

// Constants mirrored from duration-estimate.js so the arithmetic below is legible:
//   strength set work = 40s, step transition = 20s, hold fallback = 45s.

const bench = { id: 'bench', setsCount: 3, restSeconds: 90, repRange: '6–8' };
const row   = { id: 'row',   setsCount: 3, restSeconds: 60, repRange: '8–12' };
const curl  = { id: 'curl',  setsCount: 3, restSeconds: 60, repRange: '8–12' };

test('single exercise: sets × work + between-set rests, no trailing rest', () => {
  // 3×40 + 2×90 = 300s → 5 min
  const mins = estimateRoutineMinutes({ exerciseIds: ['bench'] }, [bench]);
  assert.equal(mins, 5);
});

test('two back-to-back singles include one step transition', () => {
  // row: 3×40 + 2×60 = 240; curl: 240; + 1×20 transition = 500s → 8 min
  const mins = estimateRoutineMinutes({ exerciseIds: ['row', 'curl'] }, [row, curl]);
  assert.equal(mins, 8);
});

test('a superset is faster than the same two run as singles (one shared rest/round)', () => {
  const pool = [row, curl];
  const asSingles = estimateRoutineMinutes({ exerciseIds: ['row', 'curl'] }, pool);
  // superset: rounds 3 × (40+40) + 2×max(60,60) = 240 + 120 = 360s → 6 min
  const asSuperset = estimateRoutineMinutes(
    { exerciseIds: ['row', 'curl'], supersets: [['row', 'curl']] },
    pool,
  );
  assert.equal(asSuperset, 6);
  assert.ok(asSuperset < asSingles, 'superset should estimate shorter than two singles');
});

test('cardio timer uses its programmed duration as the exercise time', () => {
  const walk = { id: 'walk', setsCount: 1, restSeconds: 0, timer: { type: 'duration', seconds: 600 } };
  const mins = estimateRoutineMinutes({ exerciseIds: ['walk'] }, [walk]);
  assert.equal(mins, 10);
});

test('isometric hold is timed by its hold seconds, not a 40s strength set', () => {
  const plank = { id: 'plank', setsCount: 3, restSeconds: 30, repRange: '30 s' };
  // 3×30 + 2×30 = 150s → round(2.5) = 3 min
  const mins = estimateRoutineMinutes({ exerciseIds: ['plank'] }, [plank]);
  assert.equal(mins, 3);
});

test('ids with no matching exercise are skipped, not counted', () => {
  // Only bench resolves → 3×40 + 2×90 = 300s → 5 min, no phantom transition.
  const mins = estimateRoutineMinutes({ exerciseIds: ['bench', 'ghost'] }, [bench]);
  assert.equal(mins, 5);
});

test('empty or unresolved routine estimates 0 minutes', () => {
  assert.equal(estimateRoutineMinutes({ exerciseIds: [] }, [bench]), 0);
  assert.equal(estimateRoutineMinutes({ exerciseIds: ['ghost'] }, [bench]), 0);
  assert.equal(estimateRoutineMinutes(null, [bench]), 0);
});
