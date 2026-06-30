import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointsToPath, buildChartSVG, escapeXml } from '../js/components/chart.js';

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

test('buildChartSVG escapes special characters in tooltip', () => {
  const points = [
    { date: '<script>', weight: 10, reps: 5 },
    { date: '2026-06-27', weight: 20, reps: 6 }
  ];
  const svg = buildChartSVG(points, { width: 300, height: 200 });
  assert.ok(!svg.includes('<script>'), 'raw <script> tag must not appear in SVG output');
  assert.ok(svg.includes('&lt;script&gt;'), 'date must be XML-escaped');
});

test('escapeXml escapes all five special XML characters', () => {
  assert.equal(escapeXml('&'), '&amp;');
  assert.equal(escapeXml('<script>'), '&lt;script&gt;');
  assert.equal(escapeXml('"quoted"'), '&quot;quoted&quot;');
  assert.equal(escapeXml('a & b < c > d "e"'), 'a &amp; b &lt; c &gt; d &quot;e&quot;');
});
