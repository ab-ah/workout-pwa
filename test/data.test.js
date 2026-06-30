import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN } from '../js/data.js';

test('PLAN has exactly 5 days', () => {
  assert.equal(PLAN.length, 5);
});

test('every day has a title, tag, and at least one exercise', () => {
  for (const day of PLAN) {
    assert.equal(typeof day.title, 'string');
    assert.equal(typeof day.tag, 'string');
    assert.ok(Array.isArray(day.exercises) && day.exercises.length > 0);
  }
});

test('every exercise has a stable unique id across the whole plan', () => {
  const ids = PLAN.flatMap(day => day.exercises.map(e => e.id));
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length);
});

test('every exercise has setsCount, repRange, restSeconds, startWeight', () => {
  for (const day of PLAN) {
    for (const ex of day.exercises) {
      assert.equal(typeof ex.id, 'string');
      assert.equal(typeof ex.name, 'string');
      assert.equal(typeof ex.setsCount, 'number');
      assert.equal(typeof ex.repRange, 'string');
      assert.equal(typeof ex.restSeconds, 'number');
      assert.equal(typeof ex.startWeight, 'string');
    }
  }
});
