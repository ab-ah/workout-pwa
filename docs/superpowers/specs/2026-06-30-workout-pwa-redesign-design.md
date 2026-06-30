# Workout PWA Redesign — Design

## Goal

Rebuild the single-page "Lean Build" workout plan PWA into a multi-screen app that opens directly on today's workout, walks through exercises one at a time, and logs weight + reps per set for long-term progress review.

## Navigation

Bottom nav with 3 tabs:
- **Today** (default) — today's workout, exercise-by-exercise logging flow.
- **Week** — read-only view of all 5 plan days, showing which is next/done.
- **History** — past sessions (log) and per-exercise progress (graphs).

## Architecture

Vanilla JS, multi-file, no build step. Static files only — works as a directly-hosted PWA (e.g. GitHub Pages) with no backend.

```
/
├── index.html          (shell: nav + view container)
├── manifest.json
├── sw.js                (cache list updated for new file structure)
├── icon-192.png / icon-512.png
├── css/
│   └── styles.css       (extracted from current inline <style>)
├── js/
│   ├── app.js             (boot, tab router, renders active view)
│   ├── data.js             (hardcoded plan: days/exercises/sets/reps)
│   ├── store.js            (localStorage read/write, schema versioning)
│   ├── views/
│   │   ├── today.js         (today's workout + exercise flow)
│   │   ├── week.js           (week-at-a-glance grid)
│   │   └── history.js         (log list + progress graphs)
│   └── components/
│       ├── exercise-card.js   (hybrid active-set card)
│       ├── rest-timer.js
│       └── chart.js           (hand-rolled SVG line chart, no dependency)
```

ES modules (`<script type="module">`) for imports — no npm, no bundler.

## Data Model (localStorage)

Two stores, versioned for future migration safety.

```js
// "leanbuild-plan-progress-v2" — where you are in the plan sequence
{
  lastCompletedDayIndex: 2,      // 0=Push,1=Pull,2=Legs,3=Upper,4=Lower; -1 = none yet
  lastCompletedAt: "2026-06-29"  // ISO date, display only ("2 days ago")
}

// "leanbuild-history-v2" — append-only log of finished sessions
[
  {
    sessionId: "s_1782700000000",
    dayIndex: 2,
    dayTitle: "Legs + Core",
    date: "2026-06-29",
    startedAt: 1782700000000,
    finishedAt: 1782703600000,
    exercises: [
      {
        exerciseId: "goblet-squat",   // stable slug, survives plan wording edits
        name: "Goblet Squat (or DB Front Squat)",
        sets: [
          { weight: 26, reps: 9 },
          { weight: 26, reps: 8 },
          { weight: 28, reps: 7 },
          { weight: 28, reps: 6 }
        ]
      }
    ]
  }
]
```

- Plan content (`data.js`) is hardcoded, same as the current app. Each exercise has a stable `id` slug so history stays linked across future wording tweaks.
- **Day selection is sequential, not calendar-based**: "today's workout" = `plan[(lastCompletedDayIndex + 1) % 5]`. Missing days or working out off-schedule doesn't break the sequence. Plan days are Push/Pull/Legs/Upper/Lower (5 entries) — rest days are not part of the sequence; if opened with no pending workout expected (i.e. user wants a true rest day), the Today tab just shows last-completed and next-up info with no forced action.
- History is append-only — entries are never edited, only added — keeping progress-graph computation simple (sort by date, plot per exercise).

## Screens

### Today tab (default)
- Shows the next day in sequence: name, tag, exercise count, "Start Workout" button.
- If already completed since last advance, shows a "✓ Completed" state with the session recap and a "Do it again" option (re-logs a fresh session for the same day without advancing the sequence further).
- **Exercise flow** (on Start):
  - One exercise at a time, hybrid card layout: the active set is expanded for weight + reps entry; completed sets collapse into a compact strip above it.
  - Logging a set auto-starts the rest timer (60–90s, per existing plan guidance) before unlocking the next set.
  - "Mark Exercise Complete →" advances to the next exercise once all sets are logged.
  - Progress indicator: "Exercise 3 of 6".
  - After the final exercise: **Summary screen** (sets/reps/weights done, time taken, streak counter) → returns to Today tab, now showing ✓ Completed.

### Week tab
- Grid/list of the 5 plan days, showing next/done status and exercise counts. Tapping a day previews its exercise list (read-only — all logging happens through Today's sequential flow to keep "today" unambiguous).

### History tab
- Toggle between:
  - **Log**: chronological list of past sessions, tap to expand and see what was logged.
  - **Progress**: pick an exercise → SVG line chart of weight × reps over time.

## Rest Timer

- Auto-starts after each set is logged; duration from the exercise's rest guidance.
- Visual countdown + `navigator.vibrate` on completion (Android-only target, no audio needed initially).
- Skippable via "Skip rest".
- Resilient to backgrounding: stores an end-timestamp and recomputes remaining time on resume, rather than relying on a continuously-running interval.

## PWA / Offline

- Fully local-first: plan bundled in `data.js`, all logs in `localStorage`. No backend, no sync, no login — single device.
- `sw.js` cache list updated to cover the new multi-file structure so offline behavior matches the current app.

## Testing Approach

- **Unit tests** (`node --test` or equivalent no-build runner) for `store.js` (schema read/write, sequential day-advance logic) and `chart.js` (data → SVG path generation) — the modules with real logic and edge cases.
- **Manual browser verification** for the exercise-flow UI, rest timer behavior, and PWA install/offline behavior — tested live per project convention, not just type-checked.

## Out of Scope (for this iteration)

- In-app plan editing (exercises/sets/reps stay hardcoded; edit via code change if needed).
- Multi-device sync / accounts / backend.
- Audio cues for the rest timer (vibration only).
