/**
 * Pure SVG line-chart builder for progress graphs.
 * No DOM dependency — produces SVG strings only.
 */

/**
 * Converts an array of data points into an SVG path `d` attribute string.
 *
 * @param {Array<{date: string, weight: number}>} points
 * @param {{width: number, height: number, padding?: number}} options
 * @returns {string}
 */
export function pointsToPath(points, { width, height, padding = 0 }) {
  if (points.length < 2) return '';

  const values = points.map((p) => p.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const xStep = innerWidth / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = padding + i * xStep;
    const y =
      max === min
        ? padding + innerHeight / 2
        : padding + innerHeight - ((p.weight - min) / (max - min)) * innerHeight;
    return `${x},${y}`;
  });

  return 'M' + coords.join(' L');
}

/**
 * Builds a complete SVG string for a weight-progress line chart.
 *
 * @param {Array<{date: string, weight: number, reps?: number}>} points
 * @param {{width?: number, height?: number, padding?: number}} options
 * @returns {string}
 */
export function buildChartSVG(points, { width = 300, height = 200, padding = 20 } = {}) {
  if (points.length < 2) {
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}"><text x="50%" y="50%" text-anchor="middle" fill="#8b94a3" font-size="13">No data yet — log a couple of sessions first</text></svg>`;
  }

  const d = pointsToPath(points, { width, height, padding });
  const values = points.map((p) => p.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const xStep = innerWidth / (points.length - 1);

  const circles = points
    .map((p, i) => {
      const x = padding + i * xStep;
      const y =
        max === min
          ? padding + innerHeight / 2
          : padding + innerHeight - ((p.weight - min) / (max - min)) * innerHeight;
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="#d6ff3f"><title>${p.date}: ${p.weight}kg x ${p.reps ?? ''}</title></circle>`;
    })
    .join('');

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}">
    <path d="${d}" fill="none" stroke="#d6ff3f" stroke-width="2"/>
    ${circles}
  </svg>`;
}
