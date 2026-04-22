export interface NewsStory {
  id: string;
  category: string;
  title: string;
  summary: string;
  timestamp: string;
  readTime: string;
  imageUrl: string;
  /** Full article body — array of paragraphs rendered as <p> elements. */
  body?: string[];
  author?: string;
  location?: string;
  relatedIds?: string[];
}

export interface NewsSection {
  id: string;
  title: string;
  stories: NewsStory[];
}

export interface MarketTicker {
  symbol: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}

export interface HomeContent {
  leadStory: NewsStory;
  spotlightStory: NewsStory;
  topHeadlines: NewsStory[];
  sections: NewsSection[];
  liveUpdates: string[];
  editorPicks: string[];
  marketTicker: MarketTicker[];
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  videoUrl: string;
  /** false = owner disabled embedding; open in new tab instead of inline modal */
  embeddable?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  stories?: NewsStory[];
  timestamp: Date;
}

export interface PodcastItem {
  id: string;
  /** Lowercase category key matching app topic slug, e.g. 'market', 'technology' */
  category: string;
  title: string;
  description: string;
  host: string;
  duration: string;
  audioUrl: string;
  imageUrl: string;
}
