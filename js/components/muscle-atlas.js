const ROLE_COLORS = {
  prime_mover: '#cc3333',
  synergist: '#cc7733',
  stabilizer: '#999922',
};
const DEFAULT_COLOR = '#3a4252';

export const MUSCLE_LABELS = {
  chest: 'Chest', shoulders: 'Shoulders', triceps: 'Triceps',
  back: 'Back', biceps: 'Biceps', rear_delts: 'Rear Delts',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
  calves: 'Calves', abs: 'Abs',
};

let styleInjected = false;

function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
.muscle-atlas-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: flex-start;
}
.muscle-atlas-svg {
  width: 140px;
  height: 350px;
  overflow: visible;
  display: block;
}
.body-base {
  fill: #2a3040;
}
.muscle-path {
  fill: #3a4252;
  stroke: #1a2030;
  stroke-width: 0.5;
  transition: fill 0.2s ease;
}
.interactive .muscle-path {
  cursor: pointer;
}
.interactive .muscle-path:hover {
  filter: brightness(1.25);
}
.muscle-atlas-label {
  text-align: center;
  font-size: 9px;
  color: #6b7280;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 4px;
}
.atlas-role-legend {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 10px;
}
.atlas-role-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #9ca3af;
}
.atlas-role-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
`;
  document.head.appendChild(style);
}

// ─── Front body base shapes ───────────────────────────────────────────────────

function buildFrontBody() {
  return `
  <!-- Head -->
  <ellipse class="body-base" cx="100" cy="26" rx="20" ry="24"/>
  <!-- Neck -->
  <rect class="body-base" x="91" y="48" width="18" height="18" rx="5"/>
  <!-- Left shoulder cap -->
  <ellipse class="body-base" cx="32" cy="82" rx="18" ry="15"/>
  <!-- Right shoulder cap -->
  <ellipse class="body-base" cx="168" cy="82" rx="18" ry="15"/>
  <!-- Torso -->
  <path class="body-base" d="
    M58,64 C46,68 34,76 30,88 C26,100 28,118 28,132
    C26,150 24,168 26,184 C28,198 36,204 46,206
    C50,210 52,218 54,228 C56,236 56,244 58,250
    L142,250 C144,244 144,236 146,228 C148,218 150,210 154,206
    C164,204 172,198 174,184 C176,168 174,150 172,132
    C172,118 174,100 170,88 C166,76 154,68 142,64
    C132,60 118,58 100,58 C82,58 68,60 58,64 Z
  "/>
  <!-- Left upper arm -->
  <path class="body-base" d="
    M14,76 C10,80 8,92 8,106 C8,120 10,136 12,150
    C14,162 16,172 18,180 C22,186 28,188 34,186
    C40,180 42,168 42,152 C42,136 40,120 38,106
    C36,92 34,80 30,74 C24,70 18,72 14,76 Z
  "/>
  <!-- Left forearm -->
  <path class="body-base" d="
    M16,186 C12,192 10,206 10,220 C10,234 12,248 14,260
    C16,270 20,276 26,276 C32,274 36,266 38,254
    C40,242 40,228 38,214 C36,202 34,192 30,186
    C24,182 20,182 16,186 Z
  "/>
  <!-- Right upper arm -->
  <path class="body-base" d="
    M186,76 C190,80 192,92 192,106 C192,120 190,136 188,150
    C186,162 184,172 182,180 C178,186 172,188 166,186
    C160,180 158,168 158,152 C158,136 160,120 162,106
    C164,92 166,80 170,74 C176,70 182,72 186,76 Z
  "/>
  <!-- Right forearm -->
  <path class="body-base" d="
    M184,186 C188,192 190,206 190,220 C190,234 188,248 186,260
    C184,270 180,276 174,276 C168,274 164,266 162,254
    C160,242 160,228 162,214 C164,202 166,192 170,186
    C176,182 180,182 184,186 Z
  "/>
  <!-- Left thigh -->
  <path class="body-base" d="
    M50,252 C44,260 42,278 42,298 C42,318 44,338 48,354
    C52,366 58,374 66,374 C74,372 80,364 82,350
    C86,334 86,314 84,294 C82,274 78,256 72,248
    C64,244 56,246 50,252 Z
  "/>
  <!-- Right thigh -->
  <path class="body-base" d="
    M150,252 C156,260 158,278 158,298 C158,318 156,338 152,354
    C148,366 142,374 134,374 C126,372 120,364 118,350
    C114,334 114,314 116,294 C118,274 122,256 128,248
    C136,244 144,246 150,252 Z
  "/>
  <!-- Left shin -->
  <path class="body-base" d="
    M46,376 C42,384 40,398 40,414 C40,430 42,446 46,458
    C50,466 56,470 64,468 C72,466 76,458 78,448
    C80,436 78,420 76,406 C74,392 70,380 64,374
    C56,370 50,370 46,376 Z
  "/>
  <!-- Right shin -->
  <path class="body-base" d="
    M154,376 C158,384 160,398 160,414 C160,430 158,446 154,458
    C150,466 144,470 136,468 C128,466 124,458 122,448
    C120,436 122,420 124,406 C126,392 130,380 136,374
    C144,370 150,370 154,376 Z
  "/>`;
}

// ─── Front muscle overlay paths ───────────────────────────────────────────────

function buildFrontMuscles() {
  return `
  <!-- CHEST: Left pec -->
  <path class="muscle-path" data-muscle="chest" data-side="front"
    aria-label="Chest" role="button" tabindex="0"
    d="M58,70 C52,76 48,86 48,98 C48,108 52,116 60,120
       C68,122 78,118 86,112 C92,106 96,100 96,94
       C94,84 88,74 80,70 C72,66 64,66 58,70 Z"/>
  <!-- CHEST: Right pec -->
  <path class="muscle-path" data-muscle="chest" data-side="front"
    aria-label="Chest" role="button" tabindex="0"
    d="M142,70 C148,76 152,86 152,98 C152,108 148,116 140,120
       C132,122 122,118 114,112 C108,106 104,100 104,94
       C106,84 112,74 120,70 C128,66 136,66 142,70 Z"/>
  <!-- SHOULDERS: Left front delt -->
  <ellipse class="muscle-path" data-muscle="shoulders" data-side="front"
    aria-label="Shoulders" role="button" tabindex="0"
    cx="32" cy="80" rx="14" ry="18"/>
  <!-- SHOULDERS: Right front delt -->
  <ellipse class="muscle-path" data-muscle="shoulders" data-side="front"
    aria-label="Shoulders" role="button" tabindex="0"
    cx="168" cy="80" rx="14" ry="18"/>
  <!-- BICEPS: Left -->
  <ellipse class="muscle-path" data-muscle="biceps" data-side="front"
    aria-label="Biceps" role="button" tabindex="0"
    cx="24" cy="120" rx="9" ry="30"/>
  <!-- BICEPS: Right -->
  <ellipse class="muscle-path" data-muscle="biceps" data-side="front"
    aria-label="Biceps" role="button" tabindex="0"
    cx="176" cy="120" rx="9" ry="30"/>
  <!-- TRICEPS: Left outer edge -->
  <path class="muscle-path" data-muscle="triceps" data-side="front"
    aria-label="Triceps" role="button" tabindex="0"
    d="M10,100 C8,110 8,126 10,140 C12,152 16,160 20,158
       C22,150 22,132 20,116 C18,104 14,98 10,100 Z"/>
  <!-- TRICEPS: Right outer edge -->
  <path class="muscle-path" data-muscle="triceps" data-side="front"
    aria-label="Triceps" role="button" tabindex="0"
    d="M190,100 C192,110 192,126 190,140 C188,152 184,160 180,158
       C178,150 178,132 180,116 C182,104 186,98 190,100 Z"/>
  <!-- ABS: Upper left block -->
  <rect class="muscle-path" data-muscle="abs" data-side="front"
    aria-label="Abs" role="button" tabindex="0"
    x="86" y="126" width="13" height="12" rx="3"/>
  <!-- ABS: Upper right block -->
  <rect class="muscle-path" data-muscle="abs" data-side="front"
    aria-label="Abs" role="button" tabindex="0"
    x="101" y="126" width="13" height="12" rx="3"/>
  <!-- ABS: Mid left block -->
  <rect class="muscle-path" data-muscle="abs" data-side="front"
    aria-label="Abs" role="button" tabindex="0"
    x="86" y="142" width="13" height="12" rx="3"/>
  <!-- ABS: Mid right block -->
  <rect class="muscle-path" data-muscle="abs" data-side="front"
    aria-label="Abs" role="button" tabindex="0"
    x="101" y="142" width="13" height="12" rx="3"/>
  <!-- ABS: Lower left block -->
  <rect class="muscle-path" data-muscle="abs" data-side="front"
    aria-label="Abs" role="button" tabindex="0"
    x="86" y="158" width="13" height="12" rx="3"/>
  <!-- ABS: Lower right block -->
  <rect class="muscle-path" data-muscle="abs" data-side="front"
    aria-label="Abs" role="button" tabindex="0"
    x="101" y="158" width="13" height="12" rx="3"/>
  <!-- ABS: Left oblique -->
  <path class="muscle-path" data-muscle="abs" data-side="front"
    aria-label="Abs" role="button" tabindex="0"
    d="M68,128 C64,138 62,152 64,166 C66,174 70,178 74,176
       C76,166 76,148 74,134 Z"/>
  <!-- ABS: Right oblique -->
  <path class="muscle-path" data-muscle="abs" data-side="front"
    aria-label="Abs" role="button" tabindex="0"
    d="M132,128 C136,138 138,152 136,166 C134,174 130,178 126,176
       C124,166 124,148 126,134 Z"/>
  <!-- QUADS: Left -->
  <path class="muscle-path" data-muscle="quads" data-side="front"
    aria-label="Quads" role="button" tabindex="0"
    d="M50,258 C46,268 44,286 44,304 C44,322 46,340 50,352
       C54,362 60,368 68,366 C76,364 80,354 82,340
       C84,324 82,304 80,286 C78,270 74,256 66,252
       C58,248 54,252 50,258 Z"/>
  <!-- QUADS: Right -->
  <path class="muscle-path" data-muscle="quads" data-side="front"
    aria-label="Quads" role="button" tabindex="0"
    d="M150,258 C154,268 156,286 156,304 C156,322 154,340 150,352
       C146,362 140,368 132,366 C124,364 120,354 118,340
       C116,324 118,304 120,286 C122,270 126,256 134,252
       C142,248 146,252 150,258 Z"/>
  <!-- CALVES: Left front -->
  <path class="muscle-path" data-muscle="calves" data-side="front"
    aria-label="Calves" role="button" tabindex="0"
    d="M48,386 C44,396 44,412 46,426 C48,436 52,442 58,440
       C64,438 68,430 68,418 C68,406 66,394 62,386
       C58,380 52,380 48,386 Z"/>
  <!-- CALVES: Right front -->
  <path class="muscle-path" data-muscle="calves" data-side="front"
    aria-label="Calves" role="button" tabindex="0"
    d="M152,386 C156,396 156,412 154,426 C152,436 148,442 142,440
       C136,438 132,430 132,418 C132,406 134,394 138,386
       C142,380 148,380 152,386 Z"/>`;
}

// ─── Back body base shapes ────────────────────────────────────────────────────

function buildBackBody() {
  return `
  <!-- Head -->
  <ellipse class="body-base" cx="100" cy="26" rx="20" ry="24"/>
  <!-- Neck -->
  <rect class="body-base" x="91" y="48" width="18" height="18" rx="5"/>
  <!-- Left shoulder cap -->
  <ellipse class="body-base" cx="32" cy="82" rx="18" ry="15"/>
  <!-- Right shoulder cap -->
  <ellipse class="body-base" cx="168" cy="82" rx="18" ry="15"/>
  <!-- Torso -->
  <path class="body-base" d="
    M58,64 C46,68 34,76 30,88 C26,100 28,118 28,132
    C26,150 24,168 26,184 C28,198 36,204 46,206
    C50,210 52,218 54,228 C56,236 56,244 58,250
    L142,250 C144,244 144,236 146,228 C148,218 150,210 154,206
    C164,204 172,198 174,184 C176,168 174,150 172,132
    C172,118 174,100 170,88 C166,76 154,68 142,64
    C132,60 118,58 100,58 C82,58 68,60 58,64 Z
  "/>
  <!-- Left upper arm -->
  <path class="body-base" d="
    M14,76 C10,80 8,92 8,106 C8,120 10,136 12,150
    C14,162 16,172 18,180 C22,186 28,188 34,186
    C40,180 42,168 42,152 C42,136 40,120 38,106
    C36,92 34,80 30,74 C24,70 18,72 14,76 Z
  "/>
  <!-- Left forearm -->
  <path class="body-base" d="
    M16,186 C12,192 10,206 10,220 C10,234 12,248 14,260
    C16,270 20,276 26,276 C32,274 36,266 38,254
    C40,242 40,228 38,214 C36,202 34,192 30,186
    C24,182 20,182 16,186 Z
  "/>
  <!-- Right upper arm -->
  <path class="body-base" d="
    M186,76 C190,80 192,92 192,106 C192,120 190,136 188,150
    C186,162 184,172 182,180 C178,186 172,188 166,186
    C160,180 158,168 158,152 C158,136 160,120 162,106
    C164,92 166,80 170,74 C176,70 182,72 186,76 Z
  "/>
  <!-- Right forearm -->
  <path class="body-base" d="
    M184,186 C188,192 190,206 190,220 C190,234 188,248 186,260
    C184,270 180,276 174,276 C168,274 164,266 162,254
    C160,242 160,228 162,214 C164,202 166,192 170,186
    C176,182 180,182 184,186 Z
  "/>
  <!-- Glute / hip area base -->
  <path class="body-base" d="
    M54,250 C46,256 42,268 42,282 C42,296 48,308 58,312
    C66,314 76,310 82,302 C86,296 88,288 88,280
    L112,280 C112,288 114,296 118,302 C124,310 134,314 142,312
    C152,308 158,296 158,282 C158,268 154,256 146,250 Z
  "/>
  <!-- Left thigh -->
  <path class="body-base" d="
    M42,286 C38,298 38,314 40,330 C42,346 48,360 56,368
    C62,374 70,374 76,368 C82,360 84,344 82,328
    C80,312 76,296 70,284 C62,276 50,278 42,286 Z
  "/>
  <!-- Right thigh -->
  <path class="body-base" d="
    M158,286 C162,298 162,314 160,330 C158,346 152,360 144,368
    C138,374 130,374 124,368 C118,360 116,344 118,328
    C120,312 124,296 130,284 C138,276 150,278 158,286 Z
  "/>
  <!-- Left shin -->
  <path class="body-base" d="
    M42,372 C38,382 36,398 38,414 C40,430 44,444 50,454
    C54,462 60,464 66,462 C72,458 76,448 76,436
    C76,420 74,404 70,390 C66,378 60,370 54,370
    C48,370 44,370 42,372 Z
  "/>
  <!-- Right shin -->
  <path class="body-base" d="
    M158,372 C162,382 164,398 162,414 C160,430 156,444 150,454
    C146,462 140,464 134,462 C128,458 124,448 124,436
    C124,420 126,404 130,390 C134,378 140,370 146,370
    C152,370 156,370 158,372 Z
  "/>`;
}

// ─── Back muscle overlay paths ────────────────────────────────────────────────

function buildBackMuscles() {
  return `
  <!-- REAR DELTS: Left -->
  <ellipse class="muscle-path" data-muscle="rear_delts" data-side="back"
    aria-label="Rear Delts" role="button" tabindex="0"
    cx="32" cy="80" rx="15" ry="18"/>
  <!-- REAR DELTS: Right -->
  <ellipse class="muscle-path" data-muscle="rear_delts" data-side="back"
    aria-label="Rear Delts" role="button" tabindex="0"
    cx="168" cy="80" rx="15" ry="18"/>
  <!-- BACK: Upper traps (diamond) -->
  <path class="muscle-path" data-muscle="back" data-side="back"
    aria-label="Back" role="button" tabindex="0"
    d="M100,58 C88,62 72,70 64,80 C72,90 86,96 100,98
       C114,96 128,90 136,80 C128,70 112,62 100,58 Z"/>
  <!-- BACK: Left lat -->
  <path class="muscle-path" data-muscle="back" data-side="back"
    aria-label="Back" role="button" tabindex="0"
    d="M46,98 C40,110 38,126 40,144 C42,158 50,168 60,170
       C68,168 74,158 76,144 C78,128 76,112 70,100
       C64,92 54,92 46,98 Z"/>
  <!-- BACK: Right lat -->
  <path class="muscle-path" data-muscle="back" data-side="back"
    aria-label="Back" role="button" tabindex="0"
    d="M154,98 C160,110 162,126 160,144 C158,158 150,168 140,170
       C132,168 126,158 124,144 C122,128 124,112 130,100
       C136,92 146,92 154,98 Z"/>
  <!-- BACK: Left rhomboid -->
  <path class="muscle-path" data-muscle="back" data-side="back"
    aria-label="Back" role="button" tabindex="0"
    d="M78,90 C74,96 72,106 74,116 C76,122 82,126 88,124
       C92,118 92,108 90,98 C88,90 82,86 78,90 Z"/>
  <!-- BACK: Right rhomboid -->
  <path class="muscle-path" data-muscle="back" data-side="back"
    aria-label="Back" role="button" tabindex="0"
    d="M122,90 C126,96 128,106 126,116 C124,122 118,126 112,124
       C108,118 108,108 110,98 C112,90 118,86 122,90 Z"/>
  <!-- TRICEPS: Left back of arm -->
  <path class="muscle-path" data-muscle="triceps" data-side="back"
    aria-label="Triceps" role="button" tabindex="0"
    d="M10,96 C8,108 8,126 10,142 C12,156 18,166 24,164
       C30,160 34,148 34,132 C34,116 30,102 24,94
       C18,88 12,90 10,96 Z"/>
  <!-- TRICEPS: Right back of arm -->
  <path class="muscle-path" data-muscle="triceps" data-side="back"
    aria-label="Triceps" role="button" tabindex="0"
    d="M190,96 C192,108 192,126 190,142 C188,156 182,166 176,164
       C170,160 166,148 166,132 C166,116 170,102 176,94
       C182,88 188,90 190,96 Z"/>
  <!-- GLUTES: Left -->
  <path class="muscle-path" data-muscle="glutes" data-side="back"
    aria-label="Glutes" role="button" tabindex="0"
    d="M50,256 C44,264 42,276 44,290 C46,302 56,312 68,312
       C78,312 86,304 88,292 C90,280 86,266 78,258
       C70,250 58,250 50,256 Z"/>
  <!-- GLUTES: Right -->
  <path class="muscle-path" data-muscle="glutes" data-side="back"
    aria-label="Glutes" role="button" tabindex="0"
    d="M150,256 C156,264 158,276 156,290 C154,302 144,312 132,312
       C122,312 114,304 112,292 C110,280 114,266 122,258
       C130,250 142,250 150,256 Z"/>
  <!-- HAMSTRINGS: Left -->
  <path class="muscle-path" data-muscle="hamstrings" data-side="back"
    aria-label="Hamstrings" role="button" tabindex="0"
    d="M44,296 C40,310 40,328 42,346 C44,360 50,370 58,372
       C66,372 72,364 74,352 C76,338 76,320 72,304
       C68,290 60,282 52,284 C48,286 46,290 44,296 Z"/>
  <!-- HAMSTRINGS: Right -->
  <path class="muscle-path" data-muscle="hamstrings" data-side="back"
    aria-label="Hamstrings" role="button" tabindex="0"
    d="M156,296 C160,310 160,328 158,346 C156,360 150,370 142,372
       C134,372 128,364 126,352 C124,338 124,320 128,304
       C132,290 140,282 148,284 C152,286 154,290 156,296 Z"/>
  <!-- CALVES: Left gastrocnemius -->
  <path class="muscle-path" data-muscle="calves" data-side="back"
    aria-label="Calves" role="button" tabindex="0"
    d="M42,382 C38,394 38,412 42,428 C46,440 52,448 60,446
       C68,444 72,434 72,420 C72,406 68,392 62,382
       C56,374 48,374 42,382 Z"/>
  <!-- CALVES: Right gastrocnemius -->
  <path class="muscle-path" data-muscle="calves" data-side="back"
    aria-label="Calves" role="button" tabindex="0"
    d="M158,382 C162,394 162,412 158,428 C154,440 148,448 140,446
       C132,444 128,434 128,420 C128,406 132,392 138,382
       C144,374 152,374 158,382 Z"/>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function createMuscleAtlas(container, options = {}) {
  const { mode = 'display', onChange, initialRoles = {} } = options;

  injectStyles();

  const muscleRoles = { ...initialRoles };

  container.innerHTML = `
    <div class="muscle-atlas-row ${mode === 'interactive' ? 'interactive' : ''}">
      <div>
        <svg class="muscle-atlas-svg" viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg">
          ${buildFrontBody()}
          ${buildFrontMuscles()}
        </svg>
        <div class="muscle-atlas-label">Front</div>
      </div>
      <div>
        <svg class="muscle-atlas-svg" viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg">
          ${buildBackBody()}
          ${buildBackMuscles()}
        </svg>
        <div class="muscle-atlas-label">Back</div>
      </div>
    </div>
  `;

  // Apply initial roles
  for (const [muscle, role] of Object.entries(muscleRoles)) {
    applyColor(muscle, role ? (ROLE_COLORS[role] ?? DEFAULT_COLOR) : DEFAULT_COLOR);
  }

  // Wire up click handlers for interactive mode
  if (mode === 'interactive') {
    container.querySelectorAll('.muscle-path').forEach(path => {
      path.addEventListener('click', () => {
        const muscle = path.dataset.muscle;
        const current = muscleRoles[muscle] ?? null;
        const next = cycleRole(current);
        if (next === null) {
          delete muscleRoles[muscle];
        } else {
          muscleRoles[muscle] = next;
        }
        applyColor(muscle, next ? ROLE_COLORS[next] : DEFAULT_COLOR);
        if (onChange) onChange({ muscle, role: next });
      });

      path.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          path.click();
        }
      });
    });
  }

  function cycleRole(current) {
    const sequence = [null, 'prime_mover', 'synergist', 'stabilizer'];
    const idx = sequence.indexOf(current);
    return sequence[(idx + 1) % sequence.length];
  }

  function applyColor(muscleId, cssColor) {
    container.querySelectorAll(`[data-muscle="${muscleId}"]`).forEach(el => {
      el.setAttribute('fill', cssColor);
    });
  }

  return {
    setMuscleColor(muscleId, cssColor) {
      applyColor(muscleId, cssColor);
    },
    setMuscleRole(muscleId, role) {
      if (role === null) {
        delete muscleRoles[muscleId];
      } else {
        muscleRoles[muscleId] = role;
      }
      applyColor(muscleId, role ? (ROLE_COLORS[role] ?? DEFAULT_COLOR) : DEFAULT_COLOR);
    },
    getMuscleRoles() {
      return { ...muscleRoles };
    },
    setMuscleRoles(rolesObj) {
      for (const m of Object.keys(muscleRoles)) {
        applyColor(m, DEFAULT_COLOR);
      }
      for (const k of Object.keys(muscleRoles)) delete muscleRoles[k];
      Object.assign(muscleRoles, rolesObj);
      for (const [m, r] of Object.entries(rolesObj)) {
        applyColor(m, r ? (ROLE_COLORS[r] ?? DEFAULT_COLOR) : DEFAULT_COLOR);
      }
    },
  };
}

export { ROLE_COLORS };
