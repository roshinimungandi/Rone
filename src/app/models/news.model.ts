export interface NewsStory {
  id: string;
  category: string;
  title: string;
  summary: string;
  timestamp: string;
  readTime: string;
  imageUrl: string;
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  stories?: NewsStory[];
  timestamp: Date;
}
