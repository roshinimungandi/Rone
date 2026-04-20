# Rone - Build Your Own Reuters News App

## Requirements Document

**Project:** Rone
**Version:** 1.0
**Date:** 2026-04-20
**Status:** Draft

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [User Entry & Authentication](#2-user-entry--authentication)
3. [AI Chat Assistant](#3-ai-chat-assistant)
4. [Customization Requirements](#4-customization-requirements)
5. [Personalization Requirements](#5-personalization-requirements)
6. [Content API Types & Mock Data](#6-content-api-types--mock-data)
7. [Generated App Requirements](#7-generated-app-requirements)
8. [Database & Storage](#8-database--storage)
9. [Query Processing & Content Guardrails](#9-query-processing--content-guardrails)
10. [Subscription & Usage Limits](#10-subscription--usage-limits)
11. [Non-Functional Requirements](#11-non-functional-requirements)

---

## 1. Project Overview

### 1.1 Vision

Rone is a web application that enables Reuters subscribers to build their own personalized Reuters news web app through a conversational AI assistant. Users describe their preferences via chat, and the system generates a unique, hosted news web page tailored to their specifications.

### 1.2 Business Goals

| Goal | Description |
|------|-------------|
| **Customization** | Allow users to control the visual presentation of their news app: theme, colors, palette, layouts, card types, ordering, and overall look and feel. |
| **Personalization** | Allow users to select and prioritize the content they want to see: topics, content types (articles, galleries, videos, podcasts, markets data), and preferences for each. |

### 1.3 High-Level User Flow

```
Reuters App / Website
        |
        | (deep link)
        v
  Rone Landing Page
        |
        |-- Anonymous --> Welcome message + Sign-in prompt
        |
        |-- Authenticated --> AI Chat Assistant
                |
                |-- User describes preferences (customization + personalization)
                |-- AI validates input (legal, content policy)
                |-- AI generates unique news web app
                |
                v
          Generated App (unique URL)
                |
                |-- Displays personalized Reuters news content
                |-- Floating AI assistant button for further edits
```

---

## 2. User Entry & Authentication

### 2.1 Deep Link Navigation

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-001 | The system must support deep link navigation from the Reuters News App (mobile). | Must |
| AUTH-002 | The system must support deep link navigation from the Reuters News Website (desktop/mobile web). | Must |
| AUTH-003 | Deep links must carry authentication context (tokens/session) when available to enable seamless SSO. | Must |
| AUTH-004 | Deep links must support optional query parameters for pre-selecting content preferences or themes. | Should |

### 2.2 Anonymous User Experience

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-010 | Anonymous (unauthenticated) users must see a welcome/landing page explaining Rone's purpose. | Must |
| AUTH-011 | The welcome page must display a clear call-to-action prompting the user to sign in with their Reuters account. | Must |
| AUTH-012 | The welcome page should include a brief preview or demo of what a generated app looks like. | Should |
| AUTH-013 | Anonymous users must not be able to access the AI chat assistant or build an app. | Must |

### 2.3 Authenticated User Experience

| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-020 | Users must authenticate using their existing Reuters account credentials (SSO integration). | Must |
| AUTH-021 | The system must validate the user's active subscription status upon login. | Must |
| AUTH-022 | Upon successful authentication, the user must be redirected to the AI Chat Assistant view. | Must |
| AUTH-023 | If the user has a previously generated app, the system should offer the option to view it or start a new build (subject to subscription limits). | Should |
| AUTH-024 | Session management must follow Reuters platform security standards (token expiry, refresh, logout). | Must |

---

## 3. AI Chat Assistant

### 3.1 Chat Interface Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| CHAT-001 | The system must display a full-screen chat interface upon authenticated user entry. | Must |
| CHAT-002 | The chat must support text-based input from the user. | Must |
| CHAT-003 | The assistant must provide an initial greeting message and explain its purpose (helping the user build a personalized news app). | Must |
| CHAT-004 | The chat must display conversation history within the current session. | Must |
| CHAT-005 | The assistant must guide the user through both customization and personalization choices. | Must |
| CHAT-006 | The assistant must provide suggestions and examples when the user is unsure of their preferences. | Should |
| CHAT-007 | The chat interface must be responsive and work on desktop, tablet, and mobile viewports. | Must |
| CHAT-008 | The assistant must summarize the user's choices before generating the app and ask for confirmation. | Must |
| CHAT-009 | The chat must display a progress indicator while the app is being generated. | Must |
| CHAT-010 | The chat must provide the unique URL of the generated app upon completion. | Must |

### 3.2 Conversational Flow

| ID | Requirement | Priority |
|----|-------------|----------|
| CHAT-020 | The assistant must follow a structured conversational flow: Greeting -> Personalization -> Customization -> Confirmation -> Generation. | Must |
| CHAT-021 | The user must be able to skip steps or provide preferences in any order via free-form text. | Should |
| CHAT-022 | The assistant must ask clarifying questions when the user's input is ambiguous. | Must |
| CHAT-023 | The assistant must remember all preferences stated earlier in the conversation and not re-ask. | Must |
| CHAT-024 | If the user changes a previously stated preference, the assistant must acknowledge the update. | Must |

---

## 4. Customization Requirements

### 4.1 Theme & Visual Appearance Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| CUST-001 | The user must be able to select or describe a color theme (e.g., dark mode, light mode, custom palette). | Must |
| CUST-002 | The user must be able to specify primary, secondary, and accent colors via name or hex code. | Must |
| CUST-003 | The system must provide a set of predefined Reuters-branded theme presets the user can choose from. | Should |
| CUST-004 | The user must be able to choose a font style preference (e.g., serif, sans-serif, modern, classic). | Should |
| CUST-005 | All generated themes must maintain WCAG 2.1 AA contrast ratios for accessibility. | Must |

### 4.2 Layout Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| CUST-010 | The user must be able to choose a layout style (e.g., grid, list, magazine, newspaper, single-column). | Must |
| CUST-011 | The user must be able to specify the order of content sections on the page (e.g., "Markets at the top, then articles, then videos"). | Must |
| CUST-012 | The user must be able to choose the number of columns for grid layouts (1-4). | Should |
| CUST-013 | The layout must be responsive across desktop, tablet, and mobile viewports. | Must |
| CUST-014 | The user should be able to specify whether to use a sidebar navigation or a top navigation bar. | Should |

### 4.3 Card Types Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| CUST-020 | The user must be able to choose card display styles for articles (e.g., headline-only, thumbnail+headline, full-card with excerpt). | Must |
| CUST-021 | The user must be able to choose card display styles for galleries (e.g., carousel, grid thumbnail, featured image). | Must |
| CUST-022 | The user must be able to choose card display styles for videos (e.g., inline player, thumbnail with play button, list view). | Must |
| CUST-023 | The user must be able to choose card display styles for podcasts (e.g., player card, episode list, compact). | Must |
| CUST-024 | The user must be able to choose how markets data is displayed (e.g., ticker strip, table, chart cards). | Must |
| CUST-025 | The system should provide default card styles per content type if the user does not specify. | Should |

### 4.4 Header & Branding Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| CUST-030 | The generated app must always display the Reuters logo and branding per brand guidelines. | Must |
| CUST-031 | The user may provide a custom title for their app (e.g., "John's Market Brief"). | Should |
| CUST-032 | The user may choose a header style (e.g., sticky, collapsible, minimal). | Should |

---

## 5. Personalization Requirements

### 5.1 Topic Selection Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| PERS-001 | The user must be able to specify which news topics they want to follow (e.g., World, Business, Technology, Sports, Science, Health, Politics, Entertainment). | Must |
| PERS-002 | The user must be able to rank topics by priority to influence content ordering. | Should |
| PERS-003 | The user must be able to specify sub-topics or keywords within a topic (e.g., "Technology > AI & Machine Learning"). | Should |
| PERS-004 | The user must be able to exclude specific topics. | Should |
| PERS-005 | The system must provide a default topic set if the user does not specify preferences. | Must |

### 5.2 Content Type Preferences Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| PERS-010 | The user must be able to select which content types to include: Articles, Galleries, Videos, Podcasts, Markets Data. | Must |
| PERS-011 | The user must be able to exclude any content type entirely. | Must |
| PERS-012 | The user must be able to specify preferences per content type (e.g., "Only long-form articles", "Only video clips under 5 minutes"). | Should |
| PERS-013 | The user must be able to specify the proportion/weight of content types (e.g., "Mostly articles, some videos, no podcasts"). | Should |

### 5.3 Markets Data Preferences Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| PERS-020 | The user must be able to select specific market instruments to track (stocks, indices, currencies, commodities). | Must |
| PERS-021 | The user must be able to create a watchlist of specific symbols (e.g., AAPL, EUR/USD, Gold). | Should |
| PERS-022 | The user must be able to choose the display format for markets data (quotes, charts, tables). | Should |
| PERS-023 | Markets data must refresh at reasonable intervals in the generated app. | Must |

### 5.4 Update Frequency Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| PERS-030 | The user should be able to specify how frequently content refreshes on their generated app (e.g., real-time, every 15 min, hourly). | Should |
| PERS-031 | The system must provide a default refresh interval based on subscription tier. | Must |

---

## 6. Content API Types & Mock Data

### 6.1 Article

**Schema:**

```json
{
  "id": "art-20260420-001",
  "type": "article",
  "thumbnail": {
    "url": "https://cdn.reuters.com/mock/images/article-thumb-001.jpg",
    "alt": "Global leaders meet at UN summit",
    "width": 800,
    "height": 450
  },
  "title": "Global Leaders Convene at UN Summit to Address Climate Finance",
  "body": [
    {
      "type": "paragraph",
      "content": "World leaders gathered in Geneva on Monday for a landmark United Nations summit aimed at restructuring global climate finance mechanisms. The three-day event brings together representatives from over 190 nations to discuss binding commitments on emissions reduction funding."
    },
    {
      "type": "paragraph",
      "content": "The summit comes amid growing pressure from developing nations for wealthier countries to honor pledges made at previous climate conferences. \"We cannot afford another decade of unfulfilled promises,\" said UN Secretary-General Maria Torres in her opening address."
    },
    {
      "type": "image",
      "url": "https://cdn.reuters.com/mock/images/article-inline-001.jpg",
      "caption": "Delegates from 190 nations at the opening ceremony in Geneva.",
      "credit": "Reuters/Jean-Marc Ferré"
    },
    {
      "type": "paragraph",
      "content": "Key proposals on the table include a new international carbon credit framework and a $500 billion annual Green Transition Fund. Negotiations are expected to intensify as delegations work toward a final communiqué by Wednesday evening."
    }
  ],
  "author": {
    "name": "Sarah Mitchell",
    "title": "Senior Climate Correspondent",
    "avatar": "https://cdn.reuters.com/mock/avatars/s-mitchell.jpg"
  },
  "publishedTime": "2026-04-20T08:30:00Z",
  "updatedTime": "2026-04-20T10:15:00Z",
  "topics": ["World", "Climate", "Politics"],
  "readTimeMinutes": 4
}
```

### 6.2 Gallery

**Schema:**

```json
{
  "id": "gal-20260420-001",
  "type": "gallery",
  "galleryTitle": "Cherry Blossom Season Transforms Cities Worldwide",
  "images": [
    {
      "url": "https://cdn.reuters.com/mock/images/gallery-001-img1.jpg",
      "caption": "Cherry blossoms in full bloom along the Tidal Basin in Washington, D.C.",
      "credit": "Reuters/Kevin Lamarque",
      "width": 1920,
      "height": 1280
    },
    {
      "url": "https://cdn.reuters.com/mock/images/gallery-001-img2.jpg",
      "caption": "A family enjoys a picnic under sakura trees in Tokyo's Ueno Park.",
      "credit": "Reuters/Issei Kato",
      "width": 1920,
      "height": 1280
    },
    {
      "url": "https://cdn.reuters.com/mock/images/gallery-001-img3.jpg",
      "caption": "Visitors photograph pink blossoms at the Jerte Valley in Spain.",
      "credit": "Reuters/Susana Vera",
      "width": 1920,
      "height": 1280
    },
    {
      "url": "https://cdn.reuters.com/mock/images/gallery-001-img4.jpg",
      "caption": "Blossoming trees line a canal in Amsterdam, Netherlands.",
      "credit": "Reuters/Piroschka van de Wouw",
      "width": 1920,
      "height": 1280
    }
  ],
  "publishedTime": "2026-04-19T14:00:00Z",
  "updatedTime": "2026-04-20T06:30:00Z",
  "topics": ["Lifestyle", "World"]
}
```

### 6.3 Video

**Schema:**

```json
{
  "id": "vid-20260420-001",
  "type": "video",
  "videoTitle": "SpaceX Launches Next-Gen Starship on Mars Mission Test Flight",
  "thumbnail": {
    "url": "https://cdn.reuters.com/mock/images/video-thumb-001.jpg",
    "alt": "Starship rocket on launch pad",
    "width": 1280,
    "height": 720
  },
  "duration": 185,
  "durationFormatted": "3:05",
  "videoStreamUrl": "https://stream.reuters.com/mock/video/vid-20260420-001/playlist.m3u8",
  "publishedTime": "2026-04-20T06:00:00Z",
  "updatedTime": "2026-04-20T06:00:00Z",
  "topics": ["Technology", "Science", "Space"]
}
```

### 6.4 Podcast

**Schema:**

```json
{
  "id": "pod-20260420-001",
  "type": "podcast",
  "podcastTitle": "Reuters World Brief",
  "podcastThumbnail": {
    "url": "https://cdn.reuters.com/mock/images/podcast-world-brief.jpg",
    "alt": "Reuters World Brief podcast logo",
    "width": 600,
    "height": 600
  },
  "episode": {
    "title": "Episode 312: The New Climate Finance Deal",
    "thumbnail": {
      "url": "https://cdn.reuters.com/mock/images/podcast-ep-312.jpg",
      "alt": "Episode 312 cover art",
      "width": 600,
      "height": 600
    },
    "duration": 1820,
    "durationFormatted": "30:20",
    "audioStreamUrl": "https://stream.reuters.com/mock/audio/pod-ep-312/stream.mp3",
    "publishedTime": "2026-04-20T05:00:00Z",
    "updatedTime": "2026-04-20T05:00:00Z"
  },
  "topics": ["World", "Climate", "Politics"]
}
```

### 6.5 Markets Data

**Schema:**

```json
{
  "id": "mkt-20260420-001",
  "type": "markets",
  "quotes": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NASDAQ",
      "price": 198.45,
      "change": 2.30,
      "changePercent": 1.17,
      "currency": "USD",
      "timestamp": "2026-04-20T15:30:00Z"
    },
    {
      "symbol": "MSFT",
      "name": "Microsoft Corp.",
      "exchange": "NASDAQ",
      "price": 442.18,
      "change": -1.55,
      "changePercent": -0.35,
      "currency": "USD",
      "timestamp": "2026-04-20T15:30:00Z"
    },
    {
      "symbol": ".DJI",
      "name": "Dow Jones Industrial Average",
      "exchange": "DJI",
      "price": 41250.75,
      "change": 185.30,
      "changePercent": 0.45,
      "currency": "USD",
      "timestamp": "2026-04-20T15:30:00Z"
    }
  ],
  "currencies": [
    {
      "pair": "EUR/USD",
      "bid": 1.0892,
      "ask": 1.0895,
      "change": 0.0012,
      "changePercent": 0.11,
      "timestamp": "2026-04-20T15:30:00Z"
    },
    {
      "pair": "GBP/USD",
      "bid": 1.2415,
      "ask": 1.2418,
      "change": -0.0023,
      "changePercent": -0.19,
      "timestamp": "2026-04-20T15:30:00Z"
    },
    {
      "pair": "USD/JPY",
      "bid": 154.28,
      "ask": 154.31,
      "change": 0.45,
      "changePercent": 0.29,
      "timestamp": "2026-04-20T15:30:00Z"
    }
  ],
  "commodities": [
    {
      "symbol": "XAU",
      "name": "Gold",
      "price": 2385.60,
      "change": 12.40,
      "changePercent": 0.52,
      "currency": "USD",
      "unit": "oz",
      "timestamp": "2026-04-20T15:30:00Z"
    },
    {
      "symbol": "CL",
      "name": "Crude Oil WTI",
      "price": 82.15,
      "change": -0.68,
      "changePercent": -0.82,
      "currency": "USD",
      "unit": "bbl",
      "timestamp": "2026-04-20T15:30:00Z"
    }
  ]
}
```

---

## 7. Generated App Requirements

### 7.1 App Generation Widget

| ID | Requirement | Priority |
|----|-------------|----------|
| GEN-001 | The system must use generative AI to produce a complete, functional web application based on the user's customization and personalization inputs. | Must |
| GEN-002 | Each generated app must be hosted at a unique, persistent URL (e.g., `rone.reuters.com/app/{user-app-id}`). | Must |
| GEN-003 | The generated app must be a fully rendered, interactive web page (not a static screenshot or PDF). | Must |
| GEN-004 | The generated app must fetch and display live Reuters content from the Content API based on the user's personalization preferences. | Must |
| GEN-005 | The generated app must apply the user's customization choices (theme, layout, card styles, etc.). | Must |
| GEN-006 | The generated app must be responsive and work across desktop, tablet, and mobile viewports. | Must |
| GEN-007 | The generated app must always display Reuters branding (logo, copyright notice, terms of use link). | Must |
| GEN-008 | The generated app must include a floating AI assistant button that opens a chat panel for the user to request changes or refinements. | Must |
| GEN-009 | The system must store the generated app configuration and assets in the database for retrieval. | Must |
| GEN-010 | The generated app must load within 3 seconds on a standard broadband connection. | Should |

### 7.2 Post-Generation Editing (via Floating Assistant)

| ID | Requirement | Priority |
|----|-------------|----------|
| GEN-020 | The floating AI assistant on the generated app must allow the user to request changes to customization (colors, layout, cards). | Must |
| GEN-021 | The floating AI assistant must allow the user to update personalization preferences (topics, content types). | Must |
| GEN-022 | Changes made through the floating assistant must update the app in near real-time without generating a new URL. | Must |
| GEN-023 | The floating assistant must be subject to the same content guardrails as the initial build chat. | Must |
| GEN-024 | The edit chat history should persist across sessions so the user can see past change requests. | Should |

---

## 8. Database & Storage

### 8.1 User App Store

| ID | Requirement | Priority |
|----|-------------|----------|
| DB-001 | The system must maintain a database storing all generated user apps. | Must |
| DB-002 | Each app record must include: user ID, app ID, unique URL, generation timestamp, customization config, personalization config, app assets/template reference, subscription period, and status (active/expired/archived). | Must |
| DB-003 | The system must support retrieving a user's app by user ID and by app URL. | Must |
| DB-004 | The system must soft-delete expired apps (retain data but disable access after subscription lapses). | Should |
| DB-005 | The system must store conversation history (chat logs) associated with each app build. | Must |
| DB-006 | The system must store edit history for post-generation changes. | Should |

### 8.2 Suggested Data Model

```
User App Record
├── appId (UUID, primary key)
├── userId (FK to Reuters user)
├── uniqueUrl (unique string)
├── status (active | expired | archived)
├── subscriptionPeriodStart (datetime)
├── subscriptionPeriodEnd (datetime)
├── createdAt (datetime)
├── updatedAt (datetime)
├── customizationConfig (JSON)
│   ├── theme (light | dark | custom)
│   ├── colors { primary, secondary, accent, background, text }
│   ├── fontStyle (serif | sans-serif | modern | classic)
│   ├── layout (grid | list | magazine | newspaper | single-column)
│   ├── columns (1-4)
│   ├── navigation (sidebar | top)
│   ├── headerStyle (sticky | collapsible | minimal)
│   ├── appTitle (string)
│   └── cardStyles { article, gallery, video, podcast, markets }
├── personalizationConfig (JSON)
│   ├── topics [ { name, priority, subtopics[], excluded } ]
│   ├── contentTypes [ { type, enabled, weight, preferences } ]
│   ├── markets { watchlist[], displayFormat, instruments[] }
│   └── refreshInterval (seconds)
├── generatedTemplate (reference to stored template/assets)
├── conversationHistory (array of chat messages)
└── editHistory (array of change records)
```

---

## 9. Query Processing & Content Guardrails

This section defines how the system must process user input during the chat to ensure that generated apps remain within Reuters brand, legal, and content standards.

### 9.1 Core Principle

> **The system must generate a Reuters news application - not an arbitrary web app.** Every generated app must look, feel, and function as a Reuters product that has been customized and personalized by the user. The system must reject any request that would result in an app that is not recognizable as a Reuters news product.

### 9.2 Input Validation Pipeline

All user messages must pass through the following processing pipeline before the AI generates or modifies an app:

```
User Input
    |
    v
[1. Content Safety Filter]
    |-- Block: hate speech, violence, explicit/sexual content, harassment
    |-- Block: nudity or sexually suggestive imagery requests
    |-- Block: content promoting illegal activities
    |-- Block: personally identifiable information of third parties
    |
    v
[2. Legal & Compliance Filter]
    |-- Block: requests to remove Reuters branding or attribution
    |-- Block: requests to add third-party branding or logos
    |-- Block: requests to display non-Reuters content sources
    |-- Block: requests to bypass content licensing restrictions
    |-- Block: requests to scrape or embed external sites
    |-- Block: requests violating copyright or IP
    |
    v
[3. Brand Integrity Filter]
    |-- Block: requests for themes/colors that mimic competitor brands
    |-- Block: requests for layouts that obscure Reuters identity
    |-- Block: requests for misleading or satirical news presentation
    |-- Block: requests that could damage Reuters reputation
    |-- Enforce: Reuters logo and branding always visible
    |-- Enforce: copyright notice always present
    |
    v
[4. Scope Boundary Filter]
    |-- Block: requests to add non-news functionality (e-commerce, social media, games, etc.)
    |-- Block: requests to embed arbitrary external widgets or scripts
    |-- Block: requests for user-generated content sections (comments, forums)
    |-- Block: requests to modify app behavior via code injection
    |-- Constrain: only Reuters Content API data types are available
    |
    v
[5. Reasonableness Filter]
    |-- Warn: excessive content types that would degrade performance
    |-- Warn: color combinations with poor accessibility
    |-- Suggest: alternatives when a request is partially valid
    |
    v
[Validated Input --> AI Generation Engine]
```

### 9.3 What Is Allowed

| Category | Allowed Actions |
|----------|----------------|
| **Colors & Themes** | Any color combination that maintains accessibility standards. Dark mode, light mode, custom palettes. Reuters-compatible color schemes. |
| **Layouts** | Grid, list, magazine, newspaper, single-column. 1-4 column configurations. Sidebar or top navigation. Sticky, collapsible, or minimal headers. |
| **Card Styles** | Any predefined card style per content type. Custom ordering and sizing preferences. |
| **Content Selection** | Any combination of Reuters content types (articles, galleries, videos, podcasts, markets). Any Reuters-available topics and sub-topics. Custom watchlists from Reuters markets data. |
| **Content Ordering** | User-defined priority and ordering of sections and content types. Sorting by recency, relevance, or custom criteria. |
| **App Title** | Custom titles that are appropriate and not misleading (e.g., "Sarah's Morning Brief"). |
| **Typography** | Choice among predefined font families (serif, sans-serif, modern, classic). |
| **Refresh Rate** | Selection from predefined refresh intervals based on subscription tier. |

### 9.4 What Is Not Allowed

| Category | Blocked Actions | Response to User |
|----------|----------------|-----------------|
| **Nudity & Sexual Content** | Any request for sexual, nude, or suggestive imagery or themes | "I'm unable to include that type of content. Reuters apps must adhere to our content standards. I can help you choose from our available topics and imagery." |
| **Hate & Violence** | Themes promoting hate, discrimination, or graphic violence | "That content doesn't align with Reuters values. Let me suggest alternative themes or topics that might interest you." |
| **Brand Removal** | Removing Reuters logo, branding, or attribution | "The Reuters brand must remain visible on all generated apps. I can help you customize the header style and positioning instead." |
| **Third-Party Content** | Adding non-Reuters content sources, RSS feeds, or external embeds | "Rone apps exclusively use Reuters content. I can help you explore our wide range of topics and content types." |
| **Competitor Branding** | Colors/layouts intentionally mimicking Bloomberg, CNN, BBC, etc. | "I've detected that this styling closely resembles another news brand. Let me suggest a unique look that's distinctly yours." |
| **Non-News Features** | E-commerce, social media feeds, games, chat rooms, comment sections | "Rone is focused on delivering a personalized news experience. I can help you optimize your content selection and layout instead." |
| **Code Injection** | Custom HTML, CSS, JavaScript, or iframe embeds | "For security reasons, custom code cannot be added. I can help you achieve your desired look using our customization options." |
| **Misleading Presentation** | Satire framing, fake news layouts, misleading headlines | "Reuters is committed to accurate journalism. I'll ensure your app presents content in a clear and trustworthy format." |
| **PII Exposure** | Displaying personal data of third parties | "I'm unable to include personal information about others. Let me help you personalize your app in other ways." |
| **Illegal Content** | Any content promoting illegal activities | "That request cannot be fulfilled. Let me help you explore our available content categories." |

### 9.5 Ambiguous Request Handling

| Scenario | System Behavior |
|----------|----------------|
| User requests a color that's borderline competitor branding | Ask for clarification: "That shade of blue is quite similar to [Competitor]'s brand. Would you like to try a slightly different tone? Here are some suggestions..." |
| User requests a topic not available in Reuters API | Inform the user: "That specific topic isn't available in our content library. Here are the closest topics we offer: [suggestions]." |
| User describes a layout that's technically infeasible | Propose closest feasible alternative: "That exact layout isn't possible, but here's something close that achieves a similar feel..." |
| User provides vague instructions | Ask structured follow-up questions: "I'd love to help! To get started, could you tell me: 1) Do you prefer a dark or light theme? 2) Which topics interest you most?" |
| User requests excessive content density | Warn about performance: "Loading all content types simultaneously might slow your app. Would you like me to prioritize the most important ones?" |

### 9.6 AI Response Standards

| ID | Requirement | Priority |
|----|-------------|----------|
| GUARD-001 | The AI must never generate content that could be mistaken for actual Reuters editorial output (no fake articles, headlines, or quotes). | Must |
| GUARD-002 | The AI must not make promises about content availability or timeliness beyond what the Content API provides. | Must |
| GUARD-003 | The AI must clearly distinguish between customization (visual) and personalization (content) when guiding the user. | Should |
| GUARD-004 | The AI must log all blocked requests for audit purposes. | Must |
| GUARD-005 | The AI must provide helpful, non-judgmental alternative suggestions when blocking a request. | Must |
| GUARD-006 | The AI must escalate unrecognized or edge-case requests to a review queue rather than making autonomous decisions on borderline content. | Should |

---

## 10. Subscription & Usage Limits

### 10.1 Build Limits

| ID | Requirement | Priority |
|----|-------------|----------|
| SUB-001 | Each user may generate one (1) app per subscription period. | Must |
| SUB-002 | The subscription period must be defined and configurable (e.g., monthly, quarterly, annual). | Must |
| SUB-003 | If the user has already built an app in the current period, the chat assistant must inform them and offer editing of the existing app instead. | Must |
| SUB-004 | The system must track build count per user per subscription period. | Must |
| SUB-005 | When a new subscription period begins, the user regains the ability to build a new app. | Must |
| SUB-006 | The previous app should remain accessible until explicitly replaced or the subscription expires. | Should |

### 10.2 App Lifecycle

| ID | Requirement | Priority |
|----|-------------|----------|
| SUB-010 | Active apps must remain accessible at their unique URL as long as the user's subscription is active. | Must |
| SUB-011 | When a subscription expires, the app URL must display a message indicating the subscription has lapsed with a prompt to renew. | Must |
| SUB-012 | App data must be retained for a minimum of 30 days after subscription expiry to allow reactivation. | Should |

---

## 11. Non-Functional Requirements

### 11.1 Performance

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-001 | The AI chat assistant must respond to user messages within 3 seconds (excluding app generation). | Must |
| NFR-002 | App generation must complete within 60 seconds. | Must |
| NFR-003 | Generated apps must achieve a Lighthouse performance score of 80+. | Should |
| NFR-004 | The system must support at least 1,000 concurrent users in the chat interface. | Must |

### 11.2 Security

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-010 | All communications must use HTTPS/TLS 1.2+. | Must |
| NFR-011 | User authentication must integrate with Reuters SSO / OAuth 2.0 infrastructure. | Must |
| NFR-012 | All user input must be sanitized to prevent XSS, injection, and other OWASP Top 10 vulnerabilities. | Must |
| NFR-013 | Generated apps must not expose internal API keys or secrets to the client. | Must |
| NFR-014 | Chat conversation data must be encrypted at rest and in transit. | Must |

### 11.3 Availability & Reliability

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-020 | The system must target 99.9% uptime for generated apps. | Must |
| NFR-021 | The system must implement graceful degradation if the Content API is temporarily unavailable. | Must |
| NFR-022 | Generated apps must display cached content if live data is momentarily unavailable. | Should |

### 11.4 Compliance

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-030 | The system must comply with GDPR for EU users (data access, portability, deletion rights). | Must |
| NFR-031 | The system must log all AI interactions for audit and compliance purposes. | Must |
| NFR-032 | The system must provide a mechanism for content takedown requests. | Must |

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **Rone** | The project name for the "Build Your Own Reuters News App" platform. |
| **Customization** | User control over the visual presentation of the generated app (colors, layouts, card styles, etc.). |
| **Personalization** | User control over the content displayed in the generated app (topics, content types, markets, etc.). |
| **Generated App** | The unique web application produced by the AI based on user preferences. |
| **Content API** | Reuters internal API providing articles, galleries, videos, podcasts, and markets data. |
| **Subscription Period** | The billing cycle during which a user is entitled to one app build. |
| **Deep Link** | A URL that navigates the user directly into the Rone platform from the Reuters app or website. |

---

## Appendix B: Requirement ID Reference

| Prefix | Domain |
|--------|--------|
| AUTH- | Authentication & Entry |
| CHAT- | AI Chat Assistant |
| CUST- | Customization |
| PERS- | Personalization |
| GEN- | Generated App |
| DB- | Database & Storage |
| GUARD- | Content Guardrails |
| SUB- | Subscription & Usage |
| NFR- | Non-Functional Requirements |
