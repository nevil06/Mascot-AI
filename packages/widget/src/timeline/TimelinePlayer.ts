import type { Pitch, TimelineCue } from '@pitchcat/shared';

export interface TimelineEvents {
  onCue: (cue: TimelineCue, index: number) => void;
  onProgress: (currentTimeSec: number, durationSec: number) => void;
  onComplete: () => void;
}

/**
 * TimelinePlayer drives scripted pitches:
 * - Emits captions and triggers gestures per cue timestamp
 * - Executes smooth page scrolling to target CSS selectors
 * - Detects manual user scrolling and temporarily pauses auto-scrolling for 5s
 * - Supports pause, resume, skip chapter, and seek
 */
export class TimelinePlayer {
  private pitch: Pitch;
  private events: TimelineEvents;
  private currentIndex = -1;
  private currentTime = 0;
  private isPlaying = false;
  private timerId: number | null = null;
  private lastTimestamp = 0;

  // Manual scroll override tracking
  private manualScrollCooldownUntil = 0;
  private boundOnUserScroll: () => void;

  constructor(pitch: Pitch, events: TimelineEvents) {
    this.pitch = pitch;
    this.events = events;

    this.boundOnUserScroll = this.handleUserScroll.bind(this);
    window.addEventListener('wheel', this.boundOnUserScroll, { passive: true });
    window.addEventListener('touchmove', this.boundOnUserScroll, { passive: true });
  }

  start(): void {
    this.stop();
    this.currentIndex = -1;
    this.currentTime = 0;
    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    this.tick();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }

  resume(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    this.tick();
  }

  skipChapter(): void {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.pitch.timeline.length) {
      const nextCue = this.pitch.timeline[nextIndex];
      this.currentTime = nextCue.t;
      this.triggerCue(nextIndex);
    } else {
      this.complete();
    }
  }

  stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
    this.currentIndex = -1;
    this.currentTime = 0;
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('wheel', this.boundOnUserScroll);
    window.removeEventListener('touchmove', this.boundOnUserScroll);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getDuration(): number {
    return this.pitch.durationSec;
  }

  private tick(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    const dt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;

    this.currentTime += dt;
    this.events.onProgress(this.currentTime, this.pitch.durationSec);

    // Check if next cue has arrived
    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.pitch.timeline.length) {
      const nextCue = this.pitch.timeline[nextIndex];
      if (this.currentTime >= nextCue.t) {
        this.triggerCue(nextIndex);
      }
    }

    if (this.currentTime >= this.pitch.durationSec) {
      this.complete();
      return;
    }

    this.timerId = requestAnimationFrame(() => this.tick());
  }

  private triggerCue(index: number): void {
    this.currentIndex = index;
    const cue = this.pitch.timeline[index];
    this.events.onCue(cue, index);

    if (cue.scrollTo) {
      this.attemptScroll(cue.scrollTo);
    }
  }

  private attemptScroll(selector: string): void {
    // If the user recently scrolled manually, pause auto-scroll
    if (Date.now() < this.manualScrollCooldownUntil) {
      return;
    }

    try {
      const target = document.querySelector(selector);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    } catch {
      // Invalid selector or DOM issue: skip silently per spec
    }
  }

  private handleUserScroll(): void {
    // Cooldown of 5000ms before auto-scroll will resume targeting
    this.manualScrollCooldownUntil = Date.now() + 5000;
  }

  private complete(): void {
    this.stop();
    this.events.onComplete();
  }
}
