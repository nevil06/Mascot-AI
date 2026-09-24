import { z } from 'zod';
export declare const GestureSchema: z.ZodEnum<["wave", "point", "nod", "shrug", "thumbsup"]>;
export type Gesture = z.infer<typeof GestureSchema>;
export declare const TimelineCueSchema: z.ZodObject<{
    /** Seconds from pitch start */
    t: z.ZodNumber;
    /** Caption text to display */
    caption: z.ZodString;
    /** Optional mascot gesture to trigger */
    gesture: z.ZodOptional<z.ZodEnum<["wave", "point", "nod", "shrug", "thumbsup"]>>;
    /** Optional CSS selector on the host page to scroll to */
    scrollTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    t: number;
    caption: string;
    gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
    scrollTo?: string | undefined;
}, {
    t: number;
    caption: string;
    gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
    scrollTo?: string | undefined;
}>;
export type TimelineCue = z.infer<typeof TimelineCueSchema>;
export declare const PitchSchema: z.ZodObject<{
    audioUrl: z.ZodString;
    durationSec: z.ZodNumber;
    timeline: z.ZodArray<z.ZodObject<{
        /** Seconds from pitch start */
        t: z.ZodNumber;
        /** Caption text to display */
        caption: z.ZodString;
        /** Optional mascot gesture to trigger */
        gesture: z.ZodOptional<z.ZodEnum<["wave", "point", "nod", "shrug", "thumbsup"]>>;
        /** Optional CSS selector on the host page to scroll to */
        scrollTo: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        t: number;
        caption: string;
        gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
        scrollTo?: string | undefined;
    }, {
        t: number;
        caption: string;
        gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
        scrollTo?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    audioUrl: string;
    durationSec: number;
    timeline: {
        t: number;
        caption: string;
        gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
        scrollTo?: string | undefined;
    }[];
}, {
    audioUrl: string;
    durationSec: number;
    timeline: {
        t: number;
        caption: string;
        gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
        scrollTo?: string | undefined;
    }[];
}>;
export type Pitch = z.infer<typeof PitchSchema>;
export declare const IntentSchema: z.ZodEnum<["general", "investor", "partner", "customer"]>;
export type Intent = z.infer<typeof IntentSchema>;
export declare const CtaSchema: z.ZodObject<{
    type: z.ZodEnum<["book_call", "email", "form"]>;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "book_call" | "email" | "form";
    url: string;
}, {
    type: "book_call" | "email" | "form";
    url: string;
}>;
export type Cta = z.infer<typeof CtaSchema>;
export declare const MascotConfigSchema: z.ZodObject<{
    name: z.ZodString;
    rive: z.ZodOptional<z.ZodString>;
    voiceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    rive?: string | undefined;
    voiceId?: string | undefined;
}, {
    name: string;
    rive?: string | undefined;
    voiceId?: string | undefined;
}>;
export type MascotConfig = z.infer<typeof MascotConfigSchema>;
export declare const ThemeSchema: z.ZodObject<{
    accent: z.ZodDefault<z.ZodString>;
    position: z.ZodDefault<z.ZodEnum<["bottom-right", "bottom-left"]>>;
}, "strip", z.ZodTypeAny, {
    accent: string;
    position: "bottom-right" | "bottom-left";
}, {
    accent?: string | undefined;
    position?: "bottom-right" | "bottom-left" | undefined;
}>;
export type Theme = z.infer<typeof ThemeSchema>;
export declare const VoiceConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["gemini-live", "sarvam"]>>;
    language: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: "gemini-live" | "sarvam";
    language: string;
}, {
    provider?: "gemini-live" | "sarvam" | undefined;
    language?: string | undefined;
}>;
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;
export declare const ConsentSchema: z.ZodObject<{
    storeTranscripts: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    storeTranscripts: boolean;
}, {
    storeTranscripts?: boolean | undefined;
}>;
export type Consent = z.infer<typeof ConsentSchema>;
export declare const CompanyConfigSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    mascot: z.ZodObject<{
        name: z.ZodString;
        rive: z.ZodOptional<z.ZodString>;
        voiceId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        rive?: string | undefined;
        voiceId?: string | undefined;
    }, {
        name: string;
        rive?: string | undefined;
        voiceId?: string | undefined;
    }>;
    theme: z.ZodDefault<z.ZodObject<{
        accent: z.ZodDefault<z.ZodString>;
        position: z.ZodDefault<z.ZodEnum<["bottom-right", "bottom-left"]>>;
    }, "strip", z.ZodTypeAny, {
        accent: string;
        position: "bottom-right" | "bottom-left";
    }, {
        accent?: string | undefined;
        position?: "bottom-right" | "bottom-left" | undefined;
    }>>;
    voice: z.ZodDefault<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["gemini-live", "sarvam"]>>;
        language: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        provider: "gemini-live" | "sarvam";
        language: string;
    }, {
        provider?: "gemini-live" | "sarvam" | undefined;
        language?: string | undefined;
    }>>;
    intents: z.ZodDefault<z.ZodArray<z.ZodEnum<["general", "investor", "partner", "customer"]>, "many">>;
    pitches: z.ZodDefault<z.ZodRecord<z.ZodEnum<["general", "investor", "partner", "customer"]>, z.ZodObject<{
        audioUrl: z.ZodString;
        durationSec: z.ZodNumber;
        timeline: z.ZodArray<z.ZodObject<{
            /** Seconds from pitch start */
            t: z.ZodNumber;
            /** Caption text to display */
            caption: z.ZodString;
            /** Optional mascot gesture to trigger */
            gesture: z.ZodOptional<z.ZodEnum<["wave", "point", "nod", "shrug", "thumbsup"]>>;
            /** Optional CSS selector on the host page to scroll to */
            scrollTo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            t: number;
            caption: string;
            gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
            scrollTo?: string | undefined;
        }, {
            t: number;
            caption: string;
            gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
            scrollTo?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        audioUrl: string;
        durationSec: number;
        timeline: {
            t: number;
            caption: string;
            gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
            scrollTo?: string | undefined;
        }[];
    }, {
        audioUrl: string;
        durationSec: number;
        timeline: {
            t: number;
            caption: string;
            gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
            scrollTo?: string | undefined;
        }[];
    }>>>;
    factSheet: z.ZodDefault<z.ZodString>;
    cta: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["book_call", "email", "form"]>;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "book_call" | "email" | "form";
        url: string;
    }, {
        type: "book_call" | "email" | "form";
        url: string;
    }>>;
    consent: z.ZodDefault<z.ZodObject<{
        storeTranscripts: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        storeTranscripts: boolean;
    }, {
        storeTranscripts?: boolean | undefined;
    }>>;
    /** Seconds after page load before the invite bubble appears */
    inviteDelaySec: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    mascot: {
        name: string;
        rive?: string | undefined;
        voiceId?: string | undefined;
    };
    theme: {
        accent: string;
        position: "bottom-right" | "bottom-left";
    };
    voice: {
        provider: "gemini-live" | "sarvam";
        language: string;
    };
    intents: ("general" | "investor" | "partner" | "customer")[];
    pitches: Partial<Record<"general" | "investor" | "partner" | "customer", {
        audioUrl: string;
        durationSec: number;
        timeline: {
            t: number;
            caption: string;
            gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
            scrollTo?: string | undefined;
        }[];
    }>>;
    factSheet: string;
    consent: {
        storeTranscripts: boolean;
    };
    inviteDelaySec: number;
    cta?: {
        type: "book_call" | "email" | "form";
        url: string;
    } | undefined;
}, {
    name: string;
    id: string;
    mascot: {
        name: string;
        rive?: string | undefined;
        voiceId?: string | undefined;
    };
    theme?: {
        accent?: string | undefined;
        position?: "bottom-right" | "bottom-left" | undefined;
    } | undefined;
    voice?: {
        provider?: "gemini-live" | "sarvam" | undefined;
        language?: string | undefined;
    } | undefined;
    intents?: ("general" | "investor" | "partner" | "customer")[] | undefined;
    pitches?: Partial<Record<"general" | "investor" | "partner" | "customer", {
        audioUrl: string;
        durationSec: number;
        timeline: {
            t: number;
            caption: string;
            gesture?: "wave" | "point" | "nod" | "shrug" | "thumbsup" | undefined;
            scrollTo?: string | undefined;
        }[];
    }>> | undefined;
    factSheet?: string | undefined;
    cta?: {
        type: "book_call" | "email" | "form";
        url: string;
    } | undefined;
    consent?: {
        storeTranscripts?: boolean | undefined;
    } | undefined;
    inviteDelaySec?: number | undefined;
}>;
export type CompanyConfig = z.infer<typeof CompanyConfigSchema>;
export declare const WidgetState: {
    readonly HIDDEN: "hidden";
    readonly IDLE: "idle";
    readonly INVITE: "invite";
    readonly INTENT_SELECT: "intent_select";
    readonly PITCHING: "pitching";
    readonly PAUSED: "paused";
    readonly QA_LISTENING: "qa_listening";
    readonly QA_THINKING: "qa_thinking";
    readonly QA_SPEAKING: "qa_speaking";
    readonly CTA: "cta";
    readonly DISMISSED: "dismissed";
    readonly VOICE_CONNECTING: "voice_connecting";
    readonly LISTENING: "listening";
    readonly THINKING: "thinking";
    readonly SPEAKING: "speaking";
};
export type WidgetStateValue = typeof WidgetState[keyof typeof WidgetState];
export declare const AnalyticsEventSchema: z.ZodObject<{
    companyId: z.ZodString;
    sessionId: z.ZodString;
    event: z.ZodEnum<["pitch_offered", "pitch_started", "pitch_completed", "intent_selected", "question_asked", "cta_clicked", "lead_submitted"]>;
    payload: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    sessionId: string;
    event: "pitch_offered" | "pitch_started" | "pitch_completed" | "intent_selected" | "question_asked" | "cta_clicked" | "lead_submitted";
    timestamp: number;
    payload?: Record<string, unknown> | undefined;
}, {
    companyId: string;
    sessionId: string;
    event: "pitch_offered" | "pitch_started" | "pitch_completed" | "intent_selected" | "question_asked" | "cta_clicked" | "lead_submitted";
    timestamp: number;
    payload?: Record<string, unknown> | undefined;
}>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export declare const LeadSchema: z.ZodObject<{
    companyId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    intent: z.ZodOptional<z.ZodEnum<["general", "investor", "partner", "customer"]>>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    companyId: string;
    name?: string | undefined;
    intent?: "general" | "investor" | "partner" | "customer" | undefined;
    note?: string | undefined;
}, {
    email: string;
    companyId: string;
    name?: string | undefined;
    intent?: "general" | "investor" | "partner" | "customer" | undefined;
    note?: string | undefined;
}>;
export type Lead = z.infer<typeof LeadSchema>;
export declare const DEMO_CARBONDOT_CONFIG: CompanyConfig;
//# sourceMappingURL=index.d.ts.map