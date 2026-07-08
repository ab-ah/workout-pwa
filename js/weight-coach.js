// Fat-loss coaching from the body-weight trend. Pure: no DOM/storage.
//
// The app already smooths weigh-ins into a 7-day trend (bodyweight.js); this
// module turns that trend into an actual coaching call. On a cut the RATE of
// loss is the program: too fast bleeds muscle, too slow isn't a cut, flat means
// intake needs a nudge. Rate is judged as a percentage of body weight per week
// so it scales with the person rather than using a fixed kg threshold.

// Weekly loss as a fraction of body weight. The muscle-sparing fat-loss band for
// a trained lifter sits around 0.4–1.0 %/week; below that is barely a cut, above
// it starts costing lean mass (and, in a deficit, strength).
const IDEAL_LOSS_LOW = 0.4;   // %/week — floor of the productive fat-loss band
const IDEAL_LOSS_HIGH = 1.0;  // %/week — ceiling before muscle loss risk climbs
const FLAT_BAND = 0.1;        // |%/week| this small reads as "weight is flat"

// Protein floor for retaining muscle in a deficit: ~1.8–2.2 g per kg body weight.
const PROTEIN_G_PER_KG_LOW = 1.8;
const PROTEIN_G_PER_KG_HIGH = 2.2;

/** Round to a whole multiple of `step` (default 5). */
function roundTo(n, step = 5) {
  return Math.round(n / step) * step;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Daily protein target (grams) to retain muscle in a deficit, from body weight.
 * @param {number} kg
 * @returns {{ low:number, high:number } | null}
 */
export function proteinTarget(kg) {
  const w = Number(kg);
  if (!Number.isFinite(w) || w <= 0) return null;
  return { low: roundTo(w * PROTEIN_G_PER_KG_LOW), high: roundTo(w * PROTEIN_G_PER_KG_HIGH) };
}

/**
 * Weekly rate of change as a percentage of body weight.
 * @param {number} deltaKg  change over the trend span (≈1 week)
 * @param {number} latestKg  current body weight
 * @returns {number | null}  signed %/week (negative = losing)
 */
export function weeklyRatePct(deltaKg, latestKg) {
  const d = Number(deltaKg);
  const w = Number(latestKg);
  if (!Number.isFinite(d) || !Number.isFinite(w) || w <= 0) return null;
  return (d / w) * 100;
}

/**
 * Classify the fat-loss rate and produce a coaching line.
 *
 * @param {{ deltaKg:number } | null} trend  from bodyweight.weightTrend
 * @param {number} latestKg  latest weigh-in
 * @returns {{ level:'fast'|'ideal'|'slow'|'flat'|'gaining'|'unknown',
 *             headline:string, detail:string, ratePct:number|null } | null}
 */
export function weightCoach(trend, latestKg) {
  const w = Number(latestKg);
  if (!Number.isFinite(w) || w <= 0) return null;

  const ratePct = trend ? weeklyRatePct(trend.deltaKg, w) : null;
  if (ratePct === null) {
    return {
      level: 'unknown',
      headline: 'Keep logging to read your rate',
      detail: 'A few more weigh-ins and the 7-day trend will tell you if the cut is paced to spare muscle.',
      ratePct: null,
    };
  }

  const loss = -ratePct; // positive when losing weight
  const kgPerWeek = trend ? round1(Math.abs(Number(trend.deltaKg))) : null;
  const pctText = `${round1(Math.abs(ratePct))}%/wk`;
  const kgText = kgPerWeek != null ? `~${kgPerWeek} kg/wk (${pctText})` : `~${pctText}`;

  if (loss > IDEAL_LOSS_HIGH) {
    return {
      level: 'fast',
      headline: `Losing fast — ${kgText}`,
      detail: 'Faster than the muscle-sparing zone. Add ~200–300 kcal (mostly carbs around training) to protect lean mass and keep your lifts moving.',
      ratePct,
    };
  }
  if (loss >= IDEAL_LOSS_LOW) {
    return {
      level: 'ideal',
      headline: `On-target cut — ${kgText}`,
      detail: 'Right in the muscle-sparing fat-loss band. Hold this intake and keep the protein up.',
      ratePct,
    };
  }
  if (loss > FLAT_BAND) {
    return {
      level: 'slow',
      headline: `Losing slowly — ${kgText}`,
      detail: 'Real but gentle loss. Fine if you want to hold strength; to speed fat loss, trim ~150–200 kcal or add volume to your walks.',
      ratePct,
    };
  }
  if (Math.abs(ratePct) <= FLAT_BAND) {
    return {
      level: 'flat',
      headline: 'Weight is flat',
      detail: 'No change on the 7-day trend. If this holds another week and you want more fat loss, cut ~200 kcal/day or add 10–15 min to your walks — not more hard training.',
      ratePct,
    };
  }
  return {
    level: 'gaining',
    headline: `Trending up — ${kgText}`,
    detail: 'Weight is rising. Expected if you meant to bulk; on a cut, tighten intake and check weekend calories.',
    ratePct,
  };
}
