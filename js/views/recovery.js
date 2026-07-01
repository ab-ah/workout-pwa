import { getSettings, getExerciseMuscles } from '../settings-store.js';

const MUSCLE_LABELS = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps',
  back: 'Back / Lats', biceps: 'Biceps', rear_delts: 'Rear Delts',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', abs: 'Abs / Core',
};

function recoveryColor(fraction) {
  const r = Math.round(255 * (1 - fraction));
  const g = Math.round(200 * fraction);
  return `rgb(${r},${g},40)`;
}

function getMuscleStatus(muscle, history, settings) {
  const recoveryHours = settings.recoveryHours[muscle] ?? 48;
  const now = Date.now();

  for (let i = history.length - 1; i >= 0; i--) {
    const session = history[i];
    // Use actual finish timestamp; fall back to noon of session date if missing
    const sessionTs = typeof session.finishedAt === 'number'
      ? session.finishedAt
      : new Date(session.date + 'T12:00:00').getTime();

    let depletion = 0;
    for (const ex of (session.exercises ?? [])) {
      const { primary, secondary } = getExerciseMuscles(ex.exerciseId, settings);
      if (primary.includes(muscle)) { depletion = 1.0; break; }
      if (secondary.includes(muscle)) depletion = Math.max(depletion, 0.5);
    }

    if (depletion === 0) continue;

    const hoursAgo = (now - sessionTs) / 3600000;
    // Primary (depletion=1.0): starts at 0% recovered, climbs to 100% over full hours.
    // Secondary (depletion=0.5): starts at 50% recovered, climbs to 100% over full hours.
    const startFraction = 1 - depletion;
    const fraction = Math.min(1, startFraction + (hoursAgo / recoveryHours) * depletion);
    return { fraction, hoursAgo };
  }

  return { fraction: 1, hoursAgo: null }; // never trained
}

function buildFrontSVG(muscleColors) {
  const c = muscleColors;
  return `<svg class="body-diagram" viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg">
  <title>Front view</title>
  <defs>
    <clipPath id="front-body-clip">
      <path d="
        M100,4 C88,4 78,12 78,26 C78,38 85,48 92,52
        C88,55 82,58 78,62 C70,66 62,70 58,80
        C54,90 54,100 52,116 C50,130 48,144 46,160
        C44,176 44,188 46,198 C36,200 28,206 26,216
        C24,228 28,244 34,256 C38,264 42,268 44,272
        C40,276 38,284 40,296 C42,306 46,314 48,320
        C44,324 40,332 38,346 C36,358 38,372 42,384
        C46,396 52,406 56,416 C58,424 58,432 58,440
        C58,452 60,460 64,464 C68,468 74,468 76,462
        C78,456 76,444 76,434 C76,424 78,414 80,404
        C82,394 84,386 86,378 C88,370 90,364 92,360
        C94,356 98,354 100,354
        C102,354 106,356 108,360
        C110,364 112,370 114,378
        C116,386 118,394 120,404
        C122,414 124,424 124,434
        C124,444 122,456 124,462
        C126,468 132,468 136,464
        C140,460 142,452 142,440
        C142,432 142,424 144,416
        C148,406 154,396 158,384
        C162,372 164,358 162,346
        C160,332 156,324 152,320
        C154,314 158,306 160,296
        C162,284 160,276 156,272
        C158,268 162,264 166,256
        C172,244 176,228 174,216
        C172,206 164,200 154,198
        C156,188 156,176 154,160
        C152,144 150,130 148,116
        C146,100 146,90 142,80
        C138,70 130,66 122,62
        C118,58 112,55 108,52
        C115,48 122,38 122,26
        C122,12 112,4 100,4 Z
      "/>
    </clipPath>
  </defs>

  <!-- Body silhouette -->
  <path d="
    M100,4 C88,4 78,12 78,26 C78,38 85,48 92,52
    C88,55 82,58 78,62 C70,66 62,70 58,80
    C54,90 54,100 52,116 C50,130 48,144 46,160
    C44,176 44,188 46,198 C36,200 28,206 26,216
    C24,228 28,244 34,256 C38,264 42,268 44,272
    C40,276 38,284 40,296 C42,306 46,314 48,320
    C44,324 40,332 38,346 C36,358 38,372 42,384
    C46,396 52,406 56,416 C58,424 58,432 58,440
    C58,452 60,460 64,464 C68,468 74,468 76,462
    C78,456 76,444 76,434 C76,424 78,414 80,404
    C82,394 84,386 86,378 C88,370 90,364 92,360
    C94,356 98,354 100,354
    C102,354 106,356 108,360
    C110,364 112,370 114,378
    C116,386 118,394 120,404
    C122,414 124,424 124,434
    C124,444 122,456 124,462
    C126,468 132,468 136,464
    C140,460 142,452 142,440
    C142,432 142,424 144,416
    C148,406 154,396 158,384
    C162,372 164,358 162,346
    C160,332 156,324 152,320
    C154,314 158,306 160,296
    C162,284 160,276 156,272
    C158,268 162,264 166,256
    C172,244 176,228 174,216
    C172,206 164,200 154,198
    C156,188 156,176 154,160
    C152,144 150,130 148,116
    C146,100 146,90 142,80
    C138,70 130,66 122,62
    C118,58 112,55 108,52
    C115,48 122,38 122,26
    C122,12 112,4 100,4 Z
  " fill="#3a4252" stroke="#4a5568" stroke-width="1"/>

  <!-- Muscle overlays clipped to body -->
  <g clip-path="url(#front-body-clip)">
    <!-- Deltoids (shoulders) -->
    <ellipse cx="54" cy="84" rx="16" ry="18" fill="${c.shoulders}" opacity="0.78"/>
    <ellipse cx="146" cy="84" rx="16" ry="18" fill="${c.shoulders}" opacity="0.78"/>

    <!-- Pectoralis major (chest) - fan shape -->
    <path d="M78,76 C78,76 72,88 72,102 C72,112 76,118 86,118 C94,118 100,112 100,106 C100,112 106,118 114,118 C124,118 128,112 128,102 C128,88 122,76 122,76 C116,80 108,82 100,82 C92,82 84,80 78,76 Z" fill="${c.chest}" opacity="0.78"/>

    <!-- Biceps -->
    <ellipse cx="38" cy="150" rx="11" ry="28" fill="${c.biceps}" opacity="0.78"/>
    <ellipse cx="162" cy="150" rx="11" ry="28" fill="${c.biceps}" opacity="0.78"/>

    <!-- Triceps (visible on sides) -->
    <ellipse cx="30" cy="148" rx="8" ry="24" fill="${c.triceps}" opacity="0.6"/>
    <ellipse cx="170" cy="148" rx="8" ry="24" fill="${c.triceps}" opacity="0.6"/>

    <!-- Rectus abdominis (abs) -->
    <rect x="88" y="124" width="24" height="12" rx="4" fill="${c.abs}" opacity="0.75"/>
    <rect x="88" y="140" width="24" height="12" rx="4" fill="${c.abs}" opacity="0.75"/>
    <rect x="88" y="156" width="24" height="12" rx="4" fill="${c.abs}" opacity="0.75"/>

    <!-- Obliques -->
    <path d="M74,128 C70,138 68,150 70,162 C72,170 76,174 80,172 C82,162 82,148 80,136 Z" fill="${c.abs}" opacity="0.55"/>
    <path d="M126,128 C130,138 132,150 130,162 C128,170 124,174 120,172 C118,162 118,148 120,136 Z" fill="${c.abs}" opacity="0.55"/>

    <!-- Quadriceps (front thighs) -->
    <path d="M62,210 C58,220 56,240 56,260 C56,280 58,300 62,316 C66,326 72,330 76,328 C80,316 82,296 82,276 C82,256 80,236 76,218 C72,210 66,208 62,210 Z" fill="${c.quads}" opacity="0.78"/>
    <path d="M138,210 C142,220 144,240 144,260 C144,280 142,300 138,316 C134,326 128,330 124,328 C120,316 118,296 118,276 C118,256 120,236 124,218 C128,210 134,208 138,210 Z" fill="${c.quads}" opacity="0.78"/>

    <!-- Calves (front visible) -->
    <ellipse cx="67" cy="390" rx="11" ry="32" fill="${c.calves}" opacity="0.72"/>
    <ellipse cx="133" cy="390" rx="11" ry="32" fill="${c.calves}" opacity="0.72"/>
  </g>

  <!-- Muscle outline details (anatomy lines) -->
  <g stroke="#4a5568" stroke-width="0.6" fill="none" opacity="0.5">
    <!-- Neck lines -->
    <line x1="94" y1="52" x2="90" y2="68"/>
    <line x1="106" y1="52" x2="110" y2="68"/>
    <!-- Chest centre line -->
    <line x1="100" y1="72" x2="100" y2="120"/>
    <!-- Abs grid lines -->
    <line x1="88" y1="136" x2="112" y2="136"/>
    <line x1="88" y1="152" x2="112" y2="152"/>
    <line x1="88" y1="168" x2="112" y2="168"/>
    <line x1="100" y1="124" x2="100" y2="182"/>
    <!-- Quad lines -->
    <line x1="69" y1="216" x2="64" y2="316"/>
    <line x1="76" y1="212" x2="76" y2="320"/>
    <line x1="124" y1="212" x2="124" y2="320"/>
    <line x1="131" y1="216" x2="136" y2="316"/>
  </g>

  <text x="100" y="490" text-anchor="middle" fill="#6b7280" font-size="9" font-family="sans-serif" letter-spacing="1">FRONT</text>
</svg>`;
}

function buildBackSVG(muscleColors) {
  const c = muscleColors;
  return `<svg class="body-diagram" viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg">
  <title>Back view</title>
  <defs>
    <clipPath id="back-body-clip">
      <path d="
        M100,4 C88,4 78,12 78,26 C78,38 85,48 92,52
        C88,55 82,58 78,62 C70,66 62,70 58,80
        C54,90 54,100 52,116 C50,130 48,144 46,160
        C44,176 44,188 46,198 C36,200 28,206 26,216
        C24,228 28,244 34,256 C38,264 42,268 44,272
        C40,276 38,284 40,296 C42,306 46,314 48,320
        C44,324 40,332 38,346 C36,358 38,372 42,384
        C46,396 52,406 56,416 C58,424 58,432 58,440
        C58,452 60,460 64,464 C68,468 74,468 76,462
        C78,456 76,444 76,434 C76,424 78,414 80,404
        C82,394 84,386 86,378 C88,370 90,364 92,360
        C94,356 98,354 100,354
        C102,354 106,356 108,360
        C110,364 112,370 114,378
        C116,386 118,394 120,404
        C122,414 124,424 124,434
        C124,444 122,456 124,462
        C126,468 132,468 136,464
        C140,460 142,452 142,440
        C142,432 142,424 144,416
        C148,406 154,396 158,384
        C162,372 164,358 162,346
        C160,332 156,324 152,320
        C154,314 158,306 160,296
        C162,284 160,276 156,272
        C158,268 162,264 166,256
        C172,244 176,228 174,216
        C172,206 164,200 154,198
        C156,188 156,176 154,160
        C152,144 150,130 148,116
        C146,100 146,90 142,80
        C138,70 130,66 122,62
        C118,58 112,55 108,52
        C115,48 122,38 122,26
        C122,12 112,4 100,4 Z
      "/>
    </clipPath>
  </defs>

  <!-- Body silhouette (same outline, back view) -->
  <path d="
    M100,4 C88,4 78,12 78,26 C78,38 85,48 92,52
    C88,55 82,58 78,62 C70,66 62,70 58,80
    C54,90 54,100 52,116 C50,130 48,144 46,160
    C44,176 44,188 46,198 C36,200 28,206 26,216
    C24,228 28,244 34,256 C38,264 42,268 44,272
    C40,276 38,284 40,296 C42,306 46,314 48,320
    C44,324 40,332 38,346 C36,358 38,372 42,384
    C46,396 52,406 56,416 C58,424 58,432 58,440
    C58,452 60,460 64,464 C68,468 74,468 76,462
    C78,456 76,444 76,434 C76,424 78,414 80,404
    C82,394 84,386 86,378 C88,370 90,364 92,360
    C94,356 98,354 100,354
    C102,354 106,356 108,360
    C110,364 112,370 114,378
    C116,386 118,394 120,404
    C122,414 124,424 124,434
    C124,444 122,456 124,462
    C126,468 132,468 136,464
    C140,460 142,452 142,440
    C142,432 142,424 144,416
    C148,406 154,396 158,384
    C162,372 164,358 162,346
    C160,332 156,324 152,320
    C154,314 158,306 160,296
    C162,284 160,276 156,272
    C158,268 162,264 166,256
    C172,244 176,228 174,216
    C172,206 164,200 154,198
    C156,188 156,176 154,160
    C152,144 150,130 148,116
    C146,100 146,90 142,80
    C138,70 130,66 122,62
    C118,58 112,55 108,52
    C115,48 122,38 122,26
    C122,12 112,4 100,4 Z
  " fill="#3a4252" stroke="#4a5568" stroke-width="1"/>

  <g clip-path="url(#back-body-clip)">
    <!-- Trapezius (upper back diamond) -->
    <path d="M100,56 C90,60 72,70 66,80 C72,88 84,94 100,96 C116,94 128,88 134,80 C128,70 110,60 100,56 Z" fill="${c.back}" opacity="0.78"/>

    <!-- Rear deltoids -->
    <ellipse cx="52" cy="86" rx="16" ry="17" fill="${c.rear_delts}" opacity="0.78"/>
    <ellipse cx="148" cy="86" rx="16" ry="17" fill="${c.rear_delts}" opacity="0.78"/>

    <!-- Latissimus dorsi (V-shape lats) -->
    <path d="M66,98 C60,110 56,128 58,148 C60,162 66,170 74,170 C80,164 84,152 86,138 C88,124 88,110 86,100 C80,98 72,96 66,98 Z" fill="${c.back}" opacity="0.78"/>
    <path d="M134,98 C140,110 144,128 142,148 C140,162 134,170 126,170 C120,164 116,152 114,138 C112,124 112,110 114,100 C120,98 128,96 134,98 Z" fill="${c.back}" opacity="0.78"/>

    <!-- Triceps (back of upper arm) -->
    <ellipse cx="34" cy="148" rx="11" ry="28" fill="${c.triceps}" opacity="0.78"/>
    <ellipse cx="166" cy="148" rx="11" ry="28" fill="${c.triceps}" opacity="0.78"/>

    <!-- Gluteus maximus -->
    <path d="M68,196 C62,202 58,214 60,228 C62,240 70,248 80,248 C88,248 94,242 96,234 C98,226 96,214 92,206 C88,198 80,194 72,194 Z" fill="${c.glutes}" opacity="0.78"/>
    <path d="M132,196 C138,202 142,214 140,228 C138,240 130,248 120,248 C112,248 106,242 104,234 C102,226 104,214 108,206 C112,198 120,194 128,194 Z" fill="${c.glutes}" opacity="0.78"/>

    <!-- Hamstrings (back of thighs) -->
    <path d="M60,256 C56,268 54,290 54,310 C54,328 58,344 64,352 C68,358 74,358 78,352 C82,340 84,318 84,298 C84,278 82,260 78,248 C72,248 64,250 60,256 Z" fill="${c.hamstrings}" opacity="0.78"/>
    <path d="M140,256 C144,268 146,290 146,310 C146,328 142,344 136,352 C132,358 126,358 122,352 C118,340 116,318 116,298 C116,278 118,260 122,248 C128,248 136,250 140,256 Z" fill="${c.hamstrings}" opacity="0.78"/>

    <!-- Calves (back) -->
    <ellipse cx="67" cy="390" rx="12" ry="32" fill="${c.calves}" opacity="0.72"/>
    <ellipse cx="133" cy="390" rx="12" ry="32" fill="${c.calves}" opacity="0.72"/>
  </g>

  <!-- Anatomy detail lines -->
  <g stroke="#4a5568" stroke-width="0.6" fill="none" opacity="0.5">
    <!-- Spine line -->
    <line x1="100" y1="56" x2="100" y2="190"/>
    <!-- Trap lines -->
    <line x1="100" y1="56" x2="66" y2="80"/>
    <line x1="100" y1="56" x2="134" y2="80"/>
    <!-- Lat lines -->
    <line x1="86" y1="100" x2="74" y2="168"/>
    <line x1="114" y1="100" x2="126" y2="168"/>
    <!-- Hamstring lines -->
    <line x1="69" y1="254" x2="64" y2="350"/>
    <line x1="79" y1="250" x2="78" y2="354"/>
    <line x1="121" y1="250" x2="122" y2="354"/>
    <line x1="131" y1="254" x2="136" y2="350"/>
  </g>

  <text x="100" y="490" text-anchor="middle" fill="#6b7280" font-size="9" font-family="sans-serif" letter-spacing="1">BACK</text>
</svg>`;
}

export function renderRecovery(container, store) {
  const settings = getSettings();
  const history = store.getHistory();

  const muscleData = {};
  for (const muscle of Object.keys(MUSCLE_LABELS)) {
    const { fraction, hoursAgo } = getMuscleStatus(muscle, history, settings);
    muscleData[muscle] = {
      fraction,
      hoursAgo,
      color: recoveryColor(fraction),
      label: MUSCLE_LABELS[muscle],
      pct: Math.round(fraction * 100),
    };
  }

  const muscleColors = {};
  for (const [m, d] of Object.entries(muscleData)) muscleColors[m] = d.color;

  const legendItems = Object.keys(MUSCLE_LABELS).map((m) => {
    const d = muscleData[m];
    const statusText = d.hoursAgo === null ? 'Fresh' : `${d.pct}% recovered`;
    return `<div class="muscle-item">
      <div class="muscle-dot" style="background:${d.color}"></div>
      <span class="muscle-name">${d.label}</span>
      <span class="muscle-status">${statusText}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="recovery-view">
      <div class="recovery-header">Recovery</div>
      <div class="recovery-sub">Color shows recovery status — red to green</div>
      <div class="body-diagrams-row">
        ${buildFrontSVG(muscleColors)}
        ${buildBackSVG(muscleColors)}
      </div>
      <div class="muscle-legend">${legendItems}</div>
    </div>
  `;
}
