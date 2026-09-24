# Mascot AI — Open Source Integration & Developer Guide 🐱💼

> **Welcome to Mascot AI!**  
> This guide is for any developer, founder, or team who wants to add a living, breathing AI company representative to their website in **under 60 seconds** — complete with 3D animation, real-time voice conversation (like ChatGPT Voice / Gemini Live), proactive page guidance, and automated investor/lead conversion.

---

## 📑 Table of Contents
1. [What is Mascot AI?](#1-what-is-mascot-ai)
2. [Quickstart: What Code to Paste on Your Website](#2-quickstart-what-code-to-paste-on-your-website)
3. [How to Give It Your Company's Data](#3-how-to-give-it-your-companys-data)
4. [What Are the APIs & Why Do You Need Them?](#4-what-are-the-apis--why-do-you-need-them)
5. [How Conversational Interaction Works (Like ChatGPT / Gemini Live)](#5-how-conversational-interaction-works)
6. [Hosting & Deployment Guide](#6-hosting--deployment-guide)
7. [Full Configuration Schema (`mascot.config.json`)](#7-full-configuration-schema)

---

## 1. What is Mascot AI?

Most startup websites are static brochures: visitors skim for 15 seconds and leave without taking action.

**Mascot AI** fixes this by placing **Dot** (a stylized 3D mascot in a tailored business suit) in the bottom-right corner of your site. It is not a robotic customer-support chatbot:
- **It converses like ChatGPT / Gemini Live**: Visitors can speak naturally using their microphone. Dot speaks back with expressive 3D jaw movements, cursor eye-tracking, and physical gestures (`wave`, `point`, `nod`, `thumbsup`).
- **Instant Barge-in Interruption**: Visitors can interrupt Dot mid-sentence just like a real phone call.
- **Active Sales & Investor Pitching**: If an investor asks *"Convince me why I should invest"*, Dot delivers a compelling pitch (highlighting margins, traction, and unfair advantage) and autonomously opens an intro call booking form.
- **Proactive Scroll Awareness**: If a visitor pauses on `#traction` or `#technology` for >6 seconds, Dot gives a contextual nudge.
- **Autonomous Lead Capture**: Captures visitor names and work emails right inside the live transcript box and sends them directly to your CRM/API.

---

## 2. Quickstart: What Code to Paste on Your Website

You can embed Mascot AI into **any website** (Webflow, Framer, WordPress, React, Next.js, or raw HTML) using one of three simple approaches.

### Approach 1: Zero-Backend Inline HTML (Fastest — 30 Seconds)
Paste this directly before your closing `</body>` tag. Everything is configured right in your HTML with **no external server needed**:

```html
<!-- 1. Define your company facts and mascot appearance -->
<script id="mascot-config" type="application/json">
{
  "id": "my-startup",
  "name": "HyperVolt Robotics",
  "mascot": {
    "name": "Dot",
    "avatar": "3d-cat"
  },
  "theme": {
    "accent": "#00C48C",
    "position": "bottom-right"
  },
  "knowledgeBase": "# HyperVolt Context\n- Overview: HyperVolt manufactures autonomous micro-drones for industrial warehouse scanning.\n- Traction: 24 active enterprise facilities scanned daily; 40% inspection time reduction.\n- Funding: $3M Seed round led by Frontier Robotics Fund.\n- Founders: Founded in 2024 by Liam Vance (ex-Skydio) and Dr. Sarah Park (MIT CSAIL).\n- Pilot: Active in Frankfurt logistics hub.",
  "tools": {
    "pageScroll": true,
    "leadCapture": true,
    "calendarUrl": "https://calendly.com/hypervolt/intro"
  },
  "proactive": true
}
</script>

<!-- 2. Drop in the standalone Web Component bundle -->
<script src="https://cdn.jsdelivr.net/npm/@pitchcat/widget/dist/mascot.min.js" async></script>
```

---

### Approach 2: Using a `mascot.config.json` File
Place a `mascot.config.json` file in your website's root folder:

```html
<script 
  src="https://cdn.jsdelivr.net/npm/@pitchcat/widget/dist/mascot.min.js" 
  data-config="/mascot.config.json" 
  async>
</script>
```

---

### Approach 3: React / Next.js (App Router or Pages Router)

```tsx
'use client';

import { useEffect } from 'react';

export function MascotWidget() {
  useEffect(() => {
    // Dynamic import to support SSR environments
    import('@pitchcat/widget').then(({ mountPitchCat }) => {
      mountPitchCat({
        id: 'acme-corp',
        name: 'Acme Corp',
        mascot: {
          name: 'Dot',
          avatar: '3d-cat',
        },
        theme: {
          accent: '#2563EB',
          position: 'bottom-right',
        },
        factSheet: `
          Acme Corp builds AI code analysis infrastructure.
          Raised $2M Pre-Seed. 5,000 GitHub developers using our CLI.
        `,
        tools: {
          pageScroll: true,
          leadCapture: true,
          calendarUrl: 'https://calendly.com/acme/demo',
        },
      });
    });
  }, []);

  return null;
}
```

---

## 3. How to Give It Your Company's Data

Mascot AI uses **strict fact-sheet grounding**. This guarantees that the mascot **never hallucinates** or makes up false claims.

### Where to Put Your Data
In your `mascot.config.json` or inline `<script id="mascot-config">`, populate the `knowledgeBase` or `factSheet` string.

### Recommended Fact Sheet Template
Format your facts as clear, concise bullet points:

```markdown
# [Your Startup Name] Knowledge Base

- What We Do: [1-2 sentences explaining what problem you solve and how.]
- Unfair Advantage / Moat: [Why your solution is 10x better, faster, or cheaper than incumbents.]
- Traction & Metrics: [Active users, revenue, pilots, or commercial facilities.]
- Funding & Valuation: [Funding raised, lead investors, and note if valuation is confidential.]
- Founders & Team: [Names, previous backgrounds, universities, or notable achievements.]
- Target Customers: [Who buys your product and what is your unit economic ROI.]
- Offer / Call to Action: [Intro calls, pilot facility tours, or free developer trials.]
```

### Proactive Section Scroll Sync
You can link mascot explanations directly to sections on your webpage! Simply give your HTML sections IDs:
```html
<section id="problem">...</section>
<section id="prototype">...</section>
<section id="traction">...</section>
<section id="team">...</section>
```
When Dot talks about your technology, pilot, or team, it will **automatically and smoothly scroll the visitor's page** to the exact section, pointing with its hand!

---

## 4. What Are the APIs & Why Do You Need Them?

Mascot AI includes a lightweight backend server located in `packages/api/` built on Hono and Node.js.

### Do I Need the API?
- **Without the API (Client-Only)**: The widget runs completely inside the browser! It uses the browser's native Web Speech API and the local grounded semantic matcher.
- **With the API (Recommended for Production)**: Enables full cloud-native **Gemini 2.0 Flash / Live Speech-to-Speech** streaming, persistent lead storage, and team notifications.

### Setting Up the API
1. Open the project root:
   ```bash
   cd Mascot-AI
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Add your Gemini API key (free from [Google AI Studio](https://aistudio.google.com/)):
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
4. Start the API server:
   ```bash
   npm run dev:api
   ```
   *The server starts on `http://localhost:3001`.*

### API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/chat` | Conversational grounded AI response using Gemini 2.0 Flash or local semantic fallback. Evaluates user intent, suggests scroll sections, and triggers gestures. |
| `POST` | `/v1/leads` | In-conversation lead capture. Saves visitor name, email, intent, and timestamp. |
| `GET` | `/v1/leads` | Returns captured leads for your sales team / dashboard (`?companyId=...`). |
| `GET` | `/v1/config/:companyId` | Returns company configuration, pitches, and fact sheet. |
| `WS` | `/v1/voice/live` | WebSocket relay for bidirectional Gemini Live audio streaming with instantaneous barge-in interruption. |

---

## 5. How Conversational Interaction Works

### Conversing Like ChatGPT Voice
1. **Click the Mascot or "Talk to Dot (Live Voice)"**:
   - The microphone activates with automatic echo cancellation and noise suppression.
   - An animated audio wave visualizer indicates Dot is actively listening.
2. **Instant Barge-in Interruption**:
   - Whenever the user speaks while Dot is talking, Dot immediately stops speaking, closes its mouth, and listens to the user.
3. **Conversational Intelligence**:
   - **Real-Time Date & Time**: Ask *"What time is it?"* or *"What's the date?"* and Dot replies with the real-time clock and calendar.
   - **Chit-Chat**: Ask *"How are you doing?"* or *"Tell me a joke"* for charming persona-driven banter.
4. **Investor Conversion**:
   - If an investor says *"I'm an angel investor, convince me why I should invest"* or asks *"What's your moat?"*, Dot delivers a confident, structured pitch highlighting unit economics, pilot traction, and the $2.5M Seed round.
   - Dot automatically triggers an interactive **Lead Capture Form** inside the conversation transcript, allowing the investor to input their email in 1 click!

---

## 6. Hosting & Deployment Guide

### Deploying the Standalone Widget (`mascot.min.js`)
The widget builds to a single file: `packages/widget/dist/mascot.min.js` (~164 KB gzipped).
You can host it on:
- **Cloudflare Pages / Vercel**: Upload `packages/widget/dist` as a static site.
- **AWS S3 + CloudFront**: Store as an immutable CDN asset.
- **npm**: Publish `@pitchcat/widget` to npm and load via `https://cdn.jsdelivr.net/npm/@pitchcat/widget/dist/mascot.min.js`.

### Deploying the Backend API
The backend in `packages/api/` is a standard Node.js server.
- **Railway / Render**: Deploy with `npm run dev:api` or `node packages/api/dist/index.js`.
- Set environment variable: `GEMINI_API_KEY=your_key_here`.

---

## 7. Full Configuration Schema (`mascot.config.json`)

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
  "knowledgeBase": "# CarbonDot Context\n- Overview: Converts industrial CO2 into calcium carbonate mineral aggregates using biocatalysis.\n- Energy: 40% lower energy penalty than DAC.\n- Funding: Raised $2.5M Seed led by Planet Ventures.\n- Pilot: Active in Rotterdam capturing 1,200 tons/yr with 3 paid enterprise contracts.\n- Technology: BioGranule modular 40-foot skids bolted onto exhaust stacks.\n- Founders: Dr. Aris Thorne (CEO) & Maya Lin (CTO).",
  "intents": ["investor", "customer", "partner", "general"]
}
```

---

## 💡 Quick Tips for Maximum Conversions
1. **Put your Calendly link** in `tools.calendarUrl` so Dot can book meetings directly into your calendar.
2. **Keep sections tagged with IDs** (`#problem`, `#prototype`, `#traction`, `#team`) so Dot can guide users visually while talking.
3. **Keep your Fact Sheet updated** with your latest funding round and pilot milestones. Dot will always represent your latest achievements with 100% confidence!
