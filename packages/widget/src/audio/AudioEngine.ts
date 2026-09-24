/**
 * AudioEngine manages a single shared AudioContext and AnalyserNode.
 * It routes all mascot audio (pre-rendered pitch and live conversation audio)
 * through one pipeline, calculating smoothed RMS amplitude (0..1) to drive the Avatar's mouth.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private animFrameId: number | null = null;
  private amplitudeCallback: ((amp: number) => void) | null = null;
  private isMuted = false;
  private smoothedRms = 0;
  private audioEl: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;

  /**
   * Initializes or resumes the AudioContext on user interaction (to bypass autoplay policy).
   */
  async init(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.isMuted ? 0 : 1;

      // Connect: [Source] -> Analyser -> Gain -> Destination
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.startAnalyserLoop();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  onAmplitude(cb: (amp: number) => void): void {
    this.amplitudeCallback = cb;
  }

  setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : 1;
    }
    if (this.audioEl) {
      this.audioEl.muted = muted;
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Connects an HTMLAudioElement (e.g. for pre-rendered pitch MP3) into the shared pipeline.
   */
  connectMediaElement(audio: HTMLAudioElement): void {
    if (!this.ctx || !this.analyser) return;

    this.audioEl = audio;
    if (!this.mediaSourceNode) {
      try {
        this.mediaSourceNode = this.ctx.createMediaElementSource(audio);
        this.mediaSourceNode.connect(this.analyser);
      } catch {
        // Element might already be connected
      }
    }
  }

  /**
   * Browser SpeechSynthesis fallback with synthetic amplitude simulation.
   * Since SpeechSynthesis cannot be directly routed to Web Audio in all browsers,
   * we generate an oscillating modulation during utterance speech so mouth sync stays active.
   */
  speakTextFallback(text: string, onEnd?: () => void): () => void {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return () => {};
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Friendly mascot tone

    let intervalId: number | null = null;

    utterance.onstart = () => {
      // Simulate speech amplitude modulation if not using direct PCM
      let step = 0;
      intervalId = window.setInterval(() => {
        step += 0.35;
        // Natural speech rhythm simulation: syllables with occasional pauses
        const raw = (Math.sin(step) * 0.5 + 0.5) * (Math.sin(step * 0.4) > -0.2 ? 0.85 : 0.1);
        if (this.amplitudeCallback) {
          this.amplitudeCallback(this.isMuted ? 0 : raw);
        }
      }, 50);
    };

    const cleanup = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (this.amplitudeCallback) {
        this.amplitudeCallback(0);
      }
    };

    utterance.onend = () => {
      cleanup();
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      cleanup();
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      cleanup();
    };
  }

  stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    if (this.amplitudeCallback) {
      this.amplitudeCallback(0);
    }
  }

  destroy(): void {
    this.stopSpeaking();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
    this.analyser = null;
  }

  private startAnalyserLoop(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkVolume = () => {
      if (!this.analyser) return;

      this.analyser.getByteTimeDomainData(dataArray);

      // Calculate Root Mean Square (RMS) volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Smooth RMS (fast attack, slower decay)
      if (rms > this.smoothedRms) {
        this.smoothedRms = rms * 0.7 + this.smoothedRms * 0.3;
      } else {
        this.smoothedRms = rms * 0.2 + this.smoothedRms * 0.8;
      }

      // Boost and clamp to 0..1 for mouth animation
      const mouthVal = Math.min(1, Math.max(0, (this.smoothedRms - 0.02) * 4.5));

      if (this.amplitudeCallback && !this.isMuted) {
        // If speech synthesis fallback is driving amplitude separately, don't overwrite with 0
        if (mouthVal > 0.01) {
          this.amplitudeCallback(mouthVal);
        }
      }

      this.animFrameId = requestAnimationFrame(checkVolume);
    };

    this.animFrameId = requestAnimationFrame(checkVolume);
  }
}
