import {
  type CompanyConfig,
  type Intent,
  type Pitch,
  type TimelineCue,
  WidgetState,
  type WidgetStateValue,
} from '@pitchcat/shared';
import { AvatarFactory } from '../avatar/AvatarFactory';
import type { Avatar } from '../avatar/Avatar';
import { AudioEngine } from '../audio/AudioEngine';
import { TimelinePlayer } from '../timeline/TimelinePlayer';
import { LiveVoiceEngine } from '../voice/LiveVoiceEngine';

export class PitchCatWidget extends HTMLElement {
  private config!: CompanyConfig;
  private shadow: ShadowRoot;
  private avatar: Avatar | null = null;
  private audio: AudioEngine | null = null;
  private timelinePlayer: TimelinePlayer | null = null;
  private liveVoiceEngine: LiveVoiceEngine | null = null;
  private state: WidgetStateValue = WidgetState.HIDDEN;
  private selectedIntent: Intent = 'general';
  private stopSpeech: (() => void) | null = null;

  // Proactive scroll perception state
  private scrollObserver: IntersectionObserver | null = null;
  private sectionDwellTimeout: number | null = null;
  private nudgedSections = new Set<string>();

  // DOM elements inside Shadow DOM
  private containerEl!: HTMLDivElement;
  private mascotWrapEl!: HTMLDivElement;
  private inviteBubbleEl!: HTMLDivElement;
  private pitchCardEl!: HTMLDivElement;
  private captionEl!: HTMLDivElement;
  private progressBarEl!: HTMLDivElement;
  private muteBtnEl!: HTMLButtonElement;
  private playPauseBtnEl!: HTMLButtonElement;
  private ctaPanelEl!: HTMLDivElement;
  private voiceCardEl!: HTMLDivElement;
  private voiceStatusTagEl!: HTMLSpanElement;
  private voiceUserTranscriptEl!: HTMLDivElement;
  private voiceDotTranscriptEl!: HTMLDivElement;

  private mouseMoveHandler: (e: MouseEvent) => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.mouseMoveHandler = this.onMouseMove.bind(this);
  }

  init(config: CompanyConfig): void {
    this.config = config;
    this.render();
    this.setupAudioAndAvatar();
    this.setupInviteTrigger();
    this.setupScrollPerception();
    window.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
  }

  disconnectedCallback(): void {
    window.removeEventListener('mousemove', this.mouseMoveHandler);
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver = null;
    }
    if (this.sectionDwellTimeout) {
      window.clearTimeout(this.sectionDwellTimeout);
      this.sectionDwellTimeout = null;
    }
    if (this.avatar) {
      this.avatar.destroy();
    }
    if (this.audio) {
      this.audio.destroy();
    }
    if (this.timelinePlayer) {
      this.timelinePlayer.destroy();
    }
    if (this.liveVoiceEngine) {
      this.liveVoiceEngine.stop();
    }
  }

  private setState(newState: WidgetStateValue): void {
    this.state = newState;
    this.containerEl.setAttribute('data-state', newState);

    if (this.avatar) {
      if (newState === WidgetState.PITCHING || newState === WidgetState.SPEAKING || newState === WidgetState.QA_SPEAKING) {
        this.avatar.setState('talking');
      } else if (newState === WidgetState.LISTENING || newState === WidgetState.QA_LISTENING) {
        this.avatar.setState('listening');
      } else if (newState === WidgetState.THINKING || newState === WidgetState.QA_THINKING) {
        this.avatar.setState('thinking');
      } else {
        this.avatar.setState('idle');
      }
    }
  }

  private async startLiveVoice(): Promise<void> {
    if (this.timelinePlayer) {
      this.timelinePlayer.stop();
    }
    if (this.audio) {
      this.audio.stopSpeaking();
    }

    this.setState(WidgetState.LISTENING);

    if (this.voiceStatusTagEl) {
      this.voiceStatusTagEl.textContent = 'Listening to you...';
    }
    if (this.voiceUserTranscriptEl) {
      this.voiceUserTranscriptEl.textContent = 'Listening... Speak naturally!';
    }
    if (this.voiceDotTranscriptEl) {
      this.voiceDotTranscriptEl.textContent = `Hi! I'm ${this.config.mascot.name}. Ask me anything about ${this.config.name} or what we do.`;
    }

    if (this.avatar) {
      this.avatar.triggerGesture('wave');
    }

    if (!this.liveVoiceEngine) {
      this.liveVoiceEngine = new LiveVoiceEngine({
        onStateChange: (vState) => {
          if (vState === 'listening') {
            this.setState(WidgetState.LISTENING);
            if (this.voiceStatusTagEl) this.voiceStatusTagEl.textContent = 'Listening... (Speak to interrupt)';
          } else if (vState === 'thinking') {
            this.setState(WidgetState.THINKING);
            if (this.voiceStatusTagEl) this.voiceStatusTagEl.textContent = 'Thinking...';
          } else if (vState === 'speaking') {
            this.setState(WidgetState.SPEAKING);
            if (this.voiceStatusTagEl) this.voiceStatusTagEl.textContent = `${this.config.mascot.name} is Speaking...`;
          } else if (vState === 'idle') {
            this.setState(WidgetState.IDLE);
          }
        },
        onTranscript: (speaker, text) => {
          if (speaker === 'user' && this.voiceUserTranscriptEl) {
            this.voiceUserTranscriptEl.textContent = `You: "${text}"`;
          } else if (speaker === 'dot' && this.voiceDotTranscriptEl) {
            this.voiceDotTranscriptEl.textContent = `${this.config.mascot.name}: "${text}"`;
          }
        },
        onInterrupted: () => {
          if (this.avatar) {
            this.avatar.setMouth(0);
            this.avatar.setState('listening');
          }
          if (this.voiceStatusTagEl) {
            this.voiceStatusTagEl.textContent = 'Barge-in: Listening to you!';
          }
        },
        onGesture: (gesture) => {
          if (this.avatar) this.avatar.triggerGesture(gesture);
        },
        onScrollTo: (selector) => {
          try {
            document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch {}
        },
        onShowCta: () => {
          this.renderInlineLeadCapture();
        },
        onAmplitude: (level) => {
          if (this.avatar) this.avatar.setMouth(level);
        },
      });
    }

    await this.liveVoiceEngine.start();
  }

  private stopLiveVoice(): void {
    if (this.liveVoiceEngine) {
      this.liveVoiceEngine.stop();
    }
    this.setState(WidgetState.IDLE);
  }

  private setupAudioAndAvatar(): void {
    this.audio = new AudioEngine();
    // Render the configured mascot avatar (3D Three.js or lightweight SVG)
    this.avatar = AvatarFactory.create(this.config.mascot?.avatar);
    this.avatar.mount(this.mascotWrapEl);

    // Sync mouth movement with audio amplitude
    this.audio.onAmplitude((level) => {
      if (this.avatar) {
        this.avatar.setMouth(level);
      }
    });

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.avatar.setReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', (e) => {
      if (this.avatar) this.avatar.setReducedMotion(e.matches);
    });

    this.setState(WidgetState.IDLE);
  }

  private setupInviteTrigger(): void {
    const inviteKey = `pitchcat_invited_${this.config.id}`;
    const alreadyInvited = sessionStorage.getItem(inviteKey);

    if (!alreadyInvited) {
      const delay = (this.config.inviteDelaySec || 5) * 1000;
      window.setTimeout(() => {
        if (this.state === WidgetState.IDLE) {
          this.setState(WidgetState.INVITE);
          sessionStorage.setItem(inviteKey, 'true');
          if (this.avatar) {
            this.avatar.triggerGesture('wave');
          }
        }
      }, delay);
    }
  }

  /**
   * Proactive scroll-aware perception:
   * Monitors when a user dwells on a section for >6 seconds and provides an intelligent,
   * non-intrusive contextual nudge tailored to what they are reading.
   */
  private setupScrollPerception(): void {
    if (this.config.proactive === false) return;
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const sections = Array.from(document.querySelectorAll('section[id], main > div[id], [data-mascot-section]'));
    if (sections.length === 0) return;

    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id || entry.target.getAttribute('data-mascot-section') || '';
          if (!id) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            if (this.nudgedSections.has(id)) continue;

            if (this.sectionDwellTimeout) {
              window.clearTimeout(this.sectionDwellTimeout);
            }

            // Dwell timer: trigger proactive nudge after 6 seconds of staying on this section
            this.sectionDwellTimeout = window.setTimeout(() => {
              if (this.state === WidgetState.IDLE || this.state === WidgetState.HIDDEN) {
                this.triggerProactiveNudge(id, entry.target);
              }
            }, 6000);
          } else {
            if (this.sectionDwellTimeout) {
              window.clearTimeout(this.sectionDwellTimeout);
              this.sectionDwellTimeout = null;
            }
          }
        }
      },
      { threshold: [0.35, 0.7] }
    );

    sections.forEach((sec) => this.scrollObserver?.observe(sec));
  }

  private triggerProactiveNudge(sectionId: string, sectionEl: Element): void {
    this.nudgedSections.add(sectionId);
    const badgeEl = this.shadow.querySelector('#invite-badge');
    const textEl = this.shadow.querySelector('#invite-text');
    const sId = sectionId.toLowerCase();

    let badgeText = `${this.config.name} Guide`;
    let message = 'Want a quick 2-minute pitch of what we do?';

    if (sId.includes('prototype') || sId.includes('tech') || sId.includes('product') || sId.includes('science')) {
      badgeText = '🔬 Technology';
      message = 'Curious how our biocatalytic process captures emissions without immense energy? Ask me anything!';
    } else if (sId.includes('traction') || sId.includes('pilot') || sId.includes('milestone') || sId.includes('customer')) {
      badgeText = '📊 Live Pilot Data';
      message = 'Want details on our live Rotterdam pilot capturing 1,200 tons/yr? Click to chat live!';
    } else if (sId.includes('team') || sId.includes('founder') || sId.includes('about')) {
      badgeText = '👥 Founding Team';
      message = 'Would you like to book an intro call with Dr. Aris Thorne and Maya Lin?';
    } else if (sId.includes('problem') || sId.includes('mission')) {
      badgeText = '🌍 The Challenge';
      message = 'See why conventional carbon capture is too energy-intensive? Let me explain our solution!';
    } else {
      const heading = sectionEl.querySelector('h1, h2, h3')?.textContent?.trim();
      if (heading) {
        badgeText = '💡 Insights';
        message = `Questions about "${heading.substring(0, 35)}..."? Ask me or listen to our pitch!`;
      }
    }

    if (badgeEl) badgeEl.textContent = badgeText;
    if (textEl) textEl.textContent = message;

    if (this.avatar) {
      this.avatar.triggerGesture('wave');
    }
    this.setState(WidgetState.INVITE);
  }

  /**
   * Renders an interactive lead capture micro-form directly inside the transcript.
   */
  private renderInlineLeadCapture(): void {
    if (!this.voiceDotTranscriptEl) return;

    if (this.voiceDotTranscriptEl.querySelector('.mascot-lead-card')) return;

    const leadCard = document.createElement('div');
    leadCard.className = 'mascot-lead-card';
    leadCard.style.cssText = 'margin-top: 10px; padding: 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); text-align: left;';
    leadCard.innerHTML = `
      <div style="font-size: 12.5px; font-weight: 700; color: #0F172A; margin-bottom: 3px;">
        📅 Direct Founder Intro
      </div>
      <div style="font-size: 11.5px; color: #64748B; margin-bottom: 8px;">
        Leave your work email and our team will follow up directly:
      </div>
      <form class="lead-capture-form" style="display: flex; flex-direction: column; gap: 6px;">
        <input type="text" placeholder="Your Name" class="lead-input-name" style="padding: 6px 10px; font-size: 12px; border: 1px solid #CBD5E1; border-radius: 6px; outline: none; background: #F8FAFC; box-sizing: border-box;" />
        <input type="email" placeholder="work@company.com" required class="lead-input-email" style="padding: 6px 10px; font-size: 12px; border: 1px solid #CBD5E1; border-radius: 6px; outline: none; background: #F8FAFC; box-sizing: border-box;" />
        <button type="submit" style="padding: 7px 12px; background: #00C48C; color: #FFFFFF; font-weight: 700; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; transition: opacity 0.2s;">
          Request Founder Intro &rarr;
        </button>
      </form>
      ${this.config.tools?.calendarUrl || this.config.cta?.url ? `
        <div style="margin-top: 8px; font-size: 11px; text-align: center; color: #94A3B8;">
          or <a href="${this.config.tools?.calendarUrl || this.config.cta?.url}" target="_blank" rel="noopener noreferrer" style="color: #00C48C; font-weight: 600; text-decoration: none;">book directly on Calendly &rarr;</a>
        </div>
      ` : ''}
    `;

    const form = leadCard.querySelector('form') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = form.querySelector('.lead-input-name') as HTMLInputElement;
      const emailInput = form.querySelector('.lead-input-email') as HTMLInputElement;
      const name = nameInput.value.trim();
      const email = emailInput.value.trim();

      if (!email) return;

      const submitBtn = form.querySelector('button') as HTMLButtonElement;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      try {
        await fetch('http://localhost:3001/v1/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            companyId: this.config.id,
            intent: this.selectedIntent,
            note: 'Captured in-conversation via Mascot AI voice chat',
          }),
        }).catch(() => null);

        window.dispatchEvent(
          new CustomEvent('mascot:lead', {
            detail: { name, email, companyId: this.config.id },
          })
        );

        leadCard.innerHTML = `
          <div style="background: #DCFCE7; border: 1px solid #86EFAC; color: #166534; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            <span>✓</span>
            <span>Thank you${name ? ' ' + name : ''}! We've queued an intro to ${email}.</span>
          </div>
        `;

        if (this.avatar) {
          this.avatar.triggerGesture('thumbsup');
        }

        if (this.liveVoiceEngine) {
          this.liveVoiceEngine.askQuestion('[LEAD_CONFIRMED]');
        }
      } catch (err) {
        leadCard.innerHTML = `<div style="color: #166534; font-size: 12px; font-weight: 600;">✓ Request received! We will follow up with you.</div>`;
      }
    });

    this.voiceDotTranscriptEl.appendChild(leadCard);

    const body = this.shadow.querySelector('.voice-body');
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.avatar || !this.mascotWrapEl) return;
    const rect = this.mascotWrapEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    this.avatar.setCursorPosition(x, y);
  }

  private async startPitch(intent: Intent): Promise<void> {
    this.selectedIntent = intent;
    const pitch = this.config.pitches[intent] || this.config.pitches.general;

    if (!pitch) {
      console.warn('No pitch available for intent', intent);
      return;
    }

    // AudioContext unlock on explicit user action
    if (this.audio) {
      await this.audio.init();
    }

    this.setState(WidgetState.PITCHING);

    if (this.timelinePlayer) {
      this.timelinePlayer.destroy();
    }

    this.timelinePlayer = new TimelinePlayer(pitch, {
      onCue: (cue, index) => this.handleCue(cue, index),
      onProgress: (current, duration) => {
        const pct = Math.min(100, (current / duration) * 100);
        this.progressBarEl.style.width = `${pct}%`;
      },
      onComplete: () => this.handlePitchComplete(),
    });

    this.timelinePlayer.start();
  }

  private handleCue(cue: TimelineCue, _index: number): void {
    this.captionEl.textContent = cue.caption;

    if (cue.gesture && this.avatar) {
      this.avatar.triggerGesture(cue.gesture);
    }

    // Speech audio playback for this cue
    if (this.audio) {
      if (this.stopSpeech) {
        this.stopSpeech();
      }
      this.stopSpeech = this.audio.speakTextFallback(cue.caption);
    }
  }

  private handlePitchComplete(): void {
    if (this.stopSpeech) {
      this.stopSpeech();
      this.stopSpeech = null;
    }
    if (this.avatar) {
      this.avatar.triggerGesture('nod');
    }
    this.setState(WidgetState.CTA);
  }

  private togglePause(): void {
    if (this.state === WidgetState.PITCHING) {
      if (this.timelinePlayer) {
        this.timelinePlayer.pause();
      }
      if (this.audio) {
        this.audio.stopSpeaking();
      }
      this.setState(WidgetState.PAUSED);
      this.playPauseBtnEl.innerHTML = `&#9654;`; // Play icon
      this.playPauseBtnEl.setAttribute('aria-label', 'Resume pitch');
    } else if (this.state === WidgetState.PAUSED) {
      if (this.timelinePlayer) {
        this.timelinePlayer.resume();
      }
      this.setState(WidgetState.PITCHING);
      this.playPauseBtnEl.innerHTML = `&#10074;&#10074;`; // Pause icon
      this.playPauseBtnEl.setAttribute('aria-label', 'Pause pitch');
    }
  }

  private skipChapter(): void {
    if (this.timelinePlayer) {
      if (this.stopSpeech) {
        this.stopSpeech();
        this.stopSpeech = null;
      }
      this.timelinePlayer.skipChapter();
    }
  }

  private toggleMute(): void {
    if (!this.audio) return;
    const next = !this.audio.getMuted();
    this.audio.setMute(next);
    this.muteBtnEl.innerHTML = next ? '&#128263;' : '&#128266;';
    this.muteBtnEl.setAttribute('aria-label', next ? 'Unmute pitch' : 'Mute pitch');
  }

  private dismiss(): void {
    if (this.timelinePlayer) {
      this.timelinePlayer.stop();
    }
    if (this.audio) {
      this.audio.stopSpeaking();
    }
    this.setState(WidgetState.DISMISSED);
  }

  private openIntentSelect(): void {
    this.setState(WidgetState.INTENT_SELECT);
  }

  private render(): void {
    const accent = this.config.theme?.accent || '#0A7';
    const isLeft = this.config.theme?.position === 'bottom-left';

    this.shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: #1E293B;
          box-sizing: border-box;
          z-index: 999999;
          position: fixed;
          bottom: 24px;
          ${isLeft ? 'left: 24px;' : 'right: 24px;'}
        }

        *, *::before, *::after {
          box-sizing: border-box;
        }

        .pitchcat-container {
          display: flex;
          flex-direction: column;
          align-items: ${isLeft ? 'flex-start' : 'flex-end'};
          position: relative;
        }

        /* Mascot Container - Compact, sleek 3D footprint */
        .mascot-anchor {
          width: 95px;
          height: 115px;
          position: relative;
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .mascot-anchor:hover {
          transform: scale(1.06) translateY(-3px);
        }

        /* Invite Speech Bubble */
        .invite-bubble {
          display: none;
          position: absolute;
          bottom: 120px;
          ${isLeft ? 'left: 0;' : 'right: 0;'};
          background: #FFFFFF;
          border-radius: 16px;
          padding: 16px;
          width: 270px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.06);
          animation: floatIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .invite-bubble::after {
          content: '';
          position: absolute;
          bottom: -8px;
          ${isLeft ? 'left: 36px;' : 'right: 36px;'};
          width: 16px;
          height: 16px;
          background: #FFFFFF;
          border-right: 1px solid rgba(0, 0, 0, 0.06);
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          transform: rotate(45deg);
        }

        .invite-title {
          font-weight: 700;
          font-size: 15px;
          color: #0F172A;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .invite-badge {
          background: ${accent}18;
          color: ${accent};
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        }

        .invite-text {
          font-size: 13px;
          color: #475569;
          margin-bottom: 12px;
        }

        .invite-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .action-row {
          display: flex;
          gap: 8px;
        }

        .btn-live {
          background: linear-gradient(135deg, #00C48C 0%, #00875A 100%);
          color: #FFFFFF;
          border: none;
          padding: 9px 14px;
          border-radius: 9px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 196, 140, 0.35);
          transition: transform 0.15s ease, filter 0.15s ease;
        }

        .btn-live:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
        }

        .live-mic-icon {
          width: 8px;
          height: 8px;
          background: #FFFFFF;
          border-radius: 50%;
          animation: pulseDot 1.2s infinite;
        }

        .btn-primary {
          background: #F1F5F9;
          color: #0F172A;
          border: 1px solid #E2E8F0;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12.5px;
          cursor: pointer;
          transition: background 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 1;
        }

        .btn-primary:hover {
          background: #E2E8F0;
        }

        .btn-secondary {
          background: transparent;
          color: #64748B;
          border: none;
          padding: 8px 10px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12.5px;
          cursor: pointer;
        }

        .btn-secondary:hover {
          color: #0F172A;
        }

        /* Intent Selection Modal/Card */
        .intent-card {
          display: none;
          position: absolute;
          bottom: 120px;
          ${isLeft ? 'left: 0;' : 'right: 0;'};
          background: #FFFFFF;
          border-radius: 16px;
          padding: 16px;
          width: 290px;
          box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(0, 0, 0, 0.08);
          animation: floatIn 0.3s ease-out forwards;
        }

        .intent-header {
          font-weight: 700;
          font-size: 14px;
          color: #0F172A;
          margin-bottom: 10px;
        }

        .intent-chips {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .intent-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          font-weight: 600;
          color: #1E293B;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .intent-chip:hover {
          background: #FFFFFF;
          border-color: ${accent};
          color: ${accent};
          transform: translateX(${isLeft ? '3px' : '-3px'});
        }

        /* Pitching Card (Active Pitch) */
        .pitch-card {
          display: none;
          position: absolute;
          bottom: 120px;
          ${isLeft ? 'left: 0;' : 'right: 0;'};
          width: 320px;
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 14px 35px -5px rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(0, 0, 0, 0.08);
          overflow: hidden;
          animation: floatIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .progress-track {
          height: 4px;
          background: #E2E8F0;
          width: 100%;
        }

        .progress-fill {
          height: 100%;
          background: ${accent};
          width: 0%;
          transition: width 0.15s linear;
        }

        .pitch-content {
          padding: 16px;
        }

        .pitch-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .live-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: ${accent};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          background: ${accent};
          border-radius: 50%;
          animation: pulseDot 1.4s infinite;
        }

        .controls-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .icon-btn {
          background: transparent;
          border: none;
          font-size: 13px;
          color: #64748B;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .icon-btn:hover {
          background: #F1F5F9;
          color: #0F172A;
        }

        .caption-box {
          font-size: 13.5px;
          line-height: 1.5;
          color: #1E293B;
          min-height: 58px;
          padding: 10px 12px;
          background: #F8FAFC;
          border-radius: 10px;
          border-left: 3px solid ${accent};
          margin-bottom: 12px;
        }

        .pitch-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* CTA Panel */
        .cta-card {
          display: none;
          position: absolute;
          bottom: 144px;
          ${isLeft ? 'left: 0;' : 'right: 0;'};
          background: #FFFFFF;
          border-radius: 16px;
          padding: 18px;
          width: 290px;
          box-shadow: 0 14px 35px -5px rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(0, 0, 0, 0.08);
          animation: floatIn 0.3s ease-out forwards;
          text-align: center;
        }

        .cta-icon {
          font-size: 28px;
          margin-bottom: 6px;
        }

        .cta-title {
          font-weight: 700;
          font-size: 15px;
          color: #0F172A;
          margin-bottom: 6px;
        }

        .cta-desc {
          font-size: 13px;
          color: #475569;
          margin-bottom: 14px;
        }

        /* Live Voice Mode Card */
        .voice-card {
          display: none;
          position: absolute;
          bottom: 120px;
          ${isLeft ? 'left: 0;' : 'right: 0;'};
          width: 320px;
          background: #FFFFFF;
          border-radius: 18px;
          box-shadow: 0 16px 40px -5px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(0, 0, 0, 0.08);
          overflow: hidden;
          animation: floatIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .voice-header {
          padding: 14px 16px 10px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #F1F5F9;
        }

        .voice-status-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wave-bars {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 16px;
        }

        .wave-bar {
          width: 3px;
          height: 6px;
          background: ${accent};
          border-radius: 2px;
          animation: waveBounce 0.8s ease-in-out infinite alternate;
        }
        .wave-bar:nth-child(2) { animation-delay: 0.15s; }
        .wave-bar:nth-child(3) { animation-delay: 0.3s; }
        .wave-bar:nth-child(4) { animation-delay: 0.45s; }

        @keyframes waveBounce {
          0% { height: 4px; }
          100% { height: 16px; }
        }

        .voice-body {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 220px;
          overflow-y: auto;
        }

        .transcript-user {
          font-size: 13px;
          background: #F1F5F9;
          color: #334155;
          padding: 8px 12px;
          border-radius: 12px 12px 2px 12px;
          align-self: flex-end;
          max-width: 90%;
        }

        .transcript-dot {
          font-size: 13.5px;
          background: #F0FDF4;
          color: #14532D;
          border-left: 3px solid ${accent};
          padding: 10px 12px;
          border-radius: 4px 12px 12px 12px;
          align-self: flex-start;
          line-height: 1.45;
        }

        .voice-hint {
          padding: 0 16px 12px;
          font-size: 11px;
          color: #94A3B8;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .btn-end-voice {
          background: #FEE2E2;
          color: #DC2626;
          border: none;
          font-size: 11.5px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-end-voice:hover {
          background: #FCA5A5;
        }

        /* Display states */
        .pitchcat-container[data-state="invite"] .invite-bubble {
          display: block;
        }

        .pitchcat-container[data-state="intent_select"] .intent-card {
          display: block;
        }

        .pitchcat-container[data-state="pitching"] .pitch-card,
        .pitchcat-container[data-state="paused"] .pitch-card {
          display: block;
        }

        .pitchcat-container[data-state="listening"] .voice-card,
        .pitchcat-container[data-state="thinking"] .voice-card,
        .pitchcat-container[data-state="speaking"] .voice-card {
          display: block;
        }

        .pitchcat-container[data-state="cta"] .cta-card {
          display: block;
        }

        .pitchcat-container[data-state="dismissed"] {
          display: none;
        }

        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }

        /* Responsive Mobile Styles (Bottom sheet presentation) */
        @media (max-width: 640px) {
          :host {
            bottom: 12px;
            right: 12px;
            left: auto;
          }

          .mascot-anchor {
            width: 90px;
            height: 105px;
          }

          .invite-bubble,
          .intent-card,
          .pitch-card,
          .cta-card {
            width: calc(100vw - 24px);
            max-width: 340px;
            bottom: 115px;
            right: 0;
          }
        }
      </style>

      <div class="pitchcat-container" id="pitchcat-root" data-state="hidden">
        <!-- Invite Bubble -->
        <div class="invite-bubble" id="invite-bubble">
          <div class="invite-title">
            <span id="invite-mascot-name">${this.config.mascot.name}</span>
            <span class="invite-badge" id="invite-badge">${this.config.name}</span>
          </div>
          <div class="invite-text" id="invite-text">
            Want a quick 2-minute pitch of what we do?
          </div>
          <div class="invite-actions">
            <button class="btn-live" id="btn-talk-live">
              <span class="live-mic-icon"></span>
              <span>Talk to ${this.config.mascot.name} (Live Voice)</span>
            </button>
            <div class="action-row">
              <button class="btn-primary" id="btn-pitch-yes">
                <span>&#9654;</span> 2-Min Pitch
              </button>
              <button class="btn-secondary" id="btn-pitch-no">Later</button>
            </div>
          </div>
        </div>

        <!-- Intent Select Card -->
        <div class="intent-card" id="intent-card">
          <div class="intent-header">What describes you best?</div>
          <div class="intent-chips" id="intent-chips-list">
            ${this.config.intents.map((intent) => `
              <button class="intent-chip" data-intent="${intent}">
                <span>${intent.charAt(0).toUpperCase() + intent.slice(1)}</span>
                <span>&rarr;</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Pitching / Caption Card -->
        <div class="pitch-card" id="pitch-card">
          <div class="progress-track">
            <div class="progress-fill" id="progress-bar"></div>
          </div>
          <div class="pitch-content">
            <div class="pitch-header">
              <div class="live-tag">
                <span class="live-dot"></span>
                <span>Pitching: ${this.config.name}</span>
              </div>
              <div class="controls-row">
                <button class="icon-btn" id="btn-play-pause" title="Pause / Resume" aria-label="Pause pitch">&#10074;&#10074;</button>
                <button class="icon-btn" id="btn-skip" title="Next Chapter" aria-label="Next chapter">&#9197;</button>
                <button class="icon-btn" id="btn-mute" title="Mute / Unmute" aria-label="Mute pitch">&#128266;</button>
                <button class="icon-btn" id="btn-dismiss" title="Close" aria-label="Close pitch">&times;</button>
              </div>
            </div>

            <!-- Accessible live region for captions -->
            <div class="caption-box" id="caption-box" role="status" aria-live="polite">
              Loading pitch...
            </div>

            <div class="pitch-footer">
              <span style="font-size: 11px; color: #94A3B8;">Click Dot anytime to interrupt</span>
              <button class="btn-secondary" id="btn-switch-intent" style="font-size: 11px; padding: 4px 8px;">
                Change topic
              </button>
            </div>
          </div>
        </div>

        <!-- Live Voice Talker Card -->
        <div class="voice-card" id="voice-card">
          <div class="voice-header">
            <div class="voice-status-wrap">
              <div class="wave-bars">
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
                <div class="wave-bar"></div>
              </div>
              <span id="voice-status-tag" style="font-size: 12px; font-weight: 700; color: ${accent};">
                Listening to you...
              </span>
            </div>
            <button class="btn-end-voice" id="btn-end-voice" title="End voice conversation">End</button>
          </div>

          <div class="voice-body">
            <div class="transcript-user" id="voice-user-transcript">
              Listening... Speak naturally!
            </div>
            <div class="transcript-dot" id="voice-dot-transcript">
              Hi! I'm Dot. Ask me anything about CarbonDot or our carbon capture technology.
            </div>
          </div>

          <div class="voice-chips" style="display: flex; gap: 6px; padding: 0 16px 10px; overflow-x: auto;">
            <button class="voice-chip-btn" data-query="Hello Dot!" style="background: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;">👋 "Hello Dot"</button>
            <button class="voice-chip-btn" data-query="How does the technology work?" style="background: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;">🧬 How it works</button>
            <button class="voice-chip-btn" data-query="Tell me about your pilot in Rotterdam" style="background: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;">📊 Traction</button>
            <button class="voice-chip-btn" data-query="I want to book a call" style="background: #F1F5F9; border: 1px solid #E2E8F0; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;">📅 Book Call</button>
          </div>

          <div class="voice-hint">
            <span>⚡ Speak anytime to interrupt Dot</span>
            <button class="btn-secondary" id="btn-voice-to-pitch" style="font-size: 10px; padding: 2px 6px;">
              Play pitch instead
            </button>
          </div>
        </div>

        <!-- CTA Panel -->
        <div class="cta-card" id="cta-card">
          <div class="cta-icon">&#127793;</div>
          <div class="cta-title">Ready to work with ${this.config.name}?</div>
          <div class="cta-desc">Let's book a call or connect with the team.</div>
          <button class="btn-primary" id="btn-cta-action" style="width: 100%; justify-content: center; margin-bottom: 8px;">
            ${this.config.cta?.type === 'book_call' ? 'Book a Call' : 'Get in Touch'}
          </button>
          <button class="btn-secondary" id="btn-cta-close" style="width: 100%; justify-content: center;">
            Done
          </button>
        </div>

        <!-- Mascot Anchor -->
        <div class="mascot-anchor" id="mascot-anchor" title="${this.config.mascot.name} from ${this.config.name}"></div>
      </div>
    `;

    // Query elements
    this.containerEl = this.shadow.querySelector('#pitchcat-root')!;
    this.mascotWrapEl = this.shadow.querySelector('#mascot-anchor')!;
    this.inviteBubbleEl = this.shadow.querySelector('#invite-bubble')!;
    this.pitchCardEl = this.shadow.querySelector('#pitch-card')!;
    this.captionEl = this.shadow.querySelector('#caption-box')!;
    this.progressBarEl = this.shadow.querySelector('#progress-bar')!;
    this.muteBtnEl = this.shadow.querySelector('#btn-mute')!;
    this.playPauseBtnEl = this.shadow.querySelector('#btn-play-pause')!;
    this.ctaPanelEl = this.shadow.querySelector('#cta-card')!;
    this.voiceCardEl = this.shadow.querySelector('#voice-card')!;
    this.voiceStatusTagEl = this.shadow.querySelector('#voice-status-tag')!;
    this.voiceUserTranscriptEl = this.shadow.querySelector('#voice-user-transcript')!;
    this.voiceDotTranscriptEl = this.shadow.querySelector('#voice-dot-transcript')!;

    // Bind event listeners
    this.mascotWrapEl.addEventListener('click', () => {
      if (this.state === WidgetState.IDLE) {
        this.setState(WidgetState.INVITE);
      } else if (this.state === WidgetState.PITCHING || this.state === WidgetState.PAUSED) {
        this.togglePause();
      } else if (this.state === WidgetState.LISTENING || this.state === WidgetState.SPEAKING) {
        this.stopLiveVoice();
      }
    });

    const btnTalkLive = this.shadow.querySelector('#btn-talk-live');
    btnTalkLive?.addEventListener('click', () => {
      this.startLiveVoice();
    });

    const btnEndVoice = this.shadow.querySelector('#btn-end-voice');
    btnEndVoice?.addEventListener('click', () => {
      this.stopLiveVoice();
    });

    const btnVoiceToPitch = this.shadow.querySelector('#btn-voice-to-pitch');
    btnVoiceToPitch?.addEventListener('click', () => {
      this.stopLiveVoice();
      this.openIntentSelect();
    });

    const voiceChipBtns = this.shadow.querySelectorAll('.voice-chip-btn');
    voiceChipBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        if (query && this.liveVoiceEngine) {
          this.liveVoiceEngine.askQuestion(query);
        }
      });
    });

    const btnPitchYes = this.shadow.querySelector('#btn-pitch-yes');
    btnPitchYes?.addEventListener('click', () => {
      if (this.config.intents.length > 1) {
        this.openIntentSelect();
      } else {
        this.startPitch('general');
      }
    });

    const btnPitchNo = this.shadow.querySelector('#btn-pitch-no');
    btnPitchNo?.addEventListener('click', () => {
      this.dismiss();
    });

    const intentChips = this.shadow.querySelectorAll('.intent-chip');
    intentChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const intent = chip.getAttribute('data-intent') as Intent;
        this.startPitch(intent || 'general');
      });
    });

    this.playPauseBtnEl.addEventListener('click', () => this.togglePause());
    this.shadow.querySelector('#btn-skip')?.addEventListener('click', () => this.skipChapter());
    this.muteBtnEl.addEventListener('click', () => this.toggleMute());
    this.shadow.querySelector('#btn-dismiss')?.addEventListener('click', () => this.dismiss());
    this.shadow.querySelector('#btn-switch-intent')?.addEventListener('click', () => this.openIntentSelect());

    this.shadow.querySelector('#btn-cta-action')?.addEventListener('click', () => {
      if (this.config.cta?.url) {
        window.open(this.config.cta.url, '_blank', 'noopener,noreferrer');
      }
    });

    this.shadow.querySelector('#btn-cta-close')?.addEventListener('click', () => {
      this.setState(WidgetState.IDLE);
    });
  }
}

// Register custom element
if (!customElements.get('pitchcat-widget')) {
  customElements.define('pitchcat-widget', PitchCatWidget);
}
