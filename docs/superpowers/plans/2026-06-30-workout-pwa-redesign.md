# Workout PWA Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the single-file "Lean Build" workout PWA into a multi-screen app (Today / Week / History tabs) that opens on today's workout, walks through exercises one at a time with a hybrid active-set card, logs weight+reps per set, runs a rest timer, and shows progress history with per-exercise graphs.

**Architecture:** Vanilla JS, multi-file, no build step, ES modules loaded via `<script type="module">`. Two localStorage stores (`leanbuild-plan-progress-v2`, `leanbuild-history-v2`) accessed through a storage-injectable `store.js` module so core logic is unit-testable in plain Node. Plan content stays hardcoded in `data.js`.

**Tech Stack:** HTML5, CSS3 (custom properties, no framework), vanilla JavaScript (ES modules), `node --test` for unit tests, browser DevTools + Android Chrome for manual/PWA verification.

---

## File Structure

```
/
├── index.html                  (shell: bottom nav + #view-root, replaces current monolith)
├── manifest.json                (unchanged)
├── sw.js                         (cache list updated for new files)
├── icon-192.png / icon-512.png   (unchanged)
├── css/
│   └── styles.css                 (theme vars + all component styles)
├── js/
│   ├── app.js                      (boot, tab router, mounts active view into #view-root)
│   ├── data.js                      (PLAN: array of 5 days, each with exercises)
│   ├── store.js                      (localStorage-backed store, storage-injectable)
│   ├── views/
│   │   ├── today.js                   (today/exercise-flow/summary screens)
│   │   ├── week.js                     (week-at-a-glance grid)
│   │   └── history.js                   (log list + progress graphs)
│   └── components/
│       ├── exercise-card.js             (hybrid active-set card, renders into a container)
│       ├── rest-timer.js                 (countdown UI + pure time-math helper)
│       └── chart.js                       (pure SVG path builder + render helper)
└── test/
    ├── data.test.js
    ├── store.test.js
    ├── chart.test.js
    └── rest-timer-math.test.js
```

---

### Task 1: Project scaffolding — extract CSS, new shell, folders

**Files:**
- Create: `css/styles.css`
- Create: `index.html` (overwrite existing)
- Create: `js/app.js` (stub)
- Modify: `sw.js`

- [ ] **Step 1: Create `css/styles.css` with the existing theme plus new layout classes**

```css
:root{
  --bg:#0e1014;
  --panel:#161a21;
  --panel-2:#1d222b;
  --line:#2a313d;
  --ink:#eef1f5;
  --muted:#8b94a3;
  --accent:#d6ff3f;
  --accent-dim:#9fbf2e;
  --push:#ff6b4a;
  --pull:#4ab0ff;
  --legs:#c08bff;
  --core:#ffd24a;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{
  background:var(--bg);
  color:var(--ink);
  font-family:'Inter',system-ui,sans-serif;
  line-height:1.5;
  padding:0 16px 90px;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:920px;margin:0 auto;padding-top:20px}

/* BOTTOM NAV */
.bottom-nav{
  position:fixed;left:0;right:0;bottom:0;
  display:flex;
  background:var(--panel);
  border-top:1px solid var(--line);
  padding:8px 0 calc(8px + env(safe-area-inset-bottom));
  z-index:50;
}
.bottom-nav button{
  flex:1;background:transparent;border:none;color:var(--muted);
  font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;
  padding:8px 4px;cursor:pointer;transition:color .12s;
}
.bottom-nav button.active{color:var(--accent)}

/* CARD/DAY shared */
.card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:18px;
  margin-bottom:18px;
  padding:20px 22px;
}
.card h2{font-family:'Anton',sans-serif;font-size:26px;text-transform:uppercase;margin-bottom:6px}
.muted{color:var(--muted);font-size:13px}
.btn-primary{
  font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--bg);background:var(--accent);border:none;
  padding:12px 20px;border-radius:10px;cursor:pointer;margin-top:14px;
}
.btn-secondary{
  font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted);background:transparent;border:1px solid var(--line);
  padding:10px 16px;border-radius:10px;cursor:pointer;margin-top:10px;
}

/* EXERCISE CARD (flow) */
.exercise-progress{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted);margin-bottom:10px}
.exercise-name{font-family:'Anton',sans-serif;font-size:28px;text-transform:uppercase;margin-bottom:4px}
.set-row{
  display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--panel-2);
}
.set-row.done{opacity:.55}
.set-row.active{
  background:var(--panel-2);border-radius:10px;padding:14px;margin:6px 0;border-bottom:none;
}
.set-label{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-dim);width:56px;flex-shrink:0}
.set-input{
  width:84px;background:var(--bg);border:1px solid var(--line);border-radius:7px;
  color:var(--ink);font-family:'JetBrains Mono',monospace;font-size:13px;padding:8px 10px;
}
.set-input:focus{outline:none;border-color:var(--accent)}

/* REST TIMER */
.rest-timer{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  background:var(--panel-2);border:1px dashed var(--line);border-radius:12px;padding:14px 18px;margin:12px 0;
}
.rest-timer .time{font-family:'JetBrains Mono',monospace;font-size:22px;color:var(--accent)}

/* WEEK GRID */
.week-grid{display:grid;gap:12px}
.week-item{
  display:flex;align-items:center;gap:14px;
  background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px;
}
.week-item .status{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)}
.week-item.is-next{border-color:var(--accent)}

/* HISTORY */
.history-toggle{display:flex;gap:8px;margin-bottom:16px}
.history-toggle button{
  flex:1;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--panel);
  color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:12px;text-transform:uppercase;cursor:pointer;
}
.history-toggle button.active{color:var(--accent);border-color:var(--accent)}
.session-row{
  background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin-bottom:10px;
}
.chart-svg{width:100%;height:220px;background:var(--panel);border:1px solid var(--line);border-radius:14px}

@media(max-width:680px){
  .wrap{padding-top:14px}
}
```

- [ ] **Step 2: Write new `index.html` shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lean Build</title>
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0e1014">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Lean Build">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
<div class="wrap" id="view-root"></div>

<nav class="bottom-nav" id="bottom-nav">
  <button data-tab="today">Today</button>
  <button data-tab="week">Week</button>
  <button data-tab="history">History</button>
</nav>

<script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Write `js/app.js` stub that just proves the module loads**

```js
console.log('Lean Build app booting...');
document.getElementById('view-root').innerHTML = '<p class="muted">Loading...</p>';
```

- [ ] **Step 4: Update `sw.js` cache list for the new file structure**

Read the current `sw.js` first to preserve its cache-name/versioning pattern, then update the asset list it precaches to:

```js
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/data.js',
  './js/store.js',
  './js/views/today.js',
  './js/views/week.js',
  './js/views/history.js',
  './js/components/exercise-card.js',
  './js/components/rest-timer.js',
  './js/components/chart.js',
  './icon-192.png',
  './icon-512.png'
];
```

Bump the cache version constant in `sw.js` (e.g. `CACHE_NAME = 'leanbuild-v2'`) so the new asset list replaces the old single-file cache on next install.

- [ ] **Step 5: Manual verification — open in browser**

Serve the directory with any static server (e.g. `npx serve .` or VS Code Live Server) and open it. Expected: page loads, shows "Loading...", no console errors, DevTools Application tab shows the service worker registered.

- [ ] **Step 6: Commit**

```bash
git add index.html css/styles.css js/app.js sw.js
git commit -m "feat: scaffold multi-file PWA shell with bottom nav"
```

---

### Task 2: `data.js` — hardcoded plan content

**Files:**
- Create: `js/data.js`
- Test: `test/data.test.js`

- [ ] **Step 1: Write the failing test**

```js
// test/data.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN } from '../js/data.js';

test('PLAN has exactly 5 days', () => {
  assert.equal(PLAN.length, 5);
});

test('every day has a title, tag, and at least one exercise', () => {
  for (const day of PLAN) {
    assert.equal(typeof day.title, 'string');
    assert.equal(typeof day.tag, 'string');
    assert.ok(Array.isArray(day.exercises) && day.exercises.length > 0);
  }
});

test('every exercise has a stable unique id across the whole plan', () => {
  const ids = PLAN.flatMap(day => day.exercises.map(e => e.id));
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length);
});

test('every exercise has setsCount, repRange, restSeconds, startWeight', () => {
  for (const day of PLAN) {
    for (const ex of day.exercises) {
      assert.equal(typeof ex.id, 'string');
      assert.equal(typeof ex.name, 'string');
      assert.equal(typeof ex.setsCount, 'number');
      assert.equal(typeof ex.repRange, 'string');
      assert.equal(typeof ex.restSeconds, 'number');
      assert.equal(typeof ex.startWeight, 'string');
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/data.test.js`
Expected: FAIL — `Cannot find module '../js/data.js'`

- [ ] **Step 3: Write `js/data.js`**

```js
export const PLAN = [
  {
    title: 'Push',
    tag: 'Chest · Shoulders · Triceps',
    focus: 'Mon — pressing power. Heavy on the flat/incline press, then shape the shoulders and arms.',
    colorVar: '--push',
    cardio: '15 min treadmill, incline 8–10%, brisk walk you can just hold a conversation through.',
    exercises: [
      { id: 'flat-barbell-bench-press', name: 'Flat Barbell Bench Press', setsCount: 4, repRange: '6–8', restSeconds: 90, startWeight: '50–60 kg bar', watchUrl: 'https://www.google.com/search?q=flat+barbell+bench+press+how+to' },
      { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '18–22 kg / hand', watchUrl: 'https://www.google.com/search?q=incline+dumbbell+press+form' },
      { id: 'seated-dumbbell-shoulder-press', name: 'Seated Dumbbell Shoulder Press', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '16–20 kg / hand', watchUrl: 'https://www.google.com/search?q=seated+dumbbell+shoulder+press' },
      { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: '7–10 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+lateral+raise+form' },
      { id: 'lying-dumbbell-triceps-extension', name: 'Lying Dumbbell Triceps Extension', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '8–12 kg / hand', watchUrl: 'https://www.google.com/search?q=lying+dumbbell+triceps+extension+skullcrusher' },
      { id: 'close-grip-dumbbell-press', name: 'Close-Grip Dumbbell Press', setsCount: 2, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg / hand', watchUrl: 'https://www.google.com/search?q=close+grip+dumbbell+press+triceps' }
    ]
  },
  {
    title: 'Pull',
    tag: 'Back · Biceps · Rear Delts',
    focus: 'Tue — rowing volume builds the V-taper that makes the waist look smaller. Preacher bench earns its keep here.',
    colorVar: '--pull',
    cardio: "15 min treadmill incline walk, or skip if you're spent — Pull day is long.",
    exercises: [
      { id: 'bent-over-barbell-row', name: 'Bent-Over Barbell Row', setsCount: 4, repRange: '6–8', restSeconds: 90, startWeight: '40–50 kg bar', watchUrl: 'https://www.google.com/search?q=bent+over+barbell+row+form' },
      { id: 'one-arm-dumbbell-row', name: 'One-Arm Dumbbell Row', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '22–28 kg', watchUrl: 'https://www.google.com/search?q=one+arm+dumbbell+row+form' },
      { id: 'chest-supported-dumbbell-row', name: 'Chest-Supported Dumbbell Row (incline bench)', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg / hand', watchUrl: 'https://www.google.com/search?q=chest+supported+incline+dumbbell+row' },
      { id: 'back-hyperextension', name: 'Back Hyperextension', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: 'bodyweight → hold plate', watchUrl: 'https://www.google.com/search?q=back+hyperextension+chair+form' },
      { id: 'preacher-curl', name: 'Preacher Curl (EZ/straight bar)', setsCount: 3, repRange: '8–10', restSeconds: 60, startWeight: '20–30 kg bar', watchUrl: 'https://www.google.com/search?q=barbell+preacher+curl+form' },
      { id: 'dumbbell-hammer-curl', name: 'Dumbbell Hammer Curl', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '10–14 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+hammer+curl+form' },
      { id: 'rear-delt-dumbbell-fly', name: 'Rear-Delt Dumbbell Fly', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: '6–9 kg / hand', watchUrl: 'https://www.google.com/search?q=rear+delt+dumbbell+fly+bent+over' }
    ]
  },
  {
    title: 'Legs + Core',
    tag: 'Quads · Hams · Glutes · Abs',
    focus: "Wed — legs are your biggest fat-burning engine. No rack needed; dumbbells and a barbell on the back do the job.",
    colorVar: '--legs',
    cardio: 'Optional 10 min easy walk to flush the legs — keep it light after squats.',
    exercises: [
      { id: 'goblet-squat', name: 'Goblet Squat (or DB Front Squat)', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '24–32 kg DB', watchUrl: 'https://www.google.com/search?q=goblet+squat+form' },
      { id: 'dumbbell-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', setsCount: 3, repRange: '8–10', restSeconds: 75, startWeight: '22–28 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+romanian+deadlift+form' },
      { id: 'bulgarian-split-squat', name: 'Walking / Bulgarian Split Squat', setsCount: 3, repRange: '10 / leg', restSeconds: 60, startWeight: '12–18 kg / hand', watchUrl: 'https://www.google.com/search?q=bulgarian+split+squat+dumbbell+form' },
      { id: 'dumbbell-calf-raise', name: 'Dumbbell Calf Raise', setsCount: 4, repRange: '15–20', restSeconds: 45, startWeight: '20–30 kg / hand', watchUrl: 'https://www.google.com/search?q=standing+dumbbell+calf+raise' },
      { id: 'hanging-leg-raise', name: 'Hanging-Free Leg Raise / Lying Leg Raise', setsCount: 3, repRange: '12–15', restSeconds: 60, startWeight: 'bodyweight', watchUrl: 'https://www.google.com/search?q=lying+leg+raise+abs+form' },
      { id: 'plank', name: 'Plank', setsCount: 3, repRange: '45–60s hold', restSeconds: 45, startWeight: 'bodyweight', watchUrl: 'https://www.google.com/search?q=plank+exercise+form' }
    ]
  },
  {
    title: 'Upper',
    tag: 'Chest · Back · Arms blend',
    focus: 'Thu — second upper hit at higher reps. Lighter than Mon/Tue, more pump, more fat-burn density. Supersets welcome.',
    colorVar: '--push',
    cardio: '20 min treadmill intervals: 1 min fast / 2 min walk × 6, or steady incline walk.',
    exercises: [
      { id: 'incline-barbell-bench-press', name: 'Incline Barbell Bench Press', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '40–50 kg bar', watchUrl: 'https://www.google.com/search?q=incline+barbell+bench+press+form' },
      { id: 'decline-dumbbell-press', name: 'Decline Dumbbell Press', setsCount: 3, repRange: '10–12', restSeconds: 75, startWeight: '16–20 kg / hand', watchUrl: 'https://www.google.com/search?q=decline+dumbbell+press+form' },
      { id: 'two-arm-dumbbell-row', name: 'Two-Arm Dumbbell Row', setsCount: 4, repRange: '10–12', restSeconds: 75, startWeight: '18–24 kg / hand', watchUrl: 'https://www.google.com/search?q=two+arm+dumbbell+row+bent+over' },
      { id: 'dumbbell-pullover', name: 'Dumbbell Pullover (lat/chest)', setsCount: 3, repRange: '12', restSeconds: 60, startWeight: '16–22 kg', watchUrl: 'https://www.google.com/search?q=dumbbell+pullover+form' },
      { id: 'standing-dumbbell-curl', name: 'Standing Dumbbell Curl', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '12–16 kg / hand', watchUrl: 'https://www.google.com/search?q=standing+dumbbell+biceps+curl+form' },
      { id: 'overhead-dumbbell-triceps-extension', name: 'Overhead Dumbbell Triceps Extension', setsCount: 3, repRange: '10–12', restSeconds: 60, startWeight: '14–18 kg', watchUrl: 'https://www.google.com/search?q=overhead+dumbbell+triceps+extension' },
      { id: 'lateral-raise-dropset', name: 'Lateral Raise (drop set last set)', setsCount: 3, repRange: '15', restSeconds: 60, startWeight: '6–9 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+lateral+raise+drop+set' }
    ]
  },
  {
    title: 'Lower + Core',
    tag: 'Posterior chain · Abs',
    focus: 'Fri — hamstring/glute lean toward the posterior chain, plus the heaviest ab day to finish the week.',
    colorVar: '--legs',
    cardio: '20–25 min steady incline walk — fasted morning or after lifting, your call.',
    exercises: [
      { id: 'barbell-romanian-deadlift', name: 'Barbell Romanian Deadlift', setsCount: 4, repRange: '8–10', restSeconds: 90, startWeight: '50–60 kg bar', watchUrl: 'https://www.google.com/search?q=barbell+romanian+deadlift+form' },
      { id: 'goblet-heels-elevated-squat', name: 'Goblet / Heels-Elevated Squat', setsCount: 3, repRange: '10–12', restSeconds: 75, startWeight: '24–30 kg DB', watchUrl: 'https://www.google.com/search?q=heels+elevated+goblet+squat' },
      { id: 'dumbbell-reverse-lunge', name: 'Dumbbell Reverse Lunge', setsCount: 3, repRange: '10 / leg', restSeconds: 60, startWeight: '12–16 kg / hand', watchUrl: 'https://www.google.com/search?q=dumbbell+reverse+lunge+form' },
      { id: 'weighted-back-hyperextension', name: 'Back Hyperextension (weighted)', setsCount: 3, repRange: '12', restSeconds: 60, startWeight: 'hold 10–20 kg plate', watchUrl: 'https://www.google.com/search?q=weighted+back+hyperextension' },
      { id: 'dumbbell-russian-twist', name: 'Dumbbell Russian Twist', setsCount: 3, repRange: '16 (8/side)', restSeconds: 45, startWeight: '8–12 kg', watchUrl: 'https://www.google.com/search?q=dumbbell+russian+twist+form' },
      { id: 'weighted-crunch', name: 'Weighted Crunch / Cable-free Crunch', setsCount: 3, repRange: '15', restSeconds: 45, startWeight: 'hold 5–10 kg DB', watchUrl: 'https://www.google.com/search?q=weighted+crunch+form' },
      { id: 'dead-bug', name: 'Dead Bug', setsCount: 2, repRange: '12 / side', restSeconds: 45, startWeight: 'bodyweight', watchUrl: 'https://www.google.com/search?q=dead+bug+core+exercise' }
    ]
  }
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/data.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add js/data.js test/data.test.js
git commit -m "feat: add hardcoded 5-day plan data module"
```

---

### Task 3: `store.js` — progress + sequential day logic

**Files:**
- Create: `js/store.js`
- Test: `test/store.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// test/store.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../js/store.js';

function makeMemoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k)
  };
}

test('getProgress returns default when nothing stored', () => {
  const store = createStore(makeMemoryStorage());
  assert.deepEqual(store.getProgress(), { lastCompletedDayIndex: -1, lastCompletedAt: null });
});

test('getProgress survives corrupted JSON', () => {
  const storage = makeMemoryStorage();
  storage.setItem('leanbuild-plan-progress-v2', '{not json');
  const store = createStore(storage);
  assert.deepEqual(store.getProgress(), { lastCompletedDayIndex: -1, lastCompletedAt: null });
});

test('getNextDayIndex wraps around plan length', () => {
  const store = createStore(makeMemoryStorage());
  assert.equal(store.getNextDayIndex(5, { lastCompletedDayIndex: -1 }), 0);
  assert.equal(store.getNextDayIndex(5, { lastCompletedDayIndex: 2 }), 3);
  assert.equal(store.getNextDayIndex(5, { lastCompletedDayIndex: 4 }), 0);
});

test('getHistory returns empty array when nothing stored', () => {
  const store = createStore(makeMemoryStorage());
  assert.deepEqual(store.getHistory(), []);
});

test('addSession appends to history and advances progress', () => {
  const store = createStore(makeMemoryStorage());
  const session = {
    sessionId: 's_1',
    dayIndex: 2,
    dayTitle: 'Legs + Core',
    date: '2026-06-29',
    startedAt: 1,
    finishedAt: 2,
    exercises: [{ exerciseId: 'goblet-squat', name: 'Goblet Squat', sets: [{ weight: 26, reps: 9 }] }]
  };
  store.addSession(session);
  assert.deepEqual(store.getHistory(), [session]);
  assert.deepEqual(store.getProgress(), { lastCompletedDayIndex: 2, lastCompletedAt: '2026-06-29' });
});

test('getExerciseHistory returns the heaviest set per session, sorted by insertion order', () => {
  const store = createStore(makeMemoryStorage());
  store.addSession({
    sessionId: 's_1', dayIndex: 2, dayTitle: 'Legs + Core', date: '2026-06-20',
    startedAt: 1, finishedAt: 2,
    exercises: [{ exerciseId: 'goblet-squat', name: 'Goblet Squat', sets: [{ weight: 24, reps: 10 }, { weight: 26, reps: 8 }] }]
  });
  store.addSession({
    sessionId: 's_2', dayIndex: 2, dayTitle: 'Legs + Core', date: '2026-06-27',
    startedAt: 1, finishedAt: 2,
    exercises: [{ exerciseId: 'goblet-squat', name: 'Goblet Squat', sets: [{ weight: 28, reps: 7 }] }]
  });
  assert.deepEqual(store.getExerciseHistory('goblet-squat'), [
    { date: '2026-06-20', weight: 26, reps: 8 },
    { date: '2026-06-27', weight: 28, reps: 7 }
  ]);
});

test('getExerciseHistory ignores sessions that did not include the exercise', () => {
  const store = createStore(makeMemoryStorage());
  store.addSession({
    sessionId: 's_1', dayIndex: 0, dayTitle: 'Push', date: '2026-06-20',
    startedAt: 1, finishedAt: 2,
    exercises: [{ exerciseId: 'flat-barbell-bench-press', name: 'Bench', sets: [{ weight: 50, reps: 8 }] }]
  });
  assert.deepEqual(store.getExerciseHistory('goblet-squat'), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/store.test.js`
Expected: FAIL — `Cannot find module '../js/store.js'`

- [ ] **Step 3: Write `js/store.js`**

```js
export const PROGRESS_KEY = 'leanbuild-plan-progress-v2';
export const HISTORY_KEY = 'leanbuild-history-v2';

const DEFAULT_PROGRESS = { lastCompletedDayIndex: -1, lastCompletedAt: null };

export function createStore(storage) {
  function getProgress() {
    const raw = storage.getItem(PROGRESS_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    try {
      return JSON.parse(raw);
    } catch {
      return { ...DEFAULT_PROGRESS };
    }
  }

  function saveProgress(progress) {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function getNextDayIndex(planLength, progress) {
    return (progress.lastCompletedDayIndex + 1) % planLength;
  }

  function getHistory() {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    storage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function addSession(session) {
    const history = getHistory();
    history.push(session);
    saveHistory(history);
    saveProgress({ lastCompletedDayIndex: session.dayIndex, lastCompletedAt: session.date });
    return history;
  }

  function getExerciseHistory(exerciseId) {
    const history = getHistory();
    const points = [];
    for (const session of history) {
      const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const heaviest = ex.sets.reduce((best, s) => (s.weight > best.weight ? s : best), ex.sets[0]);
        points.push({ date: session.date, weight: heaviest.weight, reps: heaviest.reps });
      }
    }
    return points;
  }

  return { getProgress, saveProgress, getNextDayIndex, getHistory, saveHistory, addSession, getExerciseHistory };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/store.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add js/store.js test/store.test.js
git commit -m "feat: add storage-injectable store with sequential day logic"
```

---

### Task 4: `chart.js` — pure SVG line-chart builder

**Files:**
- Create: `js/components/chart.js`
- Test: `test/chart.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// test/chart.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointsToPath, buildChartSVG } from '../js/components/chart.js';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/chart.test.js`
Expected: FAIL — `Cannot find module '../js/components/chart.js'`

- [ ] **Step 3: Write `js/components/chart.js`**

```js
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
    const y = max === min
      ? padding + innerHeight / 2
      : padding + innerHeight - ((p.weight - min) / (max - min)) * innerHeight;
    return `${x},${y}`;
  });

  return 'M' + coords.join(' L');
}

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

  const circles = points.map((p, i) => {
    const x = padding + i * xStep;
    const y = max === min
      ? padding + innerHeight / 2
      : padding + innerHeight - ((p.weight - min) / (max - min)) * innerHeight;
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="#d6ff3f"><title>${p.date}: ${p.weight}kg x ${p.reps}</title></circle>`;
  }).join('');

  return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}">
    <path d="${d}" fill="none" stroke="#d6ff3f" stroke-width="2"/>
    ${circles}
  </svg>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/chart.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add js/components/chart.js test/chart.test.js
git commit -m "feat: add pure SVG line chart builder for progress graphs"
```

---

### Task 5: `rest-timer.js` — time math + DOM component

**Files:**
- Create: `js/components/rest-timer.js`
- Test: `test/rest-timer-math.test.js`

- [ ] **Step 1: Write the failing test for the pure time-math helper**

```js
// test/rest-timer-math.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRemainingSeconds } from '../js/components/rest-timer.js';

test('computeRemainingSeconds returns full duration when just started', () => {
  const now = 1000000;
  const endTimestamp = now + 90000;
  assert.equal(computeRemainingSeconds(endTimestamp, now), 90);
});

test('computeRemainingSeconds counts down correctly', () => {
  const now = 1000000;
  const endTimestamp = now + 30500;
  assert.equal(computeRemainingSeconds(endTimestamp, now), 31);
});

test('computeRemainingSeconds floors at zero, never negative', () => {
  const now = 1000000;
  const endTimestamp = now - 5000;
  assert.equal(computeRemainingSeconds(endTimestamp, now), 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/rest-timer-math.test.js`
Expected: FAIL — `Cannot find module '../js/components/rest-timer.js'`

- [ ] **Step 3: Write `js/components/rest-timer.js`**

```js
export function computeRemainingSeconds(endTimestamp, now = Date.now()) {
  const remainingMs = endTimestamp - now;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * Mounts a rest timer into `container` counting down `durationSeconds`.
 * Calls `onComplete` when it reaches zero. Returns a `stop()` function
 * to cancel early (used by the Skip button and on unmount).
 */
export function mountRestTimer(container, durationSeconds, onComplete) {
  const endTimestamp = Date.now() + durationSeconds * 1000;
  container.innerHTML = `
    <div class="rest-timer">
      <span class="muted">Rest</span>
      <span class="time">${durationSeconds}s</span>
      <button class="btn-secondary" id="skip-rest">Skip rest</button>
    </div>
  `;
  const timeEl = container.querySelector('.time');
  const skipBtn = container.querySelector('#skip-rest');

  let intervalId = null;

  function tick() {
    const remaining = computeRemainingSeconds(endTimestamp);
    timeEl.textContent = `${remaining}s`;
    if (remaining <= 0) {
      stop();
      if (navigator.vibrate) navigator.vibrate(200);
      onComplete();
    }
  }

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  intervalId = setInterval(tick, 250);
  skipBtn.addEventListener('click', () => {
    stop();
    onComplete();
  });

  return { stop };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/rest-timer-math.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add js/components/rest-timer.js test/rest-timer-math.test.js
git commit -m "feat: add rest timer with backgrounding-safe time math"
```

---

### Task 6: `exercise-card.js` — hybrid active-set card component

**Files:**
- Create: `js/components/exercise-card.js`

- [ ] **Step 1: Write `js/components/exercise-card.js`**

```js
import { mountRestTimer } from './rest-timer.js';

/**
 * Renders one exercise with its sets into `container`.
 * `exercise` = { id, name, setsCount, repRange, restSeconds, startWeight, watchUrl }
 * `onExerciseComplete(loggedSets)` fires once all sets are logged and the
 * user taps "Mark Exercise Complete". `loggedSets` = [{ weight, reps }, ...]
 */
export function mountExerciseCard(container, exercise, onExerciseComplete) {
  const loggedSets = [];
  let activeSetIndex = 0;
  let timerHandle = null;

  function render() {
    const rows = [];
    for (let i = 0; i < exercise.setsCount; i++) {
      if (i < loggedSets.length) {
        const s = loggedSets[i];
        rows.push(`<div class="set-row done"><span class="set-label">Set ${i + 1}</span><span>${s.weight}kg x ${s.reps}</span></div>`);
      } else if (i === activeSetIndex) {
        rows.push(`
          <div class="set-row active" id="active-set-row">
            <span class="set-label">Set ${i + 1}</span>
            <input type="number" inputmode="decimal" class="set-input" id="weight-input" placeholder="${exercise.startWeight}">
            <input type="number" inputmode="numeric" class="set-input" id="reps-input" placeholder="${exercise.repRange}">
            <button class="btn-primary" id="log-set-btn">Log set</button>
          </div>
        `);
      } else {
        rows.push(`<div class="set-row"><span class="set-label">Set ${i + 1}</span><span class="muted">—</span></div>`);
      }
    }

    container.innerHTML = `
      <div class="exercise-progress" id="exercise-progress"></div>
      <div class="exercise-name">${exercise.name}</div>
      <p class="muted">${exercise.repRange} reps · rest ${exercise.restSeconds}s · start ~${exercise.startWeight}</p>
      <div id="set-rows">${rows.join('')}</div>
      <div id="rest-timer-slot"></div>
      <button class="btn-primary" id="complete-exercise-btn" ${loggedSets.length < exercise.setsCount ? 'disabled' : ''}>Mark Exercise Complete →</button>
    `;

    const logBtn = container.querySelector('#log-set-btn');
    if (logBtn) {
      logBtn.addEventListener('click', handleLogSet);
    }
    container.querySelector('#complete-exercise-btn').addEventListener('click', () => {
      if (loggedSets.length >= exercise.setsCount) onExerciseComplete(loggedSets);
    });
  }

  function handleLogSet() {
    const weightInput = container.querySelector('#weight-input');
    const repsInput = container.querySelector('#reps-input');
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) {
      weightInput.style.borderColor = 'var(--push)';
      repsInput.style.borderColor = 'var(--push)';
      return;
    }
    loggedSets.push({ weight, reps });
    activeSetIndex++;
    render();

    if (loggedSets.length < exercise.setsCount) {
      const slot = container.querySelector('#rest-timer-slot');
      timerHandle = mountRestTimer(slot, exercise.restSeconds, () => {
        slot.innerHTML = '';
      });
    }
  }

  render();
  return {
    destroy() {
      if (timerHandle) timerHandle.stop();
    }
  };
}
```

- [ ] **Step 2: Manual verification**

Create a temporary scratch HTML page (or use it directly once `today.js` is wired in Task 7) that mounts `mountExerciseCard` with a sample exercise object into a div, in a browser. Expected: typing weight+reps and tapping "Log set" moves to the next set row, shows a counting-down rest timer, and after the last set the "Mark Exercise Complete" button becomes enabled and clicking it logs the call.

- [ ] **Step 3: Commit**

```bash
git add js/components/exercise-card.js
git commit -m "feat: add hybrid exercise card component with set logging"
```

---

### Task 7: `today.js` — today view, exercise flow, summary screen

**Files:**
- Create: `js/views/today.js`

- [ ] **Step 1: Write `js/views/today.js`**

```js
import { PLAN } from '../data.js';
import { mountExerciseCard } from '../components/exercise-card.js';

/**
 * Renders the Today tab into `container`.
 * `store` is the object returned by createStore(localStorage).
 */
export function renderToday(container, store) {
  const progress = store.getProgress();
  const todaySessionKey = 'leanbuild-today-session-v2';
  const inProgress = readInProgressSession();

  if (inProgress) {
    renderExerciseFlow(inProgress.dayIndex, inProgress.exerciseIndex, inProgress.loggedExercises);
    return;
  }

  renderDayIntro();

  function readInProgressSession() {
    const raw = sessionStorage.getItem(todaySessionKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveInProgressSession(state) {
    sessionStorage.setItem(todaySessionKey, JSON.stringify(state));
  }

  function clearInProgressSession() {
    sessionStorage.removeItem(todaySessionKey);
  }

  function renderDayIntro() {
    const dayIndex = store.getNextDayIndex(PLAN.length, progress);
    const day = PLAN[dayIndex];
    container.innerHTML = `
      <div class="card" style="border-left:4px solid var(${day.colorVar})">
        <span class="muted">Up next</span>
        <h2>${day.title}</h2>
        <p class="muted">${day.tag}</p>
        <p class="muted" style="margin-top:8px">${day.focus}</p>
        <p class="muted" style="margin-top:10px">${day.exercises.length} exercises</p>
        <button class="btn-primary" id="start-workout-btn">Start Workout</button>
      </div>
    `;
    container.querySelector('#start-workout-btn').addEventListener('click', () => {
      const state = { dayIndex, exerciseIndex: 0, loggedExercises: [], startedAt: Date.now() };
      saveInProgressSession(state);
      renderExerciseFlow(state.dayIndex, state.exerciseIndex, state.loggedExercises, state.startedAt);
    });
  }

  function renderExerciseFlow(dayIndex, exerciseIndex, loggedExercises, startedAt) {
    const day = PLAN[dayIndex];
    const startTime = startedAt || (readInProgressSession() && readInProgressSession().startedAt) || Date.now();

    if (exerciseIndex >= day.exercises.length) {
      renderSummary(dayIndex, loggedExercises, startTime);
      return;
    }

    const exercise = day.exercises[exerciseIndex];
    container.innerHTML = `<div class="card" id="exercise-card-slot"></div>`;
    const slot = container.querySelector('#exercise-card-slot');
    const progressLabel = document.createElement('div');
    progressLabel.className = 'exercise-progress';
    progressLabel.textContent = `Exercise ${exerciseIndex + 1} of ${day.exercises.length}`;

    mountExerciseCard(slot, exercise, (sets) => {
      const updatedLogged = [...loggedExercises, { exerciseId: exercise.id, name: exercise.name, sets }];
      const state = { dayIndex, exerciseIndex: exerciseIndex + 1, loggedExercises: updatedLogged, startedAt: startTime };
      saveInProgressSession(state);
      renderExerciseFlow(dayIndex, exerciseIndex + 1, updatedLogged, startTime);
    });

    slot.prepend(progressLabel);
  }

  function renderSummary(dayIndex, loggedExercises, startedAt) {
    const day = PLAN[dayIndex];
    const finishedAt = Date.now();
    const totalSets = loggedExercises.reduce((sum, e) => sum + e.sets.length, 0);
    const minutes = Math.max(1, Math.round((finishedAt - startedAt) / 60000));

    const session = {
      sessionId: `s_${finishedAt}`,
      dayIndex,
      dayTitle: day.title,
      date: new Date().toISOString().slice(0, 10),
      startedAt,
      finishedAt,
      exercises: loggedExercises
    };
    store.addSession(session);
    clearInProgressSession();

    container.innerHTML = `
      <div class="card">
        <h2>Workout Complete</h2>
        <p class="muted">${day.title} — ${loggedExercises.length} exercises, ${totalSets} sets, ${minutes} min</p>
        <button class="btn-primary" id="back-to-today-btn">Back to Today</button>
      </div>
    `;
    container.querySelector('#back-to-today-btn').addEventListener('click', () => {
      renderToday(container, store);
    });
  }
}
```

- [ ] **Step 2: Manual verification**

Wire this into `app.js` (done fully in Task 9) and walk through a full day in the browser: Start Workout → log every set of every exercise → confirm rest timer fires between sets → confirm the final summary screen shows correct totals → confirm `leanbuild-history-v2` in DevTools Application > Local Storage now contains the session → reload mid-workout and confirm it resumes from `sessionStorage` instead of restarting.

- [ ] **Step 3: Commit**

```bash
git add js/views/today.js
git commit -m "feat: add Today view with exercise flow and summary screen"
```

---

### Task 8: `week.js` — week-at-a-glance view

**Files:**
- Create: `js/views/week.js`

- [ ] **Step 1: Write `js/views/week.js`**

```js
import { PLAN } from '../data.js';

export function renderWeek(container, store) {
  const progress = store.getProgress();
  const nextIndex = store.getNextDayIndex(PLAN.length, progress);

  const items = PLAN.map((day, index) => {
    const isNext = index === nextIndex;
    const isDoneThisCycle = !isNext && wasCompletedAfter(index);
    const status = isNext ? 'Next up' : (isDoneThisCycle ? 'Done' : 'Pending');
    return `
      <div class="week-item ${isNext ? 'is-next' : ''}" style="border-left:4px solid var(${day.colorVar})">
        <div>
          <strong>${day.title}</strong>
          <div class="muted">${day.tag} · ${day.exercises.length} exercises</div>
        </div>
        <span class="status">${status}</span>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="week-grid">${items}</div>`;

  function wasCompletedAfter(index) {
    // A day is "done this cycle" if it sits before nextIndex in plan order
    // counting from the start of the current pass through the 5-day list.
    if (progress.lastCompletedDayIndex === -1) return false;
    if (nextIndex === 0) return true; // full cycle just completed
    return index < nextIndex;
  }
}
```

- [ ] **Step 2: Manual verification**

Load the Week tab with no history (fresh localStorage): expect Push marked "Next up", rest "Pending". Complete Push and Pull via the Today flow, then revisit Week: expect Push/Pull "Done", Legs+Core "Next up", Upper/Lower "Pending". Confirm tapping a day does nothing destructive (read-only per spec — no click handler attached, which is correct).

- [ ] **Step 3: Commit**

```bash
git add js/views/week.js
git commit -m "feat: add Week view showing next/done status per day"
```

---

### Task 9: `history.js` — log list + progress graphs

**Files:**
- Create: `js/views/history.js`

- [ ] **Step 1: Write `js/views/history.js`**

```js
import { PLAN } from '../data.js';
import { buildChartSVG } from '../components/chart.js';

const ALL_EXERCISES = PLAN.flatMap((day) => day.exercises);

export function renderHistory(container, store) {
  let mode = 'log'; // 'log' | 'progress'

  function render() {
    container.innerHTML = `
      <div class="history-toggle">
        <button id="tab-log" class="${mode === 'log' ? 'active' : ''}">Log</button>
        <button id="tab-progress" class="${mode === 'progress' ? 'active' : ''}">Progress</button>
      </div>
      <div id="history-body"></div>
    `;
    container.querySelector('#tab-log').addEventListener('click', () => { mode = 'log'; render(); });
    container.querySelector('#tab-progress').addEventListener('click', () => { mode = 'progress'; render(); });

    const body = container.querySelector('#history-body');
    if (mode === 'log') renderLog(body); else renderProgress(body);
  }

  function renderLog(body) {
    const history = [...store.getHistory()].reverse();
    if (history.length === 0) {
      body.innerHTML = '<p class="muted">No sessions logged yet.</p>';
      return;
    }
    body.innerHTML = history.map((session) => `
      <div class="session-row">
        <strong>${session.dayTitle}</strong> — <span class="muted">${session.date}</span>
        <div class="muted">${session.exercises.length} exercises</div>
        <ul>
          ${session.exercises.map((e) => `<li>${e.name}: ${e.sets.map((s) => `${s.weight}kg x ${s.reps}`).join(', ')}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  }

  function renderProgress(body) {
    const options = ALL_EXERCISES.map((e) => `<option value="${e.id}">${e.name}</option>`).join('');
    body.innerHTML = `
      <select id="exercise-select" class="set-input" style="width:100%;margin-bottom:14px">${options}</select>
      <div id="chart-slot"></div>
    `;
    const select = body.querySelector('#exercise-select');
    const chartSlot = body.querySelector('#chart-slot');

    function drawChart() {
      const points = store.getExerciseHistory(select.value);
      chartSlot.innerHTML = buildChartSVG(points, { width: 600, height: 220 });
    }

    select.addEventListener('change', drawChart);
    drawChart();
  }

  render();
}
```

- [ ] **Step 2: Manual verification**

With at least 2 completed sessions of the same exercise logged at different weights, open History → Log tab: confirm sessions list newest-first with correct exercise/set breakdown. Switch to Progress tab, pick that exercise from the dropdown: confirm the SVG line chart renders with the correct number of points and hovering a point's title shows date/weight/reps. Pick an exercise with 0 or 1 sessions logged: confirm the "No data yet" message shows instead of a broken chart.

- [ ] **Step 3: Commit**

```bash
git add js/views/history.js
git commit -m "feat: add History view with log list and per-exercise progress chart"
```

---

### Task 10: `app.js` — wire up the router and bottom nav

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Replace the stub in `js/app.js` with the real router**

```js
import { createStore } from './store.js';
import { renderToday } from './views/today.js';
import { renderWeek } from './views/week.js';
import { renderHistory } from './views/history.js';

const store = createStore(window.localStorage);
const viewRoot = document.getElementById('view-root');
const navButtons = document.querySelectorAll('#bottom-nav button');

const VIEWS = {
  today: () => renderToday(viewRoot, store),
  week: () => renderWeek(viewRoot, store),
  history: () => renderHistory(viewRoot, store)
};

function setActiveTab(tab) {
  navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
  VIEWS[tab]();
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
});

setActiveTab('today');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
```

- [ ] **Step 2: Manual verification — full app walkthrough**

Open the app fresh (clear localStorage first). Expected: lands on Today tab showing Push as next workout. Tap Week tab: shows all 5 days, Push marked next. Tap History tab: shows "No sessions logged yet." and an empty-state chart. Return to Today, complete a full workout (all exercises, all sets, with rest timers firing), confirm it reaches the summary screen and returns to Today showing the next day (Pull) as next up. Confirm History now shows the completed session and its exercises' charts have one data point.

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: wire up tab router connecting Today/Week/History views"
```

---

### Task 11: PWA verification — install + offline behavior

**Files:**
- (no new files — verification only, fix forward if issues found)

- [ ] **Step 1: Serve over HTTPS or localhost and verify service worker installs**

Serve the directory (e.g. `npx serve .`) and open in Chrome DevTools > Application > Service Workers. Expected: `sw.js` shows as activated, and Application > Cache Storage shows the cache named in Task 1 Step 4 (e.g. `leanbuild-v2`) containing all files from the updated `ASSETS` list.

- [ ] **Step 2: Verify offline load**

In DevTools, toggle Network to "Offline", then hard-reload the page. Expected: app still loads, Today/Week/History all render correctly using cached files and existing localStorage data (no network errors blocking render).

- [ ] **Step 3: Verify Android install + portrait lock**

On an Android device (or Chrome remote debugging), open the hosted URL, use "Add to Home Screen". Expected: installs with the Lean Build icon, launches standalone (no browser chrome), matches `manifest.json`'s `orientation: portrait-primary`.

- [ ] **Step 4: Verify rest timer survives backgrounding**

Start a workout, log a set to trigger the rest timer, switch to another app for 10+ seconds, then return. Expected: the countdown reflects elapsed real time (not paused) because `computeRemainingSeconds` is timestamp-based, not interval-accumulated.

- [ ] **Step 5: Fix forward**

If any verification step fails, fix the relevant file (most likely `sw.js` cache list or `manifest.json`) and re-run the failed step until it passes. Do not commit broken PWA behavior.

- [ ] **Step 6: Final commit (only if fixes were needed)**

```bash
git add -A
git commit -m "fix: address PWA install/offline verification issues"
```

---

## Self-Review Notes

- **Spec coverage:** Bottom nav (Task 1/10) · sequential day data model (Task 3) · hybrid exercise card with rest timer (Tasks 5/6) · weight+reps logging (Task 6) · summary screen (Task 7) · Week read-only grid (Task 8) · History log + progress graphs (Task 9) · offline/PWA (Tasks 1/11) · unit tests for store.js and chart.js per the spec's testing section (Tasks 3/4), plus rest-timer time math (Task 5) which is the other pure-logic unit worth covering. All spec sections are covered.
- **Placeholder scan:** No TBD/TODO markers; every step has complete, runnable code.
- **Type consistency:** `exercise.id` (data.js) flows through unchanged as `exerciseId` in logged session entries (today.js → store.js), matching the schema in the spec and the `getExerciseHistory` lookup in store.js. `store.getNextDayIndex(planLength, progress)` signature is consistent between its test (Task 3) and its callers in `today.js`/`week.js` (Tasks 7/8). `mountExerciseCard(container, exercise, onExerciseComplete)` signature matches between its definition (Task 6) and its call site in `today.js` (Task 7). Fixed a `week.js` bug found during self-review: the original `wasCompletedAfter` referenced an undefined `progress` reference incorrectly in its condition — simplified to compare `index < nextIndex` consistently against `progress.lastCompletedDayIndex === -1` and the full-cycle wrap case.
