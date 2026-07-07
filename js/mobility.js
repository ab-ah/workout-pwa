// Rest-day mobility & recovery suggestions. Pure: no DOM/storage.
//
// A blank "Rest Day" card wastes the recovery slot. These are low-effort,
// no-equipment movements that aid recovery without depositing training fatigue —
// light mobility, stretching, and easy activity. The set is deliberately short
// so it reads as a nudge, not a second workout.

const MOBILITY_ITEMS = [
  { name: 'Cat–cow + thoracic rotations', detail: '1–2 min, spine mobility' },
  { name: '90/90 hip switches', detail: '10 / side, open the hips' },
  { name: 'Deep squat hold', detail: '3 × 30s, ankles & hips' },
  { name: 'Doorway chest / pec stretch', detail: '2 × 30s / side' },
  { name: 'Standing hamstring & hip-flexor stretch', detail: '30s / side' },
  { name: 'Easy 15–25 min walk', detail: 'blood flow, no incline needed' },
  { name: 'Foam roll quads, back & calves', detail: '5 min if you have a roller' },
];

/**
 * A short rotating slice of mobility suggestions. Rotating by day keeps the card
 * from showing the same list every rest day without needing any stored state.
 * @param {number} [seed]  day-of-month or similar rotation index
 * @param {number} [count]
 * @returns {Array<{name:string, detail:string}>}
 */
export function mobilitySuggestions(seed = 0, count = 4) {
  const n = MOBILITY_ITEMS.length;
  const start = ((Math.floor(seed) % n) + n) % n;
  const out = [];
  for (let i = 0; i < Math.min(count, n); i++) {
    out.push(MOBILITY_ITEMS[(start + i) % n]);
  }
  return out;
}
