// ─────────────────────────────────────────────────────────────────────────────
// Rone – Data Models
// Aligned with: requirements.md, solution-architecture.md,
//               prompt-processing-specification.md (PRS v1.0)
// ─────────────────────────────────────────────────────────────────────────────

/** A mock Reuters subscriber account (POC – no real SSO). */
export interface RoneUser {
  id: string;
  name: string;
  email: string;
  subscription: 'professional' | 'free';
  avatarInitials: string;
}

// ── Slot types (PRS Section 4) ────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'auto';
export type LayoutStyle = 'magazine' | 'grid' | 'list' | 'newspaper' | 'single-column';
export type NavigationType = 'top' | 'sidebar';
export type HeaderStyle = 'sticky' | 'collapsible' | 'minimal';
export type FontFamily = 'serif' | 'sans-serif' | 'modern' | 'classic';

export type ArticleCardStyle = 'headline-only' | 'thumbnail-headline' | 'full-card' | 'featured-hero';
export type VideoCardStyle   = 'thumbnail-play' | 'inline-player' | 'list-view' | 'cinematic';
export type GalleryCardStyle = 'carousel' | 'grid-thumbnails' | 'featured-image' | 'filmstrip';
export type PodcastCardStyle = 'player-card' | 'episode-list' | 'compact' | 'waveform';
export type MarketsCardStyle = 'ticker-strip' | 'table' | 'chart-cards' | 'sparkline-list';
export type MarketsFormat    = 'quotes' | 'charts' | 'table' | 'mixed';
export type RefreshInterval  = 60 | 300 | 900 | 1800 | 3600;

// ── Visual customisation types (post-generation mutations) ──────────────────
export type CardSize     = 'compact' | 'normal' | 'large';
export type CardEffect   = 'none' | 'glass' | 'shadow' | 'bordered';
export type BorderRadius = 'none' | 'small' | 'medium' | 'large' | 'pill';

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ContentTypeConfig {
  enabled: boolean;
  weight: number;
}

/**
 * The GenerationPrompt / AppConfig schema consumed by the generation engine
 * (PRS Section 7 – simplified for the Angular POC).
 */
export interface AppConfig {
  version: '1.0.0';
  theme: {
    mode: ThemeMode;
    colors: ColorPalette;
  };
  layout: {
    style: LayoutStyle;
    columns: 1 | 2 | 3 | 4;
    navigation: NavigationType;
    header: {
      style: HeaderStyle;
      appTitle: string | null;
    };
  };
  typography: {
    fontFamily: FontFamily;
  };
  contentTypes: {
    articles:  ContentTypeConfig;
    videos:    ContentTypeConfig;
    galleries: ContentTypeConfig;
    podcasts:  ContentTypeConfig;
    markets:   ContentTypeConfig;
  };
  cardStyles: {
    article:  ArticleCardStyle;
    video:    VideoCardStyle;
    gallery:  GalleryCardStyle;
    podcast:  PodcastCardStyle;
    markets:  MarketsCardStyle;
  };
  topics: string[];
  markets: {
    watchlist: string[];
    displayFormat: MarketsFormat;
  };
  /** Order sections appear in the generated app (PRS Section 9.8). */
  sectionOrder: string[];
  refreshInterval: RefreshInterval;

  // ── Post-generation visual mutation slots ───────────────────────────────
  cardSize: CardSize;
  cardEffect: CardEffect;
  borderRadius: BorderRadius;
  /** Per-section heading background (CSS colour string, empty = default) */
  sectionHeaderColor: string;
  /** Full-page background image URL (empty = none) */
  backgroundImage: string;
  /** Granular visibility of fields inside each card type */
  cardDetails: {
    article: { showImage: boolean; showMeta: boolean; showSummary: boolean; showReadMore: boolean };
    video:   { showThumbnail: boolean; showMeta: boolean };
  };
}

/** Default slot values (PRS Section 8 – system defaults before any user input). */
export const DEFAULT_APP_CONFIG: AppConfig = {
  version: '1.0.0',
  theme: {
    mode: 'light',
    colors: {
      primary:    '#FF8000',   // Reuters orange
      secondary:  '#1A1A2E',
      accent:     '#E94560',
      background: '#FFFFFF',
      text:       '#1A1A1A',
    },
  },
  layout: {
    style:      'magazine',
    columns:    3,
    navigation: 'top',
    header: {
      style:    'sticky',
      appTitle: null,
    },
  },
  typography: { fontFamily: 'sans-serif' },
  contentTypes: {
    articles:  { enabled: true,  weight: 0.40 },
    videos:    { enabled: true,  weight: 0.20 },
    galleries: { enabled: true,  weight: 0.15 },
    podcasts:  { enabled: true,  weight: 0.10 },
    markets:   { enabled: true,  weight: 0.15 },
  },
  cardStyles: {
    article: 'thumbnail-headline',
    video:   'thumbnail-play',
    gallery: 'carousel',
    podcast: 'player-card',
    markets: 'ticker-strip',
  },
  topics:   ['World', 'Business', 'Technology'],
  markets: {
    watchlist:     ['.DJI', '.SPX', '.IXIC', 'EUR=', 'GBP=', 'JPY='],
    displayFormat: 'quotes',
  },
  sectionOrder:    ['markets', 'articles', 'videos', 'galleries', 'podcasts'],
  refreshInterval: 900,
  cardSize:        'normal',
  cardEffect:      'none',
  borderRadius:    'small',
  sectionHeaderColor: '',
  backgroundImage:    '',
  cardDetails: {
    article: { showImage: true, showMeta: true, showSummary: true, showReadMore: true },
    video:   { showThumbnail: true, showMeta: true },
  },
};

// ── Builder conversation types ────────────────────────────────────────────────

/** Conversation stages, following CHAT-020 flow. */
export type BuilderStage =
  | 'greeting'
  | 'topics'
  | 'content_types'
  | 'markets'
  | 'theme'
  | 'layout'
  | 'title'
  | 'confirmation'
  | 'generating'
  | 'complete';

export interface BuilderMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ── Generated app ─────────────────────────────────────────────────────────────

export interface GeneratedApp {
  id: string;
  userId: string;
  config: AppConfig;
  createdAt: string;   // ISO string for JSON serialisability
  status: 'building' | 'active' | 'error';
}

// ── Mutation types (PRS Section 11) ──────────────────────────────────────────

export type MutationType =
  | 'update_slot'
  | 'enable_feature'
  | 'disable_feature'
  | 'reorder'
  | 'full_rebuild';

export interface MutationRecord {
  mutationId: string;
  appId: string;
  type: MutationType;
  before: Partial<AppConfig>;
  after:  Partial<AppConfig>;
  timestamp: string;
}
