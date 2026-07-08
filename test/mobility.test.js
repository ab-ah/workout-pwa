import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allMobility, mobilitySuggestions } from '../js/mobility.js';

test('allMobility returns the full ordered set, each with a name, detail and gif', () => {
  const all = allMobility();
  assert.ok(all.length >= 5, 'a real mobility routine, not a stub');
  for (const m of all) {
    assert.ok(m.name && typeof m.name === 'string');
    assert.ok(m.detail && typeof m.detail === 'string');
    assert.match(m.gifUrl, /^assets\/exercise-gifs\/.+\.gif$/);
  }
});

test('allMobility returns fresh copies (mutating one does not leak back)', () => {
  const a = allMobility();
  a[0].name = 'MUTATED';
  assert.notEqual(allMobility()[0].name, 'MUTATED');
});

test('mobilitySuggestions is a rotating slice of the same set', () => {
  const slice = mobilitySuggestions(0, 4);
  assert.equal(slice.length, 4);
  const names = new Set(allMobility().map(m => m.name));
  for (const m of slice) assert.ok(names.has(m.name));
});
