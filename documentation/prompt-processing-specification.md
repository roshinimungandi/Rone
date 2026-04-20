# Rone - Prompt Processing & App Generation Specification

## Technical Specification

**Project:** Rone
**Document Type:** System Processing Rules Specification (PRS)
**Version:** 1.0
**Date:** 2026-04-20
**Status:** Draft

---

## Why This Document Type

This document is a **Processing Rules Specification (PRS)** — a technical contract between the conversational AI layer and the app generation engine. It is not a requirements doc or a user guide. It defines:

- How raw user text is classified, validated, and rejected
- How validated text is transformed into a deterministic, machine-readable prompt object
- Which features are always generated (defaults) and which depend on user input (optional)
- The exact schema the generation engine consumes

A PRS is the correct format because the rules here are not narratives — they are conditional logic, enums, schemas, and pipelines that must be implemented precisely in code.

---

## Table of Contents

1. [Processing Pipeline Overview](#1-processing-pipeline-overview)
2. [Stage 1 — Input Classification](#2-stage-1--input-classification)
3. [Stage 2 — Safety & Compliance Gate](#3-stage-2--safety--compliance-gate)
4. [Stage 3 — Intent Extraction & Slot Filling](#4-stage-3--intent-extraction--slot-filling)
5. [Stage 4 — Prompt Assembly](#5-stage-4--prompt-assembly)
6. [Stage 5 — Generation Dispatch](#6-stage-5--generation-dispatch)
7. [App Generation Prompt Schema](#7-app-generation-prompt-schema)
8. [Default Features (Always Generated)](#8-default-features-always-generated)
9. [Optional Features (User-Driven)](#9-optional-features-user-driven)
10. [Blocked Requests — Rules & Responses](#10-blocked-requests--rules--responses)
11. [Prompt Mutation Rules (Post-Generation Edits)](#11-prompt-mutation-rules-post-generation-edits)
12. [Example: End-to-End Processing](#12-example-end-to-end-processing)

---

## 1. Processing Pipeline Overview

Every user message passes through five sequential stages. A message can be rejected at any stage. Only messages that survive all stages produce a mutation to the generation prompt.

```
┌─────────────────────────────────────────────────────────────┐
│                     USER TEXT INPUT                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
              ┌────────────────────────┐
              │  STAGE 1               │
              │  Input Classification  │──── Classify intent type
              └───────────┬────────────┘
                          │
                          v
              ┌────────────────────────┐
              │  STAGE 2               │
              │  Safety & Compliance   │──── Block / Allow / Flag
              │  Gate                  │
              └───────────┬────────────┘
                          │ (passed)
                          v
              ┌────────────────────────┐
              │  STAGE 3               │
              │  Intent Extraction &   │──── Extract structured
              │  Slot Filling          │     key-value pairs
              └───────────┬────────────┘
                          │
                          v
              ┌────────────────────────┐
              │  STAGE 4               │
              │  Prompt Assembly       │──── Merge into prompt
              │                        │     object
              └───────────┬────────────┘
                          │
                          v
              ┌────────────────────────┐
              │  STAGE 5               │
              │  Generation Dispatch   │──── Send to generation
              │                        │     engine
              └───────────┴────────────┘
                          │
                          v
              ┌────────────────────────┐
              │  GENERATED APP         │
              └────────────────────────┘
```

---

## 2. Stage 1 — Input Classification

The system classifies every user message into one of the following intent categories before further processing.

### 2.1 Intent Types

```typescript
enum UserIntentType {
  CUSTOMIZATION_THEME       = "customization.theme",
  CUSTOMIZATION_LAYOUT      = "customization.layout",
  CUSTOMIZATION_CARDS       = "customization.cards",
  CUSTOMIZATION_HEADER      = "customization.header",
  CUSTOMIZATION_TYPOGRAPHY  = "customization.typography",

  PERSONALIZATION_TOPICS    = "personalization.topics",
  PERSONALIZATION_CONTENT   = "personalization.content_types",
  PERSONALIZATION_MARKETS   = "personalization.markets",
  PERSONALIZATION_REFRESH   = "personalization.refresh",

  ACTION_CONFIRM_BUILD      = "action.confirm_build",
  ACTION_CANCEL             = "action.cancel",
  ACTION_RESET              = "action.reset",
  ACTION_EDIT_EXISTING      = "action.edit_existing",

  QUESTION_ABOUT_SYSTEM     = "question.system",
  QUESTION_ABOUT_OPTIONS    = "question.options",

  OUT_OF_SCOPE              = "out_of_scope",
  AMBIGUOUS                 = "ambiguous",
  BLOCKED                   = "blocked"
}
```

### 2.2 Classification Rules

| User says (example) | Classified as |
|---------------------|---------------|
| "Make it dark mode with blue accents" | `customization.theme` |
| "I want a magazine-style layout" | `customization.layout` |
| "Show articles as big cards with images" | `customization.cards` |
| "Put the header sticky at the top" | `customization.header` |
| "Use a modern sans-serif font" | `customization.typography` |
| "I want tech and science news" | `personalization.topics` |
| "Include videos and podcasts, no galleries" | `personalization.content_types` |
| "Track AAPL, MSFT, and EUR/USD" | `personalization.markets` |
| "Update every 15 minutes" | `personalization.refresh` |
| "Yes, build it" | `action.confirm_build` |
| "Never mind, cancel" | `action.cancel` |
| "Start over" | `action.reset` |
| "Change my existing app's colors" | `action.edit_existing` |
| "What layouts are available?" | `question.options` |
| "Can you make me a shopping website?" | `out_of_scope` |
| "dark maybe" | `ambiguous` |

### 2.3 Multi-Intent Messages

A single message may contain multiple intents:

> "I want dark mode, tech news, and a grid layout with 3 columns"

This produces three classified intents:
- `customization.theme` → dark mode
- `personalization.topics` → tech
- `customization.layout` → grid, 3 columns

The system must split multi-intent messages and process each intent through stages 2-4 independently.

---

## 3. Stage 2 — Safety & Compliance Gate

Every classified intent passes through a set of rule-based filters. Each filter returns one of three statuses:

```typescript
enum GateResult {
  ALLOW   = "allow",    // Proceed to Stage 3
  BLOCK   = "block",    // Reject with explanation, do not process
  FLAG    = "flag"      // Allow but log for human review
}
```

### 3.1 Filter Chain

Filters execute in order. The first `BLOCK` stops processing for that intent.

```
Filter 1: ContentSafetyFilter
Filter 2: LegalComplianceFilter
Filter 3: BrandIntegrityFilter
Filter 4: ScopeBoundaryFilter
Filter 5: ReasonablenessFilter
```

### 3.2 Filter 1 — ContentSafetyFilter

**Purpose:** Block harmful, explicit, or abusive content.

```yaml
rules:
  - id: CSF-001
    name: explicit_sexual_content
    trigger: Message requests sexual, nude, or suggestive imagery, themes, or layouts
    result: BLOCK
    response: >
      I can't include that type of content. All Rone apps follow Reuters content
      standards. I can help you choose from our available themes and imagery.

  - id: CSF-002
    name: hate_speech_discrimination
    trigger: Message contains or requests hateful, discriminatory, or derogatory content
    result: BLOCK
    response: >
      That doesn't align with Reuters values. Let me suggest alternative
      themes or topics that might interest you.

  - id: CSF-003
    name: violence_graphic
    trigger: Message requests graphic violence or gore as theme or content focus
    result: BLOCK
    response: >
      I can't apply that type of theme. I can help you create a professional
      news app with a different visual approach.

  - id: CSF-004
    name: illegal_activity
    trigger: Message promotes or requests content about illegal activities
    result: BLOCK
    response: >
      That request can't be fulfilled. Let me help you explore
      our available content categories.

  - id: CSF-005
    name: pii_third_party
    trigger: Message contains personal data of identifiable third parties
    result: BLOCK
    response: >
      I can't include personal information about others. Let me help
      you personalize your app in other ways.

  - id: CSF-006
    name: self_harm
    trigger: Message references self-harm or suicide as content preference
    result: BLOCK
    response: >
      I'm not able to configure content around that topic. If you or
      someone you know needs help, please contact a crisis helpline.
      Let me help you pick topics for your news app.
```

### 3.3 Filter 2 — LegalComplianceFilter

**Purpose:** Enforce Reuters licensing, IP, and legal obligations.

```yaml
rules:
  - id: LCF-001
    name: remove_reuters_branding
    trigger: User asks to remove, hide, or minimize Reuters logo/branding/attribution
    result: BLOCK
    response: >
      Reuters branding must remain visible on all generated apps.
      I can help you customize the header style and positioning instead.

  - id: LCF-002
    name: third_party_branding
    trigger: User asks to add logos, brands, or trademarks of other companies
    result: BLOCK
    response: >
      Third-party branding can't be added to Rone apps. I can help you
      create a custom title and color scheme for a unique identity.

  - id: LCF-003
    name: external_content_sources
    trigger: User asks to pull content from non-Reuters APIs, RSS feeds, or websites
    result: BLOCK
    response: >
      Rone apps exclusively use Reuters content. Our library covers a wide
      range of topics — let me help you explore them.

  - id: LCF-004
    name: copyright_violation
    trigger: User requests reproduction of specific copyrighted works or texts
    result: BLOCK
    response: >
      I can't reproduce copyrighted material. All content in your app
      will come directly from Reuters' licensed library.

  - id: LCF-005
    name: scraping_embedding
    trigger: User asks to scrape, iframe, or embed external web pages
    result: BLOCK
    response: >
      Embedding external sites isn't supported for security and licensing
      reasons. I can help you configure Reuters content instead.
```

### 3.4 Filter 3 — BrandIntegrityFilter

**Purpose:** Ensure the generated app is recognizable as a Reuters product.

```yaml
rules:
  - id: BIF-001
    name: competitor_mimicry
    trigger: >
      User requests a color scheme, layout, or style that closely replicates
      a known competitor (Bloomberg: #FF6600 terminal green; CNN: red banner;
      BBC: white/burgundy; Fox: blue/red/white flag style)
    result: FLAG
    response: >
      That styling is similar to another news brand. Would you like me
      to suggest a unique look that's distinctly yours?

  - id: BIF-002
    name: obscure_reuters_identity
    trigger: >
      User requests a layout or design where Reuters identity would not
      be apparent (e.g., full-bleed background replacing header, logo at 0 opacity)
    result: BLOCK
    response: >
      The design must keep Reuters identity clearly visible. I can offer
      minimal header styles that are clean but still branded.

  - id: BIF-003
    name: misleading_presentation
    trigger: >
      User asks for satire framing, parody layout, "fake news" style,
      or any format that could undermine editorial credibility
    result: BLOCK
    response: >
      Reuters is committed to trustworthy journalism. Your app will
      present content clearly and accurately. I can help you find
      a distinctive but professional visual style.

  - id: BIF-004
    name: offensive_app_title
    trigger: User provides an app title containing profanity, slurs, or offensive language
    result: BLOCK
    response: >
      That title can't be used. Try a different name for your news app —
      something personal or descriptive works great.
```

### 3.5 Filter 4 — ScopeBoundaryFilter

**Purpose:** Keep the generated output within the boundaries of a news app.

```yaml
rules:
  - id: SBF-001
    name: non_news_functionality
    trigger: >
      User requests features outside a news app scope: e-commerce, payment,
      social media, games, quizzes, dating, file sharing, messaging
    result: BLOCK
    response: >
      Rone is focused on delivering a personalized news experience. Those
      features aren't available, but I can help you optimize your content
      and layout.

  - id: SBF-002
    name: user_generated_content
    trigger: User asks for comment sections, forums, user profiles, or upload features
    result: BLOCK
    response: >
      User-generated content features aren't part of Rone. Your app
      is a curated Reuters news experience. Let me help you shape it.

  - id: SBF-003
    name: code_injection
    trigger: >
      User attempts to supply raw HTML, CSS, JavaScript, SQL, or any code
      to be injected into the generated app
    result: BLOCK
    response: >
      Custom code can't be added directly. I can achieve most visual
      and layout goals using our customization options — tell me
      what you're trying to accomplish.

  - id: SBF-004
    name: external_widgets
    trigger: User asks for third-party widgets, trackers, analytics, or ad networks
    result: BLOCK
    response: >
      External widgets can't be embedded. Your Rone app includes
      built-in Reuters content widgets. Let me show you what's available.

  - id: SBF-005
    name: arbitrary_web_app
    trigger: >
      User asks to build something that is not a news app at all
      (portfolio site, blog, landing page, dashboard unrelated to news)
    result: BLOCK
    response: >
      Rone builds personalized Reuters news apps. I can't create other
      types of websites, but I can make your news experience unique.
      What topics interest you?
```

### 3.6 Filter 5 — ReasonablenessFilter

**Purpose:** Warn about technically valid but suboptimal choices.

```yaml
rules:
  - id: RF-001
    name: poor_accessibility
    trigger: >
      Chosen color combination produces a WCAG contrast ratio below 4.5:1
      for normal text or below 3:1 for large text
    result: FLAG
    response: >
      That color combination may be hard to read for some users.
      I can suggest a similar palette with better contrast.
      Would you like to see alternatives?

  - id: RF-002
    name: excessive_density
    trigger: User enables all content types AND requests 4-column grid AND high refresh rate
    result: FLAG
    response: >
      Loading everything at once may slow your app down. Would you
      like to prioritize the most important sections and lazy-load the rest?

  - id: RF-003
    name: empty_configuration
    trigger: User disables all content types or all topics
    result: FLAG
    response: >
      Your app won't have any content to display with those settings.
      Would you like to keep at least one content type or topic?

  - id: RF-004
    name: conflicting_preferences
    trigger: User provides contradictory instructions (e.g., "dark theme with white background")
    result: FLAG
    response: >
      Those preferences seem to conflict. When you say dark theme,
      would you like the background to be dark as well, or did you
      have something specific in mind?
```

---

## 4. Stage 3 — Intent Extraction & Slot Filling

After a message passes the safety gate, the system extracts structured key-value pairs and maps them to the prompt schema slots.

### 4.1 Slot Definitions

Each slot has a key, type, allowed values, and a default. Slots are filled incrementally across multiple messages.

```typescript
interface SlotDefinition {
  key: string;
  type: "enum" | "enum[]" | "string" | "number" | "boolean" | "object" | "object[]";
  allowedValues?: string[] | number[];
  default: any;
  required: boolean;
  source: "user" | "system";  // "user" = filled by conversation, "system" = always injected
}
```

### 4.2 Customization Slots

```typescript
const CUSTOMIZATION_SLOTS: SlotDefinition[] = [
  {
    key: "theme.mode",
    type: "enum",
    allowedValues: ["light", "dark", "auto"],
    default: "light",
    required: false,
    source: "user"
  },
  {
    key: "theme.colors.primary",
    type: "string",           // hex color: #RRGGBB
    default: "#FF8000",       // Reuters orange
    required: false,
    source: "user"
  },
  {
    key: "theme.colors.secondary",
    type: "string",
    default: "#1A1A2E",
    required: false,
    source: "user"
  },
  {
    key: "theme.colors.accent",
    type: "string",
    default: "#E94560",
    required: false,
    source: "user"
  },
  {
    key: "theme.colors.background",
    type: "string",
    default: "#FFFFFF",       // overridden to #121212 if mode=dark
    required: false,
    source: "user"
  },
  {
    key: "theme.colors.text",
    type: "string",
    default: "#1A1A1A",       // overridden to #E0E0E0 if mode=dark
    required: false,
    source: "user"
  },
  {
    key: "theme.typography.fontFamily",
    type: "enum",
    allowedValues: ["serif", "sans-serif", "modern", "classic", "monospace"],
    default: "sans-serif",
    required: false,
    source: "user"
  },
  {
    key: "layout.style",
    type: "enum",
    allowedValues: ["grid", "list", "magazine", "newspaper", "single-column"],
    default: "magazine",
    required: false,
    source: "user"
  },
  {
    key: "layout.columns",
    type: "number",
    allowedValues: [1, 2, 3, 4],
    default: 3,
    required: false,
    source: "user"
  },
  {
    key: "layout.navigation",
    type: "enum",
    allowedValues: ["top", "sidebar", "bottom-tabs"],
    default: "top",
    required: false,
    source: "user"
  },
  {
    key: "layout.header.style",
    type: "enum",
    allowedValues: ["sticky", "collapsible", "minimal"],
    default: "sticky",
    required: false,
    source: "user"
  },
  {
    key: "layout.header.appTitle",
    type: "string",
    default: null,            // null = show "Reuters" only
    required: false,
    source: "user"
  },
  {
    key: "cards.article",
    type: "enum",
    allowedValues: [
      "headline-only",
      "thumbnail-headline",
      "full-card",
      "featured-hero"
    ],
    default: "thumbnail-headline",
    required: false,
    source: "user"
  },
  {
    key: "cards.gallery",
    type: "enum",
    allowedValues: [
      "carousel",
      "grid-thumbnails",
      "featured-image",
      "filmstrip"
    ],
    default: "carousel",
    required: false,
    source: "user"
  },
  {
    key: "cards.video",
    type: "enum",
    allowedValues: [
      "inline-player",
      "thumbnail-play",
      "list-view",
      "cinematic"
    ],
    default: "thumbnail-play",
    required: false,
    source: "user"
  },
  {
    key: "cards.podcast",
    type: "enum",
    allowedValues: [
      "player-card",
      "episode-list",
      "compact",
      "waveform"
    ],
    default: "player-card",
    required: false,
    source: "user"
  },
  {
    key: "cards.markets",
    type: "enum",
    allowedValues: [
      "ticker-strip",
      "table",
      "chart-cards",
      "sparkline-list"
    ],
    default: "ticker-strip",
    required: false,
    source: "user"
  }
];
```

### 4.3 Personalization Slots

```typescript
const PERSONALIZATION_SLOTS: SlotDefinition[] = [
  {
    key: "topics",
    type: "object[]",
    // Each topic: { name: string, priority: number, subtopics?: string[], excluded: boolean }
    default: [
      { name: "World", priority: 1, subtopics: [], excluded: false },
      { name: "Business", priority: 2, subtopics: [], excluded: false },
      { name: "Technology", priority: 3, subtopics: [], excluded: false }
    ],
    required: false,
    source: "user"
  },
  {
    key: "contentTypes.articles",
    type: "object",
    // { enabled: boolean, weight: number (0-1), preferences: {} }
    default: { enabled: true, weight: 0.4, preferences: {} },
    required: false,
    source: "user"
  },
  {
    key: "contentTypes.galleries",
    type: "object",
    default: { enabled: true, weight: 0.15, preferences: {} },
    required: false,
    source: "user"
  },
  {
    key: "contentTypes.videos",
    type: "object",
    default: { enabled: true, weight: 0.2, preferences: {} },
    required: false,
    source: "user"
  },
  {
    key: "contentTypes.podcasts",
    type: "object",
    default: { enabled: true, weight: 0.1, preferences: {} },
    required: false,
    source: "user"
  },
  {
    key: "contentTypes.markets",
    type: "object",
    default: { enabled: true, weight: 0.15, preferences: {} },
    required: false,
    source: "user"
  },
  {
    key: "markets.watchlist",
    type: "string[]",
    default: [".DJI", ".SPX", ".IXIC", "EUR=", "GBP=", "JPY="],
    required: false,
    source: "user"
  },
  {
    key: "markets.displayFormat",
    type: "enum",
    allowedValues: ["quotes", "charts", "table", "mixed"],
    default: "quotes",
    required: false,
    source: "user"
  },
  {
    key: "refreshIntervalSeconds",
    type: "number",
    allowedValues: [60, 300, 900, 1800, 3600],
    default: 900,
    required: false,
    source: "user"
  },
  {
    key: "sectionOrder",
    type: "string[]",
    // ordered list of section keys the user wants top-to-bottom
    default: ["markets", "articles", "videos", "galleries", "podcasts"],
    required: false,
    source: "user"
  }
];
```

### 4.4 Extraction Examples

| User says | Extracted slots |
|-----------|----------------|
| "Dark mode please" | `theme.mode = "dark"` |
| "I like navy blue and gold" | `theme.colors.primary = "#000080"`, `theme.colors.accent = "#FFD700"` |
| "Magazine layout, 2 columns" | `layout.style = "magazine"`, `layout.columns = 2` |
| "Only articles and markets, no video" | `contentTypes.articles.enabled = true`, `contentTypes.markets.enabled = true`, `contentTypes.videos.enabled = false`, `contentTypes.galleries.enabled = false`, `contentTypes.podcasts.enabled = false` |
| "Track Tesla, Apple, and gold" | `markets.watchlist = ["TSLA", "AAPL", "XAU"]` |
| "Put markets at the top, then videos, then articles" | `sectionOrder = ["markets", "videos", "articles"]` |
| "Call it Sarah's Morning Brief" | `layout.header.appTitle = "Sarah's Morning Brief"` |

### 4.5 Slot Filling Rules

```
RULE 1: Later values overwrite earlier values for the same slot.
RULE 2: Partial updates merge — "add podcasts" does not reset articles.
RULE 3: Ambiguous color names map to the nearest safe hex value using a lookup table.
RULE 4: Unrecognized topic names trigger a clarification question — never guess.
RULE 5: If user says "default" for any slot, reset it to the schema default.
RULE 6: Slots the user never mentions retain their default values.
```

---

## 5. Stage 4 — Prompt Assembly

Once all user intents are extracted and slots are filled, the system assembles the complete generation prompt object.

### 5.1 Assembly Process

```
1. Start with DEFAULT_PROMPT_TEMPLATE (Section 7)
2. Inject SYSTEM-OWNED features (Section 8) — these cannot be overridden
3. Overlay user-filled slots from conversation onto OPTIONAL features (Section 9)
4. Apply DERIVED values (e.g., dark mode forces background/text color swap)
5. Run final validation pass (schema check, contrast check, completeness check)
6. Produce final GenerationPrompt object
```

### 5.2 Derived Value Rules

```typescript
const DERIVED_RULES = [
  {
    condition: "theme.mode === 'dark' AND theme.colors.background === DEFAULT",
    action: "theme.colors.background = '#121212'"
  },
  {
    condition: "theme.mode === 'dark' AND theme.colors.text === DEFAULT",
    action: "theme.colors.text = '#E0E0E0'"
  },
  {
    condition: "theme.mode === 'auto'",
    action: "generate both light and dark variants, use prefers-color-scheme"
  },
  {
    condition: "layout.style === 'single-column'",
    action: "layout.columns = 1 (force override)"
  },
  {
    condition: "layout.style === 'newspaper'",
    action: "layout.columns = max(layout.columns, 2)"
  },
  {
    condition: "contentTypes.markets.enabled === false",
    action: "remove 'markets' from sectionOrder"
  },
  {
    condition: "sectionOrder contains type where contentTypes[type].enabled === false",
    action: "remove disabled types from sectionOrder"
  }
];
```

---

## 6. Stage 5 — Generation Dispatch

### 6.1 Pre-Dispatch Checklist

Before sending the prompt to the generation engine, the system runs this checklist:

```typescript
interface PreDispatchCheck {
  systemFeaturesPresent: boolean;     // All default features injected
  atLeastOneContentType: boolean;     // At least one content type enabled
  atLeastOneTopic: boolean;           // At least one topic selected
  contrastRatiosPassing: boolean;     // All color pairs meet WCAG AA
  appTitleClean: boolean;             // Title passed safety filter (or is null)
  sectionOrderValid: boolean;         // Only enabled types in order
  userConfirmed: boolean;             // User explicitly confirmed build
}
```

All checks must be `true` before dispatching. If any fail, the assistant asks the user to resolve the issue.

### 6.2 Dispatch Payload

The generation engine receives:

```typescript
interface GenerationDispatch {
  promptVersion: string;              // Schema version, e.g. "1.0.0"
  userId: string;
  subscriptionTier: string;
  prompt: GenerationPrompt;           // Full assembled prompt (Section 7)
  conversationId: string;             // For audit trail
  timestamp: string;                  // ISO 8601
}
```

---

## 7. App Generation Prompt Schema

This is the complete JSON schema the generation engine consumes. It is the single source of truth for what the generated app must contain.

```typescript
interface GenerationPrompt {
  version: "1.0.0";

  // ═══════════════════════════════════════════════
  // SYSTEM-OWNED — always injected, never user-modified
  // ═══════════════════════════════════════════════
  system: {
    branding: {
      reutersLogo: true;                     // always true
      logoPosition: "header-left";           // fixed
      copyrightNotice: true;                 // always true
      termsOfUseLink: true;                  // always true
      poweredByRone: true;                   // "Built with Rone" footer badge
    };
    features: {
      accountButton: {
        enabled: true;                       // always true
        position: "header-right";            // fixed
        showBadge: true;                     // notification badge for subscription status
        actions: [
          "view_profile",
          "subscription_status",
          "manage_app",
          "sign_out"
        ];
      };
      aiAssistant: {
        enabled: true;                       // always true
        position: "bottom-right";            // floating action button
        icon: "chat-bubble";
        capabilities: [
          "modify_customization",
          "modify_personalization",
          "rebuild_app",
          "continue_existing"
        ];
      };
      responsiveShell: {
        enabled: true;                       // always true
        breakpoints: {
          mobile: 0,
          tablet: 768,
          desktop: 1024,
          wide: 1440
        };
      };
      errorBoundary: {
        enabled: true;                       // always true
        fallbackMessage: "Content temporarily unavailable. Please refresh.";
      };
      contentAttribution: {
        enabled: true;                       // always true, every piece of content shows source
        format: "Reuters / {author}";
      };
      analytics: {
        enabled: true;                       // internal Reuters analytics only
        provider: "reuters-internal";
      };
      accessibilityFeatures: {
        enabled: true;
        skipToContent: true;
        ariaLabels: true;
        keyboardNavigation: true;
        screenReaderOptimized: true;
      };
    };
    metadata: {
      generatedAt: string;                   // ISO 8601
      generatorVersion: string;
      promptSchemaVersion: "1.0.0";
    };
  };

  // ═══════════════════════════════════════════════
  // USER-DRIVEN — filled from conversation or defaults
  // ═══════════════════════════════════════════════
  customization: {
    theme: {
      mode: "light" | "dark" | "auto";
      colors: {
        primary: string;                     // hex
        secondary: string;
        accent: string;
        background: string;
        text: string;
        cardBackground: string;
        border: string;
      };
      typography: {
        fontFamily: "serif" | "sans-serif" | "modern" | "classic" | "monospace";
        headingScale: number;                // default 1.25
        bodySize: number;                    // default 16 (px)
      };
    };
    layout: {
      style: "grid" | "list" | "magazine" | "newspaper" | "single-column";
      columns: 1 | 2 | 3 | 4;
      navigation: "top" | "sidebar" | "bottom-tabs";
      header: {
        style: "sticky" | "collapsible" | "minimal";
        appTitle: string | null;
      };
    };
    cards: {
      article: "headline-only" | "thumbnail-headline" | "full-card" | "featured-hero";
      gallery: "carousel" | "grid-thumbnails" | "featured-image" | "filmstrip";
      video: "inline-player" | "thumbnail-play" | "list-view" | "cinematic";
      podcast: "player-card" | "episode-list" | "compact" | "waveform";
      markets: "ticker-strip" | "table" | "chart-cards" | "sparkline-list";
    };
  };

  personalization: {
    topics: Array<{
      name: string;
      priority: number;
      subtopics: string[];
      excluded: boolean;
    }>;
    contentTypes: {
      articles: { enabled: boolean; weight: number; preferences: object };
      galleries: { enabled: boolean; weight: number; preferences: object };
      videos:    { enabled: boolean; weight: number; preferences: object };
      podcasts:  { enabled: boolean; weight: number; preferences: object };
      markets:   { enabled: boolean; weight: number; preferences: object };
    };
    markets: {
      watchlist: string[];
      displayFormat: "quotes" | "charts" | "table" | "mixed";
      instruments: ("stocks" | "indices" | "currencies" | "commodities")[];
    };
    sectionOrder: string[];
    refreshIntervalSeconds: number;
  };
}
```

---

## 8. Default Features (Always Generated)

These features are **system-owned**. They are injected into every generated app regardless of user input. The user cannot disable, remove, or override them.

### 8.1 Feature: Reuters Branding

| Property | Value | Rationale |
|----------|-------|-----------|
| Reuters logo | Always visible in header-left | Legal/brand requirement |
| Copyright notice | Always in footer | Legal requirement |
| Terms of Use link | Always in footer | Legal requirement |
| "Built with Rone" badge | Always in footer | Product attribution |
| Content attribution | Every content card shows "Reuters / {author}" | Editorial integrity |

### 8.2 Feature: Account Button & Badge

| Property | Value | Rationale |
|----------|-------|-----------|
| Position | Header, right side | Consistent UX pattern |
| Badge indicator | Shows subscription status, notifications | User must know subscription state |
| Dropdown actions | View Profile, Subscription Status, Manage App, Sign Out | Core account management |
| Authentication check | Verifies active session on every page load | Security requirement |

### 8.3 Feature: AI Assistant (Floating Chat)

| Property | Value | Rationale |
|----------|-------|-----------|
| Position | Bottom-right floating button | Accessible without disrupting content |
| Icon | Chat bubble with Rone branding | Discoverable |
| Capabilities | Modify theme, modify content, rebuild app, continue existing | Post-generation editing |
| Subject to guardrails | Yes, all Stage 2 filters apply | Consistent safety |
| Available actions per subscription | Edit existing (always), Rebuild (if new period) | Business rule enforcement |

### 8.4 Feature: Responsive Shell

| Property | Value | Rationale |
|----------|-------|-----------|
| Mobile breakpoint | 0 - 767px | Single column, stacked layout |
| Tablet breakpoint | 768 - 1023px | Reduced columns |
| Desktop breakpoint | 1024 - 1439px | Full layout |
| Wide breakpoint | 1440px+ | Max-width container |
| All apps must render correctly at all breakpoints | Required | Core UX standard |

### 8.5 Feature: Error Boundary

| Property | Value | Rationale |
|----------|-------|-----------|
| Content API failure | Show fallback message per section | Graceful degradation |
| Full page error | Show branded error page with retry | Never show blank/broken page |
| Stale content | Show cached version with "Last updated" label | UX continuity |

### 8.6 Feature: Accessibility

| Property | Value | Rationale |
|----------|-------|-----------|
| Skip to content link | Always present | WCAG requirement |
| ARIA labels | All interactive elements | Screen reader support |
| Keyboard navigation | Full tab/enter/escape support | Accessibility standard |
| Focus indicators | Visible on all interactive elements | WCAG requirement |
| Color contrast | Enforced minimum WCAG AA (4.5:1) | Accessibility standard |


## 9. Optional Features (User-Driven)

These features are filled by user conversation input. If the user does not specify a preference, the system uses the default value. The user can modify any of these.

### 9.1 Theme & Colors

| Slot | Default | User can change to |
|------|---------|--------------------|
| Mode | `light` | `dark`, `auto` |
| Primary color | `#FF8000` (Reuters orange) | Any hex passing brand filter |
| Secondary color | `#1A1A2E` | Any hex |
| Accent color | `#E94560` | Any hex |
| Background | `#FFFFFF` (light) / `#121212` (dark) | Any hex passing contrast check |
| Text color | `#1A1A1A` (light) / `#E0E0E0` (dark) | Any hex passing contrast check |
| Card background | derived from background | Any hex |
| Border color | derived from secondary | Any hex |

### 9.2 Typography

| Slot | Default | User can change to |
|------|---------|--------------------|
| Font family | `sans-serif` | `serif`, `modern`, `classic`, `monospace` |
| Heading scale | `1.25` | `1.0` - `1.5` |
| Body font size | `16px` | `14px` - `20px` |

### 9.3 Layout

| Slot | Default | User can change to |
|------|---------|--------------------|
| Style | `magazine` | `grid`, `list`, `newspaper`, `single-column` |
| Columns | `3` | `1`, `2`, `4` |
| Navigation | `top` | `sidebar`, `bottom-tabs` |
| Header style | `sticky` | `collapsible`, `minimal` |
| App title | `null` (Reuters only) | Any safe string |

### 9.4 Card Display Styles

| Content Type | Default | Options |
|--------------|---------|---------|
| Article | `thumbnail-headline` | `headline-only`, `full-card`, `featured-hero` |
| Gallery | `carousel` | `grid-thumbnails`, `featured-image`, `filmstrip` |
| Video | `thumbnail-play` | `inline-player`, `list-view`, `cinematic` |
| Podcast | `player-card` | `episode-list`, `compact`, `waveform` |
| Markets | `ticker-strip` | `table`, `chart-cards`, `sparkline-list` |

### 9.5 Content Types (Enable/Disable & Weight)

| Content Type | Default Enabled | Default Weight | User can |
|--------------|----------------|----------------|----------|
| Articles | `true` | `0.40` | Disable, change weight |
| Galleries | `true` | `0.15` | Disable, change weight |
| Videos | `true` | `0.20` | Disable, change weight |
| Podcasts | `true` | `0.10` | Disable, change weight |
| Markets | `true` | `0.15` | Disable, change weight |

Weights must sum to `1.0`. When a user disables a type, remaining weights are proportionally redistributed.

### 9.6 Topics

| Slot | Default | User can |
|------|---------|----------|
| Selected topics | World, Business, Technology | Add/remove from full Reuters topic list |
| Topic priority | World=1, Business=2, Technology=3 | Reorder |
| Subtopics | none | Add specific sub-topics per topic |
| Excluded topics | none | Exclude any topic |

### 9.7 Markets

| Slot | Default | User can |
|------|---------|----------|
| Watchlist | .DJI, .SPX, .IXIC, EUR=, GBP=, JPY= | Add/remove symbols |
| Display format | `quotes` | `charts`, `table`, `mixed` |
| Instruments | stocks, indices, currencies | Add/remove: commodities, bonds, crypto |

### 9.8 Section Order

| Default Order | User can |
|---------------|----------|
| 1. Markets | Reorder any sections |
| 2. Articles | |
| 3. Videos | |
| 4. Galleries | |
| 5. Podcasts | |

### 9.9 Refresh Interval

| Default | Options |
|---------|---------|
| `900` (15 min) | `60` (1 min), `300` (5 min), `1800` (30 min), `3600` (1 hr) |

---

## 10. Blocked Requests — Rules & Responses

Consolidated decision matrix for the assistant to use at runtime.

### 10.1 Decision Matrix

```
 USER REQUEST                          │ DECISION │ FILTER    │ ACTION
────────────────────────────────────────┼──────────┼───────────┼─────────────────────────
 "Make it look like Bloomberg terminal" │ FLAG     │ BIF-001   │ Suggest alternative
 "Remove the Reuters logo"             │ BLOCK    │ LCF-001   │ Explain brand rule
 "Add my company logo"                 │ BLOCK    │ LCF-002   │ Suggest custom title
 "Pull news from BBC RSS"              │ BLOCK    │ LCF-003   │ Offer Reuters topics
 "Add a comments section"              │ BLOCK    │ SBF-002   │ Explain scope
 "Inject this CSS: body{display:none}" │ BLOCK    │ SBF-003   │ Offer customization
 "Include adult content topics"        │ BLOCK    │ CSF-001   │ Redirect to topics
 "White text on white background"      │ FLAG     │ RF-001    │ Suggest contrast fix
 "Build me a portfolio site"           │ BLOCK    │ SBF-005   │ Redirect to news app
 "Add Google Analytics"                │ BLOCK    │ SBF-004   │ Explain analytics policy
 "Dark mode with red accents"          │ ALLOW    │ —         │ Fill slots
 "Only tech and science articles"      │ ALLOW    │ —         │ Fill slots
 "Grid layout, 3 columns"             │ ALLOW    │ —         │ Fill slots
 "Track AAPL and TSLA"                │ ALLOW    │ —         │ Fill slots
 "Name it My Morning Brief"           │ ALLOW    │ —         │ Fill slots
 "Disable podcasts"                    │ ALLOW    │ —         │ Fill slots
 "Make the font bigger"               │ ALLOW    │ —         │ Fill slots
 "Videos should auto-play"            │ FLAG     │ RF-002    │ Discuss UX impact
```

### 10.2 Escalation Rules

```
IF    a request triggers FLAG and the user insists after alternative is offered
THEN  allow if technically safe, log for review

IF    a request triggers BLOCK and the user insists
THEN  repeat the block reason, offer nearest alternative, never override

IF    a request cannot be classified by any filter
THEN  escalate to review queue, respond: "Let me check on that — I'll get back to you shortly."
```

---

## 11. Prompt Mutation Rules (Post-Generation Edits)

When the user edits their app via the floating AI assistant, the same pipeline runs but with mutation semantics instead of creation semantics.

### 11.1 Mutation Types

```typescript
enum MutationType {
  UPDATE_SLOT     = "update_slot",      // Change a single slot value
  ENABLE_FEATURE  = "enable_feature",   // Turn on a content type or section
  DISABLE_FEATURE = "disable_feature",  // Turn off a content type or section
  REORDER         = "reorder",          // Change section order
  FULL_REBUILD    = "full_rebuild"      // Discard and rebuild (counts as new build)
}
```

### 11.2 Mutation Rules

```
RULE 1: UPDATE_SLOT, ENABLE_FEATURE, DISABLE_FEATURE, REORDER are free and unlimited.
RULE 2: FULL_REBUILD consumes the subscription build allowance.
RULE 3: System-owned features (Section 8) cannot be mutated.
RULE 4: Each mutation runs through the full Stage 2 safety gate.
RULE 5: Mutations apply immediately — no confirmation required for single-slot changes.
RULE 6: If a mutation changes 3+ slots simultaneously, the assistant asks for confirmation.
RULE 7: Mutation history is stored for audit and rollback purposes.
```

### 11.3 Rollback

```typescript
interface MutationRecord {
  mutationId: string;
  timestamp: string;
  type: MutationType;
  previousValue: any;
  newValue: any;
  slotsAffected: string[];
  userId: string;
  conversationId: string;
}
```

The system retains the last 50 mutations per app. The user can request "undo last change" via the assistant, which reverts the most recent mutation.

---

## 12. Example: End-to-End Processing

### User Conversation

```
USER: Hi! I want a dark news app focused on tech and finance.
      Show me articles as big cards and markets as charts.
      Put markets at the top. No podcasts or galleries.
      Call it "Dev & Markets Daily". Use green accents.
```

### Stage 1 — Classification

```json
[
  { "intent": "customization.theme",    "text": "dark news app" },
  { "intent": "customization.theme",    "text": "green accents" },
  { "intent": "personalization.topics", "text": "tech and finance" },
  { "intent": "customization.cards",    "text": "articles as big cards" },
  { "intent": "customization.cards",    "text": "markets as charts" },
  { "intent": "personalization.content","text": "no podcasts or galleries" },
  { "intent": "customization.header",   "text": "Dev & Markets Daily" },
  { "intent": "personalization.content","text": "put markets at the top" }
]
```

### Stage 2 — Safety Gate

All intents pass. "Dev & Markets Daily" passes app title safety check. Green accents do not trigger competitor brand filter. No blocked content detected.

### Stage 3 — Slot Filling

```json
{
  "theme.mode": "dark",
  "theme.colors.accent": "#00C853",
  "theme.colors.background": "#121212",
  "theme.colors.text": "#E0E0E0",
  "layout.header.appTitle": "Dev & Markets Daily",
  "cards.article": "featured-hero",
  "cards.markets": "chart-cards",
  "contentTypes.articles": { "enabled": true, "weight": 0.50 },
  "contentTypes.galleries": { "enabled": false, "weight": 0 },
  "contentTypes.videos": { "enabled": true, "weight": 0.15 },
  "contentTypes.podcasts": { "enabled": false, "weight": 0 },
  "contentTypes.markets": { "enabled": true, "weight": 0.35 },
  "topics": [
    { "name": "Technology", "priority": 1, "subtopics": [], "excluded": false },
    { "name": "Business", "priority": 2, "subtopics": ["Finance"], "excluded": false }
  ],
  "sectionOrder": ["markets", "articles", "videos"]
}
```

### Stage 4 — Prompt Assembly

System-owned features (Section 8) are injected. User slots are overlaid. Derived rules fire:
- `dark` mode forces `background = #121212`, `text = #E0E0E0`
- Disabled types removed from `sectionOrder`
- Weights redistributed to sum to 1.0

### Stage 5 — Dispatch

Pre-dispatch checks pass. Prompt sent to generation engine.

### Assembled Prompt (abbreviated)

```json
{
  "version": "1.0.0",
  "system": {
    "branding": { "reutersLogo": true, "copyrightNotice": true, "termsOfUseLink": true, "poweredByRone": true },
    "features": {
      "accountButton": { "enabled": true, "position": "header-right", "showBadge": true },
      "aiAssistant": { "enabled": true, "position": "bottom-right" },
      "responsiveShell": { "enabled": true },
      "errorBoundary": { "enabled": true },
      "contentAttribution": { "enabled": true },
      "analytics": { "enabled": true, "provider": "reuters-internal" },
      "accessibilityFeatures": { "enabled": true }
    }
  },
  "customization": {
    "theme": {
      "mode": "dark",
      "colors": { "primary": "#FF8000", "secondary": "#1A1A2E", "accent": "#00C853", "background": "#121212", "text": "#E0E0E0" },
      "typography": { "fontFamily": "sans-serif" }
    },
    "layout": {
      "style": "magazine",
      "columns": 3,
      "navigation": "top",
      "header": { "style": "sticky", "appTitle": "Dev & Markets Daily" }
    },
    "cards": {
      "article": "featured-hero",
      "gallery": "carousel",
      "video": "thumbnail-play",
      "podcast": "player-card",
      "markets": "chart-cards"
    }
  },
  "personalization": {
    "topics": [
      { "name": "Technology", "priority": 1 },
      { "name": "Business", "priority": 2, "subtopics": ["Finance"] }
    ],
    "contentTypes": {
      "articles": { "enabled": true, "weight": 0.50 },
      "galleries": { "enabled": false },
      "videos": { "enabled": true, "weight": 0.15 },
      "podcasts": { "enabled": false },
      "markets": { "enabled": true, "weight": 0.35 }
    },
    "markets": {
      "watchlist": [".DJI", ".SPX", ".IXIC", "EUR=", "GBP=", "JPY="],
      "displayFormat": "charts"
    },
    "sectionOrder": ["markets", "articles", "videos"],
    "refreshIntervalSeconds": 900
  }
}
```

### Generated App

The generation engine produces a web app at `rone.reuters.com/app/u-28a4f1` that renders:

1. **Header (sticky):** Reuters logo (left), "Dev & Markets Daily" title, Account button with badge (right)
2. **Markets section:** Chart cards for default watchlist instruments, dark background with green accent charts
3. **Articles section:** Featured-hero cards for Technology and Business/Finance articles
4. **Videos section:** Thumbnail-play cards for tech and business videos
5. **Footer:** Copyright notice, Terms of Use link, "Built with Rone" badge
6. **Floating button (bottom-right):** AI assistant for future edits
