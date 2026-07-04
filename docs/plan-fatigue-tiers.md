# Plan: Fatigue-model audit fixes (Tiers A/B/C) + app version indicator

Status legend: ⬜ todo · 🟨 in progress · ✅ done

Goal: implement the three tiers from the fatigue-model audit and add a visible app
version so the phone can confirm it has the latest build. Work is checkpointed and
committed per phase so it is resumable across sessions.

**Plan-version bumps:** everything in Phases 1–4 lands under `CURRENT_PLAN_VERSION = 8`.
The Tier C shoulder split (Phase 5), if done in a later session, lands under `= 9`.

Run tests with: `node --test test/*.test.js` (glob form; directory form is broken on this Node).

---

## Phase 0 — App version indicator ✅
- ⬜ Create `js/version.js` → `export const APP_VERSION = '1.1.0';` and `export const BUILD_DATE = '2026-07-04';`.
- ⬜ Show it in Settings (footer under the data actions): "Lean Build v1.1.0 · plan v8 · 2026-07-04".
  Import `APP_VERSION`, `BUILD_DATE` in `js/views/settings.js`; also show `CURRENT_PLAN_VERSION`.
- ⬜ Add `js/version.js` to `sw.js` ASSETS; bump `CACHE_NAME` (v15 → v16).
- ⬜ **Convention going forward:** every deploy bumps `APP_VERSION` (patch) AND `CACHE_NAME`.

## Phase 1 — Tier A: recovery-window recalibration + migration ✅
Edit `DEFAULT_RECOVERY_HOURS` in `js/settings-store.js`:
| muscle | old | new |
|---|---|---|
| lower_back | 84 | 60 |
| lats | 72 | 60 |
| quads | 72 | 60 |
| hamstrings | 72 | 60 |
| glutes | 72 | 60 |
| chest | 60 | 54 |
(unchanged: shoulders 48, traps 48, triceps 48, biceps 48, forearms 40, rear_delts 48, calves 48, abs 36, obliques 36)

- ⬜ Add a `RECOVERY_HOURS_V8_MIGRATION` map of `{ muscle: {from, to} }` for the six above.
- ⬜ In `migrateSettings`, gated on `needsPlan`: for each entry, if `settings.recoveryHours[m] === from`, set to `to`.
  (Preserves user tuning; only rewrites windows still at the old default.) Persist via existing `changed` flag.
- ⬜ Test in `test/settings-store.test.js`: a saved plan with old windows migrates to new; a *tuned* window (e.g. chest=90) is left alone.

## Phase 2 — Tier A: exercise retags ✅
Edit `DEFAULT_EXERCISE_MUSCLES` in `js/settings-store.js` (migration Step 1 already refreshes muscles on the v8 bump):
| exercise | muscle | old → new |
|---|---|---|
| preacher-curl | forearms | synergist → stabilizer |
| standing-dumbbell-curl | forearms | synergist → stabilizer |
| dumbbell-swing | shoulders | synergist → stabilizer |
| goblet-squat | abs | synergist → stabilizer |
| goblet-heels-elevated-squat | abs | synergist → stabilizer |
| treadmill-incline-walk | calves | synergist → stabilizer |
- ⬜ KEEP `dumbbell-hammer-curl` forearms=synergist (correct); KEEP `dumbbell-farmer-carry` forearms=prime_mover.
- ⬜ Test: preacher-curl forearms is stabilizer after migration; hammer-curl stays synergist.

## Phase 3 — Tier B: schedule/programming fixes ✅
Edit `DEFAULT_ROUTINES` in `js/settings-store.js` (Step 3 reinstalls routines on the v8 bump):
- ⬜ `conditioning-core`: replace `dumbbell-swing` with `burpee` (removes hams/glutes PM the day after Friday RDL). `burpee` already has a muscle map.
- ⬜ `upper-power`: replace `treadmill-hiit-intervals` with `treadmill-incline-walk` (stops quad synergist load the day before Tuesday squats). Update routine `name` "Upper Power + Intervals" → "Upper Power + Walk". HIIT stays on Saturday only.
- ⬜ Update `test/settings-store.test.js` schedule/routine assertions if they name these exercises (the "spaces fatigue" test checks routine ids, not exercise ids — verify it still passes).

## Phase 4 — Tier C6: isometric/cardio fatigue scaling ✅
Model change so holds/cardio don't deposit working-set fatigue.
- ⬜ Add `DEFAULT_FATIGUE_SCALE` map in `js/settings-store.js` (default 1 when absent):
  plank 0.4, side-plank 0.4, dead-bug 0.5, treadmill-incline-walk 0.5, treadmill-hiit-intervals 0.8,
  mountain-climber 0.7, flutter-kicks 0.6, hanging-leg-raise 0.8, bicycle-crunch 0.8.
- ⬜ Assign `fatigueScale` in `defaultExercises()` (like `weightStep`); add to migration stale-check + refresh.
- ⬜ In `js/recovery-model.js` `sessionDepletion`: `weightedSets += weight * setCount(ex) * scaleFor(ex.exerciseId, settings)`.
  Add `scaleFor` helper reading `settings.exercises.find(id)?.fatigueScale ?? 1`.
- ⬜ Tests in `test/recovery-model.test.js`: a scaled exercise deposits proportionally less; default (no scale) unchanged (regression guard on existing numbers).
- ⬜ Bump `CACHE_NAME`; `APP_VERSION` → 1.2.0. Commit + push checkpoint here (deployable, verifiable on phone).

## Phase 5 — Tier C5: split "shoulders" → front_delts + side_delts (LARGEST; may be a later session) ⬜
Under `CURRENT_PLAN_VERSION = 9`.
- ⬜ `muscle-atlas-paths.js`: add `front_delts` + `side_delts` labels; subdivide the single `shoulders` deltoid-cap
  path (line ~128) into two sub-paths (front slice + lateral slice). Keep `rear_delts` as-is. Cleanest is to REPLACE
  `shoulders` with the two new ids everywhere.
- ⬜ `DEFAULT_RECOVERY_HOURS`: add front_delts 48, side_delts 48; remove `shoulders`.
- ⬜ Retag every exercise using `shoulders` (≈15): presses → front_delts (PM/syn), lateral raises → side_delts PM,
  push-ups/thrusters/push-press/swing/renegade → appropriate head. (Enumerate before editing.)
- ⬜ `MUSCLE_LABELS`, recovery.js legend, week.js, today.js warnings pick up new ids automatically (they iterate MUSCLE_LABELS).
- ⬜ Migration: recoveryHours add new keys; muscle refresh handles retags on the v9 bump. Consider mapping any user-tuned `shoulders` value onto both new keys.
- ⬜ Update tests referencing `shoulders`.
- ⬜ Bump `CACHE_NAME`; `APP_VERSION` → 1.3.0.

---

## Resume notes
- After each phase: `node --test test/*.test.js` must be green, then commit `feat: …` and `git push`, then
  fast-forward master for deploy: `git push origin workout-pwa-redesign:master`, and (legacy Pages)
  `gh api -X POST repos/ab-ah/workout-pwa/pages/builds` if the auto-deploy flakes. Verify live sw.js CACHE_NAME.
- Deploy branch = **master** (Pages source); active work branch = **workout-pwa-redesign**.
- Current `CURRENT_PLAN_VERSION` before this work = 7. Phases 1–4 → 8. Phase 5 → 9.
- Attribution disabled in commits (user global setting) — no Co-Authored-By trailer.
