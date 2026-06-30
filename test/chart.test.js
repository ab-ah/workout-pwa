import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointsToPath, buildChartSVG } from '../js/components/chart.js';

test('pointsToPath returns empty string for fewer than 2 points', () => {
  assert.equal(pointsToPath([], { width: 100, height: 100 }), '');
  assert.equal(pointsToPath([{ date: '2026-06-20', weight: 10 }], { width: 100, height: 100 }), '');
});

test('pointsToPath maps flat values to a horizontal line at mid-height', () => {
  const points = [{ date: '2026-06-20', weight: 10 }, { date: '2026-06-27', weight: 10 }];
  const d = pointsToPath(points, { width: 100, height: 100, padding: 0 });
  assert.equal(d, 'M0,50 L100,50');
});

test('pointsToPath scales min/max across width and height', () => {
  const points = [
    { date: '2026-06-20', weight: 0 },
    { date: '2026-06-27', weight: 10 },
    { date: '2026-07-04', weight: 20 }
  ];
  const d = pointsToPath(points, { width: 100, height: 100, padding: 0 });
  assert.equal(d, 'M0,100 L50,50 L100,0');
});

test('buildChartSVG returns an svg string containing the path and one circle per point', () => {
  const points = [{ date: '2026-06-20', weight: 10 }, { date: '2026-06-27', weight: 20 }];
  const svg = buildChartSVG(points, { width: 300, height: 200 });
  assert.match(svg, /<svg[^>]*viewBox="0 0 300 200"/);
  assert.match(svg, /<path /);
  const circleCount = (svg.match(/<circle/g) || []).length;
  assert.equal(circleCount, 2);
});

test('buildChartSVG returns an empty-state message for fewer than 2 points', () => {
  const svg = buildChartSVG([], { width: 300, height: 200 });
  assert.match(svg, /No data yet/);
});
