// Anatomical SVG path data for the muscle atlas.
// Figure uses classic 7.5-head proportions in a 200x500 viewBox:
//   crown y=11, chin y=69, shoulders y=92, nipple line y=134, waist y=186,
//   crotch y=254, knee y=352, ankle y=455.
// Left-side limbs and muscles are defined once and mirrored with an SVG
// transform so both sides are perfectly symmetric.

export const MUSCLE_LABELS = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  traps: 'Traps',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  back: 'Lats',
  lower_back: 'Lower Back',
  abs: 'Abs',
  obliques: 'Obliques',
  rear_delts: 'Rear Delts',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
};

function mirrored(content) {
  return `${content}<g transform="translate(200,0) scale(-1,1)">${content}</g>`;
}

function muscle(id, d) {
  const label = MUSCLE_LABELS[id] ?? id;
  return `<path class="muscle-path" data-muscle="${id}" aria-label="${label}" role="button" tabindex="0" d="${d}"/>`;
}

function muscleRect(id, x, y, w, h, rx) {
  const label = MUSCLE_LABELS[id] ?? id;
  return `<rect class="muscle-path" data-muscle="${id}" aria-label="${label}" role="button" tabindex="0" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
}

// ─── Shared body-base shapes (identical for front and back) ──────────────────

const HEAD = `<ellipse class="body-base" cx="100" cy="40" rx="21" ry="29"/>`;
const NECK = `<rect class="body-base" x="90" y="56" width="20" height="30" rx="6"/>`;

const TORSO = `<path class="body-base" d="
  M100,74
  C94,74 86,77 78,81
  C70,85 62,89 57,94
  C54,100 55,110 59,118
  C61,132 62,146 65,160
  C69,176 72,182 74,188
  C70,202 66,216 65,228
  C66,240 74,250 85,255
  L100,257
  L115,255
  C126,250 134,240 135,228
  C134,216 130,202 126,188
  C128,182 131,176 135,160
  C138,146 139,132 141,118
  C145,110 146,100 143,94
  C138,89 130,85 122,81
  C114,77 106,74 100,74 Z"/>`;

const LEFT_UPPER_ARM = `<path class="body-base" d="
  M57,94
  C48,96 41,104 39,116
  C38,130 38,146 39,160
  C40,172 42,180 45,186
  C49,191 55,191 58,186
  C60,178 61,166 61,152
  C61,136 60,118 59,106
  C59,99 58,95 57,94 Z"/>`;

const LEFT_FOREARM = `<path class="body-base" d="
  M44,188
  C38,196 34,208 33,222
  C32,234 33,245 35,252
  C37,259 42,261 46,258
  C50,254 52,246 53,236
  C54,222 54,208 53,198
  C52,191 50,187 48,186
  C46,185 45,186 44,188 Z"/>`;

const LEFT_HAND = `<ellipse class="body-base" cx="41" cy="268" rx="9" ry="15"/>`;

const LEFT_THIGH = `<path class="body-base" d="
  M65,234
  C61,256 60,282 63,306
  C65,326 68,342 72,352
  L94,352
  C96,340 98,322 99,304
  C100,286 100,268 99,254
  C89,244 76,236 65,234 Z"/>`;

const LEFT_SHIN = `<path class="body-base" d="
  M71,360
  C67,374 66,392 68,408
  C70,426 73,442 76,452
  L88,452
  C91,440 93,424 94,406
  C95,390 94,372 92,360
  L71,360 Z"/>`;

const LEFT_FOOT = `<path class="body-base" d="
  M75,452 L89,452
  C91,458 92,463 91,467
  C88,470 78,470 74,467
  C72,462 73,456 75,452 Z"/>`;

const LEFT_LIMBS = LEFT_UPPER_ARM + LEFT_FOREARM + LEFT_HAND + LEFT_THIGH + LEFT_SHIN + LEFT_FOOT;

// Back view adds a hip/glute base plate over the same silhouette
const GLUTE_PLATE = `<path class="body-base" d="
  M66,230
  C60,242 58,258 60,272
  C62,286 70,296 82,300
  L118,300
  C130,296 138,286 140,272
  C142,258 140,242 134,230
  C120,238 80,238 66,230 Z"/>`;

// ─── Front muscles (left side + centre; right side mirrored) ─────────────────

const FRONT_LEFT_MUSCLES =
  // Trapezius (front slope, neck to shoulder)
  muscle('traps', `M87,76 C80,79 71,84 64,89 C70,93 79,94 86,92 C87,87 87,81 87,76 Z`) +
  // Front/side deltoid cap
  muscle('shoulders', `M55,95 C47,98 41,106 40,116 C40,124 43,130 48,131 C54,131 59,124 61,114 C61,105 60,98 58,95 C57,93 56,94 55,95 Z`) +
  // Pectoral
  muscle('chest', `M99,100 C88,98 76,100 68,106 C63,112 63,122 67,130 C73,139 85,143 95,142 C97,141 99,138 99,133 L99,104 Z`) +
  // Biceps
  muscle('biceps', `M51,110 C46,114 43,124 43,138 C43,152 45,164 48,172 C51,178 56,177 58,171 C60,162 60,148 59,134 C58,121 56,111 53,108 C52,107 51,108 51,110 Z`) +
  // Forearm flexors / brachioradialis
  muscle('forearms', `M45,192 C40,200 37,212 37,224 C37,236 39,246 42,252 C45,256 49,255 51,250 C53,242 53,229 52,216 C51,204 49,195 47,190 C46,188 45,189 45,192 Z`) +
  // Rectus abdominis — 4 blocks per column (right column mirrored)
  muscleRect('abs', 87, 142, 11, 21, 5) +
  muscleRect('abs', 87, 166, 11, 21, 5) +
  muscleRect('abs', 87, 190, 11, 21, 5) +
  muscleRect('abs', 87, 214, 11, 26, 6) +
  // Obliques
  muscle('obliques', `M84,150 C77,157 73,168 72,181 C72,196 75,211 80,223 C82,227 84,228 84,223 L84,152 Z`) +
  // Quadriceps — vastus lateralis (outer)
  muscle('quads', `M67,242 C63,262 62,288 64,312 C65,328 68,342 71,350 C73,353 76,351 77,345 C78,328 77,306 75,284 C74,264 71,248 69,241 C68,239 67,240 67,242 Z`) +
  // Quadriceps — rectus femoris (centre)
  muscle('quads', `M81,246 C78,260 77,280 78,300 C79,318 81,333 84,343 C86,348 89,348 91,342 C93,330 93,310 92,290 C91,271 88,254 85,244 C83,240 82,242 81,246 Z`) +
  // Quadriceps — vastus medialis (inner teardrop)
  muscle('quads', `M93,302 C91,312 91,326 92,338 C93,346 95,350 97,348 C99,345 100,336 100,324 C100,312 98,303 96,298 C95,295 94,297 93,302 Z`) +
  // Tibialis anterior / front calf strip
  muscle('calves', `M71,362 C68,374 67,392 69,408 C70,422 73,436 76,446 C78,450 81,449 82,444 C83,431 82,414 80,398 C78,382 75,368 73,361 C72,359 71,360 71,362 Z`);

// ─── Back muscles (left side + centre; right side mirrored) ──────────────────

const TRAPS_KITE = muscle('traps', `
  M100,64
  C93,68 82,77 69,87
  C64,91 63,95 67,98
  C75,102 85,104 93,105
  C95,119 97,134 100,148
  C103,134 105,119 107,105
  C115,104 125,102 133,98
  C137,95 136,91 131,87
  C118,77 107,68 100,64 Z`);

const BACK_LEFT_MUSCLES =
  // Rear deltoid cap
  muscle('rear_delts', `M55,95 C47,98 41,106 40,116 C40,124 43,130 48,131 C54,131 59,124 61,114 C61,105 60,98 58,95 C57,93 56,94 55,95 Z`) +
  // Latissimus dorsi fan
  muscle('back', `M63,120 C61,134 61,148 64,162 C67,176 73,188 81,196 C86,200 91,198 93,192 C94,180 94,166 93,152 C92,138 89,126 85,118 C78,113 69,115 63,120 Z`) +
  // Erector spinae column
  muscleRect('lower_back', 89, 156, 9, 78, 4.5) +
  // Triceps
  muscle('triceps', `M47,108 C42,116 40,130 40,146 C40,160 42,172 46,180 C50,186 56,184 58,177 C60,167 60,152 59,138 C58,124 55,112 52,106 C50,103 48,105 47,108 Z`) +
  // Forearm extensors
  muscle('forearms', `M45,192 C40,200 37,212 37,224 C37,236 39,246 42,252 C45,256 49,255 51,250 C53,242 53,229 52,216 C51,204 49,195 47,190 C46,188 45,189 45,192 Z`) +
  // Gluteus maximus
  muscle('glutes', `M79,240 C69,243 62,252 61,264 C60,277 65,288 74,293 C82,297 91,295 96,288 C99,282 99,272 98,262 C97,251 93,242 87,238 C84,237 81,238 79,240 Z`) +
  // Hamstrings — biceps femoris (outer)
  muscle('hamstrings', `M67,300 C64,314 63,330 65,344 C66,351 69,355 72,353 C75,349 76,340 76,328 C76,315 74,304 72,297 C70,293 68,295 67,300 Z`) +
  // Hamstrings — semitendinosus (inner)
  muscle('hamstrings', `M80,300 C78,314 78,330 80,344 C81,351 84,355 87,353 C90,349 91,340 91,328 C91,315 89,304 86,297 C83,292 81,294 80,300 Z`) +
  // Gastrocnemius — outer head
  muscle('calves', `M69,360 C66,371 65,385 67,399 C68,410 71,417 74,416 C77,412 78,403 78,391 C78,378 76,366 73,358 C71,354 70,356 69,360 Z`) +
  // Gastrocnemius — inner head
  muscle('calves', `M81,360 C79,371 78,385 80,399 C81,410 84,417 87,416 C90,412 91,403 91,391 C91,378 89,366 86,358 C84,354 82,356 81,360 Z`);

// ─── Builders ─────────────────────────────────────────────────────────────────

export function buildFrontBody() {
  return HEAD + NECK + TORSO + mirrored(LEFT_LIMBS);
}

export function buildFrontMuscles() {
  return mirrored(FRONT_LEFT_MUSCLES);
}

export function buildBackBody() {
  return HEAD + NECK + TORSO + GLUTE_PLATE + mirrored(LEFT_LIMBS);
}

export function buildBackMuscles() {
  return TRAPS_KITE + mirrored(BACK_LEFT_MUSCLES);
}
