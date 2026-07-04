import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movingAverage, latestEntry, weightTrend } from '../js/bodyweight.js';

test('movingAverage smooths and begins at the first entry', () => {
  const entries = [
    { date: '2026-01-01', kg: 90 },
    { date: '2026-01-02', kg: 92 },
    { date: '2026-01-03', kg: 88 },
  ];
  const ma = movingAverage(entries, 7);
  assert.equal(ma.length, 3);
  assert.equal(ma[0].weight, 90);           // first point = itself
  assert.equal(ma[2].weight, 90);           // (90+92+88)/3 = 90
});

test('movingAverage respects the window length', () => {
  const entries = [
    { date: '2026-01-01', kg: 100 },
    { date: '2026-01-02', kg: 100 },
    { date: '2026-01-03', kg: 70 },
  ];
  const ma = movingAverage(entries, 2);
  assert.equal(ma[2].weight, 85);           // last two: (100+70)/2
});

test('movingAverage sorts out-of-order entries by date', () => {
  const entries = [
    { date: '2026-01-03', kg: 88 },
    { date: '2026-01-01', kg: 90 },
  ];
  const ma = movingAverage(entries, 7);
  assert.equal(ma[0].date, '2026-01-01');
  assert.equal(ma[1].date, '2026-01-03');
});

test('latestEntry returns the newest weigh-in or null', () => {
  assert.equal(latestEntry([]), null);
  const e = latestEntry([{ date: '2026-01-01', kg: 90 }, { date: '2026-01-05', kg: 88 }]);
  assert.equal(e.kg, 88);
});

test('weightTrend reports a loss over the span', () => {
  const entries = [];
  for (let d = 1; d <= 14; d++) {
    entries.push({ date: `2026-01-${String(d).padStart(2, '0')}`, kg: 92 - d * 0.2 });
  }
  const trend = weightTrend(entries, 7, 7);
  assert.ok(trend);
  assert.ok(trend.deltaKg < 0);             // losing weight
  assert.equal(trend.toDate, '2026-01-14');
});

test('weightTrend is null without enough history', () => {
  assert.equal(weightTrend([{ date: '2026-01-01', kg: 90 }], 7, 7), null);
});
