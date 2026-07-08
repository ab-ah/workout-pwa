// Rest-day mobility & recovery suggestions. Pure: no DOM/storage.
//
// A blank "Rest Day" card wastes the recovery slot. These are low-effort,
// no-equipment movements that aid recovery without depositing training fatigue —
// light mobility, stretching, and easy activity. The set is deliberately short
// so it reads as a nudge, not a second workout.

// Each movement carries a demo gif (bundled locally, like the exercise pool) so
// the recovery card is visual and followable, not just a text list.
const MOBILITY_ITEMS = [
  { name: 'Cat–cow', detail: '8–10 slow reps, spine mobility', gifUrl: 'assets/exercise-gifs/mobility-cat-cow.gif' },
  { name: 'Cobra / abdominal stretch', detail: '2 × 20–30s, opens the front', gifUrl: 'assets/exercise-gifs/mobility-cobra-stretch.gif' },
  { name: "Child's pose", detail: '2 × 30s, lats & lower back', gifUrl: 'assets/exercise-gifs/mobility-childs-pose.gif' },
  { name: 'Doorway chest / pec stretch', detail: '2 × 30s / side', gifUrl: 'assets/exercise-gifs/mobility-chest-stretch.gif' },
  { name: 'Standing hamstring stretch', detail: '2 × 30s / side', gifUrl: 'assets/exercise-gifs/mobility-hamstring-stretch.gif' },
  { name: 'Kneeling hip-flexor stretch', detail: '30s / side, opens the hips', gifUrl: 'assets/exercise-gifs/mobility-hip-flexor-stretch.gif' },
  { name: '90/90 hip stretch', detail: '10 / side, hip rotation', gifUrl: 'assets/exercise-gifs/mobility-90-90-hip.gif' },
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
