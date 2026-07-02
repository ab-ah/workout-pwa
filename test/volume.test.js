import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyVolumeByMuscle } from '../js/volume.js';

const exercises = [
  { id: 'bench', setsCount: 4, muscles: { chest: 'prime_mover', triceps: 'synergist' } },
  { id: 'row', setsCount: 4, muscles: { back: 'prime_mover', biceps: 'synergist', forearms: 'stabilizer' } },
  { id: 'squat', setsCount: 5, muscles: { quads: 'prime_mover', glutes: 'synergist', abs: 'stabilizer' } },
];
const routines = [
  { id: 'push', exerciseIds: ['bench'] },
  { id: 'pull', exerciseIds: ['row'] },
  { id: 'legs', exerciseIds: ['squat'] },
];

test('weeklyVolumeByMuscle sums prime + synergist sets across the schedule', () => {
  const schedule = { '1': 'push', '2': 'pull', '3': 'legs' };
  const vol = weeklyVolumeByMuscle(schedule, routines, exercises);
  const map = Object.fromEntries(vol.map(v => [v.muscle, v.sets]));
  assert.equal(map.chest, 4);
  assert.equal(map.triceps, 4);   // synergist counts
  assert.equal(map.quads, 5);
  assert.equal(map.glutes, 5);
});

test('weeklyVolumeByMuscle excludes stabilisers', () => {
  const schedule = { '2': 'pull', '3': 'legs' };
  const vol = weeklyVolumeByMuscle(schedule, routines, exercises);
  const map = Object.fromEntries(vol.map(v => [v.muscle, v.sets]));
  assert.equal(map.forearms, undefined); // stabiliser in row
  assert.equal(map.abs, undefined);      // stabiliser in squat
});

test('weeklyVolumeByMuscle counts a routine once per scheduled day', () => {
  const schedule = { '1': 'push', '4': 'push' }; // push twice a week
  const vol = weeklyVolumeByMuscle(schedule, routines, exercises);
  const chest = vol.find(v => v.muscle === 'chest');
  assert.equal(chest.sets, 8); // 4 sets × 2 days
});

test('weeklyVolumeByMuscle returns muscles sorted by descending volume', () => {
  const schedule = { '1': 'push', '3': 'legs' };
  const vol = weeklyVolumeByMuscle(schedule, routines, exercises);
  for (let i = 1; i < vol.length; i++) {
    assert.ok(vol[i - 1].sets >= vol[i].sets);
  }
  assert.equal(vol[0].muscle, 'quads'); // 5 sets, the most
});

test('weeklyVolumeByMuscle handles empty / rest-only schedules', () => {
  assert.deepEqual(weeklyVolumeByMuscle({}, routines, exercises), []);
  assert.deepEqual(weeklyVolumeByMuscle({ '0': null }, routines, exercises), []);
});
