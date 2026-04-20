# Rone - Solution Architecture

## High-Level Technical Design for POC

**Project:** Rone
**Document Type:** Solution Architecture Document (SAD)
**Version:** 1.0
**Date:** 2026-04-20
**Status:** Draft
**References:** [requirements.md](requirements.md), [prompt-processing-specification.md](prompt-processing-specification.md)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [System Map](#2-system-map)
3. [Technology Stack](#3-technology-stack)
4. [LLM Strategy](#4-llm-strategy)
5. [Service Architecture](#5-service-architecture)
6. [Data Flows](#6-data-flows)
7. [Data Storage](#7-data-storage)
8. [Content Integration](#8-content-integration)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Generated App Runtime](#10-generated-app-runtime)
11. [Infrastructure & Hosting](#11-infrastructure--hosting)
12. [POC Scope & Simplifications](#12-poc-scope--simplifications)
13. [Risk Register](#13-risk-register)
14. [Phasing](#14-phasing)

---

## 1. Architecture Overview

### 1.1 System Landscape

Rone consists of five logical systems that work together:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          RONE PLATFORM                                    │
│                                                                          │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────────────────────┐  │
│  │  RONE       │   │  ORCHESTRATION   │   │  GENERATION              │  │
│  │  BUILDER    │──>│  BACKEND         │──>│  ENGINE                  │  │
│  │  (Frontend) │   │  (API + Pipeline)│   │  (LLM + Code Assembly)   │  │
│  └─────────────┘   └────────┬─────────┘   └────────────┬─────────────┘  │
│                             │                           │                │
│                             v                           v                │
│                    ┌────────────────┐          ┌────────────────────┐    │
│                    │  DATA LAYER    │          │  APP HOSTING       │    │
│                    │  (DB + Cache)  │          │  (Generated Apps)  │    │
│                    └────────────────┘          └────────────────────┘    │
│                                                                          │
└───────────────┬──────────────────────────────────────────────────────────┘
                │
     ┌──────────┴──────────┐
     │  EXTERNAL SYSTEMS   │
     │  - Reuters SSO      │
     │  - Content API      │
     │  - Markets API      │
     │  - LLM Providers    │
     └─────────────────────┘
```

### 1.2 Core Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Config-driven, not code-driven generation** | Generated apps are rendered from the JSON prompt schema at runtime, not from LLM-generated raw code. This keeps output deterministic, safe, and testable. |
| **LLM for conversation, templates for rendering** | The LLM handles natural language understanding and slot filling. A template engine handles app assembly from the filled prompt schema. This avoids LLM hallucination in code output. |
| **Mock-first for POC** | All external dependencies (Content API, Markets API, SSO) are mocked at the boundary so the POC can run independently. |
| **Single deployable** | For POC, the builder frontend, API backend, and app hosting run as one deployable unit. |

---

## 2. System Map

### 2.1 Systems to Build

| # | System | What It Does | Build or Buy |
|---|--------|--------------|-------------|
| 1 | **Rone Builder Frontend** | Chat UI where authenticated users describe their app preferences | Build (Angular) |
| 2 | **Orchestration API** | Backend that runs the 5-stage processing pipeline, manages sessions, stores apps | Build (Node.js/NestJS) |
| 3 | **Conversation Agent** | LLM-powered agent that classifies intents, fills slots, validates input, and guides the user | Build (LLM integration layer) |
| 4 | **App Generation Engine** | Takes the assembled GenerationPrompt JSON and produces a renderable app bundle | Build (template engine + component library) |
| 5 | **App Hosting Runtime** | Serves generated apps at unique URLs, fetches content from APIs, renders the user's config | Build (lightweight server or static hosting + client-side rendering) |
| 6 | **Content Mock API** | Serves mocked articles, galleries, videos, podcasts, markets data for POC | Build (simple REST mock) |
| 7 | **Database** | Stores user app configs, conversation history, mutation logs | Build (schema + migrations) |

### 2.2 External Systems (Integrate, Don't Build)

| System | Integration Type | POC Approach |
|--------|-----------------|--------------|
| Reuters SSO / OAuth 2.0 | OAuth 2.0 PKCE flow | Mock auth with hardcoded test users |
| Reuters Content API | REST/GraphQL | Mock API with static JSON fixtures |
| Reuters Markets API | REST / WebSocket | Mock API with static quotes, simulated ticks |
| LLM Provider (Claude / OpenAI) | API (HTTP) | Real LLM API calls (core to the product) |

---

## 3. Technology Stack

### 3.1 Frontend — Rone Builder

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Angular 18+** | Existing project scaffold, team familiarity |
| State Management | **NgRx Signals** or **RxJS BehaviorSubjects** | Lightweight for POC; manages chat state and prompt slots |
| Chat UI | **Custom Angular components** | Full control over UX; no heavy third-party chat SDK needed |
| Styling | **Tailwind CSS** or **Angular Material** | Rapid prototyping, responsive out of the box |
| HTTP | **Angular HttpClient** | Standard; interceptors for auth tokens |
| Real-time (optional) | **Server-Sent Events (SSE)** | Stream LLM responses token-by-token to the chat UI |

### 3.2 Backend — Orchestration API

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | **Node.js 20+** | Same language as frontend, fast prototyping |
| Framework | **NestJS** | Structured, modular, good TypeScript support, built-in validation |
| API Protocol | **REST + SSE** | REST for CRUD, SSE for streaming chat responses |
| Validation | **class-validator + Zod** | Schema validation for the GenerationPrompt object |
| Session | **JWT + Redis** | Stateless auth, Redis for conversation session state |

### 3.3 LLM Integration

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Primary LLM | **Claude Sonnet 4.6** (Anthropic) | Strong instruction following, good at structured output (JSON), cost-effective for high-volume chat |
| Fallback LLM | **Claude Haiku 4.5** | For simple intent classification and safety filtering (cheaper, faster) |
| LLM SDK | **Anthropic TypeScript SDK** | Official SDK, supports streaming, tool use |
| Prompt management | **Version-controlled prompt templates in code** | Prompts stored as `.ts` files with typed parameters, versioned with the application |
| Safety layer | **Claude system prompt guardrails + custom post-processing** | LLM handles nuanced safety; rule-based post-processing catches known patterns |

### 3.4 App Generation & Hosting

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Template engine | **Prebuilt Angular component library** | A set of themed, configurable Angular components (cards, layouts, sections) assembled based on the prompt schema |
| App runtime | **Angular SSR (Server-Side Rendering)** or **Static pre-render** | Generated apps are Angular apps rendered from the stored config at request time |
| Hosting | **Same server as API (POC)** / **Azure Static Web Apps (prod)** | POC: simplicity. Prod: CDN-backed, scalable |
| URL routing | `rone.reuters.com/app/:appId` | Unique URL per generated app, resolved to config in DB |

### 3.5 Data

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Primary database | **PostgreSQL 16** | Relational, JSONB support for config storage, mature |
| Cache | **Redis 7** | Session state, conversation context, content cache |
| ORM | **Prisma** or **TypeORM** | Type-safe database access, migrations |
| File/asset storage | **Azure Blob Storage** (prod) / **Local filesystem** (POC) | Store generated app bundles, thumbnails |

---

## 4. LLM Strategy

### 4.1 Where LLMs Are Used

The system uses LLMs at three distinct points. Each has different requirements for model capability, latency, and cost.

```
┌───────────────────────────────────────────────────────┐
│                  LLM USAGE MAP                         │
│                                                        │
│  ┌─────────────────────────────────────────┐           │
│  │  LLM #1: CONVERSATION AGENT            │           │
│  │  Model: Claude Sonnet 4.6              │           │
│  │  Role: Chat with user, guide through   │           │
│  │        preferences, classify intents,   │           │
│  │        fill slots, validate input       │           │
│  │  Latency: <3s per response             │           │
│  │  Streaming: Yes (SSE to frontend)      │           │
│  │  Context: System prompt + conversation  │           │
│  │           history + current prompt      │           │
│  │           schema state                  │           │
│  └─────────────────────────────────────────┘           │
│                                                        │
│  ┌─────────────────────────────────────────┐           │
│  │  LLM #2: SAFETY CLASSIFIER             │           │
│  │  Model: Claude Haiku 4.5               │           │
│  │  Role: Fast pre-check on every user    │           │
│  │        message before conversation      │           │
│  │        agent processes it               │           │
│  │  Latency: <500ms                       │           │
│  │  Streaming: No (classification only)   │           │
│  │  Output: { safe: bool, filter: string, │           │
│  │           reason: string }              │           │
│  └─────────────────────────────────────────┘           │
│                                                        │
│  ┌─────────────────────────────────────────┐           │
│  │  LLM #3: THEME GENERATOR (optional)    │           │
│  │  Model: Claude Sonnet 4.6              │           │
│  │  Role: When user gives vague visual    │           │
│  │        descriptions ("something modern │           │
│  │        and techy"), generate a concrete │           │
│  │        color palette + typography       │           │
│  │        suggestion as JSON              │           │
│  │  Latency: <5s (non-blocking, preview)  │           │
│  │  Streaming: No                         │           │
│  └─────────────────────────────────────────┘           │
│                                                        │
└───────────────────────────────────────────────────────┘
```

### 4.2 LLM #1 — Conversation Agent (Detail)

This is the core LLM integration. It powers the entire chat experience.

**System Prompt Structure:**

```
┌────────────────────────────────────────────────────┐
│ SYSTEM PROMPT                                       │
│                                                     │
│ 1. ROLE DEFINITION                                  │
│    "You are the Rone assistant, helping Reuters      │
│     subscribers build their personalized news app."  │
│                                                     │
│ 2. AVAILABLE SLOTS (from PRS document)              │
│    JSON schema of all customization +               │
│    personalization slots with allowed values         │
│                                                     │
│ 3. CURRENT SLOT STATE                               │
│    The current filled/unfilled state of all slots   │
│    (updated after each user message)                │
│                                                     │
│ 4. GUARDRAIL RULES                                  │
│    Embedded filter rules from PRS sections 3.2-3.6  │
│                                                     │
│ 5. OUTPUT FORMAT INSTRUCTIONS                       │
│    "Respond with TWO parts:                         │
│     1. A JSON block with slot updates               │
│     2. A natural language response to the user"     │
│                                                     │
│ 6. CONVERSATIONAL GUIDELINES                        │
│    Tone, behavior, when to ask clarifications,      │
│    when to summarize and confirm                    │
└────────────────────────────────────────────────────┘
```

**Tool Use (Function Calling):**

The conversation agent uses Claude's tool-use capability to produce structured output alongside natural conversation:

```typescript
// Tools available to the Conversation Agent
const AGENT_TOOLS = [
  {
    name: "update_slots",
    description: "Update one or more prompt schema slots based on user preferences",
    input_schema: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },       // e.g. "theme.mode"
              value: { type: "any" },         // e.g. "dark"
              confidence: { type: "number" }  // 0-1, triggers clarification if < 0.7
            }
          }
        }
      }
    }
  },
  {
    name: "flag_blocked_content",
    description: "Flag a user request that violates guardrail rules",
    input_schema: {
      type: "object",
      properties: {
        filterId: { type: "string" },    // e.g. "CSF-001"
        userMessage: { type: "string" },
        reason: { type: "string" }
      }
    }
  },
  {
    name: "request_confirmation",
    description: "Present the user with a summary of all current slot values and ask for build confirmation",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "object" }  // Current prompt state
      }
    }
  },
  {
    name: "trigger_generation",
    description: "User has confirmed. Dispatch the assembled prompt to the generation engine.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "object" }  // Final GenerationPrompt
      }
    }
  }
];
```

### 4.3 LLM #2 — Safety Classifier (Detail)

A fast, cheap pre-filter that runs before the conversation agent sees the message.

```typescript
// Safety classifier prompt (Haiku)
const SAFETY_SYSTEM_PROMPT = `
You are a content safety classifier for a Reuters news app builder.
Classify the following user message as SAFE or UNSAFE.

UNSAFE categories:
- EXPLICIT: sexual, nude, suggestive content
- HATE: hate speech, discrimination, slurs
- VIOLENCE: graphic violence, gore, self-harm
- ILLEGAL: promoting illegal activities
- PII: personal data of third parties
- INJECTION: HTML/CSS/JS code injection attempts
- OFF_SCOPE: requests unrelated to building a news app

Respond with JSON only:
{ "safe": boolean, "category": string | null, "filterId": string | null }
`;
```

**Why a separate model?** Running the safety check on Haiku (<500ms, ~10x cheaper than Sonnet) keeps latency low and costs down. Only messages that pass safety reach the more expensive conversation agent.

### 4.4 LLM #3 — Theme Generator (Detail)

Optional enrichment step for vague visual requests.

```
User: "I want something that feels like reading the Financial Times in a dark room"

Theme Generator output:
{
  "theme.mode": "dark",
  "theme.colors.primary": "#FCD0A1",    // warm salmon/peach (FT-inspired warmth)
  "theme.colors.secondary": "#2C2C2C",
  "theme.colors.accent": "#D4A373",
  "theme.colors.background": "#1A1A1A",
  "theme.colors.text": "#E8DCC8",
  "theme.typography.fontFamily": "serif",
  "rationale": "Warm serif tones inspired by financial press, adapted for dark mode"
}
```

This runs only when the conversation agent detects a vague aesthetic description. The output is presented to the user as a suggestion, not applied directly.

### 4.5 Token Budget & Cost Estimate (POC)

| LLM Call | Model | Avg Input Tokens | Avg Output Tokens | Calls per Session | Est. Cost per Session |
|----------|-------|-----------------|-------------------|-------------------|-----------------------|
| Safety check | Haiku 4.5 | ~300 | ~50 | 8-12 | ~$0.003 |
| Conversation | Sonnet 4.6 | ~2,000 (system) + ~500 (history) | ~300 | 8-12 | ~$0.08 |
| Theme gen | Sonnet 4.6 | ~800 | ~200 | 0-2 | ~$0.01 |
| **Total per user session** | | | | | **~$0.09** |

---

## 5. Service Architecture

### 5.1 Service Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│                    RONE BACKEND (NestJS)                         │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │ AuthModule    │  │ ChatModule    │  │ GenerationModule    │  │
│  │               │  │               │  │                     │  │
│  │ - SSO proxy   │  │ - WebSocket/  │  │ - Prompt assembler  │  │
│  │ - JWT issuer  │  │   SSE handler │  │ - Template resolver │  │
│  │ - Session mgr │  │ - Safety gate │  │ - Asset bundler     │  │
│  │ - Subscription│  │ - LLM agent   │  │ - Deploy service    │  │
│  │   validator   │  │ - Slot store  │  │                     │  │
│  └───────────────┘  └───────────────┘  └─────────────────────┘  │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │ AppModule     │  │ ContentModule │  │ AuditModule         │  │
│  │               │  │               │  │                     │  │
│  │ - App CRUD    │  │ - Content API │  │ - Request logging   │  │
│  │ - URL routing │  │   proxy       │  │ - Blocked request   │  │
│  │ - Config      │  │ - Mock data   │  │   log               │  │
│  │   serving     │  │   provider    │  │ - Mutation history  │  │
│  │ - Mutation    │  │ - Cache layer │  │                     │  │
│  │   handler     │  │               │  │                     │  │
│  └───────────────┘  └───────────────┘  └─────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 API Endpoints

```
AUTH
  POST   /api/auth/login          → Initiate SSO / mock login
  POST   /api/auth/callback       → SSO callback, issue JWT
  POST   /api/auth/refresh        → Refresh JWT
  GET    /api/auth/me             → Current user + subscription status

CHAT
  POST   /api/chat/session        → Create new chat session
  POST   /api/chat/message        → Send message (returns SSE stream)
  GET    /api/chat/session/:id    → Retrieve conversation history
  DELETE /api/chat/session/:id    → End session

APP
  GET    /api/apps/mine           → List user's generated apps
  GET    /api/apps/:appId/config  → Get app config (GenerationPrompt JSON)
  POST   /api/apps/generate       → Trigger app generation from confirmed prompt
  PATCH  /api/apps/:appId/config  → Mutate app config (post-generation edits)
  GET    /api/apps/:appId/status  → Build status (pending, building, ready, error)

CONTENT (proxy / mock)
  GET    /api/content/articles     → Articles by topic, pagination
  GET    /api/content/galleries    → Galleries by topic
  GET    /api/content/videos       → Videos by topic
  GET    /api/content/podcasts     → Podcasts by topic
  GET    /api/content/markets      → Markets quotes, currencies, commodities

GENERATED APP (public, no /api prefix)
  GET    /app/:appId              → Serve the generated app
  GET    /app/:appId/assets/*     → Serve app static assets
```

---

## 6. Data Flows

### 6.1 Flow 1 — User Sends Chat Message

```
                        ┌──────────┐
                        │  Browser │
                        └────┬─────┘
                             │ POST /api/chat/message
                             │ { sessionId, text: "dark mode, tech news" }
                             v
                     ┌───────────────┐
                     │  API Gateway  │
                     │  (Auth check) │
                     └───────┬───────┘
                             │
                             v
                  ┌─────────────────────┐
                  │  SAFETY CLASSIFIER  │  ◄── LLM #2 (Haiku)
                  │  (Stage 2 pre-check)│
                  └──────────┬──────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                 UNSAFE             SAFE
                    │                 │
                    v                 v
             ┌────────────┐  ┌───────────────────┐
             │ Return     │  │ CONVERSATION AGENT │  ◄── LLM #1 (Sonnet)
             │ block msg  │  │ (Stage 1, 3, 4)   │
             │ + filterId │  │                    │
             └────────────┘  │ Input:             │
                             │  - System prompt   │
                             │  - Conversation    │
                             │    history         │
                             │  - Current slots   │
                             │  - User message    │
                             │                    │
                             │ Output:            │
                             │  - Tool calls      │
                             │    (slot updates)  │
                             │  - Chat response   │
                             └────────┬──────────┘
                                      │
                                      v
                           ┌────────────────────┐
                           │  SLOT STORE        │
                           │  (Redis)           │
                           │                    │
                           │  Apply updates:    │
                           │  theme.mode="dark" │
                           │  topics=[{tech}]   │
                           └────────┬───────────┘
                                    │
                                    v
                           ┌────────────────────┐
                           │  SSE STREAM        │
                           │  to browser        │
                           │                    │
                           │  Chat response +   │
                           │  Updated slot      │
                           │  state preview     │
                           └────────────────────┘
```

### 6.2 Flow 2 — App Generation

```
User confirms build ("Yes, build it")
              │
              v
     ┌────────────────────┐
     │  PROMPT ASSEMBLER  │
     │                    │
     │  1. Load defaults  │
     │  2. Inject system  │
     │     features       │
     │  3. Overlay user   │
     │     slots          │
     │  4. Apply derived  │
     │     rules          │
     │  5. Validate       │
     └────────┬───────────┘
              │
              │  GenerationPrompt JSON
              v
     ┌────────────────────┐
     │  TEMPLATE RESOLVER │
     │                    │
     │  Maps prompt to:   │
     │  - Layout template │
     │  - Card components │
     │  - Theme CSS vars  │
     │  - Section order   │
     │  - Content queries │
     └────────┬───────────┘
              │
              │  App bundle (config + component refs)
              v
     ┌────────────────────┐
     │  DEPLOY SERVICE    │
     │                    │
     │  1. Generate appId │
     │  2. Store config   │
     │     in database    │
     │  3. Register URL   │
     │     route          │
     │  4. Mark status    │
     │     = "ready"      │
     └────────┬───────────┘
              │
              v
     ┌────────────────────┐
     │  RETURN TO USER    │
     │                    │
     │  URL:              │
     │  rone.reuters.com/ │
     │  app/u-28a4f1      │
     └────────────────────┘
```

### 6.3 Flow 3 — Generated App Page Load

```
Browser requests: rone.reuters.com/app/u-28a4f1
              │
              v
     ┌────────────────────┐
     │  APP HOSTING       │
     │  RUNTIME           │
     │                    │
     │  1. Resolve appId  │
     │  2. Load config    │
     │     from DB        │
     │  3. Check user     │
     │     subscription   │
     │     status         │
     └────────┬───────────┘
              │
       ┌──────┴──────┐
       │             │
    ACTIVE        EXPIRED
       │             │
       v             v
  ┌──────────┐  ┌──────────────┐
  │ Serve    │  │ Serve        │
  │ app      │  │ subscription │
  │ shell    │  │ expired page │
  └────┬─────┘  └──────────────┘
       │
       │  App shell loads in browser
       v
  ┌───────────────────────────────────────┐
  │  CLIENT-SIDE RENDERING                │
  │                                       │
  │  1. Read config (embedded in page)    │
  │  2. Apply theme CSS variables         │
  │  3. Render layout template            │
  │  4. For each enabled section:         │
  │     ┌─────────────────────────┐       │
  │     │ Fetch content from      │       │
  │     │ /api/content/{type}     │       │
  │     │ ?topics=tech,business   │       │
  │     │ &limit=10               │       │
  │     └─────────┬───────────────┘       │
  │               │                       │
  │               v                       │
  │     ┌─────────────────────────┐       │
  │     │ Render cards using      │       │
  │     │ selected card style     │       │
  │     │ (e.g., "featured-hero") │       │
  │     └─────────────────────────┘       │
  │                                       │
  │  5. Inject system features:           │
  │     - Reuters branding (header/footer)│
  │     - Account button                  │
  │     - AI assistant FAB                │
  │     - Analytics                       │
  │                                       │
  │  6. Start content refresh timer       │
  └───────────────────────────────────────┘
```

### 6.4 Flow 4 — Post-Generation Edit

```
User clicks AI assistant FAB on generated app
              │
              v
     ┌────────────────────┐
     │  CHAT PANEL OPENS  │
     │  (same ChatModule) │
     │                    │
     │  Context:          │
     │  - appId           │
     │  - Current config  │
     │  - Edit history    │
     └────────┬───────────┘
              │
              │  User: "Change to grid layout, 2 columns"
              v
     ┌────────────────────┐
     │  SAME PIPELINE     │
     │  (Safety → Agent   │
     │   → Slot update)   │
     │                    │
     │  Mutation:         │
     │  layout.style =    │
     │    "grid"          │
     │  layout.columns =  │
     │    2               │
     └────────┬───────────┘
              │
              v
     ┌────────────────────┐
     │  PATCH /api/apps/  │
     │  :appId/config     │
     │                    │
     │  Update config in  │
     │  DB, log mutation  │
     └────────┬───────────┘
              │
              v
     ┌────────────────────┐
     │  APP RE-RENDERS    │
     │  (client-side)     │
     │                    │
     │  Hot-swap layout   │
     │  without full      │
     │  page reload       │
     └────────────────────┘
```

---

## 7. Data Storage

### 7.1 Database Schema (PostgreSQL)

```sql
-- Core tables

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reuters_user_id VARCHAR(255) UNIQUE NOT NULL,
  email           VARCHAR(255),
  display_name    VARCHAR(255),
  subscription_tier   VARCHAR(50),
  subscription_start  TIMESTAMPTZ,
  subscription_end    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE apps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  slug            VARCHAR(100) UNIQUE NOT NULL,     -- URL-safe unique ID
  status          VARCHAR(20) DEFAULT 'active',     -- active, expired, archived
  config          JSONB NOT NULL,                   -- Full GenerationPrompt JSON
  build_period_start  TIMESTAMPTZ NOT NULL,
  build_period_end    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  app_id          UUID REFERENCES apps(id),         -- NULL during initial build
  type            VARCHAR(20) NOT NULL,             -- 'build' or 'edit'
  messages        JSONB NOT NULL DEFAULT '[]',
  slot_state      JSONB NOT NULL DEFAULT '{}',      -- Current slot fill state
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mutations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id          UUID NOT NULL REFERENCES apps(id),
  conversation_id UUID REFERENCES conversations(id),
  type            VARCHAR(30) NOT NULL,             -- update_slot, enable_feature, etc.
  previous_config JSONB NOT NULL,
  new_config      JSONB NOT NULL,
  slots_affected  TEXT[] NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  action          VARCHAR(50) NOT NULL,             -- message_blocked, app_generated, etc.
  detail          JSONB,
  filter_id       VARCHAR(20),                      -- e.g. CSF-001
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_apps_user_id ON apps(user_id);
CREATE INDEX idx_apps_slug ON apps(slug);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_mutations_app_id ON mutations(app_id);
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
```

### 7.2 Redis Structure

```
session:{userId}              → JWT session data (TTL: 24h)
chat:{conversationId}:slots   → Current slot state JSON (TTL: 2h)
chat:{conversationId}:history → Message array for LLM context (TTL: 2h)
content:cache:{type}:{topic}  → Cached Content API responses (TTL: 5min)
ratelimit:{userId}            → Rate limiting counter (TTL: 1min)
```

---

## 8. Content Integration

### 8.1 POC: Mock Content API

For the POC, a local mock API serves static JSON fixtures.

```
/mock-api
  /articles.json      → 20 mock articles across topics
  /galleries.json     → 10 mock galleries
  /videos.json        → 10 mock videos
  /podcasts.json      → 5 mock podcasts with episodes
  /markets.json       → Quotes, currencies, commodities
```

The mock API supports query parameters to simulate filtering:

```
GET /api/content/articles?topics=Technology,Business&limit=10
GET /api/content/markets?symbols=AAPL,MSFT,.DJI&type=quotes
```

### 8.2 Production: Content API Integration

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Generated   │────>│  Content Proxy   │────>│  Reuters       │
│  App Client  │     │  (Backend)       │     │  Content API   │
└──────────────┘     │                  │     └────────────────┘
                     │  - Auth (API key)│
                     │  - Rate limiting │     ┌────────────────┐
                     │  - Caching       │────>│  Reuters       │
                     │  - Topic mapping │     │  Markets API   │
                     │  - Response      │     └────────────────┘
                     │    normalization │
                     └──────────────────┘
```

The generated app never calls Reuters APIs directly. All content flows through the backend Content Proxy, which handles API keys, caching, and rate limiting.

---

## 9. Authentication & Authorization

### 9.1 Auth Flow

```
┌─────────┐   deep link    ┌─────────┐   redirect    ┌──────────┐
│ Reuters │───────────────>│  Rone   │─────────────>│ Reuters  │
│ App/Web │               │ Landing │              │ SSO      │
└─────────┘               └─────────┘              │ (OAuth)  │
                                                    └────┬─────┘
                                                         │ auth code
                                                         v
                                                    ┌──────────┐
                                                    │  Rone    │
                                                    │  Backend │
                                                    │          │
                                                    │ Exchange │
                                                    │ code for │
                                                    │ tokens   │
                                                    └────┬─────┘
                                                         │ JWT
                                                         v
                                                    ┌──────────┐
                                                    │  Browser │
                                                    │  (cookie │
                                                    │  / local │
                                                    │  storage)│
                                                    └──────────┘
```

### 9.2 POC Simplification

For the POC, authentication is mocked:

```typescript
// Mock auth - hardcoded test users
const MOCK_USERS = [
  {
    id: "user-001",
    email: "sarah.test@reuters.com",
    displayName: "Sarah Test",
    subscriptionTier: "premium",
    subscriptionEnd: "2026-12-31T23:59:59Z",
    buildsThisPeriod: 0
  },
  {
    id: "user-002",
    email: "john.test@reuters.com",
    displayName: "John Test",
    subscriptionTier: "premium",
    subscriptionEnd: "2026-12-31T23:59:59Z",
    buildsThisPeriod: 1  // Already built an app this period
  }
];
```

Login in POC: pick a user from a dropdown. No real OAuth flow.

---

## 10. Generated App Runtime

### 10.1 How Generated Apps Work

Generated apps are **not** raw code produced by an LLM. They are **config-driven Angular applications** rendered from the GenerationPrompt JSON.

```
┌─────────────────────────────────────────────────────────────┐
│  GENERATED APP = APP SHELL + USER CONFIG                     │
│                                                              │
│  App Shell (same for all users):                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  - Angular runtime                                     │ │
│  │  - Component library (all card types, all layouts)     │ │
│  │  - Theme engine (CSS custom properties)                │ │
│  │  - Content fetching service                            │ │
│  │  - System features (branding, account, assistant, a11y)│ │
│  └────────────────────────────────────────────────────────┘ │
│                          +                                   │
│  User Config (unique per user):                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  GenerationPrompt JSON (embedded or fetched)           │ │
│  │  - Which layout to activate                            │ │
│  │  - Which card components to render per section         │ │
│  │  - CSS variable values (colors, fonts)                 │ │
│  │  - Content API query parameters (topics, types)        │ │
│  │  - Section order                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          =                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Unique-looking news app at a unique URL               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Why Config-Driven (Not LLM-Generated Code)

| Approach | Pros | Cons |
|----------|------|------|
| **LLM generates raw HTML/CSS/JS** | Maximum creative flexibility | Unpredictable output, security risks (XSS), inconsistent quality, slow generation, hard to edit post-generation |
| **Config-driven rendering** (chosen) | Deterministic, secure, fast, editable, testable, consistent quality | Limited to predefined component variations |

For the POC, config-driven rendering is the correct trade-off. It guarantees that every generated app is safe, accessible, branded, and functional. The LLM's creativity is channeled into helping the user choose the right configuration — not into writing code.

### 10.3 Component Library

The app shell includes a prebuilt library of components:

```
components/
├── layouts/
│   ├── GridLayout          (1-4 columns)
│   ├── ListLayout          (single column, stacked)
│   ├── MagazineLayout      (featured + grid)
│   ├── NewspaperLayout     (multi-column, dense)
│   └── SingleColumnLayout  (mobile-optimized)
│
├── cards/
│   ├── articles/
│   │   ├── HeadlineOnlyCard
│   │   ├── ThumbnailHeadlineCard
│   │   ├── FullCard
│   │   └── FeaturedHeroCard
│   ├── galleries/
│   │   ├── CarouselCard
│   │   ├── GridThumbnailsCard
│   │   ├── FeaturedImageCard
│   │   └── FilmstripCard
│   ├── videos/
│   │   ├── InlinePlayerCard
│   │   ├── ThumbnailPlayCard
│   │   ├── ListViewCard
│   │   └── CinematicCard
│   ├── podcasts/
│   │   ├── PlayerCard
│   │   ├── EpisodeListCard
│   │   ├── CompactCard
│   │   └── WaveformCard
│   └── markets/
│       ├── TickerStripWidget
│       ├── TableWidget
│       ├── ChartCardsWidget
│       └── SparklineListWidget
│
├── system/                     (always rendered)
│   ├── ReutersBrandingHeader
│   ├── AccountButton
│   ├── AiAssistantFab
│   ├── FooterBranding
│   ├── ErrorBoundary
│   └── AccessibilityShell
│
└── theme/
    └── ThemeEngine            (reads colors/fonts from config,
                                sets CSS custom properties)
```

### 10.4 Theme Engine

```css
/* The ThemeEngine reads the GenerationPrompt and sets these: */

:root {
  --rone-color-primary:    var(--config-primary);
  --rone-color-secondary:  var(--config-secondary);
  --rone-color-accent:     var(--config-accent);
  --rone-color-background: var(--config-background);
  --rone-color-text:       var(--config-text);
  --rone-color-card-bg:    var(--config-card-background);
  --rone-color-border:     var(--config-border);
  --rone-font-family:      var(--config-font-family);
  --rone-font-size-body:   var(--config-body-size);
  --rone-heading-scale:    var(--config-heading-scale);
}

/* All components reference these variables — no hardcoded colors */
```

---

## 11. Infrastructure & Hosting

### 11.1 POC Infrastructure

```
┌─────────────────────────────────────────────────┐
│  SINGLE DEPLOYMENT (local / single server)       │
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │  Node.js Process (NestJS)               │     │
│  │                                         │     │
│  │  /          → Angular Builder SPA       │     │
│  │  /api/*     → REST API                  │     │
│  │  /app/:id   → Generated app shell       │     │
│  │  /mock/*    → Mock content API          │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  PostgreSQL  │  │  Redis       │              │
│  │  (Docker)    │  │  (Docker)    │              │
│  └──────────────┘  └──────────────┘              │
│                                                  │
│  External: Anthropic API (real, cloud)           │
└─────────────────────────────────────────────────┘
```

### 11.2 Production Infrastructure (Future)

```
┌───────────────────────────────────────────────────────────┐
│  AZURE                                                     │
│                                                            │
│  ┌─────────────┐    ┌──────────────────┐                  │
│  │ Azure CDN / │    │ Azure App Service │                  │
│  │ Front Door  │───>│ (NestJS API)     │                  │
│  └──────┬──────┘    └────────┬─────────┘                  │
│         │                    │                             │
│         │              ┌─────┴──────┐                      │
│         │              │            │                      │
│         v              v            v                      │
│  ┌────────────┐  ┌──────────┐ ┌──────────┐                │
│  │ Azure      │  │ Azure DB │ │ Azure    │                │
│  │ Static Web │  │ for      │ │ Cache for│                │
│  │ Apps       │  │ Postgres │ │ Redis    │                │
│  │ (gen apps) │  └──────────┘ └──────────┘                │
│  └────────────┘                                            │
│                                                            │
│  ┌───────────────┐  ┌──────────────────┐                  │
│  │ Azure Blob    │  │ Azure Key Vault  │                  │
│  │ Storage       │  │ (API keys,       │                  │
│  │ (assets)      │  │  secrets)        │                  │
│  └───────────────┘  └──────────────────┘                  │
│                                                            │
│  External: Anthropic API, Reuters SSO, Content API         │
└───────────────────────────────────────────────────────────┘
```

---

## 12. POC Scope & Simplifications

### 12.1 What's In the POC

| Feature | POC Implementation |
|---------|-------------------|
| Chat assistant | Full LLM-powered conversation with Anthropic API |
| Intent classification | LLM-based (Haiku for safety, Sonnet for conversation) |
| Slot filling | Full schema from PRS, maintained in Redis |
| Safety filters | LLM-based classification + system prompt guardrails |
| Prompt assembly | Full GenerationPrompt JSON assembly with defaults + user slots |
| App generation | Config-driven rendering from component library |
| Unique URL hosting | `localhost:4200/app/:appId` with DB-backed config |
| Content display | Mock API with realistic fixture data |
| Post-generation editing | Floating assistant with mutation support |
| Database | PostgreSQL with full schema |
| Default features | All system-owned features (branding, account button, assistant FAB, accessibility) |

### 12.2 What's Deferred to Post-POC

| Feature | Reason for Deferral |
|---------|-------------------|
| Reuters SSO integration | Requires enterprise SSO setup; mock auth sufficient for demo |
| Real Content API integration | Requires API access credentials and agreements |
| Real Markets API (live data) | Requires data licensing; mock quotes are sufficient |
| Subscription enforcement | Business rules are defined; enforcement is a simple gate |
| CDN / Azure Static Web Apps deployment | Local hosting proves the concept |
| Real-time content refresh (WebSocket) | Polling with mock data is sufficient |
| Human review queue for flagged requests | Audit log captures flags; manual review is post-POC |
| Multi-language / i18n | English only for POC |
| Performance optimization (lazy loading, code splitting) | Functional correctness first |
| Comprehensive analytics | Basic logging is sufficient |

### 12.3 POC Success Criteria

| # | Criterion |
|---|-----------|
| 1 | A user can log in (mock), chat with the assistant, and express customization + personalization preferences. |
| 2 | The assistant correctly classifies intents, fills slots, and blocks unsafe/out-of-scope requests with appropriate responses. |
| 3 | Upon confirmation, the system generates a working news app at a unique URL. |
| 4 | The generated app displays the correct layout, theme, card styles, and content sections matching the user's choices. |
| 5 | System-owned features (branding, account button, AI FAB) are present on every generated app. |
| 6 | The floating assistant allows post-generation edits that update the app without a new URL. |
| 7 | The full conversation and app config are persisted in the database. |
| 8 | End-to-end flow completes in under 90 seconds (chat + generation + first render). |

---

## 13. Risk Register

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|-----------|------------|
| 1 | LLM produces inconsistent slot extractions from ambiguous input | Medium | High | Use tool-use for structured output; add confidence scores; trigger clarification for low-confidence extractions |
| 2 | Safety classifier misses a harmful request | High | Low | Defense in depth: Haiku pre-check + Sonnet conversation guardrails + rule-based post-processing |
| 3 | Generated apps look too similar despite different configs | Medium | Medium | Invest in component library variety; ensure color, typography, and layout combinations produce visually distinct outputs |
| 4 | LLM latency exceeds 3s target for chat responses | Medium | Medium | Stream responses via SSE; use Haiku for fast classification; cache system prompt for prompt caching benefits |
| 5 | Config-driven approach is too rigid for creative user requests | Medium | Medium | Track requests that hit scope boundaries; use data to prioritize new component variants |
| 6 | Content mock data feels unrealistic in demo | Low | Low | Use realistic Reuters-style content, plausible timestamps, variety of topics |
| 7 | Anthropic API rate limits during demo | High | Low | Implement retry with exponential backoff; pre-test at expected concurrency |

---

## 14. Phasing

### Phase 1 — Foundation (Weeks 1-2)

- Project scaffolding (Angular frontend, NestJS backend, Docker for Postgres + Redis)
- Database schema and migrations
- Mock auth module with test users
- Mock Content API with fixture data
- Basic chat UI (message input, message list, SSE streaming)

### Phase 2 — AI Integration (Weeks 3-4)

- Anthropic SDK integration
- Safety classifier (Haiku) pipeline
- Conversation agent (Sonnet) with system prompt, tool use, slot filling
- Slot store in Redis
- Prompt assembly and validation logic

### Phase 3 — App Generation (Weeks 5-6)

- Component library (layouts, cards, system features)
- Theme engine (CSS custom properties from config)
- Config-driven renderer
- App hosting endpoint (`/app/:appId`)
- End-to-end: chat → generation → unique URL

### Phase 4 — Post-Generation & Polish (Weeks 7-8)

- Floating AI assistant on generated apps
- Mutation pipeline (edit without new URL)
- Conversation history persistence
- Audit logging
- Safety filter edge cases and testing
- Demo readiness

```
Week  1   2   3   4   5   6   7   8
      ├───┤───┤───┤───┤───┤───┤───┤
P1    ████████
P2              ████████
P3                        ████████
P4                                  ████████
```

---

## Appendix A: Key Technical Decisions

| Decision | Chosen | Alternative Considered | Why |
|----------|--------|----------------------|-----|
| App generation approach | Config-driven rendering | LLM generates raw code | Deterministic, secure, testable, fast to render, easy to edit post-generation |
| Primary LLM | Claude Sonnet 4.6 | GPT-4o, Gemini | Strong structured output via tool use, good instruction following, competitive pricing |
| Safety pre-check | Separate Haiku call | Single Sonnet call handles both | Cheaper, faster, decoupled; safety runs even if Sonnet is slow/down |
| Frontend framework | Angular | React, Vue | Existing project is Angular; reduces context switching |
| Backend framework | NestJS | Express, Fastify | Modular architecture, TypeScript-native, built-in DI and validation |
| Database | PostgreSQL + JSONB | MongoDB, DynamoDB | JSONB gives document flexibility within a relational model; strong ecosystem |
| Streaming | SSE | WebSocket | Simpler for one-way streaming (LLM → client); no bidirectional state needed |
| Component library | Custom Angular | Web Components, Stencil | Tighter integration with Angular host; faster POC development |

## Appendix B: Document Cross-References

| This Document Section | References |
|----------------------|------------|
| Section 4 (LLM Strategy) | PRS: Stages 1-5, Filter rules |
| Section 6.1 (Chat message flow) | PRS: Pipeline overview, Safety gate, Slot filling |
| Section 6.2 (App generation flow) | PRS: Prompt assembly, Generation dispatch |
| Section 7.1 (DB Schema) | Requirements: DB-001 through DB-006 |
| Section 10.3 (Component library) | Requirements: CUST-020 through CUST-032 |
| Section 12 (POC scope) | Requirements: All NFR- requirements (scoped for POC) |
