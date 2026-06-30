export function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const fmt = (n) => Math.round(n * 100) / 100;

function mapPoints(points, { width, height, padding }) {
  const values = points.map((p) => p.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const xStep = innerWidth / (points.length - 1);
  return points.map((p, i) => ({
    x: fmt(padding + i * xStep),
    y: fmt(
      max === min
        ? padding + innerHeight / 2
        : padding + innerHeight - ((p.weight - min) / (max - min)) * innerHeight
    ),
    point: p,
  }));
}

export function pointsToPath(points, { width, height, padding = 0 }) {
  if (points.length < 2) return '';
  const mapped = mapPoints(points, { width, height, padding });
  return 'M' + mapped.map(({ x, y }) => `${x},${y}`).join(' L');
}

export function buildChartSVG(points, { width = 300, height = 200, padding = 20 } = {}) {
  if (points.length < 2) {
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}"><text x="50%" y="50%" text-anchor="middle" fill="#8b94a3" font-size="13">No data yet — log a couple of sessions first</text></svg>`;
  }

  const mapped = mapPoints(points, { width, height, padding });
  const d = 'M' + mapped.map(({ x, y }) => `${x},${y}`).join(' L');

  const circles = mapped.map(({ x, y, point: p }) =>
    `<circle cx="${x}" cy="${y}" r="3.5" fill="#d6ff3f"><title>${escapeXml(p.date)}: ${escapeXml(p.weight)}kg x ${escapeXml(p.reps ?? '')}</title></circle>`
  ).join('');

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}">
    <path d="${d}" fill="none" stroke="#d6ff3f" stroke-width="2"/>
    ${circles}
  </svg>`;
}
