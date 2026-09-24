import { z } from 'zod';

// ─── Timeline ──────────────────────────────────────────────────────────
export const GestureSchema = z.enum([
  'wave', 'point', 'nod', 'shrug', 'thumbsup',
]);
export type Gesture = z.infer<typeof GestureSchema>;

export const TimelineCueSchema = z.object({
  /** Seconds from pitch start */
  t: z.number().min(0),
  /** Caption text to display */
  caption: z.string(),
  /** Optional mascot gesture to trigger */
  gesture: GestureSchema.optional(),
  /** Optional CSS selector on the host page to scroll to */
  scrollTo: z.string().optional(),
});
export type TimelineCue = z.infer<typeof TimelineCueSchema>;

// ─── Pitch ─────────────────────────────────────────────────────────────
export const PitchSchema = z.object({
  audioUrl: z.string(),
  durationSec: z.number().positive(),
  timeline: z.array(TimelineCueSchema),
});
export type Pitch = z.infer<typeof PitchSchema>;

// ─── Intent ────────────────────────────────────────────────────────────
export const IntentSchema = z.enum([
  'general', 'investor', 'partner', 'customer',
]);
export type Intent = z.infer<typeof IntentSchema>;

// ─── CTA ───────────────────────────────────────────────────────────────
export const CtaSchema = z.object({
  type: z.enum(['book_call', 'email', 'form']),
  url: z.string().url(),
});
export type Cta = z.infer<typeof CtaSchema>;

// ─── Mascot Tools & Agent Config ───────────────────────────────────────
export const MascotToolsSchema = z.object({
  pageScroll: z.boolean().default(true),
  leadCapture: z.boolean().default(true),
  calendarUrl: z.string().url().optional(),
  webhookUrl: z.string().url().optional(),
});
export type MascotTools = z.infer<typeof MascotToolsSchema>;

export const MascotAvatarTypeSchema = z.enum(['3d-cat', 'placeholder-svg', 'custom']).default('3d-cat');
export type MascotAvatarType = z.infer<typeof MascotAvatarTypeSchema>;

export const MascotConfigSchema = z.object({
  name: z.string(),
  avatar: MascotAvatarTypeSchema.default('3d-cat'),
  rive: z.string().optional(),
  voiceId: z.string().optional(),
});
export type MascotConfig = z.infer<typeof MascotConfigSchema>;

// ─── Theme ─────────────────────────────────────────────────────────────
export const ThemeSchema = z.object({
  accent: z.string().default('#0A7'),
  position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
});
export type Theme = z.infer<typeof ThemeSchema>;

// ─── Voice ─────────────────────────────────────────────────────────────
export const VoiceConfigSchema = z.object({
  provider: z.enum(['gemini-live', 'sarvam']).default('gemini-live'),
  language: z.string().default('en-IN'),
});
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;

// ─── Consent ───────────────────────────────────────────────────────────
export const ConsentSchema = z.object({
  storeTranscripts: z.boolean().default(false),
});
export type Consent = z.infer<typeof ConsentSchema>;

// ─── Company Config (top-level) ────────────────────────────────────────
export const CompanyConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  mascot: MascotConfigSchema,
  theme: ThemeSchema.default({}),
  voice: VoiceConfigSchema.default({}),
  intents: z.array(IntentSchema).default(['general']),
  pitches: z.record(IntentSchema, PitchSchema).default({}),
  factSheet: z.string().default(''),
  knowledgeBase: z.string().optional(),
  goal: z.string().default('represent_company_and_convert_visitors'),
  tools: MascotToolsSchema.default({}),
  cta: CtaSchema.optional(),
  consent: ConsentSchema.default({}),
  proactive: z.boolean().default(true),
  /** Seconds after page load before the invite bubble appears */
  inviteDelaySec: z.number().default(5),
});
export type CompanyConfig = z.infer<typeof CompanyConfigSchema>;

// ─── Widget State Machine ──────────────────────────────────────────────
export const WidgetState = {
  HIDDEN: 'hidden',
  IDLE: 'idle',
  INVITE: 'invite',
  INTENT_SELECT: 'intent_select',
  PITCHING: 'pitching',
  PAUSED: 'paused',
  QA_LISTENING: 'qa_listening',
  QA_THINKING: 'qa_thinking',
  QA_SPEAKING: 'qa_speaking',
  CTA: 'cta',
  DISMISSED: 'dismissed',
  // Voice states (Phase 3)
  VOICE_CONNECTING: 'voice_connecting',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
} as const;
export type WidgetStateValue = typeof WidgetState[keyof typeof WidgetState];

// ─── Events (analytics) ───────────────────────────────────────────────
export const AnalyticsEventSchema = z.object({
  companyId: z.string(),
  sessionId: z.string(),
  event: z.enum([
    'pitch_offered',
    'pitch_started',
    'pitch_completed',
    'intent_selected',
    'question_asked',
    'cta_clicked',
    'lead_submitted',
  ]),
  payload: z.record(z.unknown()).optional(),
  timestamp: z.number(),
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// ─── Lead ──────────────────────────────────────────────────────────────
export const LeadSchema = z.object({
  companyId: z.string(),
  name: z.string().optional(),
  email: z.string().email(),
  intent: IntentSchema.optional(),
  note: z.string().optional(),
});
export type Lead = z.infer<typeof LeadSchema>;

// ─── Default CarbonDot Config ──────────────────────────────────────────
export const DEMO_CARBONDOT_CONFIG: CompanyConfig = {
  id: 'carbondot',
  name: 'CarbonDot',
  mascot: {
    name: 'Dot',
    avatar: '3d-cat',
  },
  goal: 'represent_company_and_convert_visitors',
  tools: {
    pageScroll: true,
    leadCapture: true,
    calendarUrl: 'https://calendly.com',
  },
  proactive: true,
  theme: {
    accent: '#00C48C',
    position: 'bottom-right',
  },
  voice: {
    provider: 'gemini-live',
    language: 'en-IN',
  },
  intents: ['investor', 'customer', 'partner', 'general'],
  inviteDelaySec: 4,
  factSheet: `
    - Company Overview: CarbonDot is a climate-tech company that converts industrial flue CO2 emissions into permanent, stable mineral granules using ambient-temperature biocatalytic mineralization.
    - Energy Efficiency: Consumes 40% less energy than conventional direct air capture and amine scrubbing.
    - Funding & Capital: Raised $2.5M Seed funding led by Planet Ventures.
    - Valuation: Current company valuation is confidential and not publicly disclosed.
    - Pilot & Traction: Flagship commercial pilot facility is operating live in Rotterdam, capturing 1,200 tons of CO2 annually. 3 paid enterprise pilot MOUs in place.
    - Technology: BioGranule™ modular 40-foot skids that bolt directly onto industrial exhaust stacks. Uses engineered carbonic anhydrase catalyst running at ambient temperatures to crystallize gaseous CO2 into ASTM C33 certified building aggregates for concrete.
    - Founders & Leadership: Founded in 2024 by Dr. Aris Thorne (CEO, 8 patents in biocatalytic mineral synthesis, ex-TU Delft) and Maya Lin (CTO, ex-Climeworks process engineer).
    - Next Steps: Offering introduction calls and facility tours for investors, industrial partners, and customer plant operators.
  `,
  cta: {
    type: 'book_call',
    url: 'https://calendly.com',
  },
  consent: {
    storeTranscripts: false,
  },
  pitches: {
    investor: {
      audioUrl: '',
      durationSec: 50,
      timeline: [
        {
          t: 0,
          caption: "Hi there! I'm Dot, CarbonDot's company representative.",
          gesture: 'wave',
        },
        {
          t: 6,
          caption: "Heavy industry accounts for over 30% of global greenhouse emissions. Current capture technologies are way too energy intensive.",
          scrollTo: '#problem',
          gesture: 'shrug',
        },
        {
          t: 16,
          caption: "That's why we engineered BioGranule: our proprietary biocatalytic system that traps CO2 directly at the flue stack, consuming 40% less energy.",
          scrollTo: '#prototype',
          gesture: 'point',
        },
        {
          t: 28,
          caption: "Our Rotterdam pilot is actively capturing 1,200 tons per year, with 3 paid enterprise pilots lined up.",
          scrollTo: '#traction',
          gesture: 'nod',
        },
        {
          t: 38,
          caption: "We're backed by Planet Ventures and led by top chemical engineers from MIT and TU Delft. Let's schedule a deep dive!",
          scrollTo: '#team',
          gesture: 'thumbsup',
        },
      ],
    },
    general: {
      audioUrl: '',
      durationSec: 40,
      timeline: [
        {
          t: 0,
          caption: "Welcome to CarbonDot! I'm Dot, here to give you the fast walkthrough.",
          gesture: 'wave',
        },
        {
          t: 5,
          caption: "Every day, industrial manufacturing releases millions of tons of trapped carbon.",
          scrollTo: '#problem',
        },
        {
          t: 14,
          caption: "Our solution locks carbon permanently into inert architectural minerals.",
          scrollTo: '#prototype',
          gesture: 'point',
        },
        {
          t: 24,
          caption: "Our team brings together world-class materials scientists and climate operators.",
          scrollTo: '#team',
          gesture: 'nod',
        },
        {
          t: 32,
          caption: "Check out our pilot milestones or book time with the founders!",
          scrollTo: '#traction',
          gesture: 'thumbsup',
        },
      ],
    },
    customer: {
      audioUrl: '',
      durationSec: 35,
      timeline: [
        {
          t: 0,
          caption: "Looking to decarbonize your manufacturing facility? I can help.",
          gesture: 'wave',
        },
        {
          t: 6,
          caption: "CarbonDot installs as a modular bolt-on unit right at your exhaust stream.",
          scrollTo: '#prototype',
          gesture: 'point',
        },
        {
          t: 16,
          caption: "We turn your emissions into certified green building aggregates you can resell.",
          scrollTo: '#traction',
          gesture: 'nod',
        },
        {
          t: 26,
          caption: "Connect with our engineering team to calculate your plant's ROI.",
          gesture: 'thumbsup',
        },
      ],
    },
    partner: {
      audioUrl: '',
      durationSec: 35,
      timeline: [
        {
          t: 0,
          caption: "Hello! We actively partner with clean infrastructure developers and distributors.",
          gesture: 'wave',
        },
        {
          t: 8,
          caption: "Our patent-pending catalyst scales efficiently across standard chemical supply chains.",
          scrollTo: '#prototype',
          gesture: 'point',
        },
        {
          t: 18,
          caption: "Take a look at our current traction and deployment roadmap.",
          scrollTo: '#traction',
          gesture: 'nod',
        },
        {
          t: 26,
          caption: "Let's explore co-development opportunities together.",
          gesture: 'thumbsup',
        },
      ],
    },
  },
};

