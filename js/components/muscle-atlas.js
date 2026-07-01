import {
  MUSCLE_LABELS,
  buildFrontBody,
  buildFrontMuscles,
  buildBackBody,
  buildBackMuscles,
} from './muscle-atlas-paths.js';

const ROLE_COLORS = {
  prime_mover: '#cc3333',
  synergist: '#cc7733',
  stabilizer: '#999922',
};
const DEFAULT_COLOR = '#2d3a4a';

export { MUSCLE_LABELS };

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
  background: #e8edf2;
  border-radius: 12px;
  padding: 16px 12px 10px;
}
.muscle-atlas-svg {
  width: 140px;
  height: 350px;
  overflow: visible;
  display: block;
}
.body-base {
  fill: #9baab8;
}
.muscle-path {
  fill: #2a3340;
  stroke: #9baab8;
  stroke-width: 1;
  transition: fill 0.2s ease;
}
.interactive .muscle-path {
  cursor: pointer;
}
.interactive .muscle-path:hover {
  filter: brightness(1.4);
}
.muscle-atlas-label {
  text-align: center;
  font-size: 9px;
  color: #4a5568;
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
.muscle-tooltip {
  position: fixed;
  background: #1a2030;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 9999;
  opacity: 0;
  transition: opacity 0.1s ease;
}
.muscle-tooltip.visible {
  opacity: 1;
}
`;
  document.head.appendChild(style);
}

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
    <div class="muscle-tooltip" id="muscle-tooltip"></div>
  `;

  // Apply initial roles
  for (const [muscle, role] of Object.entries(muscleRoles)) {
    applyColor(muscle, role ? (ROLE_COLORS[role] ?? DEFAULT_COLOR) : DEFAULT_COLOR);
  }

  // Wire up tooltip + click handlers for interactive mode
  if (mode === 'interactive') {
    const tooltip = container.querySelector('#muscle-tooltip');

    container.querySelectorAll('.muscle-path').forEach(path => {
      path.addEventListener('mouseenter', () => {
        const muscleId = path.dataset.muscle;
        tooltip.textContent = MUSCLE_LABELS[muscleId] ?? muscleId;
        tooltip.classList.add('visible');
      });
      path.addEventListener('mousemove', e => {
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top = (e.clientY - 28) + 'px';
      });
      path.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });

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
      el.style.fill = cssColor;
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
