import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AppConfig,
  BuilderMessage,
  BuilderStage,
  DEFAULT_APP_CONFIG,
  GeneratedApp,
  MutationRecord,
  MutationType,
} from '../models/rone.model';

// ── Safety gate patterns (PRS Section 3.2 – 3.5) ─────────────────────────────
// Maps a regex to the BLOCK response the assistant must return.
const BLOCKED_PATTERNS: ReadonlyArray<{ readonly pattern: RegExp; readonly message: string }> = [
  {
    pattern: /bloomberg|cnn\s*brand|bbc\s*style|fox\s*news\s*look/i,
    message:
      "I've detected that this styling closely resembles another news brand. Let me suggest a unique look that's distinctly yours.",
  },
  {
    pattern: /remove.*reuters|hide.*logo|no.*reuters.*brand|without.*branding/i,
    message:
      'The Reuters brand must remain visible on all generated apps. I can help you customise the header style and positioning instead.',
  },
  {
    pattern:
      /shopping|e-?commerce|social\s*media\s*feed|game|comment\s*section|chat\s*room/i,
    message:
      'Rone is focused on delivering a personalised news experience. I can help you optimise your content selection and layout instead.',
  },
  {
    pattern: /<script|<style\b|javascript:|onerror=|onload=/i,
    message:
      'For security reasons, custom code cannot be added. I can help you achieve your desired look using our customisation options.',
  },
  {
    pattern: /porn|nude|naked|explicit|xxx|sex\s*content/i,
    message:
      "I'm unable to include that type of content. Reuters apps must adhere to our content standards.",
  },
];

// ── Colour name → hex lookup (PRS Slot Filling Rule 3) ───────────────────────
const COLOUR_MAP: Record<string, string> = {
  red: '#DC3545', 'dark red': '#8B0000',
  blue: '#0066CC', 'dark blue': '#003366', navy: '#001F5B',
  'light blue': '#5BC0DE', sky: '#87CEEB', cobalt: '#0047AB',
  green: '#28A745', 'dark green': '#1B5E20', teal: '#009688', emerald: '#50C878',
  orange: '#FF8000', amber: '#FFC107', yellow: '#FFD700',
  purple: '#6F42C1', violet: '#8B00FF', indigo: '#4B0082',
  pink: '#E91E63', rose: '#F43F5E', magenta: '#FF00FF',
  gold: '#FFD700', silver: '#C0C0C0',
  white: '#FFFFFF', black: '#000000',
  gray: '#6C757D', grey: '#6C757D', 'dark gray': '#343A40', slate: '#64748B',
};

// ── Topic keyword → Reuters topic mapping (PRS Stage 3) ──────────────────────
const TOPIC_KEYWORD_MAP: Record<string, string> = {
  tech: 'Technology', technology: 'Technology', ai: 'Technology',
  'artificial intelligence': 'Technology', cyber: 'Technology',
  software: 'Technology', chip: 'Technology', digital: 'Technology',
  semiconductor: 'Technology', robotics: 'Technology',

  business: 'Business', finance: 'Business', corporate: 'Business',
  economy: 'Business', economics: 'Business', trade: 'Business',
  retail: 'Business', company: 'Business', companies: 'Business',

  world: 'World', global: 'World', international: 'World', foreign: 'World',

  market: 'Markets', markets: 'Markets', stocks: 'Markets', equities: 'Markets',
  'wall street': 'Markets', shares: 'Markets', nasdaq: 'Markets',
  's&p': 'Markets', dow: 'Markets', stock: 'Markets',

  politics: 'Politics', political: 'Politics', government: 'Politics',
  policy: 'Politics', election: 'Politics', senate: 'Politics',

  science: 'Science', research: 'Science', space: 'Science',
  climate: 'Science', environment: 'Science',

  health: 'Health', medical: 'Health', healthcare: 'Health', medicine: 'Health',
  covid: 'Health', pandemic: 'Health', pharma: 'Health',

  sports: 'Sports', sport: 'Sports', soccer: 'Sports', football: 'Sports',
  basketball: 'Sports', tennis: 'Sports', athletics: 'Sports',

  entertainment: 'Entertainment', culture: 'Entertainment', arts: 'Entertainment',
  music: 'Entertainment', film: 'Entertainment', celebrity: 'Entertainment',

  energy: 'Energy', oil: 'Energy', gas: 'Energy', renewable: 'Energy',
  solar: 'Energy', wind: 'Energy',
};

const ALL_VALID_TOPICS = [
  'World', 'Business', 'Technology', 'Markets',
  'Politics', 'Science', 'Health', 'Sports',
  'Energy', 'Entertainment',
];

// ── Market symbol / name lookup ───────────────────────────────────────────────
const MARKET_NAME_MAP: Record<string, string> = {
  apple: 'AAPL', tesla: 'TSLA', google: 'GOOG', alphabet: 'GOOG',
  amazon: 'AMZN', microsoft: 'MSFT', nvidia: 'NVDA', meta: 'META',
  netflix: 'NFLX', 'berkshire hathaway': 'BRK.A', 'jp morgan': 'JPM',
  gold: 'XAU', silver: 'XAG', copper: 'HG=F',
  'eur/usd': 'EUR=', 'gbp/usd': 'GBP=', 'usd/jpy': 'JPY=',
  'sp500': '.SPX', 's&p 500': '.SPX', 's&p500': '.SPX',
  dow: '.DJI', 'dow jones': '.DJI', nasdaq: '.IXIC',
  bitcoin: 'BTC=', ethereum: 'ETH=',
};

@Injectable({ providedIn: 'root' })
export class AppBuilderService {
  // ── Reactive state ──────────────────────────────────────────────────────────
  private readonly _messages = signal<BuilderMessage[]>([]);
  private readonly _stage    = signal<BuilderStage>('greeting');
  private readonly _config   = signal<AppConfig>(structuredClone(DEFAULT_APP_CONFIG));
  private readonly _generatedApp = signal<GeneratedApp | null>(null);
  private readonly _isTyping = signal<boolean>(false);

  readonly messages     = this._messages.asReadonly();
  readonly stage        = this._stage.asReadonly();
  readonly config       = this._config.asReadonly();
  readonly generatedApp = this._generatedApp.asReadonly();
  readonly isTyping     = this._isTyping.asReadonly();

  // ── Mutation history (PRS Section 11.3) ─────────────────────────────────────
  private mutationLog: MutationRecord[] = [];
  private currentAppId = '';
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  /** Kick off a new builder session for the authenticated user (CHAT-003). */
  startSession(userName: string): void {
    this._messages.set([]);
    this._stage.set('greeting');
    // Reset config but keep POC defaults — topics start empty so user must choose
    this._config.set({ ...structuredClone(DEFAULT_APP_CONFIG), topics: [] });
    this._generatedApp.set(null);
    this.mutationLog = [];
    this.currentAppId = '';

    this.pushAssistant(
      `Welcome to **Rone**, ${userName}! I'm your AI assistant, and I'll help you build your very own personalised Reuters news app from scratch.\n\n` +
      `Through our conversation I'll help you choose:\n` +
      `- 📰 **Content** — topics, articles, videos, markets data and more\n` +
      `- 🎨 **Appearance** — theme, colours, and layout\n\n` +
      `Let's start with what matters most — **what news topics interest you?**\n\n` +
      `Available topics: **World, Business, Technology, Markets, Politics, Science, Health, Sports, Energy, Entertainment**\n\n` +
      `Feel free to list several — the more you share, the better tailored your app will be!`
    );
    this._stage.set('topics');
  }

  /** Send a user message through the 5-stage processing pipeline (PRS Section 1). */
  sendMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Stage 2: Safety & Compliance Gate
    const blocked = BLOCKED_PATTERNS.find(b => b.pattern.test(trimmed));
    if (blocked) {
      this.pushUser(trimmed);
      this.withDelay(() => this.pushAssistant(blocked.message));
      return;
    }

    this.pushUser(trimmed);
    this._isTyping.set(true);
    this.withDelay(() => {
      this._isTyping.set(false);
      this.dispatch(this._stage(), trimmed);
    });
  }

  /** Load a previously generated app from storage (for /app/:id route). */
  loadApp(appId: string): GeneratedApp | null {
    // Check in-memory first
    const live = this._generatedApp();
    if (live && live.id === appId) return live;

    // Fall back to sessionStorage (POC – no real DB)
    if (!this.isBrowser) return null;
    const raw = sessionStorage.getItem(`rone-app-${appId}`);
    if (!raw) return null;
    try {
      const app = JSON.parse(raw) as GeneratedApp;
      this._generatedApp.set(app);
      this._config.set(app.config);
      this.currentAppId = appId;
      return app;
    } catch {
      return null;
    }
  }

  /**
   * Process an edit command from the floating AI assistant on the generated app.
   * Implements PRS Section 11 — Prompt Mutation Rules.
   */
  processEditCommand(command: string): string {
    // Safety gate (PRS Section 11.2 Rule 4)
    const blocked = BLOCKED_PATTERNS.find(b => b.pattern.test(command));
    if (blocked) return blocked.message;

    const lower = command.toLowerCase();

    // THEME mutations
    if (/\bdark\s*(mode|theme)?\b/i.test(lower)) {
      return this.applyMutation('update_slot', c => ({
        ...c,
        theme: {
          ...c.theme,
          mode: 'dark',
          colors: { ...c.theme.colors, background: '#121212', text: '#E0E0E0' },
        },
      }), '✅ Switched to **dark mode**. Your app has been updated!');
    }
    if (/\blight\s*(mode|theme)?\b/i.test(lower)) {
      return this.applyMutation('update_slot', c => ({
        ...c,
        theme: {
          ...c.theme,
          mode: 'light',
          colors: { ...c.theme.colors, background: '#FFFFFF', text: '#1A1A1A' },
        },
      }), '✅ Switched to **light mode**. Your app has been updated!');
    }

    // COLOUR mutations — accent
    for (const [name, hex] of Object.entries(COLOUR_MAP)) {
      if (lower.includes(name)) {
        return this.applyMutation('update_slot', c => ({
          ...c,
          theme: { ...c.theme, colors: { ...c.theme.colors, accent: hex } },
        }), `✅ Accent colour updated to **${name}** (${hex}). App refreshed!`);
      }
    }

    // LAYOUT mutations
    if (/\bgrid\b/i.test(lower)) {
      return this.applyMutation('update_slot', c => ({
        ...c, layout: { ...c.layout, style: 'grid' },
      }), '✅ Layout changed to **grid**. App refreshed!');
    }
    if (/\bmagazine\b/i.test(lower)) {
      return this.applyMutation('update_slot', c => ({
        ...c, layout: { ...c.layout, style: 'magazine' },
      }), '✅ Layout changed to **magazine**. App refreshed!');
    }
    if (/\blist\b/i.test(lower)) {
      return this.applyMutation('update_slot', c => ({
        ...c, layout: { ...c.layout, style: 'list' },
      }), '✅ Layout changed to **list**. App refreshed!');
    }
    if (/\bnewspaper\b/i.test(lower)) {
      return this.applyMutation('update_slot', c => ({
        ...c, layout: { ...c.layout, style: 'newspaper' },
      }), '✅ Layout changed to **newspaper**. App refreshed!');
    }

    // TOPIC mutations
    const topics = this.extractTopics(lower);
    if (topics.length > 0) {
      if (/add|include|also|more|plus/i.test(lower)) {
        return this.applyMutation('update_slot', c => ({
          ...c, topics: [...new Set([...c.topics, ...topics])],
        }), `✅ Added **${topics.join(', ')}** to your topics. App refreshed!`);
      }
      if (/remove|exclude|no\s+more|stop|drop/i.test(lower)) {
        return this.applyMutation('update_slot', c => ({
          ...c,
          topics: c.topics.filter(t => !topics.includes(t)).length
            ? c.topics.filter(t => !topics.includes(t))
            : c.topics,
        }), `✅ Removed **${topics.join(', ')}** from your topics. App refreshed!`);
      }
    }

    return (
      `I can modify your app! Try:\n` +
      `- **"Switch to dark/light mode"**\n` +
      `- **"Change accent to blue/green/red/..."**\n` +
      `- **"Change layout to grid/magazine/list"**\n` +
      `- **"Add Sports"** or **"Remove Markets"**`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Stage dispatch (PRS Section 1 pipeline)
  // ─────────────────────────────────────────────────────────────────────────────

  private dispatch(stage: BuilderStage, text: string): void {
    switch (stage) {
      case 'topics':         return this.handleTopics(text);
      case 'content_types':  return this.handleContentTypes(text);
      case 'markets':        return this.handleMarkets(text);
      case 'theme':          return this.handleTheme(text);
      case 'layout':         return this.handleLayout(text);
      case 'title':          return this.handleTitle(text);
      case 'confirmation':   return this.handleConfirmation(text);
      default: break;  // noop during generating / complete
    }
  }

  // ── Stage handlers ────────────────────────────────────────────────────────

  /** CHAT-020 Step 2: Personalisation — Topics. */
  private handleTopics(text: string): void {
    const topics = this.extractTopics(text);

    if (topics.length === 0) {
      this.pushAssistant(
        `I didn't catch specific topics. Please choose from:\n` +
        `**World, Business, Technology, Markets, Politics, Science, Health, Sports, Energy, Entertainment**\n\n` +
        `For example: *"Technology, Business and World news"*`
      );
      return;
    }

    this._config.update(c => ({ ...c, topics }));

    this.pushAssistant(
      `Great choices — **${topics.join(', ')}**!\n\n` +
      `Now for **content types**. Your app can include:\n\n` +
      `- 📄 **Articles** — in-depth written coverage\n` +
      `- 🎥 **Videos** — news clips and reports\n` +
      `- 🖼️ **Galleries** — photo stories\n` +
      `- 🎙️ **Podcasts** — audio journalism\n` +
      `- 📊 **Markets data** — stocks, indices, currencies\n\n` +
      `All are enabled by default. Tell me if you'd like to exclude any, or just say **"all good"** to keep everything.`
    );
    this._stage.set('content_types');
  }

  /** CHAT-020 Step 2: Personalisation — Content types. */
  private handleContentTypes(text: string): void {
    const lower = text.toLowerCase();

    if (!/all|everything|yes|fine|good|ok|keep|include all|no change/i.test(lower)) {
      this._config.update(c => {
        const ct = structuredClone(c.contentTypes);
        if (/no.*video|without.*video|exclude.*video/i.test(lower))     ct.videos.enabled    = false;
        if (/no.*galleri|without.*galleri|exclude.*galleri/i.test(lower)) ct.galleries.enabled = false;
        if (/no.*podcast|without.*podcast|exclude.*podcast/i.test(lower)) ct.podcasts.enabled  = false;
        if (/no.*market|without.*market|exclude.*market/i.test(lower))   ct.markets.enabled   = false;
        if (/no.*article|without.*article|exclude.*article/i.test(lower)) ct.articles.enabled  = false;
        if (/only\s+articles?/i.test(lower)) {
          ct.videos.enabled = ct.galleries.enabled = ct.podcasts.enabled = ct.markets.enabled = false;
        }
        // Redistribute weights
        const enabled = Object.values(ct).filter(v => v.enabled);
        if (enabled.length > 0) {
          const share = parseFloat((1.0 / enabled.length).toFixed(2));
          for (const v of Object.values(ct)) v.weight = v.enabled ? share : 0;
        }
        return { ...c, contentTypes: ct };
      });
    }

    const marketsEnabled = this._config().contentTypes.markets.enabled;
    if (marketsEnabled) {
      this.pushAssistant(
        `Content preferences set!\n\n` +
        `Since you're including **markets data**, are there specific instruments you'd like to track?\n\n` +
        `Examples: *"Apple, Tesla, Gold, EUR/USD, S&P 500"*\n\n` +
        `Or say **"use defaults"** for the standard Reuters overview (Dow, S&P 500, Nasdaq, EUR/USD).`
      );
      this._stage.set('markets');
    } else {
      this.askTheme();
    }
  }

  /** CHAT-020 Step 2: Personalisation — Markets watchlist. */
  private handleMarkets(text: string): void {
    if (!/default|standard|use\s*default|keep\s*default/i.test(text)) {
      const watchlist = this.extractMarketSymbols(text);
      if (watchlist.length > 0) {
        this._config.update(c => ({ ...c, markets: { ...c.markets, watchlist } }));
      }
    }
    this.askTheme();
  }

  /** CHAT-020 Step 3: Customisation — Theme. */
  private askTheme(): void {
    this.pushAssistant(
      `Now let's design the **look and feel** of your app.\n\n` +
      `🌙 **Dark mode** — dark backgrounds, light text (great for night reading)\n` +
      `☀️ **Light mode** — clean white backgrounds (classic news look)\n` +
      `🔄 **Auto** — matches your device setting\n\n` +
      `You can also add a colour preference, e.g.:\n` +
      `*"dark mode with blue accents"* or *"light theme with green highlights"*`
    );
    this._stage.set('theme');
  }

  private handleTheme(text: string): void {
    const lower = text.toLowerCase();
    let mode    = this._config().theme.mode;
    let colors  = { ...this._config().theme.colors };

    if (/\bdark\b/i.test(lower))  { mode = 'dark';  colors.background = '#121212'; colors.text = '#E0E0E0'; }
    if (/\blight\b/i.test(lower)) { mode = 'light'; colors.background = '#FFFFFF'; colors.text = '#1A1A1A'; }
    if (/\bauto\b/i.test(lower))   mode = 'auto';

    // Colour extraction — check for hex codes first, then named colours
    const hexMatch = text.match(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/);
    if (hexMatch) colors.accent = hexMatch[0];

    for (const [name, hex] of Object.entries(COLOUR_MAP)) {
      if (lower.includes(name)) {
        colors.accent = hex;
        break;
      }
    }

    this._config.update(c => ({ ...c, theme: { mode, colors } }));

    const modeLabel = mode === 'dark' ? '🌙 Dark mode' : mode === 'auto' ? '🔄 Auto' : '☀️ Light mode';
    this.pushAssistant(
      `${modeLabel} — looks great!\n\n` +
      `Now for **layout**. How would you like your news organised?\n\n` +
      `- 📰 **Magazine** — featured stories with varied card sizes *(recommended)*\n` +
      `- 🔲 **Grid** — equal-sized cards in a clean grid\n` +
      `- 📋 **List** — compact linear reading format\n` +
      `- 🗞️ **Newspaper** — classic editorial, multi-column\n` +
      `- 📱 **Single-column** — focused, distraction-free reading\n\n` +
      `You can also specify column count, e.g. *"3-column grid"*.`
    );
    this._stage.set('layout');
  }

  private handleLayout(text: string): void {
    const lower = text.toLowerCase();
    let style: AppConfig['layout']['style'] = 'magazine';
    let columns: 1 | 2 | 3 | 4 = 3;

    if (/\bgrid\b/i.test(lower))                        style = 'grid';
    else if (/\blist\b/i.test(lower))                   style = 'list';
    else if (/\bnewspaper\b/i.test(lower))              style = 'newspaper';
    else if (/single.?col|one.?col|1.?col/i.test(lower)) { style = 'single-column'; columns = 1; }
    else if (/\bmagazine\b/i.test(lower))               style = 'magazine';

    const colM = lower.match(/(\d).?col/);
    if (colM) columns = (Math.min(4, Math.max(1, parseInt(colM[1], 10))) as 1 | 2 | 3 | 4);

    this._config.update(c => ({ ...c, layout: { ...c.layout, style, columns } }));

    this.pushAssistant(
      `**${style.charAt(0).toUpperCase() + style.slice(1)}** layout — nice choice!\n\n` +
      `Almost done. Would you like to give your news app a **custom name**?\n\n` +
      `Examples: *"Alex's Morning Brief"*, *"My Finance Daily"*, *"Tech & Markets Hub"*\n\n` +
      `Or say **"skip"** to use the Reuters default.`
    );
    this._stage.set('title');
  }

  private handleTitle(text: string): void {
    let appTitle: string | null = null;

    if (!/^(skip|no|none|default|pass|use default)$/i.test(text.trim())) {
      appTitle = text
        .replace(/["']/g, '')
        .replace(/^(call it|name it|title[:=]?\s*|app name[:=]?\s*)/i, '')
        .trim()
        .slice(0, 50) || null;
    }

    this._config.update(c => ({
      ...c,
      layout: { ...c.layout, header: { ...c.layout.header, appTitle } },
    }));

    this.showConfirmation();
  }

  /** CHAT-020 Step 4: Confirmation — summarise all choices (CHAT-008). */
  private showConfirmation(): void {
    const cfg     = this._config();
    const topics  = cfg.topics.join(', ') || 'World, Business, Technology (default)';
    const enabled = Object.entries(cfg.contentTypes)
      .filter(([, v]) => v.enabled)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
      .join(', ');
    const themeDesc  = cfg.theme.mode === 'dark' ? '🌙 Dark mode' : cfg.theme.mode === 'auto' ? '🔄 Auto' : '☀️ Light mode';
    const layoutDesc = cfg.layout.style.charAt(0).toUpperCase() + cfg.layout.style.slice(1);
    const titleDesc  = cfg.layout.header.appTitle ?? 'My Reuters (default)';

    this.pushAssistant(
      `Here's a summary of **your personalised Reuters news app**:\n\n` +
      `📰 **App Name:** ${titleDesc}\n` +
      `🎨 **Theme:** ${themeDesc}\n` +
      `📐 **Layout:** ${layoutDesc} (${cfg.layout.columns} columns)\n` +
      `📋 **Topics:** ${topics}\n` +
      `📦 **Content Types:** ${enabled}\n` +
      (cfg.contentTypes.markets.enabled
        ? `📊 **Markets watchlist:** ${cfg.markets.watchlist.slice(0, 4).join(', ')}${cfg.markets.watchlist.length > 4 ? ' +' + (cfg.markets.watchlist.length - 4) + ' more' : ''}\n`
        : '') +
      `\nReady to build? Type **"Build it"** or **"Yes"** to generate your app!\n\n` +
      `Or let me know if you'd like to change anything first.`
    );
    this._stage.set('confirmation');
  }

  /** CHAT-020 Step 4 → 5: Handle user confirmation or change request. */
  private handleConfirmation(text: string): void {
    const lower = text.toLowerCase();

    // User wants to change something mid-confirmation
    if (/topic|interest/i.test(lower) && !/yes|build|confirm|ok|sure|go|proceed/i.test(lower)) {
      const t = this.extractTopics(lower);
      if (t.length > 0) { this._config.update(c => ({ ...c, topics: t })); this.showConfirmation(); return; }
    }
    if (/dark|light|colour|color|theme/i.test(lower) && !/yes|build|confirm/i.test(lower)) {
      this.handleTheme(text); return;
    }
    if (/grid|list|magazine|layout|column/i.test(lower) && !/yes|build|confirm/i.test(lower)) {
      this.handleLayout(text); return;
    }
    if (/start\s*over|reset|restart/i.test(lower)) {
      this.pushAssistant(`No problem! Let's start fresh. What topics are you most interested in?`);
      this._config.update(c => ({ ...c, topics: [] }));
      this._stage.set('topics');
      return;
    }

    // Confirm and generate
    if (/yes|build|confirm|proceed|ok|sure|go|create|let'?s\s*do|absolutely|sounds\s*good/i.test(lower)) {
      this.generateApp();
    } else {
      this.pushAssistant(
        `Not sure what you'd like to change. You can:\n` +
        `- Say **"Build it"** to create your app\n` +
        `- Ask to change topics, theme, layout, or content types\n` +
        `- Say **"Start over"** to begin again`
      );
    }
  }

  // ── CHAT-020 Step 5: Generation Dispatch ─────────────────────────────────────

  private generateApp(): void {
    this._stage.set('generating');
    this.pushAssistant(
      `🚀 **Building your personalised Reuters news app…**\n\n` +
      `⚙️ Assembling your content feeds…\n` +
      `🎨 Applying your theme and layout…\n` +
      `📊 Configuring your market watchlist…\n\n` +
      `This will just take a moment!`
    );

    // Simulate generation delay (3 seconds)
    setTimeout(() => {
      const appId = `u-${Date.now().toString(36)}`;
      const config = this._config();
      const app: GeneratedApp = {
        id:        appId,
        userId:    '',  // set by caller if needed
        config,
        createdAt: new Date().toISOString(),
        status:    'active',
      };

      if (this.isBrowser) {
        sessionStorage.setItem(`rone-app-${appId}`, JSON.stringify(app));
      }

      this.currentAppId = appId;
      this._generatedApp.set(app);
      this._stage.set('complete');

      this.pushAssistant(
        `✅ **Your app is ready!**\n\n` +
        `Your personalised Reuters news experience has been created.\n` +
        `Redirecting you there now… → **/app/${appId}**`
      );
    }, 3000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Apply a mutation to the config, log it, and persist to storage.
   * PRS Section 11.2 — mutations run through the safety gate before arriving here.
   */
  private applyMutation(
    type: MutationType,
    updater: (c: AppConfig) => AppConfig,
    successMsg: string,
  ): string {
    const before = this._config();
    this._config.update(updater);
    const after = this._config();

    const record: MutationRecord = {
      mutationId: `mut-${Date.now()}`,
      appId:      this.currentAppId,
      type,
      before:     before as Partial<AppConfig>,
      after:      after  as Partial<AppConfig>,
      timestamp:  new Date().toISOString(),
    };
    this.mutationLog = [...this.mutationLog.slice(-49), record]; // Keep last 50

    // Sync to storage
    const app = this._generatedApp();
    if (app && this.isBrowser) {
      const updated = { ...app, config: after };
      this._generatedApp.set(updated);
      sessionStorage.setItem(`rone-app-${app.id}`, JSON.stringify(updated));
    }

    return successMsg;
  }

  /** Stage 3 — extract Reuters topic names from free-form text. */
  private extractTopics(text: string): string[] {
    const lower = text.toLowerCase();
    const found = new Set<string>();

    for (const [kw, topic] of Object.entries(TOPIC_KEYWORD_MAP)) {
      if (lower.includes(kw)) found.add(topic);
    }
    // Also accept properly-cased topic names directly
    for (const topic of ALL_VALID_TOPICS) {
      if (lower.includes(topic.toLowerCase())) found.add(topic);
    }
    return [...found];
  }

  /** Stage 3 — extract market symbols from user text (PRS Section 4.4). */
  private extractMarketSymbols(text: string): string[] {
    const syms = new Set<string>();
    const lower = text.toLowerCase();

    for (const [name, sym] of Object.entries(MARKET_NAME_MAP)) {
      if (lower.includes(name)) syms.add(sym);
    }
    // Also match well-formed ticker symbols (2-5 uppercase letters followed by whitespace/comma/end)
    const tickers = text.match(/\b([A-Z]{2,5})\b/g) ?? [];
    for (const t of tickers) {
      if (!['OR', 'AND', 'THE', 'NO', 'I', 'MY', 'DO', 'IN', 'AT', 'TO'].includes(t)) syms.add(t);
    }

    return [...syms].slice(0, 10);
  }

  private pushUser(content: string): void {
    this._messages.update(m => [...m, {
      id:        `msg-${Date.now()}-u`,
      role:      'user',
      content,
      timestamp: new Date(),
    }]);
  }

  private pushAssistant(content: string): void {
    this._messages.update(m => [...m, {
      id:        `msg-${Date.now()}-a`,
      role:      'assistant',
      content,
      timestamp: new Date(),
    }]);
  }

  private withDelay(fn: () => void, ms = 900): void {
    setTimeout(fn, ms);
  }
}
