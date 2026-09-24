# Mascot AI (PitchCat) 🐱💼

> **Open-source, drop-in AI "Company Representative" widget for startups and deep-tech teams.**  
> Transform brochure websites into interactive, high-converting experiences with a 3D animated mascot that delivers scripted pitches, guides users across sections, converses via real-time speech, and captures leads autonomously.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-164%20KB%20gzipped-success.svg)](packages/widget)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](tsconfig.json)

👉 **Looking to set this up for your company? Read the [Complete Open Source Guide & Tutorial](OPEN_SOURCE_GUIDE.md) to learn how to supply your own data, configure APIs, and paste the embed code into your website.**

---

## ⚡ 60-Second Drop-In Setup

Add Mascot AI to any website in under a minute with **zero backend required**:

### Option A: Single Drop-In Script (with `mascot.config.json`)
```html
<!-- Drop at the end of your <body> -->
<script 
  src="https://cdn.jsdelivr.net/npm/@pitchcat/widget/dist/mascot.min.js" 
  data-config="/mascot.config.json" 
  async>
</script>
```

### Option B: Inline Zero-File Setup (HTML Only)
```html
<script id="mascot-config" type="application/json">
{
  "id": "acme-energy",
  "name": "Acme Energy",
  "mascot": {
    "name": "Dot",
    "avatar": "3d-cat"
  },
  "knowledgeBase": "Acme Energy builds solid-state sodium batteries that charge in 8 minutes. Raised $4M Seed led by Clean Ventures. Flagship pilot running in Austin.",
  "tools": {
    "pageScroll": true,
    "leadCapture": true,
    "calendarUrl": "https://calendly.com/your-startup"
  },
  "proactive": true
}
</script>
<script src="/dist/mascot.min.js" async></script>
```

### Option C: React / Next.js
```tsx
'use client';
import { useEffect } from 'react';

export function MascotWidget() {
  useEffect(() => {
    import('@pitchcat/widget').then(({ mountPitchCat }) => {
      mountPitchCat({
        id: 'my-startup',
        name: 'My Startup',
        factSheet: 'Key metrics, funding, and product overview...',
      });
    });
  }, []);

  return null;
}
```

---

## 🌟 Autonomous Agent Features

| Feature | Description |
| :--- | :--- |
| **Stylized 3D Avatar** | Three.js PBR character in a tailored suit. Includes eye tracking following the cursor, audio-driven jaw lip-sync, and procedural gestures (`wave`, `point`, `nod`, `shrug`, `thumbsup`). |
| **Real-Time Live Voice** | Bidirectional speech-to-speech with instant barge-in interruption. Visitors can interrupt Dot at any moment. |
| **Proactive Perception** | `IntersectionObserver` dwell detection. When visitors pause on sections (`#technology`, `#traction`, `#pricing`), Dot offers non-intrusive contextual insights. |
| **In-Conversation Lead Capture** | Dot autonomously renders an interactive micro-form right inside the voice transcript, capturing names and emails directly into your CRM/API. |
| **Synchronized Auto-Scroll** | Automatically highlights relevant page sections when explaining concepts, with automatic 5-second pause if the user scrolls manually. |
| **Strict Grounding Guarantee** | Dot only states verified facts from your `mascot.config.json` fact sheet. No hallucinations. |
| **Zero CSS Collisions** | Fully isolated inside Shadow DOM. Won't interfere with your site's styles, framework, or layout. |

---

## 🛠️ Configuration Reference (`mascot.config.json`)

```json
{
  "$schema": "https://mascot-ai.org/schema.json",
  "id": "carbondot",
  "name": "CarbonDot",
  "mascot": {
    "name": "Dot",
    "avatar": "3d-cat"
  },
  "theme": {
    "accent": "#00C48C",
    "position": "bottom-right"
  },
  "goal": "represent_company_and_convert_visitors",
  "tools": {
    "pageScroll": true,
    "leadCapture": true,
    "calendarUrl": "https://calendly.com/carbondot"
  },
  "proactive": true,
  "inviteDelaySec": 4,
  "knowledgeBase": "# CarbonDot Context\n- Overview: Converts industrial CO2 into calcium carbonate aggregate.\n- Funding: Raised $2.5M Seed led by Planet Ventures.\n- Pilot: Active in Rotterdam capturing 1,200 tons/yr.",
  "intents": ["investor", "customer", "partner", "general"]
}
```

---

## 🏗️ Monorepo Architecture

```
├── packages/
│   ├── shared/            # Zod schemas, data contracts, and defaults
│   ├── widget/            # Standalone Web Component, 3D avatar, AudioEngine, LiveVoiceEngine
│   └── api/               # Hono backend for Gemini Live speech relay and lead capture
├── apps/
│   └── demo-site/         # CarbonDot demonstration site (Vite, port 3000)
└── mascot.config.json     # Standard 1-file drop-in configuration
```

---

## 🚀 Local Development

### 1. Install & Build
```bash
npm install
npm run build
```

### 2. Start the Demo Site & API Server
```bash
# Terminal 1: Demo landing page (http://localhost:3000)
npm run dev

# Terminal 2: API server & Gemini relay (http://localhost:3001)
npm run dev:api
```

### 3. Optional: Configure Gemini Cloud Live API
Copy `.env.example` to `.env` in `Mascot-AI/`:
```bash
cp .env.example .env
```
Add your key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(If no API key is set, Mascot AI seamlessly falls back to the intelligent local fact-sheet semantic engine with zero latency).*

---

## 📡 API Endpoints

- `GET /v1/config/:companyId` — Fetches company configuration and pitch timelines.
- `POST /v1/chat` — Contextual grounded Q&A answering strictly from the company's fact sheet.
- `POST /v1/leads` — In-conversation lead capture (`{ name, email, companyId, intent, note }`).
- `GET /v1/leads` — Retrieve captured visitor leads.
- `WS /v1/voice/live` — WebSocket relay for Gemini Multimodal Live speech-to-speech.

---

## 📄 License
MIT © 2026 Mascot AI Authors. Free for personal and commercial use.