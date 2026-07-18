export const SETTINGS_KEY = 'leanbuild-settings-v1';

// Bump when the shipped DEFAULT_ROUTINES/DEFAULT_SCHEDULE should be force-installed
// over an older stored plan. v2 = fat-loss / lean-definition plan with treadmill
// conditioning. v3 = exercise GIFs repointed from external URLs to bundled local
// files (assets/exercise-gifs/*). v4 = fatigue-spaced week (Wed active recovery,
// Sat conditioning), no pull-up-bar equipment assumption (Lying Leg Raise).
// v5 = corrected muscle-role maps (pullover chest, plank obliques, flutter-kick
// quads, plus stabilizer accuracy on presses/rows/RDLs). v6 = cardio countdown
// timers on the treadmill exercises (interval work/rest cycling for HIIT, plain
// duration countdown for the steady walk). v7 = per-exercise weightStep so the
// progression coach jumps by a sensible increment for each lift (2.5 kg barbell,
// 2 kg dumbbell, 1 kg small isolation) instead of a flat 2.5. v8 = fatigue-model
// audit: recalibrated recovery windows (see RECOVERY_HOURS_V8_MIGRATION),
// corrected muscle-role tags, schedule fixes (no back-to-back posterior chain,
// no HIIT the day before legs), and per-exercise fatigueScale so isometric/cardio
// work deposits less fatigue than a working lift set. Existing saved settings
// below this version are migrated once (routines/schedule reinstalled + default
// exercise names/gifUrls/muscles/timers/weightSteps/fatigueScales refreshed +
// stale-default recovery windows nudged to the new values). v9 = the single
// "shoulders" muscle is split into front_delts + side_delts so pressing and
// lateral-raise fatigue no longer pile onto one bucket; exercise tags are
// refreshed on the bump and any tuned "shoulders" recovery window is copied onto
// both new heads. v10 = audit follow-ups: longer rest on the heavy barbell
// compounds (restSeconds now refreshed on the bump), lateral raises added to the
// Monday routine so side-delt weekly volume clears maintenance, and a one-time
// remap of any orphaned "shoulders" muscle tag (e.g. on a user-made exercise)
// onto front_delts.
// v11 = load/balance revision: the Lower Power squat is now a Barbell Back Squat
// (uncaps quad loading — the goblet variant tops out at the heaviest dumbbell,
// trivial for a trained squat) instead of the Goblet Squat, and the Lower
// Hypertrophy day trades its weighted back-hyperextension (removing a second day
// of dynamic loaded lumbar flexion) for lateral raises (lifting the
// under-served side-delt weekly volume). Goblet Squat and Weighted Back
// Hyperextension stay in the exercise library — they're just no longer on the
// default schedule. On the bump, the new routines reinstall and the new
// Barbell Back Squat exercise is appended to any existing pool.
// v12 = weekly-volume rebalance from the MEV/MAV/MRV landmark audit. The Lower
// Power day drops its Back Hyperextension (the only direct lumbar work, stacked
// on back squat + barbell RDL — pulls lower_back back under MRV and de-loads the
// most axially-taxing session), and the Upper Power day swaps its Seated DB
// Shoulder Press for a Rear-Delt DB Fly (front delts were over MRV from all the
// pressing; rear delts sat on the MEV floor — this trims one and lifts the other
// to 2x/week). Overhead pressing stays on the Upper Hypertrophy day. Both
// exercises remain in the library, just off the default schedule. Routines
// reinstall on the bump.
// v13 = trainer-review follow-ups (weekly-volume + programming):
//   • Hamstring knee-flexion gap closed — a new Lying Dumbbell Leg Curl joins the
//     Lower Hypertrophy day (every other ham move here is a hip hinge; the biceps
//     femoris short head only works under knee flexion). It replaces Friday's
//     Flutter Kicks, whose ab volume was redundant (abs sat near MRV).
//   • Side-delt volume finally cleared maintenance: the Dumbbell Lateral Raise and
//     Lateral-Raise Dropset step to 4 working sets, and Upper Hypertrophy trades
//     its plain lateral raise for the intensity-boosting dropset variant.
//   • Burpees retired (worst joint cost / least progressible move for a 40 y/o at
//     90 kg) — Conditioning & Core now finishes on the Dumbbell Push Press, an
//     explosive, loadable, low-impact conditioner. front_delts MRV was lifted
//     16→18 in volume.js to keep the added pressing inside the productive band.
//   • Antagonist supersets declared on both upper days (bench↔row, press↔pullover,
//     curl↔triceps) so the ~26-set upper sessions can be run in ~half the time.
//   Because setsCount now ships as a programmed variable, the migration refreshes
//   it on default exercises on the bump (same one-time overwrite trade-off as
//   name/muscles/rest). Routines reinstall; new leg-curl exercise is appended.
// v14 = trainer-review follow-ups (equipment now includes a resistance band):
//   • Direct glute work added — a Dumbbell Hip Thrust joins the Lower Hypertrophy
//     day. The plan's glute volume was 100% indirect (synergist half-credit off
//     squats/RDLs/lunges); the hip thrust is the first movement that trains them
//     as a prime mover.
//   • Shoulder-health / rear-delt work — a Band Face Pull is added to BOTH upper
//     days. Four pressing days a week with no external-rotation work is an
//     impingement risk at 40; the face pull covers external rotation and lifts
//     rear-delt volume.
//   • Lengthened-position biceps — Upper Hypertrophy trades the Standing DB Curl
//     for an Incline DB Curl (more growth per set from the stretched position).
//   • Honest vertical-pull accounting — with no pull-up bar/cable, dumbbell-pullover
//     and renegade-row are demoted from lats prime_mover to synergist so the weekly
//     volume chart stops overstating lat work.
//   • Form cues — a new optional `cue` field carries a short setup/technique note
//     (calf raises off a step, hip-thrust setup, face-pull path, incline-curl
//     stretch); it's refreshed on default exercises on the bump, like name/muscles.
//   New exercises (incline-dumbbell-curl, dumbbell-hip-thrust, band-face-pull) are
//   appended to any existing pool; routines reinstall on the bump.
// v15 = equipment fix: the resistance band can't be anchored to a wall, so the
//   Band Face Pull (needs an eye-height anchor) is swapped for a Band Pull-Apart
//   on both upper days — same rear-delt + external-rotation benefit, held in the
//   hands with no anchor. The new band-pull-apart exercise is appended to any
//   existing pool and the routines reinstall on the bump; the old band-face-pull
//   stays in the library (off the default schedule) so no history is orphaned.
// v16 = trainer-review follow-ups (weekly-volume audit, no new equipment):
//   • Lats were the plan's structural gap — 14 weighted sets, below the 16 MAV
//     growth threshold, and (with no pull-up bar or cable) 100% horizontal rowing.
//     The Chest-Supported DB Row steps 3→5 sets on Upper Power: it's the one row
//     that adds direct lat volume with ZERO lower-back cost (lower_back already
//     sits near its MRV), clearing lats to 16.
//   • Row quality — a dead-stop / long-ROM lat cue is added to the three scheduled
//     rowing drivers (bent-over barbell, chest-supported DB, two-arm DB) so each
//     set biases the lats over the biceps instead of turning into a short-ROM heave.
//   • Calves were barely over maintenance (8.5 sets) — the DB Calf Raise steps
//     4→5 on both lower days, lifting calves to ~10 without a third calf slot.
//   • Redundant ab volume trimmed — Mountain Climbers (lowest stimulus-per-fatigue
//     of the core moves, on a day where abs already clear optimal) are dropped from
//     Conditioning & Core; the freed recovery budget backs the lat/calf additions.
//   • Landmark corrections in volume.js for the plan's mostly-indirect,
//     work-tolerant muscles so the volume chart stops false-flagging "over MRV":
//     glutes 18→22 (indirect off every squat/RDL/lunge), plus traps 18→22 and
//     rear delts 18→20 (the +2 chest-supported-row sets nudged both just over the
//     old ceiling; nearly all their volume is synergist half-credit from rows).
//   Migration refreshes setsCount + cue on the affected default exercises and
//   reinstalls the routines on the bump; logged history is untouched.
// v17 = written per-exercise `form` guidance (DEFAULT_EXERCISE_FORM) shown in the
// new "ⓘ Form" popup beside each demo. Migration refreshes `form` onto existing
// default exercises on the bump (same mechanism as `cue`); nothing else changes.
export const CURRENT_PLAN_VERSION = 17;

const DEFAULT_RECOVERY_HOURS = {
  chest: 54, front_delts: 48, side_delts: 48, traps: 48, triceps: 48, lats: 60,
  lower_back: 60, biceps: 48, forearms: 40, rear_delts: 48,
  quads: 60, hamstrings: 60, glutes: 60, calves: 48,
  abs: 36, obliques: 36,
};

// v8 recovery-window recalibration. The old windows encoded full
// supercompensation (up to 3.5 days), which made a sensible 2x/week split read as
// perpetually under-recovered. These represent "recovered enough to train
// productively again" instead. Migration only rewrites a saved window that is
// still at its OLD default, so a user's own +/- tuning is preserved.
const RECOVERY_HOURS_V8_MIGRATION = {
  lower_back: { from: 84, to: 60 },
  lats:       { from: 72, to: 60 },
  quads:      { from: 72, to: 60 },
  hamstrings: { from: 72, to: 60 },
  glutes:     { from: 72, to: 60 },
  chest:      { from: 60, to: 54 },
};

// 4-level fatigue model: prime_mover=1.0, synergist=0.35, stabilizer=0.08, absent=0.0
const DEFAULT_EXERCISE_MUSCLES = {
  'flat-barbell-bench-press':            { chest: 'prime_mover', triceps: 'synergist', front_delts: 'synergist', lats: 'stabilizer' },
  'incline-dumbbell-press':              { chest: 'prime_mover', front_delts: 'prime_mover', triceps: 'synergist' },
  'incline-barbell-bench-press':         { chest: 'prime_mover', front_delts: 'prime_mover', triceps: 'synergist' },
  'decline-dumbbell-press':              { chest: 'prime_mover', triceps: 'synergist', front_delts: 'stabilizer' },
  'seated-dumbbell-shoulder-press':      { front_delts: 'prime_mover', side_delts: 'synergist', triceps: 'synergist', traps: 'synergist' },
  'dumbbell-lateral-raise':              { side_delts: 'prime_mover', traps: 'stabilizer' },
  'lateral-raise-dropset':               { side_delts: 'prime_mover', traps: 'stabilizer' },
  'lying-dumbbell-triceps-extension':    { triceps: 'prime_mover' },
  'close-grip-dumbbell-press':           { triceps: 'prime_mover', chest: 'synergist', front_delts: 'synergist' },
  'overhead-dumbbell-triceps-extension': { triceps: 'prime_mover' },
  'bent-over-barbell-row':               { lats: 'prime_mover', traps: 'synergist', rear_delts: 'synergist', biceps: 'synergist', lower_back: 'synergist', forearms: 'stabilizer', hamstrings: 'stabilizer' },
  'one-arm-dumbbell-row':                { lats: 'prime_mover', traps: 'synergist', rear_delts: 'synergist', biceps: 'synergist', forearms: 'stabilizer', obliques: 'stabilizer' },
  'chest-supported-dumbbell-row':        { lats: 'prime_mover', traps: 'synergist', rear_delts: 'synergist', biceps: 'synergist' },
  'two-arm-dumbbell-row':                { lats: 'prime_mover', traps: 'synergist', rear_delts: 'synergist', biceps: 'synergist', lower_back: 'synergist', forearms: 'stabilizer' },
  // Honest vertical-pull accounting: with no pull-up bar or cable, the pullover
  // is a stretch-based accessory, not a true lat driver — lats downgraded to
  // synergist so weekly-volume no longer overstates lat work (see also
  // renegade-row). chest gets the same stretch.
  'dumbbell-pullover':                   { lats: 'synergist', chest: 'synergist', triceps: 'stabilizer' },
  'incline-dumbbell-curl':               { biceps: 'prime_mover', forearms: 'stabilizer' },
  'dumbbell-hip-thrust':                 { glutes: 'prime_mover', hamstrings: 'synergist', quads: 'stabilizer' },
  'band-pull-apart':                     { rear_delts: 'prime_mover', traps: 'synergist' },
  'back-hyperextension':                 { lower_back: 'prime_mover', glutes: 'synergist', hamstrings: 'synergist' },
  'weighted-back-hyperextension':        { lower_back: 'prime_mover', glutes: 'synergist', hamstrings: 'synergist' },
  'preacher-curl':                       { biceps: 'prime_mover', forearms: 'stabilizer' },
  'dumbbell-hammer-curl':                { biceps: 'prime_mover', forearms: 'synergist' },
  'standing-dumbbell-curl':              { biceps: 'prime_mover', forearms: 'stabilizer' },
  'rear-delt-dumbbell-fly':              { rear_delts: 'prime_mover', traps: 'synergist' },
  'goblet-squat':                        { quads: 'prime_mover', glutes: 'synergist', abs: 'stabilizer', lower_back: 'stabilizer' },
  'goblet-heels-elevated-squat':         { quads: 'prime_mover', glutes: 'synergist', abs: 'stabilizer', lower_back: 'stabilizer' },
  'barbell-back-squat':                  { quads: 'prime_mover', glutes: 'synergist', lower_back: 'synergist', hamstrings: 'stabilizer', abs: 'stabilizer' },
  'bulgarian-split-squat':               { quads: 'prime_mover', glutes: 'prime_mover', hamstrings: 'synergist', abs: 'stabilizer' },
  'dumbbell-reverse-lunge':              { quads: 'prime_mover', glutes: 'prime_mover', hamstrings: 'synergist', abs: 'stabilizer' },
  'dumbbell-romanian-deadlift':          { hamstrings: 'prime_mover', glutes: 'prime_mover', lower_back: 'synergist', forearms: 'stabilizer', traps: 'stabilizer' },
  'barbell-romanian-deadlift':           { hamstrings: 'prime_mover', glutes: 'prime_mover', lower_back: 'synergist', forearms: 'stabilizer', traps: 'stabilizer' },
  // Knee-flexion hamstring work (biceps-femoris short head), the one pattern every
  // other ham move in the plan misses. Gastrocnemius assists at the knee → calves
  // stabilizer. No hip load, so glutes/lower back stay out of it.
  'dumbbell-lying-leg-curl':             { hamstrings: 'prime_mover', calves: 'stabilizer' },
  'dumbbell-calf-raise':                 { calves: 'prime_mover' },
  'hanging-leg-raise':                   { abs: 'prime_mover' },
  'plank':                               { abs: 'prime_mover', obliques: 'synergist', front_delts: 'stabilizer', glutes: 'stabilizer', lower_back: 'stabilizer' },
  'dumbbell-russian-twist':              { obliques: 'prime_mover', abs: 'synergist' },
  'weighted-crunch':                     { abs: 'prime_mover' },
  'dead-bug':                            { abs: 'prime_mover', obliques: 'synergist' },
  // --- Fat-loss conditioning & metabolic additions ---
  'treadmill-incline-walk':              { calves: 'stabilizer', hamstrings: 'stabilizer', glutes: 'stabilizer', quads: 'stabilizer' },
  'treadmill-hiit-intervals':            { quads: 'synergist', calves: 'synergist', hamstrings: 'synergist', glutes: 'stabilizer' },
  'dumbbell-thruster':                   { quads: 'prime_mover', front_delts: 'prime_mover', side_delts: 'synergist', glutes: 'synergist', triceps: 'synergist', abs: 'stabilizer' },
  'dumbbell-swing':                      { glutes: 'prime_mover', hamstrings: 'prime_mover', lower_back: 'synergist', front_delts: 'stabilizer', forearms: 'stabilizer', abs: 'stabilizer' },
  // Renegade row is an anti-rotation core drill with a light row bolted on; the
  // load ceiling is too low to be a real lat builder, so lats → synergist (abs
  // stays the true prime mover) and the volume chart stops over-crediting lats.
  'renegade-row':                        { lats: 'synergist', abs: 'prime_mover', obliques: 'synergist', biceps: 'synergist', front_delts: 'stabilizer', triceps: 'stabilizer' },
  'dumbbell-push-press':                 { front_delts: 'prime_mover', side_delts: 'synergist', triceps: 'synergist', quads: 'synergist', traps: 'synergist', glutes: 'stabilizer' },
  'dumbbell-farmer-carry':               { forearms: 'prime_mover', traps: 'prime_mover', abs: 'stabilizer', obliques: 'stabilizer', glutes: 'stabilizer' },
  'burpee':                              { quads: 'synergist', chest: 'synergist', front_delts: 'synergist', abs: 'synergist', hamstrings: 'stabilizer', triceps: 'stabilizer' },
  'mountain-climber':                    { abs: 'prime_mover', obliques: 'synergist', quads: 'synergist', front_delts: 'stabilizer' },
  'push-up':                             { chest: 'prime_mover', triceps: 'synergist', front_delts: 'synergist', abs: 'stabilizer' },
  'bicycle-crunch':                      { abs: 'prime_mover', obliques: 'prime_mover' },
  'side-plank':                          { obliques: 'prime_mover', abs: 'synergist', side_delts: 'stabilizer', glutes: 'stabilizer' },
  'flutter-kicks':                       { abs: 'prime_mover', quads: 'stabilizer' },
};

// Sensible progression increment (kg) per lift. Barbell moves jump 2.5, most
// dumbbell work 2 (fixed DBs step ~2/hand), small isolation 1. Bodyweight, hold,
// and cardio exercises are omitted — they carry no weightStep and the coach
// chases reps/time for them instead.
const DEFAULT_WEIGHT_STEP = {
  'flat-barbell-bench-press': 2.5,
  'incline-barbell-bench-press': 2.5,
  'bent-over-barbell-row': 2.5,
  'barbell-romanian-deadlift': 2.5,
  'preacher-curl': 2.5,
  'barbell-back-squat': 2.5,
  'incline-dumbbell-press': 2,
  'decline-dumbbell-press': 2,
  'seated-dumbbell-shoulder-press': 2,
  'close-grip-dumbbell-press': 2,
  'one-arm-dumbbell-row': 2,
  'two-arm-dumbbell-row': 2,
  'chest-supported-dumbbell-row': 2,
  'dumbbell-pullover': 2,
  'overhead-dumbbell-triceps-extension': 2,
  'lying-dumbbell-triceps-extension': 2,
  'goblet-squat': 2,
  'goblet-heels-elevated-squat': 2,
  'dumbbell-romanian-deadlift': 2,
  'bulgarian-split-squat': 2,
  'dumbbell-reverse-lunge': 2,
  'dumbbell-lying-leg-curl': 2,
  'dumbbell-calf-raise': 2,
  'dumbbell-thruster': 2,
  'dumbbell-swing': 2,
  'dumbbell-push-press': 2,
  'renegade-row': 2,
  'dumbbell-farmer-carry': 2,
  'weighted-back-hyperextension': 2,
  'dumbbell-lateral-raise': 1,
  'lateral-raise-dropset': 1,
  'rear-delt-dumbbell-fly': 1,
  'dumbbell-hammer-curl': 1,
  'standing-dumbbell-curl': 1,
  'incline-dumbbell-curl': 1,
  'dumbbell-hip-thrust': 2,
  'dumbbell-russian-twist': 1,
  'weighted-crunch': 1,
};

// Per-exercise fatigue multiplier (default 1 when absent). Isometric holds and
// cardio don't deposit the same fatigue as a heavy working set of the same
// nominal "sets", so they're scaled down. Applied on top of the role weight in
// recovery-model.sessionDepletion. Only exercises that deviate from 1 are listed.
const DEFAULT_FATIGUE_SCALE = {
  'plank': 0.4,
  'side-plank': 0.4,
  'dead-bug': 0.5,
  'flutter-kicks': 0.6,
  'mountain-climber': 0.7,
  'bicycle-crunch': 0.8,
  'hanging-leg-raise': 0.8,
  'treadmill-incline-walk': 0.5,
  'treadmill-hiit-intervals': 0.8,
};

// Written technique guidance shown in the "ⓘ Form" popup next to each exercise's
// demo (see components/form-popup.js). One clear, correct paragraph per exercise:
// setup, the working range, and the most common fault to avoid. Kept in its own
// map (like DEFAULT_EXERCISE_MUSCLES) and merged onto the pool in
// defaultExercises(); the plan-version migration refreshes it onto existing users.
const DEFAULT_EXERCISE_FORM = {
  'flat-barbell-bench-press': "Plant your feet flat and drive them into the floor, pull your shoulder blades back and down, and keep a slight arch in your lower back. Lower the bar under control to your mid-chest with your elbows tucked to roughly 45° (not flared to 90°), touch lightly, then press up and slightly back toward your face. Keep your wrists stacked over your elbows and never bounce the bar off your chest.",
  'incline-dumbbell-press': "Set the bench to about 30° — steeper shifts the work off your upper chest onto your shoulders. Start with the dumbbells at the sides of your upper chest, elbows at ~45°, then press up and slightly together without clashing the bells at the top. Lower under control until you feel a stretch across the chest, keeping your shoulder blades pinned to the bench.",
  'seated-dumbbell-shoulder-press': "Sit tall with your back supported and brace your core so you don't arch your lower back. Start with the dumbbells at ear height, palms facing forward and elbows slightly in front of your body rather than flared straight out to the sides. Press overhead until your arms are nearly straight, then lower under control back to ear level each rep.",
  'dumbbell-lateral-raise': "Stand with a slight bend in your elbows and a small forward lean. Lead with your elbows, not your hands, and raise the dumbbells out to the sides until your upper arms reach shoulder height — imagine pouring water from the bells at the top. Keep your traps relaxed and lower slowly; don't swing or shrug the weight up.",
  'lying-dumbbell-triceps-extension': "Lie on a flat bench holding the dumbbells over your chest, palms facing each other. Keeping your upper arms vertical and still, bend only at the elbows to lower the bells toward the sides of your head, then extend back up. Don't let the elbows flare outward or the upper arms drift back — the movement happens only at the elbow.",
  'close-grip-dumbbell-press': "Press two dumbbells held together, or with a neutral palms-facing grip, over your chest while keeping your elbows tucked close to your sides throughout. The tucked elbows shift the work onto the triceps. Lower to your lower chest under control and press back up without letting the elbows flare out.",
  'bent-over-barbell-row': "Hinge at the hips to about 45° with soft knees and a flat, braced back — never rounded. Let the bar hang at arm's length, then pull it to your lower ribs or belt line by driving your elbows back and down and squeezing the shoulder blades. Pause briefly at the top, lower under control to a full stretch, and don't heave with your lower back or jerk your torso upright.",
  'one-arm-dumbbell-row': "Brace one hand and knee on a bench with your back flat and roughly parallel to the floor. Let the dumbbell hang straight down for a full stretch, then row it up toward your hip by driving the elbow back and down, keeping it close to your body. Squeeze the lat at the top, don't twist your torso, and lower under control.",
  'chest-supported-dumbbell-row': "Lie chest-down on an incline bench so your torso is fully supported — this takes the lower back out of it. Let the dumbbells hang for a full stretch, then row them toward your hips by driving the elbows down and back (not up toward your chest) to bias the lats. Squeeze the shoulder blades at the top and lower slowly.",
  'back-hyperextension': "Set the pad just below your hip crease so you can hinge freely. Cross your arms or hold a plate, keep a neutral spine, and lower your torso by bending only at the hips until you feel a stretch in the hamstrings. Raise back up by squeezing the glutes until your body is a straight line — don't hyper-arch or swing past neutral.",
  'preacher-curl': "Rest the backs of your upper arms flat on the pad with your armpits set high on it. Lower the bar under control to a near-full stretch without letting your elbows lift off the pad, then curl up by contracting the biceps, stopping short of straight-up vertical to keep tension. Keep your wrists neutral and don't heave the weight.",
  'dumbbell-hammer-curl': "Hold the dumbbells with a neutral grip — palms facing each other — and keep that grip the whole set. With your elbows pinned to your sides, curl the weights up without swinging, then lower under control. The neutral grip works the brachialis and forearms alongside the biceps.",
  'rear-delt-dumbbell-fly': "Hinge forward at the hips to about 45° with a flat back, dumbbells hanging beneath you and a slight bend in the elbows. Raise the bells out to the sides in a wide arc until your upper arms reach shoulder height, leading with the elbows and squeezing the rear delts. Move slowly, don't use momentum, and keep the traps from shrugging.",
  'goblet-squat': "Hold a single dumbbell vertically against your chest with your elbows tucked. Set your feet about shoulder-width with toes slightly out, brace your core, and squat by sitting back and spreading your knees out over your toes. Descend to at least parallel with your chest tall and heels flat, then drive up through the whole foot.",
  'barbell-back-squat': "Set the bar on your upper back (not your neck), brace your core hard, and stand with feet shoulder-width, toes slightly out. Break at the hips and knees together, keeping your knees tracking over your toes and your torso as upright as the bar allows, and descend to at least parallel. Drive up through mid-foot without letting your knees cave in or your hips shoot up first.",
  'dumbbell-romanian-deadlift': "Hold the dumbbells in front of your thighs with softly bent knees. Hinge at the hips by pushing your butt back, keeping the weights close to your legs and your back flat, until you feel a strong hamstring stretch around mid-shin. Drive your hips forward to stand tall and squeeze the glutes — the knees stay mostly fixed; this is a hinge, not a squat.",
  'bulgarian-split-squat': "Rest the top of your rear foot on a bench with your front foot planted about two feet ahead. Keep your torso slightly forward and lower straight down until your front thigh is roughly parallel, with the front knee tracking over the toes. Drive up through the front heel; most of the load stays on the front leg and the back leg is only for balance.",
  'dumbbell-calf-raise': "Stand with the balls of your feet on a plate or step, holding dumbbells at your sides. Let your heels drop below the step for a full stretch at the bottom, then rise all the way up onto your toes and pause a second at the top. Move slowly through the whole range — bouncing or cutting the stretch short wastes the set.",
  'hanging-leg-raise': "Lie flat on your back with your hands under your hips or gripping the bench for stability. Keeping your legs fairly straight, raise them until they're vertical, curling your hips slightly off the floor at the top for the abs. Lower under control and stop just before your heels touch down to keep constant tension — don't let your lower back arch up.",
  'plank': "Set your forearms under your shoulders and extend your legs back. Form one straight line from head to heels — squeeze your glutes and brace your abs so your hips neither sag nor pike up. Keep your neck neutral and keep breathing; hold the position rather than letting the lower back dip.",
  'incline-barbell-bench-press': "Set the bench to about 30° and plant your feet, shoulder blades retracted. Lower the bar under control to your upper chest, just below the collarbone, with your elbows at ~45°, then press up and slightly back. Keep your wrists stacked and don't let your shoulders roll forward at the bottom.",
  'decline-dumbbell-press': "On a slight decline, start with the dumbbells at the sides of your lower chest and your elbows tucked to about 45°. Press up and slightly together over your lower chest, then lower under control to a stretch. Keep your shoulder blades pinned and your core braced so you stay stable on the decline.",
  'two-arm-dumbbell-row': "Hinge at the hips to about 45° with a flat, braced back and soft knees, letting both dumbbells hang at arm's length. Row them toward your hips by driving the elbows down and back — think 'elbow to back pocket' — and pause briefly at the top. Lower to a full stretch each rep and don't stand up or round your back.",
  'dumbbell-pullover': "Lie across or along a bench holding one dumbbell over your chest with both hands cupping the top end. Keeping a slight, fixed bend in your elbows, lower the weight back behind your head until you feel a stretch through the chest and lats, then pull it back over your chest. Keep your hips down and move only at the shoulders.",
  'standing-dumbbell-curl': "Stand tall with the dumbbells at your sides, palms forward and elbows pinned to your ribs. Curl the weights up by contracting the biceps without swinging your torso or letting your elbows drift forward, then lower under full control. Keep your wrists neutral and don't use momentum out of the bottom.",
  'overhead-dumbbell-triceps-extension': "Hold one dumbbell overhead with both hands (or one per hand), upper arms vertical and close to your head. Bend at the elbows to lower the weight behind your head until you feel a stretch in the triceps, then extend back up. Keep your elbows pointing forward and still — only the forearms move.",
  'lateral-raise-dropset': "Same as a lateral raise: a slight elbow bend, lead with the elbows, and raise out to shoulder height without shrugging. On the final set, once you hit failure, immediately grab a lighter pair and keep repping to extend the set. Keep your form strict even as you fatigue — reduce the weight rather than swinging it up.",
  'barbell-romanian-deadlift': "Start standing with the bar at your thighs and knees softly bent. Push your hips back and slide the bar down your legs, keeping it close and your back flat, until you feel a deep hamstring stretch around mid-shin. Drive your hips forward to lock out tall — the bar stays close, the spine stays neutral, and the movement is a hinge, not a squat.",
  'goblet-heels-elevated-squat': "Hold a dumbbell at your chest and put your heels on a small plate or wedge — the elevation lets you sit straighter and bias the quads. Squat straight down with an upright torso and knees tracking over the toes to at least parallel, then drive up through the whole foot. Keep your chest tall and your heels down on the plate.",
  'dumbbell-reverse-lunge': "Hold the dumbbells at your sides and step one foot back, lowering until both knees are about 90° and the front thigh is parallel. Keep your torso upright and your weight on the front heel, then drive back to standing through the front leg. Stepping backward rather than forward is easier on the knees and keeps the front shin more vertical.",
  'dumbbell-lying-leg-curl': "Lie face-down on a bench and pinch a dumbbell between your feet. Keeping your hips pressed into the bench, curl your heels toward your glutes by contracting the hamstrings, pause at the top, then lower under control. Don't let your hips rise or your lower back arch to help.",
  'weighted-back-hyperextension': "Set the pad just below the hip crease and hold a plate to your chest. With a neutral spine, hinge at the hips to lower your torso until you feel a hamstring stretch, then squeeze the glutes to raise back to a straight line. Add weight gradually and never round or over-extend the spine.",
  'dumbbell-russian-twist': "Sit with your knees bent and lean back to about 45° with a braced core (lift the heels for more challenge). Hold a dumbbell at your chest and rotate your torso to bring the weight toward the floor on each side, turning through your ribs rather than just swinging your arms. Keep your chest tall and move under control.",
  'weighted-crunch': "Lie on your back with knees bent, holding a dumbbell or plate on your chest. Curl your shoulder blades off the floor by contracting the abs — think about shortening the distance between your ribs and hips — then lower under control. It's a short crunch, not a full sit-up, so don't yank on your neck or hip-flex your whole torso up.",
  'dead-bug': "Lie on your back with your arms reaching to the ceiling and your hips and knees bent to 90°. Press your lower back flat into the floor and brace, then slowly lower the opposite arm and leg toward the floor without letting your back arch off it. Return and switch sides — control and a flat back matter far more than range or speed.",
  'incline-dumbbell-curl': "Sit back on an incline bench (about 45–60°) and let your arms hang straight down, palms forward — this stretched position loads the biceps more than a standing curl. Curl the dumbbells up while keeping your upper arms still and your back on the bench, then lower slowly to a full stretch. Don't let your elbows swing forward.",
  'dumbbell-hip-thrust': "Sit with your shoulder blades against a bench and a padded dumbbell across your hips, feet flat and about hip-width. Tuck your chin, drive through your heels, and lift your hips until your torso is parallel to the floor, squeezing the glutes hard at the top. Lower under control and keep your ribs down — don't arch your lower back to gain height.",
  'band-pull-apart': "Hold a band in front of you at shoulder height with straight arms, hands about shoulder-width apart. Pull the band apart out to your sides by squeezing your shoulder blades together, keeping your arms straight, until the band nears your chest. Return slowly under control — this trains the rear delts and upper-back posture.",
  'treadmill-incline-walk': "Set a brisk pace at a 6–10% incline and walk tall — don't hunch or grip the handrails, which cuts the effort. Let your arms swing naturally and drive through the whole foot. Aim for a pace where you can just about hold a conversation; this steady, low-impact cardio burns calories without eating into your lifting recovery.",
  'treadmill-hiit-intervals': "Alternate hard efforts (a fast run or steep fast walk) with easy recovery periods. During the work interval push to a genuinely hard pace; during the rest interval slow right down to recover. Warm up first, keep your posture tall, and end the set if your form breaks down — the quality of the hard efforts matters more than grinding through.",
  'dumbbell-thruster': "Hold the dumbbells at your shoulders and squat down to at least parallel with an upright torso. Drive up explosively through your heels and ride that momentum to press the dumbbells overhead in one fluid motion. Lower the weights back to your shoulders as you descend into the next squat, and keep your core braced throughout.",
  'dumbbell-swing': "Hold one dumbbell with both hands and hinge at the hips, hiking the weight back between your legs. Snap your hips forward powerfully to swing the weight up to about chest height — the drive comes from your hips and glutes, not your arms or shoulders. Keep your back flat, let the weight float at the top, then hinge again to absorb it.",
  'renegade-row': "Get into a push-up position gripping two dumbbells with your feet set wide for stability. Brace your core hard and, without twisting your hips, row one dumbbell to your ribs while balancing on the other. Lower it under control and alternate — the priority is an anti-rotation plank, so keep your hips square and level rather than chasing heavy weight.",
  'dumbbell-push-press': "Hold the dumbbells at your shoulders, brace your core, and dip slightly at the knees. Drive up explosively through your legs and use that momentum to press the dumbbells overhead to a full lockout. Lower under control back to your shoulders — the leg drive lets you move more weight than a strict press while sparing the shoulders.",
  'dumbbell-farmer-carry': "Pick up a heavy dumbbell in each hand with a flat back, then stand tall with your shoulders back and core braced. Walk with controlled steps, keeping the weights from swinging and your posture upright the whole distance — don't lean or shuffle. Grip hard; this builds grip, traps and core stability.",
  'burpee': "From standing, squat down and plant your hands, then jump or step your feet back into a plank. Do a push-up (or lower your chest), jump your feet back up to your hands, and stand or jump up. Keep a flat back in the plank and land softly; slow the reps down rather than letting your midsection sag when you tire.",
  'mountain-climber': "Start in a strong push-up plank with your hands under your shoulders and your core braced. Drive one knee toward your chest, then switch legs in a running motion, keeping your hips low and level. Don't let your butt pike up or your lower back sag — speed comes second to a stable plank.",
  'push-up': "Set your hands slightly wider than your shoulders and form a straight line from head to heels with your core and glutes tight. Lower under control until your chest is just above the floor with your elbows at about 45° (not flared to 90°), then press back to full extension. Keep your body rigid — no sagging hips or piking up.",
  'bicycle-crunch': "Lie on your back with your hands lightly behind your head and your shoulder blades off the floor. Bring one knee in while rotating the opposite elbow toward it and extending the other leg, then alternate in a smooth pedalling motion. Turn through your torso to bring elbow and knee together — don't pull on your neck or just flail your arms.",
  'side-plank': "Lie on your side and prop up on one forearm with your elbow under your shoulder, stacking your feet. Lift your hips so your body forms a straight line from head to feet and hold — don't let your hips sag toward the floor. Keep your neck neutral and brace the obliques; work each side for equal time.",
  'flutter-kicks': "Lie on your back with your hands under your hips and your legs extended, lower back pressed flat into the floor. Lift your heels a few inches off the ground and make small, quick alternating up-and-down kicks. Keep the movement controlled and your lower back flat the whole time — if it arches, raise your legs higher or stop.",
};

// All exercise data self-contained
const EXERCISE_POOL_DATA = [
  { id: 'flat-barbell-bench-press', name: 'Flat Barbell Bench Press', setsCount: 4, repRange: '6–8', restSeconds: 150, startWeight: '50–60 kg bar', gifUrl: 'assets/exercise-gifs/flat-barbell-bench-press.gif' },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '18–22 kg / hand', gifUrl: 'assets/exercise-gifs/incline-dumbbell-press.gif' },
  { id: 'seated-dumbbell-shoulder-press', name: 'Seated Dumbbell Shoulder Press', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '16–20 kg / hand', gifUrl: 'assets/exercise-gifs/seated-dumbbell-shoulder-press.gif' },
  { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', setsCount: 4, repRange: '12–15', restSeconds: 60, startWeight: '7–10 kg / hand', gifUrl: 'assets/exercise-gifs/dumbbell-lateral-raise.gif' },
  { id: 'lying-dumbbell-triceps-extension', name: 'Lying Dumbbell Triceps Extension', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '8–12 kg / hand', gifUrl: 'assets/exercise-gifs/lying-dumbbell-triceps-extension.gif' },
  { id: 'close-grip-dumbbell-press', name: 'Close-Grip Dumbbell Press', setsCount: 2, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg / hand', gifUrl: 'assets/exercise-gifs/close-grip-dumbbell-press.gif' },
  { id: 'bent-over-barbell-row', name: 'Bent-Over Barbell Row', setsCount: 4, repRange: '6–8', restSeconds: 150, startWeight: '40–50 kg bar', gifUrl: 'assets/exercise-gifs/bent-over-barbell-row.gif', cue: 'Hinge to ~45°, brace hard, and pull the bar to your lower ribs — elbows driving back and down, not flaring up. Own a brief pause at the top and a full stretch at the bottom; think “elbow to back pocket” to load the lats rather than heaving with the lower back.' },
  { id: 'one-arm-dumbbell-row', name: 'One-Arm Dumbbell Row', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '22–28 kg / hand', gifUrl: 'assets/exercise-gifs/one-arm-dumbbell-row.gif' },
  { id: 'chest-supported-dumbbell-row', name: 'Chest-Supported Dumbbell Row (incline bench)', setsCount: 5, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg / hand', gifUrl: 'assets/exercise-gifs/chest-supported-dumbbell-row.gif', cue: 'Chest pinned to the incline bench so the lower back does nothing — that’s the point of this one. Let the dumbbells hang for a full stretch at the bottom, then drive the elbows down and back toward your hips (not up to your chest) to bias the lats. Your main lat driver — hence the extra sets.' },
  { id: 'back-hyperextension', name: 'Back Hyperextension', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: 'bodyweight → hold plate', gifUrl: 'assets/exercise-gifs/back-hyperextension.gif' },
  { id: 'preacher-curl', name: 'Preacher Curl (EZ/straight bar)', setsCount: 3, repRange: '8–10', restSeconds: 60, startWeight: '20–30 kg bar', gifUrl: 'assets/exercise-gifs/preacher-curl.gif' },
  { id: 'dumbbell-hammer-curl', name: 'Dumbbell Hammer Curl', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '10–14 kg / hand', gifUrl: 'assets/exercise-gifs/dumbbell-hammer-curl.gif' },
  { id: 'rear-delt-dumbbell-fly', name: 'Rear-Delt Dumbbell Fly', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: '6–9 kg / hand', gifUrl: 'assets/exercise-gifs/rear-delt-dumbbell-fly.gif' },
  { id: 'goblet-squat', name: 'Goblet Squat (or DB Front Squat)', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '24–32 kg DB', gifUrl: 'assets/exercise-gifs/goblet-squat.gif' },
  { id: 'barbell-back-squat', name: 'Barbell Back Squat', setsCount: 4, repRange: '6–8', restSeconds: 150, startWeight: 'bar + moderate load', gifUrl: 'assets/exercise-gifs/barbell-back-squat.gif' },
  { id: 'dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '22–28 kg / hand', gifUrl: 'assets/exercise-gifs/dumbbell-romanian-deadlift.gif' },
  { id: 'bulgarian-split-squat', name: 'Walking / Bulgarian Split Squat', setsCount: 3, repRange: '10 / leg', restSeconds: 60, startWeight: '12–18 kg / hand', gifUrl: 'assets/exercise-gifs/bulgarian-split-squat.gif' },
  { id: 'dumbbell-calf-raise', name: 'Dumbbell Calf Raise', setsCount: 5, repRange: '15–20', restSeconds: 45, startWeight: '20–30 kg / hand', gifUrl: 'assets/exercise-gifs/dumbbell-calf-raise.gif', cue: 'Toes on a plate or step — let the heel drop for a full stretch at the bottom, then rise all the way onto the toes. Pause 1–2s in the stretched bottom position; standing flat cuts the growth half of the ROM.' },
  { id: 'hanging-leg-raise', name: 'Lying Leg Raise', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: 'bodyweight', gifUrl: 'assets/exercise-gifs/hanging-leg-raise.gif' },
  { id: 'plank', name: 'Plank', setsCount: 3, repRange: '45–60s hold', restSeconds: 45, startWeight: 'bodyweight', gifUrl: 'assets/exercise-gifs/plank.gif' },
  { id: 'incline-barbell-bench-press', name: 'Incline Barbell Bench Press', setsCount: 4, repRange: '8–10', restSeconds: 120, startWeight: '40–50 kg bar', gifUrl: 'assets/exercise-gifs/incline-barbell-bench-press.gif' },
  { id: 'decline-dumbbell-press', name: 'Decline Dumbbell Press', setsCount: 3, repRange: '10–12', restSeconds: 75, startWeight: '16–20 kg / hand', gifUrl: 'assets/exercise-gifs/decline-dumbbell-press.gif' },
  { id: 'two-arm-dumbbell-row', name: 'Two-Arm Dumbbell Row', setsCount: 4, repRange: '10–12', restSeconds: 75, startWeight: '18–24 kg / hand', gifUrl: 'assets/exercise-gifs/two-arm-dumbbell-row.gif', cue: 'Hinge and let both dumbbells hang for a full stretch, then row them toward your hips with the elbows tracking down and back — “elbow to back pocket.” A brief dead-stop stretch at the bottom of each rep keeps the lats working instead of the biceps taking over.' },
  { id: 'dumbbell-pullover', name: 'Dumbbell Pullover (lat/chest)', setsCount: 3, repRange: '12', restSeconds: 60, startWeight: '16–22 kg', gifUrl: 'assets/exercise-gifs/dumbbell-pullover.gif' },
  { id: 'standing-dumbbell-curl', name: 'Standing Dumbbell Curl', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '12–16 kg / hand', gifUrl: 'assets/exercise-gifs/standing-dumbbell-curl.gif' },
  { id: 'overhead-dumbbell-triceps-extension', name: 'Overhead Dumbbell Triceps Extension', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg', gifUrl: 'assets/exercise-gifs/overhead-dumbbell-triceps-extension.gif' },
  { id: 'lateral-raise-dropset', name: 'Lateral Raise (drop set last set)', setsCount: 4, repRange: '15', restSeconds: 60, startWeight: '6–9 kg / hand', gifUrl: 'assets/exercise-gifs/lateral-raise-dropset.gif' },
  { id: 'barbell-romanian-deadlift', name: 'Barbell Romanian Deadlift', setsCount: 4, repRange: '8–10', restSeconds: 120, startWeight: '50–60 kg bar', gifUrl: 'assets/exercise-gifs/barbell-romanian-deadlift.gif' },
  { id: 'goblet-heels-elevated-squat', name: 'Goblet / Heels-Elevated Squat', setsCount: 3, repRange: '10–12', restSeconds: 75, startWeight: '24–30 kg DB', gifUrl: 'assets/exercise-gifs/goblet-heels-elevated-squat.gif' },
  { id: 'dumbbell-reverse-lunge', name: 'Dumbbell Reverse Lunge', setsCount: 3, repRange: '10 / leg', restSeconds: 60, startWeight: '12–16 kg / hand', gifUrl: 'assets/exercise-gifs/dumbbell-reverse-lunge.gif' },
  { id: 'dumbbell-lying-leg-curl', name: 'Lying Dumbbell Leg Curl', setsCount: 3, repRange: '10–12', restSeconds: 75, startWeight: 'DB between feet, 6–12 kg', gifUrl: 'assets/exercise-gifs/dumbbell-lying-leg-curl.gif' },
  { id: 'weighted-back-hyperextension', name: 'Back Hyperextension (weighted)', setsCount: 3, repRange: '12', restSeconds: 60, startWeight: 'hold 10–20 kg plate', gifUrl: 'assets/exercise-gifs/weighted-back-hyperextension.gif' },
  { id: 'dumbbell-russian-twist', name: 'Dumbbell Russian Twist', setsCount: 3, repRange: '16 (8/side)', restSeconds: 45, startWeight: '8–12 kg', gifUrl: 'assets/exercise-gifs/dumbbell-russian-twist.gif' },
  { id: 'weighted-crunch', name: 'Weighted Crunch / Cable-free Crunch', setsCount: 3, repRange: '15', restSeconds: 45, startWeight: 'hold 5–10 kg DB', gifUrl: 'assets/exercise-gifs/weighted-crunch.gif' },
  { id: 'dead-bug', name: 'Dead Bug', setsCount: 2, repRange: '12 / side', restSeconds: 45, startWeight: 'bodyweight', gifUrl: 'assets/exercise-gifs/dead-bug.gif' },
  // --- v14 trainer-review additions (equipment: bench, DBs, resistance band) ---
  { id: 'incline-dumbbell-curl', name: 'Incline Dumbbell Curl', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '10–14 kg / hand', gifUrl: 'assets/exercise-gifs/incline-dumbbell-curl.gif', cue: 'Lie back on the incline bench, arms hanging straight down — the stretched (lengthened) position grows more biceps per rep than a standing curl. Keep the upper arms still.' },
  { id: 'dumbbell-hip-thrust', name: 'Dumbbell Hip Thrust', setsCount: 3, repRange: '10–12', restSeconds: 90, startWeight: 'DB across hips, 24–34 kg', gifUrl: 'assets/exercise-gifs/dumbbell-hip-thrust.gif', cue: 'Shoulder blades on the bench, DB across the hips (pad it), chin tucked. Drive through the heels and squeeze the glutes hard at the top — the only direct glute work in the plan.' },
  { id: 'band-pull-apart', name: 'Band Pull-Apart', setsCount: 3, repRange: '15–20', restSeconds: 45, startWeight: 'band, controlled', gifUrl: 'assets/exercise-gifs/band-pull-apart.gif', cue: 'Hold the band in front at shoulder height, arms straight — no anchor needed. Pull it apart to your chest, squeezing the shoulder blades, then return under control. Trains rear delts AND external rotation — cheap insurance for four pressing days a week.' },
  // --- Fat-loss conditioning & metabolic additions ---
  { id: 'treadmill-incline-walk', name: 'Incline Treadmill Walk (steady)', setsCount: 1, repRange: '25–35 min', restSeconds: 0, startWeight: 'incline 6–10%, brisk', gifUrl: 'assets/exercise-gifs/treadmill-incline-walk.gif', timer: { type: 'duration', seconds: 1800 } },
  { id: 'treadmill-hiit-intervals', name: 'Treadmill HIIT Intervals', setsCount: 1, repRange: '8–10 × 30s hard / 60s easy', restSeconds: 0, startWeight: 'run/fast walk', gifUrl: 'assets/exercise-gifs/treadmill-hiit-intervals.gif', timer: { type: 'interval', workSeconds: 30, restSeconds: 60, rounds: 9 } },
  { id: 'dumbbell-thruster', name: 'Dumbbell Thruster (squat → press)', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '10–16 kg / hand', gifUrl: 'assets/exercise-gifs/dumbbell-thruster.gif' },
  { id: 'dumbbell-swing', name: 'Dumbbell Swing (hip hinge)', setsCount: 3, repRange: '15–20', restSeconds: 45, startWeight: '16–24 kg DB', gifUrl: 'assets/exercise-gifs/dumbbell-swing.gif' },
  { id: 'renegade-row', name: 'Renegade Row (plank + row)', setsCount: 3, repRange: '8 / arm', restSeconds: 60, startWeight: '10–16 kg / hand', gifUrl: 'assets/exercise-gifs/renegade-row.gif' },
  { id: 'dumbbell-push-press', name: 'Dumbbell Push Press', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '16–22 kg / hand', gifUrl: 'assets/exercise-gifs/dumbbell-push-press.gif' },
  { id: 'dumbbell-farmer-carry', name: "Farmer's Carry", setsCount: 3, repRange: '30–40 m', restSeconds: 60, startWeight: '24–32 kg / hand', gifUrl: 'assets/exercise-gifs/dumbbell-farmer-carry.gif' },
  { id: 'burpee', name: 'Burpee', setsCount: 3, repRange: '10–12', restSeconds: 45, startWeight: 'bodyweight', gifUrl: 'assets/exercise-gifs/burpee.gif' },
  { id: 'mountain-climber', name: 'Mountain Climbers', setsCount: 3, repRange: '30–40 total', restSeconds: 30, startWeight: 'bodyweight', gifUrl: 'assets/exercise-gifs/mountain-climber.gif' },
  { id: 'push-up', name: 'Push-Up', setsCount: 3, repRange: '12–20', restSeconds: 45, startWeight: 'bodyweight', gifUrl: 'assets/exercise-gifs/push-up.gif' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', setsCount: 3, repRange: '20 (10/side)', restSeconds: 30, startWeight: 'bodyweight', gifUrl: 'assets/exercise-gifs/bicycle-crunch.gif' },
  { id: 'side-plank', name: 'Side Plank', setsCount: 2, repRange: '30–45s / side', restSeconds: 30, startWeight: 'bodyweight', gifUrl: 'assets/exercise-gifs/side-plank.gif' },
  { id: 'flutter-kicks', name: 'Flutter Kicks', setsCount: 3, repRange: '30–40s', restSeconds: 30, startWeight: 'bodyweight', gifUrl: 'assets/exercise-gifs/flutter-kicks.gif' },
];

// Fat-loss / lean-definition plan: heavy compound lifting to retain muscle in a
// deficit, treadmill conditioning layered on top (HIIT finishers + steady incline
// walks), and fatigue spaced across the week — two-day training blocks separated
// by a mid-week active-recovery day, with the leg-light conditioning circuit on
// Saturday so it never steals from lower-body recovery.
const DEFAULT_ROUTINES = [
  {
    id: 'upper-power',
    name: 'Upper Power + Walk',
    tag: 'Chest · Back · Shoulders · Cardio',
    colorVar: '--push',
    exerciseIds: [
      'flat-barbell-bench-press',
      'bent-over-barbell-row',
      'incline-dumbbell-press',
      'chest-supported-dumbbell-row',
      'rear-delt-dumbbell-fly',
      'dumbbell-lateral-raise',
      'band-pull-apart',
      'preacher-curl',
      'overhead-dumbbell-triceps-extension',
      'treadmill-incline-walk',
    ],
    // Antagonist pairs — alternate a set of each and rest once after the pair to
    // roughly halve this ~26-set session without losing hypertrophy.
    supersets: [
      ['flat-barbell-bench-press', 'bent-over-barbell-row'],
      ['incline-dumbbell-press', 'chest-supported-dumbbell-row'],
      ['preacher-curl', 'overhead-dumbbell-triceps-extension'],
    ],
  },
  {
    id: 'lower-power',
    name: 'Lower Power + Walk',
    tag: 'Quads · Hams · Glutes · Cardio',
    colorVar: '--legs',
    exerciseIds: [
      'barbell-back-squat',
      'barbell-romanian-deadlift',
      'dumbbell-reverse-lunge',
      'dumbbell-calf-raise',
      'hanging-leg-raise',
      'treadmill-incline-walk',
    ],
  },
  {
    // Mid-week deload: easy movement to aid recovery, not accumulate fatigue.
    id: 'recovery-walk',
    name: 'Active Recovery',
    tag: 'Cardio · Core · Mobility',
    colorVar: '--cardio',
    exerciseIds: [
      'treadmill-incline-walk',
      'plank',
      'side-plank',
      'dead-bug',
    ],
  },
  {
    id: 'upper-hypertrophy',
    name: 'Upper Hypertrophy',
    tag: 'Push · Pull · Arms',
    colorVar: '--pull',
    exerciseIds: [
      'incline-barbell-bench-press',
      'two-arm-dumbbell-row',
      'seated-dumbbell-shoulder-press',
      'dumbbell-pullover',
      'rear-delt-dumbbell-fly',
      'lateral-raise-dropset',
      'band-pull-apart',
      'incline-dumbbell-curl',
      'lying-dumbbell-triceps-extension',
    ],
    // Antagonist pairs to compress the session (see upper-power).
    supersets: [
      ['incline-barbell-bench-press', 'two-arm-dumbbell-row'],
      ['seated-dumbbell-shoulder-press', 'dumbbell-pullover'],
      ['incline-dumbbell-curl', 'lying-dumbbell-triceps-extension'],
    ],
  },
  {
    id: 'lower-hypertrophy',
    name: 'Lower Hypertrophy + Walk',
    tag: 'Legs · Glutes · Delts · Cardio',
    colorVar: '--legs',
    exerciseIds: [
      'goblet-heels-elevated-squat',
      'dumbbell-romanian-deadlift',
      'dumbbell-lying-leg-curl',
      'bulgarian-split-squat',
      'dumbbell-hip-thrust',
      'dumbbell-lateral-raise',
      'dumbbell-calf-raise',
      'treadmill-incline-walk',
    ],
  },
  {
    // Upper/core-biased circuit: keeps conditioning high the day after leg
    // hypertrophy without adding quad-dominant work. The finisher is a Dumbbell
    // Push Press (explosive, loadable, low-impact) rather than burpees — same
    // metabolic hit, far kinder to a 40 y/o's knees and wrists, and actually
    // progressible. Its overhead press adds front-delt volume, kept in-band by
    // the front_delts MRV bump (see volume.js).
    id: 'conditioning-core',
    name: 'Conditioning & Core',
    tag: 'Full Body · Core · Cardio',
    colorVar: '--cardio',
    exerciseIds: [
      'dumbbell-farmer-carry',
      'renegade-row',
      'push-up',
      'dumbbell-push-press',
      'bicycle-crunch',
      'side-plank',
      'treadmill-hiit-intervals',
    ],
  },
];

const DEFAULT_SCHEDULE = {
  '0': null,                 // Sunday — full rest
  '1': 'upper-power',        // Monday
  '2': 'lower-power',        // Tuesday
  '3': 'recovery-walk',      // Wednesday — active recovery
  '4': 'upper-hypertrophy',  // Thursday
  '5': 'lower-hypertrophy',  // Friday
  '6': 'conditioning-core',  // Saturday — leg-light circuit + HIIT
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return buildDefaults();
    const parsed = JSON.parse(raw);
    const normalized = normalizeSettings(parsed);
    const { settings, changed } = migrateSettings(normalized);
    // Persist a one-time migration so it does not re-run and cannot clobber
    // later user customizations.
    if (changed) saveSettings(settings);
    return settings;
  } catch {
    return buildDefaults();
  }
}

// Fill in any missing top-level fields so consumers can rely on their shape.
function normalizeSettings(settings) {
  return {
    exercises: settings.exercises ?? [],
    routines: settings.routines ?? [],
    schedule: settings.schedule ?? { ...DEFAULT_SCHEDULE },
    recoveryHours: { ...DEFAULT_RECOVERY_HOURS, ...(settings.recoveryHours ?? {}) },
    planVersion: settings.planVersion ?? 0,
  };
}

/**
 * Bring stored settings up to the current shipped plan. Steps:
 *   1. One-time (on plan-version bump) — refresh known default exercises' name,
 *      gifUrl and muscle-role map to the shipped values (bundled local gifs,
 *      corrected muscle science), leaving user-added exercises and all other
 *      fields alone. Note: a bump does overwrite atlas edits made to DEFAULT
 *      exercises, the trade-off for being able to ship muscle corrections.
 *   2. Non-destructive — add any newly shipped default exercises (e.g. treadmill
 *      and conditioning moves) that the user doesn't have yet.
 *   3. One-time — for anyone below CURRENT_PLAN_VERSION, install the new default
 *      routines + weekly schedule, then stamp the version so it never re-runs.
 *      Logged workout history lives under a separate key and is untouched.
 * Returns { settings, changed } so the caller can persist only when needed.
 */
const ROLE_RANK = { prime_mover: 3, synergist: 2, stabilizer: 1 };

/** Move a legacy `shoulders` muscle tag onto `front_delts`, keeping the stronger
 *  role if the exercise already tags front_delts. Used to clean up user-created
 *  exercises that predate the v9 deltoid split. */
function remapShouldersTag(exercise) {
  const m = exercise?.muscles;
  if (!m || m.shoulders == null) return exercise;
  const { shoulders, ...rest } = m;
  const front = rest.front_delts != null
    ? ((ROLE_RANK[rest.front_delts] ?? 0) >= (ROLE_RANK[shoulders] ?? 0) ? rest.front_delts : shoulders)
    : shoulders;
  return { ...exercise, muscles: { ...rest, front_delts: front } };
}

function migrateSettings(settings) {
  const defaults = defaultExercises();
  const defaultById = new Map(defaults.map(e => [e.id, e]));
  const needsPlan = (settings.planVersion ?? 0) < CURRENT_PLAN_VERSION;

  // Step 1: refresh name + gifUrl + muscles + timer on known default exercises
  // to the shipped values (local gif paths, corrected names, corrected muscle
  // roles, cardio countdown config).
  let exercises = settings.exercises;
  if (needsPlan) {
    exercises = exercises.map(e => {
      const d = defaultById.get(e.id);
      if (!d) return e;
      const stale =
        (d.gifUrl && e.gifUrl !== d.gifUrl) ||
        (d.name && e.name !== d.name) ||
        JSON.stringify(e.muscles ?? {}) !== JSON.stringify(d.muscles ?? {}) ||
        JSON.stringify(e.timer ?? null) !== JSON.stringify(d.timer ?? null) ||
        (e.weightStep ?? null) !== (d.weightStep ?? null) ||
        (e.fatigueScale ?? null) !== (d.fatigueScale ?? null) ||
        (d.restSeconds != null && e.restSeconds !== d.restSeconds) ||
        (d.setsCount != null && e.setsCount !== d.setsCount) ||
        (d.cue != null && e.cue !== d.cue) ||
        (d.form != null && e.form !== d.form);
      return stale
        ? {
            ...e, name: d.name, gifUrl: d.gifUrl, muscles: { ...d.muscles },
            ...(d.timer ? { timer: { ...d.timer } } : {}),
            ...(d.weightStep != null ? { weightStep: d.weightStep } : {}),
            ...(d.fatigueScale != null ? { fatigueScale: d.fatigueScale } : {}),
            ...(d.restSeconds != null ? { restSeconds: d.restSeconds } : {}),
            ...(d.setsCount != null ? { setsCount: d.setsCount } : {}),
            ...(d.cue != null ? { cue: d.cue } : {}),
            ...(d.form != null ? { form: d.form } : {}),
          }
        : e;
    });
  }

  // Step 1b: remap orphaned "shoulders" tags (pre-v9 split) onto front_delts
  // across ALL exercises — including user-created ones that Step 1 leaves alone —
  // so no invisible, un-editable muscle keeps depositing fatigue.
  if (needsPlan) exercises = exercises.map(remapShouldersTag);

  // Step 2: append newly shipped default exercises the user is missing.
  const existingIds = new Set(exercises.map(e => e.id));
  const missing = defaults.filter(e => !existingIds.has(e.id));
  if (missing.length) exercises = [...exercises, ...missing];

  // Step 3: install the shipped plan + schedule once.
  const routines = needsPlan
    ? DEFAULT_ROUTINES.map(r => ({ ...r, exerciseIds: [...r.exerciseIds] }))
    : settings.routines;
  const schedule = needsPlan ? { ...DEFAULT_SCHEDULE } : settings.schedule;
  const planVersion = needsPlan ? CURRENT_PLAN_VERSION : settings.planVersion;

  // Step 4: nudge stale-default recovery windows to their recalibrated v8 values,
  // but only where the saved window is still exactly the old default — a window
  // the user has tuned via the Recovery tab is left untouched.
  let recoveryHours = settings.recoveryHours;
  if (needsPlan) {
    recoveryHours = { ...settings.recoveryHours };
    for (const [muscle, { from, to }] of Object.entries(RECOVERY_HOURS_V8_MIGRATION)) {
      if (recoveryHours[muscle] === from) recoveryHours[muscle] = to;
    }
    // v9 split: carry any saved "shoulders" window (default or tuned) onto both
    // new deltoid heads, then drop the now-orphaned key. The heads are brand new
    // in v9, so whatever normalize just seeded them (the default 48) is safe to
    // overwrite with the user's actual shoulders value.
    if (recoveryHours.shoulders != null) {
      recoveryHours.front_delts = recoveryHours.shoulders;
      recoveryHours.side_delts = recoveryHours.shoulders;
      delete recoveryHours.shoulders;
    }
  }

  const changed = missing.length > 0 || needsPlan;
  return { settings: { ...settings, exercises, routines, schedule, recoveryHours, planVersion }, changed };
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// The full default exercise pool, deduplicated by id, each with its muscle map.
function defaultExercises() {
  const seen = new Set();
  const exercises = [];
  for (const ex of EXERCISE_POOL_DATA) {
    if (!seen.has(ex.id)) {
      seen.add(ex.id);
      exercises.push({
        ...ex,
        muscles: DEFAULT_EXERCISE_MUSCLES[ex.id] ?? {},
        ...(DEFAULT_WEIGHT_STEP[ex.id] != null ? { weightStep: DEFAULT_WEIGHT_STEP[ex.id] } : {}),
        ...(DEFAULT_FATIGUE_SCALE[ex.id] != null ? { fatigueScale: DEFAULT_FATIGUE_SCALE[ex.id] } : {}),
        ...(DEFAULT_EXERCISE_FORM[ex.id] != null ? { form: DEFAULT_EXERCISE_FORM[ex.id] } : {}),
      });
    }
  }
  return exercises;
}

export function buildDefaults() {
  return {
    exercises: defaultExercises(),
    routines: DEFAULT_ROUTINES.map(r => ({ ...r, exerciseIds: [...r.exerciseIds] })),
    schedule: { ...DEFAULT_SCHEDULE },
    recoveryHours: { ...DEFAULT_RECOVERY_HOURS },
    planVersion: CURRENT_PLAN_VERSION,
  };
}

/**
 * Returns the muscles object { [muscleId]: role } for the given exercise,
 * or {} if the exercise is not found in settings.
 */
export function getExerciseMuscles(exerciseId, settings) {
  const ex = settings.exercises.find(e => e.id === exerciseId);
  return ex?.muscles ?? {};
}
