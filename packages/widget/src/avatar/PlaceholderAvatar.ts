import type { Gesture } from '@pitchcat/shared';
import type { Avatar, AvatarState } from './Avatar';

/**
 * PlaceholderAvatar renders an animated SVG cat wearing a dark business suit and tie ("Dot").
 * It supports:
 * - Breathing animation
 * - Blinking loop (every 3-6s)
 * - Eye-follow towards cursor (normalized X/Y)
 * - Dynamic mouth openness (0-1) driven by Web Audio RMS
 * - Expressive gestures (wave, point, nod, shrug, thumbsup)
 * - Respects prefers-reduced-motion
 */
export class PlaceholderAvatar implements Avatar {
  private container: HTMLElement | null = null;
  private rootEl: HTMLElement | null = null;
  private mouthEl: SVGPathElement | null = null;
  private leftPupilEl: SVGCircleElement | null = null;
  private rightPupilEl: SVGCircleElement | null = null;
  private leftArmEl: SVGGElement | null = null;
  private rightArmEl: SVGGElement | null = null;
  private headEl: SVGGElement | null = null;
  private bodyEl: SVGGElement | null = null;

  private state: AvatarState = 'idle';
  private mouthOpenness = 0;
  private reducedMotion = false;
  private blinkTimer: number | null = null;
  private gestureTimeout: number | null = null;

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
    this.startBlinkLoop();
  }

  destroy(): void {
    if (this.blinkTimer) {
      window.clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }
    if (this.gestureTimeout) {
      window.clearTimeout(this.gestureTimeout);
      this.gestureTimeout = null;
    }
    if (this.rootEl && this.rootEl.parentElement) {
      this.rootEl.parentElement.removeChild(this.rootEl);
    }
    this.container = null;
    this.rootEl = null;
  }

  setState(state: AvatarState): void {
    this.state = state;
    if (!this.rootEl) return;
    this.rootEl.setAttribute('data-state', state);

    if (state === 'thinking') {
      this.setMouth(0);
    }
  }

  setMouth(value: number): void {
    this.mouthOpenness = Math.max(0, Math.min(1, value));
    if (!this.mouthEl) return;

    // Morph the SVG mouth path between closed smile and open speaking oval
    // Base closed smile: M 42 63 Q 50 67 58 63
    // Open mouth: M 42 63 Q 50 (63 + 14 * value) 58 63 Q 50 (63 - 2 * value) 42 63
    const depth = 64 + this.mouthOpenness * 12;
    const upper = 62 - this.mouthOpenness * 2;
    const mouthPath = this.mouthOpenness > 0.08
      ? `M 43 ${upper} Q 50 ${depth} 57 ${upper} Q 50 62 43 ${upper} Z`
      : `M 43 62 Q 50 66 57 62`;

    this.mouthEl.setAttribute('d', mouthPath);
    this.mouthEl.setAttribute('fill', this.mouthOpenness > 0.15 ? '#C53030' : 'none');
  }

  triggerGesture(gesture: Gesture): void {
    if (!this.rootEl || this.reducedMotion) return;

    if (this.gestureTimeout) {
      window.clearTimeout(this.gestureTimeout);
    }

    this.rootEl.removeAttribute('data-gesture');
    // Force reflow
    void this.rootEl.offsetWidth;
    this.rootEl.setAttribute('data-gesture', gesture);

    this.gestureTimeout = window.setTimeout(() => {
      if (this.rootEl) {
        this.rootEl.removeAttribute('data-gesture');
      }
      this.gestureTimeout = null;
    }, 1800);
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    if (this.rootEl) {
      this.rootEl.classList.toggle('reduced-motion', enabled);
    }
  }

  setCursorPosition(x: number, y: number): void {
    if (this.reducedMotion || !this.leftPupilEl || !this.rightPupilEl) return;

    // Pupil shift range: -2.5 to +2.5 px
    const dx = (x - 0.5) * 5;
    const dy = (y - 0.5) * 4;

    this.leftPupilEl.setAttribute('cx', `${38 + dx}`);
    this.leftPupilEl.setAttribute('cy', `${48 + dy}`);
    this.rightPupilEl.setAttribute('cx', `${62 + dx}`);
    this.rightPupilEl.setAttribute('cy', `${48 + dy}`);
  }

  private startBlinkLoop(): void {
    const nextBlink = 2500 + Math.random() * 3500;
    this.blinkTimer = window.setTimeout(() => {
      this.doBlink();
      this.startBlinkLoop();
    }, nextBlink);
  }

  private doBlink(): void {
    if (!this.rootEl) return;
    this.rootEl.classList.add('blink');
    setTimeout(() => {
      if (this.rootEl) {
        this.rootEl.classList.remove('blink');
      }
    }, 180);
  }

  private render(): void {
    if (!this.container) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'pitchcat-avatar-wrap';
    wrapper.innerHTML = `
      <style>
        .pitchcat-avatar-wrap {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          user-select: none;
          pointer-events: none;
        }

        .cat-svg {
          width: 120px;
          height: 140px;
          overflow: visible;
          transform-origin: bottom center;
          filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.2));
        }

        /* Idle breathing */
        .cat-body-group {
          transform-origin: 50px 110px;
          animation: catBreathe 3.6s ease-in-out infinite;
        }

        .cat-head-group {
          transform-origin: 50px 52px;
          animation: catHeadBob 3.6s ease-in-out infinite;
        }

        .cat-ear-left, .cat-ear-right {
          transform-origin: 50px 30px;
          transition: transform 0.2s ease;
        }

        /* Blinking */
        .pitchcat-avatar-wrap.blink .cat-eye-white {
          transform: scaleY(0.08);
          transform-origin: center;
        }
        .pitchcat-avatar-wrap.blink .cat-pupil {
          opacity: 0;
        }

        /* Gestures */
        .pitchcat-avatar-wrap[data-gesture="wave"] .cat-arm-right {
          animation: catWave 1.4s ease-in-out;
        }
        .pitchcat-avatar-wrap[data-gesture="point"] .cat-arm-right {
          animation: catPoint 1.6s ease-in-out;
        }
        .pitchcat-avatar-wrap[data-gesture="nod"] .cat-head-group {
          animation: catNod 1.2s ease-in-out;
        }
        .pitchcat-avatar-wrap[data-gesture="shrug"] .cat-body-group {
          animation: catShrug 1.4s ease-in-out;
        }
        .pitchcat-avatar-wrap[data-gesture="thumbsup"] .cat-arm-left {
          animation: catThumbsUp 1.5s ease-in-out;
        }

        /* States */
        .pitchcat-avatar-wrap[data-state="listening"] .cat-ear-left {
          transform: rotate(-6deg) translateY(-2px);
        }
        .pitchcat-avatar-wrap[data-state="listening"] .cat-ear-right {
          transform: rotate(6deg) translateY(-2px);
        }
        .pitchcat-avatar-wrap[data-state="thinking"] .cat-head-group {
          transform: rotate(-4deg);
        }

        @keyframes catBreathe {
          0%, 100% { transform: scale(1, 1); }
          50% { transform: scale(1.02, 0.98); }
        }

        @keyframes catHeadBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(1.5px); }
        }

        @keyframes catWave {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-50deg) translate(-10px, -20px); }
          40% { transform: rotate(-30deg) translate(-8px, -15px); }
          60% { transform: rotate(-50deg) translate(-10px, -20px); }
          80% { transform: rotate(-35deg) translate(-8px, -15px); }
        }

        @keyframes catPoint {
          0%, 100% { transform: rotate(0deg); }
          25%, 75% { transform: rotate(-35deg) translate(-15px, -10px); }
        }

        @keyframes catNod {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          30% { transform: rotate(4deg) translateY(6px); }
          60% { transform: rotate(-2deg) translateY(-2px); }
          85% { transform: rotate(2deg) translateY(3px); }
        }

        @keyframes catShrug {
          0%, 100% { transform: translateY(0); }
          40%, 60% { transform: translateY(-5px); }
        }

        @keyframes catThumbsUp {
          0%, 100% { transform: rotate(0deg); }
          30%, 70% { transform: rotate(45deg) translate(8px, -12px); }
        }

        .pitchcat-avatar-wrap.reduced-motion *,
        .pitchcat-avatar-wrap.reduced-motion .cat-body-group,
        .pitchcat-avatar-wrap.reduced-motion .cat-head-group {
          animation: none !important;
          transition: none !important;
        }
      </style>

      <svg class="cat-svg" viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1E293B"/>
            <stop offset="100%" stop-color="#0F172A"/>
          </linearGradient>
          <linearGradient id="furGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#475569"/>
            <stop offset="100%" stop-color="#334155"/>
          </linearGradient>
          <linearGradient id="tieGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#00C48C"/>
            <stop offset="100%" stop-color="#00875A"/>
          </linearGradient>
          <radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#A7F3D0"/>
            <stop offset="85%" stop-color="#10B981"/>
            <stop offset="100%" stop-color="#047857"/>
          </radialGradient>
        </defs>

        <!-- Body & Suit -->
        <g class="cat-body-group" id="cat-body">
          <!-- Torso Suit Jacket -->
          <path d="M 26 80 Q 50 74 74 80 L 80 125 Q 50 128 20 125 Z" fill="url(#suitGrad)"/>
          
          <!-- White Shirt Triangle -->
          <polygon points="41,77 59,77 50,105" fill="#F8FAFC"/>
          
          <!-- Green Tie -->
          <polygon points="48,84 52,84 54,106 50,112 46,106" fill="url(#tieGrad)"/>
          <polygon points="46.5,80 53.5,80 52,84 48,84" fill="#00C48C"/>

          <!-- Suit Lapels -->
          <polygon points="26,80 43,84 35,112 25,98" fill="#334155"/>
          <polygon points="74,80 57,84 65,112 75,98" fill="#334155"/>

          <!-- Left Arm / Hand -->
          <g class="cat-arm-left" id="arm-left" style="transform-origin: 26px 85px;">
            <path d="M 25 83 Q 14 98 22 110" stroke="url(#suitGrad)" stroke-width="9" stroke-linecap="round" fill="none"/>
            <circle cx="22" cy="110" r="4.5" fill="url(#furGrad)"/>
          </g>

          <!-- Right Arm / Hand -->
          <g class="cat-arm-right" id="arm-right" style="transform-origin: 74px 85px;">
            <path d="M 75 83 Q 86 98 78 110" stroke="url(#suitGrad)" stroke-width="9" stroke-linecap="round" fill="none"/>
            <circle cx="78" cy="110" r="4.5" fill="url(#furGrad)"/>
          </g>
        </g>

        <!-- Head -->
        <g class="cat-head-group" id="cat-head">
          <!-- Left Ear -->
          <g class="cat-ear-left">
            <polygon points="24,42 34,16 45,36" fill="url(#furGrad)"/>
            <polygon points="28,38 35,22 42,34" fill="#FDA4AF"/>
          </g>
          
          <!-- Right Ear -->
          <g class="cat-ear-right">
            <polygon points="55,36 66,16 76,42" fill="url(#furGrad)"/>
            <polygon points="58,34 65,22 72,38" fill="#FDA4AF"/>
          </g>

          <!-- Head Shape -->
          <ellipse cx="50" cy="52" rx="27" ry="24" fill="url(#furGrad)"/>

          <!-- Whiskers -->
          <line x1="22" y1="56" x2="35" y2="58" stroke="#E2E8F0" stroke-width="1.2" stroke-linecap="round" opacity="0.75"/>
          <line x1="20" y1="62" x2="34" y2="62" stroke="#E2E8F0" stroke-width="1.2" stroke-linecap="round" opacity="0.75"/>
          <line x1="78" y1="56" x2="65" y2="58" stroke="#E2E8F0" stroke-width="1.2" stroke-linecap="round" opacity="0.75"/>
          <line x1="80" y1="62" x2="66" y2="62" stroke="#E2E8F0" stroke-width="1.2" stroke-linecap="round" opacity="0.75"/>

          <!-- Left Eye -->
          <ellipse class="cat-eye-white" cx="38" cy="48" rx="6.5" ry="7" fill="url(#eyeGrad)"/>
          <circle class="cat-pupil" id="cat-pupil-left" cx="38" cy="48" r="3.2" fill="#0F172A"/>
          <circle cx="36.5" cy="45.5" r="1.3" fill="#FFFFFF"/>

          <!-- Right Eye -->
          <ellipse class="cat-eye-white" cx="62" cy="48" rx="6.5" ry="7" fill="url(#eyeGrad)"/>
          <circle class="cat-pupil" id="cat-pupil-right" cx="62" cy="48" r="3.2" fill="#0F172A"/>
          <circle cx="60.5" cy="45.5" r="1.3" fill="#FFFFFF"/>

          <!-- Nose -->
          <polygon points="47.5,58 52.5,58 50,60.8" fill="#FDA4AF"/>

          <!-- Mouth -->
          <path id="cat-mouth" d="M 43 62 Q 50 66 57 62" stroke="#0F172A" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        </g>
      </svg>
    `;

    this.container.appendChild(wrapper);
    this.rootEl = wrapper;

    this.mouthEl = wrapper.querySelector('#cat-mouth');
    this.leftPupilEl = wrapper.querySelector('#cat-pupil-left');
    this.rightPupilEl = wrapper.querySelector('#cat-pupil-right');
    this.leftArmEl = wrapper.querySelector('#arm-left');
    this.rightArmEl = wrapper.querySelector('#arm-right');
    this.headEl = wrapper.querySelector('#cat-head');
    this.bodyEl = wrapper.querySelector('#cat-body');
  }
}
