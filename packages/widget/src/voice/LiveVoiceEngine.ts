import type { Gesture } from '@pitchcat/shared';

export interface LiveVoiceEvents {
  onStateChange: (state: 'connecting' | 'listening' | 'thinking' | 'speaking' | 'idle') => void;
  onTranscript: (speaker: 'user' | 'dot', text: string) => void;
  onInterrupted: () => void;
  onGesture: (gesture: Gesture) => void;
  onScrollTo: (selector: string) => void;
  onShowCta: () => void;
  onAmplitude: (level: number) => void;
}

/**
 * LiveVoiceEngine powers bidirectional speech-to-speech interaction with Dot:
 * - Captures mic audio with echo cancellation & noise suppression
 * - Handles immediate barge-in interruption (cutting playback when user speaks)
 * - Supports both native Gemini Live WebSocket streaming and local real-time speech engine
 */
export class LiveVoiceEngine {
  private events: LiveVoiceEvents;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private isListening = false;
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private recognition: any = null; // SpeechRecognition
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private amplitudeInterval: number | null = null;

  constructor(events: LiveVoiceEvents) {
    this.events = events;
  }

  async start(): Promise<void> {
    this.events.onStateChange('connecting');

    try {
      // 1. Request microphone access with echo cancellation
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Initialize Web Audio Context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // 3. Connect to Live Voice Relay
      this.connectRelay();

      // 4. Initialize Local Voice Engine as backup / fallback
      this.initLocalVoiceRecognition();

      this.events.onStateChange('listening');
      this.isListening = true;
    } catch (err) {
      console.warn('[PitchCat Live] Microphone access or AudioContext error:', err);
      // Fallback to text prompt
      this.events.onTranscript('dot', "I couldn't access your microphone. You can still ask me anything using the options!");
      this.events.onStateChange('idle');
    }
  }

  stop(): void {
    this.isListening = false;
    this.stopSpeaking();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    this.events.onStateChange('idle');
  }

  private connectRelay(): void {
    try {
      this.ws = new WebSocket('ws://localhost:3001/v1/voice/live?company=carbondot');

      this.ws.onopen = () => {
        console.log('[PitchCat Live] Connected to backend relay');
        this.isConnected = true;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle server-side interruption signal from Gemini
          if (data.interrupted) {
            this.handleBargeIn();
          }

          // Handle tool calls from Gemini
          if (data.toolCall) {
            const { name, args } = data.toolCall;
            if (name === 'scroll_to_section' && args?.sectionId) {
              this.events.onScrollTo(args.sectionId);
            } else if (name === 'set_gesture' && args?.gesture) {
              this.events.onGesture(args.gesture);
            } else if (name === 'show_cta') {
              this.events.onShowCta();
            }
          }
        } catch {}
      };

      this.ws.onerror = () => {
        console.log('[PitchCat Live] Backend relay unavailable, running in local real-time mode');
      };
    } catch {
      // Local fallback
    }
  }

  /**
   * Initializes real-time local voice loop with instant barge-in support.
   */
  private initLocalVoiceRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    let speechSilenceTimer: number | null = null;
    let pendingSpeech = '';

    this.recognition.onstart = () => {
      console.log('[PitchCat Live] Voice listener active');
    };

    const triggerProcessedQuestion = (query: string) => {
      if (!query || query.trim().length === 0) return;
      const clean = query.trim();
      pendingSpeech = '';
      if (speechSilenceTimer) {
        clearTimeout(speechSilenceTimer);
        speechSilenceTimer = null;
      }
      this.events.onTranscript('user', clean);
      this.handleUserQuestion(clean);
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      // BARGE-IN: If the user starts speaking while Dot is speaking, IMMEDIATELY cut Dot's audio!
      if (this.isSpeaking && (interimTranscript.length > 1 || finalTranscript.length > 1)) {
        console.log('[PitchCat Live] Barge-in detected! Stopping Dot immediately.');
        this.handleBargeIn();
      }

      const currentSpeech = (finalTranscript || interimTranscript).trim();
      if (currentSpeech.length > 0) {
        pendingSpeech = currentSpeech;

        // If Chrome gives isFinal, trigger immediately
        if (finalTranscript.trim().length > 0) {
          triggerProcessedQuestion(finalTranscript);
          return;
        }

        // Fast silence trigger: If user paused speaking for 450ms, don't wait 3s for Chrome!
        if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
        speechSilenceTimer = window.setTimeout(() => {
          if (pendingSpeech.length > 0) {
            triggerProcessedQuestion(pendingSpeech);
          }
        }, 450);
      }
    };

    this.recognition.onerror = (err: any) => {
      if (err.error !== 'no-speech') {
        console.log('[PitchCat Live] Speech recognition status:', err.error);
      }
    };

    this.recognition.onend = () => {
      // Keep listening while active and not speaking
      if (this.isListening && !this.isSpeaking && this.recognition) {
        try {
          this.recognition.start();
        } catch {}
      }
    };

    try {
      this.recognition.start();
    } catch {}
  }

  /**
   * Instant Barge-In Handler: flushes audio, stops mouth animation, shifts to listening.
   */
  private handleBargeIn(): void {
    this.stopSpeaking();
    this.events.onInterrupted();
    this.events.onStateChange('listening');
  }

  /**
   * Public method to let user trigger a query via click chips or typed input
   */
  askQuestion(question: string): void {
    this.events.onTranscript('user', question);
    this.handleUserQuestion(question);
  }

  private async handleUserQuestion(question: string): Promise<void> {
    this.events.onStateChange('thinking');

    // ── 1. Query Backend /v1/chat First (Gemini AI with full Startup Knowledge Base) ──
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('http://localhost:3001/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, companyId: 'carbondot' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          this.speakAnswer(data.reply, data.gesture, data.scrollTo, data.suggestCta);
          return;
        }
      }
    } catch (err) {
      console.log('[PitchCat Live] Backend chat query failed or timed out, using local knowledge base');
    }

    // ── 2. Local Grounded Knowledge Base Fallback ──
    const lower = question.toLowerCase();

    // Real-time Date and Time
    if (
      lower.includes('date') ||
      lower.includes('time') ||
      lower.includes('what day') ||
      lower.includes('today') ||
      lower.includes('clock')
    ) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      this.speakAnswer(
        `It's currently ${timeStr} on ${dateStr}. It's always a wonderful time to talk decarbonization and scaling clean-tech!`,
        'nod'
      );
      return;
    }

    // Conversational Chit-Chat & Personality
    if (
      lower.includes('how are you') ||
      lower.includes('how are things') ||
      lower.includes('how do you do') ||
      lower.includes('what are you doing') ||
      lower.includes('who are you') ||
      lower.includes('joke')
    ) {
      if (lower.includes('who are you')) {
        this.speakAnswer(
          "I'm Dot! I'm CarbonDot's official AI company representative. I'm here to explain our technology, answer questions live, and connect you directly with our founders.",
          'wave'
        );
        return;
      }
      if (lower.includes('joke')) {
        this.speakAnswer(
          "Why do chemical engineers love carbon capture? Because it keeps the planet from boiling over and makes concrete rock solid!",
          'nod'
        );
        return;
      }
      this.speakAnswer(
        "I'm feeling energized! Ready to share how CarbonDot turns heavy industrial emissions into certified building minerals. What can I dive into for you?",
        'wave'
      );
      return;
    }

    // Investor Pitch, Convince Me, Moat & Returns
    if (
      lower.includes('convince') ||
      lower.includes('why invest') ||
      lower.includes('why should i invest') ||
      lower.includes('pitch me') ||
      lower.includes('investor') ||
      lower.includes('moat') ||
      lower.includes('unit economics') ||
      lower.includes('margin') ||
      lower.includes('market size') ||
      lower.includes('tam') ||
      lower.includes('advantage')
    ) {
      this.speakAnswer(
        "Here is why CarbonDot is an exceptional investment: First, our ambient biocatalysis cuts energy cost by 40%, creating sellable ASTM aggregates rather than costly waste. Second, our Rotterdam commercial pilot is live capturing 1,200 tons per year with 3 paid enterprise MOUs. And third, our $2.5M Seed round is backed by Planet Ventures. Let's get an intro meeting booked with Dr. Thorne!",
        'thumbsup',
        '#traction',
        true
      );
      return;
    }

    // Fast Greeting
    if (
      lower.includes('hello') ||
      lower.includes('hi') ||
      lower.includes('hey') ||
      lower.includes('good morning')
    ) {
      this.speakAnswer(
        "Hey there! Great to meet you. I'm Dot, CarbonDot's company rep. Ask me anything about our carbon capture tech or how we turn emissions into building minerals!",
        'wave'
      );
      return;
    }

    // Valuation & Funding (Handled before technology so "how much are you funded" works accurately!)
    if (
      lower.includes('valuation') ||
      lower.includes('evaluation') ||
      lower.includes('fund') ||
      lower.includes('invest') ||
      lower.includes('seed') ||
      lower.includes('raise') ||
      lower.includes('how much')
    ) {
      if (lower.includes('valuation') || lower.includes('evaluation')) {
        this.speakAnswer(
          "Our exact valuation is currently confidential, but we have raised a $2.5M Seed round led by Planet Ventures to accelerate deployment of our mineralization reactors.",
          'nod',
          '#traction'
        );
        return;
      }
      this.speakAnswer(
        "We raised a $2.5M Seed round led by Planet Ventures to scale our commercial modular mineralization reactors.",
        'thumbsup',
        '#traction'
      );
      return;
    }

    // Company Overview / What is CarbonDot
    if (
      lower.includes('what is carbon') ||
      lower.includes('what is this') ||
      lower.includes('what do you do') ||
      lower.includes('tell me about') ||
      lower.includes('overview') ||
      lower.includes('pitch') ||
      lower.trim() === 'carbondot'
    ) {
      this.speakAnswer(
        "CarbonDot is a climate-tech company capturing industrial CO2 right at factory exhaust stacks. We use a proprietary ambient biocatalyst to convert emissions into permanent mineral aggregates for construction, saving 40% energy over traditional capture.",
        'point',
        '#prototype'
      );
      return;
    }

    // Technology / How It Works (Requires specific phrase, NOT the single word "how")
    if (
      lower.includes('how does it work') ||
      lower.includes('how it works') ||
      lower.includes('how do you') ||
      lower.includes('technology') ||
      lower.includes('biocatalyst') ||
      lower.includes('biogranule') ||
      lower.includes('mineralization')
    ) {
      this.speakAnswer(
        "We bolt modular reactors onto industrial exhaust stacks. Our bioengineered catalyst crystallizes gaseous CO2 into ASTM certified calcium carbonate aggregates suitable for concrete and construction pavers.",
        'point',
        '#prototype'
      );
      return;
    }

    // Problem & Emissions
    if (lower.includes('problem') || lower.includes('challenge') || lower.includes('emissions')) {
      this.speakAnswer(
        "Heavy industry generates over 30% of global emissions, and current capture methods use far too much energy. Our biocatalytic process reduces energy penalty by 40%.",
        'shrug',
        '#problem'
      );
      return;
    }

    // Pilot & Traction
    if (lower.includes('pilot') || lower.includes('rotterdam') || lower.includes('traction') || lower.includes('customer')) {
      this.speakAnswer(
        "Our commercial pilot in Rotterdam captures 1,200 tons of CO2 annually right now, with 3 paid enterprise contracts lined up.",
        'thumbsup',
        '#traction'
      );
      return;
    }

    // Founders & Leadership
    if (lower.includes('founder') || lower.includes('team') || lower.includes('who')) {
      this.speakAnswer(
        "CarbonDot was founded by Dr. Aris Thorne and Maya Lin, combining elite materials science from TU Delft with industrial scaling from Climeworks.",
        'nod',
        '#team'
      );
      return;
    }

    // Lead submission confirmation
    if (query === '[LEAD_CONFIRMED]') {
      this.speakAnswer(
        "Awesome! I've sent your request over to our founding team. We will reach out to you directly!",
        'thumbsup',
        undefined,
        false
      );
      return;
    }

    // Booking & Meeting / Lead Capture
    if (
      lower.includes('call') ||
      lower.includes('book') ||
      lower.includes('meeting') ||
      lower.includes('contact') ||
      lower.includes('intro') ||
      lower.includes('reach out') ||
      lower.includes('email') ||
      lower.includes('lead')
    ) {
      this.speakAnswer(
        "I'd love to set that up! You can drop your email right here or click our direct booking link below.",
        'thumbsup',
        undefined,
        true
      );
      return;
    }

    // Default grounded fallback
    this.speakAnswer(
      "That's a thoughtful question! While that specific detail isn't in our public fact sheet yet, I'd be glad to connect you with Dr. Thorne.",
      'shrug',
      undefined,
      false
    );
  }

  private speakAnswer(text: string, gesture?: Gesture, scrollTo?: string, suggestCta?: boolean): void {
    // 1. Temporarily pause speech recognition while Dot speaks to prevent Chrome audio hardware contention
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
    }

    this.events.onStateChange('speaking');
    this.events.onTranscript('dot', text);

    if (gesture) {
      this.events.onGesture(gesture);
    }

    if (scrollTo) {
      this.events.onScrollTo(scrollTo);
    }

    if (suggestCta) {
      setTimeout(() => this.events.onShowCta(), 1200);
    }

    if (!('speechSynthesis' in window)) {
      this.events.onStateChange('listening');
      this.resumeRecognition();
      return;
    }

    window.speechSynthesis.cancel();
    this.isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    // Amplitude simulation for 3D mouth sync
    let step = 0;
    this.amplitudeInterval = window.setInterval(() => {
      step += 0.45;
      const amp = (Math.sin(step) * 0.5 + 0.5) * (Math.sin(step * 0.5) > -0.2 ? 0.95 : 0.1);
      this.events.onAmplitude(amp);
    }, 45);

    let finished = false;
    const onFinish = () => {
      if (finished) return;
      finished = true;
      this.stopSpeaking();
      this.events.onStateChange('listening');
      this.resumeRecognition();
    };

    utterance.onend = onFinish;
    utterance.onerror = onFinish;

    // Safety watchdog: estimated duration based on word count
    const words = text.split(' ').length;
    const estimatedDurationMs = (words / 2.5) * 1000 + 1500;
    setTimeout(onFinish, estimatedDurationMs);

    this.currentUtterance = utterance;

    // Chrome audio unstick delay (40ms)
    setTimeout(() => {
      if (this.isSpeaking) {
        window.speechSynthesis.speak(utterance);
      }
    }, 40);
  }

  private resumeRecognition(): void {
    if (this.isListening && !this.isSpeaking && this.recognition) {
      try {
        this.recognition.start();
      } catch {}
    }
  }

  private stopSpeaking(): void {
    this.isSpeaking = false;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.amplitudeInterval) {
      clearInterval(this.amplitudeInterval);
      this.amplitudeInterval = null;
    }
    this.events.onAmplitude(0);
  }
}
