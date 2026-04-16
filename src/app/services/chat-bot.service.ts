import { Injectable } from '@angular/core';

import { ChatMessage, NewsStory } from '../models/news.model';
import { NewsContentService } from './news-content.service';

interface ConversationContext {
  lastTopic: string;
  lastStories: NewsStory[];
  lastDetailIndex: number;
}

// Keywords that map to sections/categories in the news data
const TOPIC_MAP: Record<string, string[]> = {
  world:       ['world', 'global', 'international', 'europe', 'asia', 'africa', 'americas'],
  markets:     ['market', 'stock', 'equities', 'nasdaq', 'sp500', 'dow', 'shares', 'wall street', 'finance', 'bond', 'currency', 'dollar', 'forex'],
  technology:  ['tech', 'technology', 'ai', 'artificial intelligence', 'cyber', 'chip', 'software', 'data', 'satellite', 'telecom', 'internet'],
  energy:      ['energy', 'oil', 'gas', 'crude', 'refinery', 'fuel', 'solar', 'battery', 'ev', 'electric'],
  policy:      ['policy', 'bank', 'rate', 'fed', 'inflation', 'central bank', 'government', 'regulation'],
  business:    ['business', 'retail', 'consumer', 'company', 'corporate', 'trade', 'deal', 'merger', 'earnings'],
  commodities: ['commodit', 'copper', 'gold', 'silver', 'wheat', 'corn', 'soy'],
  shipping:    ['shipping', 'port', 'cargo', 'freight', 'vessel', 'maritime', 'logistics', 'supply chain'],
};

const FOLLOWUP_PATTERNS = [
  /more about (that|this|it)/i,
  /tell me more/i,
  /more details?/i,
  /elaborate/i,
  /explain/i,
  /what else/i,
  /next one/i,
  /\bmore\b/i,
  /\bdetails?\b/i,
];

const GREETING_PATTERNS = [
  /^(hi|hello|hey|howdy|greetings)/i,
];

const HELP_PATTERNS = [
  /what can you do/i,
  /help/i,
  /how does this work/i,
];

@Injectable({
  providedIn: 'root'
})
export class ChatBotService {
  private messages: ChatMessage[] = [];
  private context: ConversationContext = {
    lastTopic: '',
    lastStories: [],
    lastDetailIndex: 0,
  };

  constructor(private readonly content: NewsContentService) {
    this.messages.push(this.makeBotMessage(
      `Hi! I'm your Wireline news assistant. Ask me about any topic — **Markets**, **World**, **Technology**, **Energy**, **Business**, or **Policy** — and I'll surface the latest coverage for you.`,
      []
    ));
  }

  getMessages(): ChatMessage[] {
    return this.messages;
  }

  sendMessage(userText: string): void {
    const trimmed = userText.trim();
    if (!trimmed) return;

    this.messages.push(this.makeUserMessage(trimmed));
    const reply = this.buildReply(trimmed);
    // Small defer so Angular change detection picks up both messages together
    setTimeout(() => this.messages.push(reply), 120);
  }

  clearHistory(): void {
    this.messages = [this.makeBotMessage(
      `Conversation cleared. Ask me about any topic to get started!`,
      []
    )];
    this.context = { lastTopic: '', lastStories: [], lastDetailIndex: 0 };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private buildReply(input: string): ChatMessage {
    const lower = input.toLowerCase();

    if (GREETING_PATTERNS.some(p => p.test(lower))) {
      return this.makeBotMessage(
        `Hello! What kind of news are you interested in today? Try asking about **Markets**, **Technology**, **Energy**, **World News**, or any other topic.`,
        []
      );
    }

    if (HELP_PATTERNS.some(p => p.test(lower))) {
      return this.makeBotMessage(
        `I can find news stories for you based on topics or keywords. Here's what you can try:\n\n- *"Show me technology news"*\n- *"What's happening in markets?"*\n- *"Energy sector updates"*\n- *"Tell me more"* — to expand on the last topic\n- *"What else?"* — for additional stories`,
        []
      );
    }

    // Follow-up: user wants more on the current context
    if (FOLLOWUP_PATTERNS.some(p => p.test(lower)) && this.context.lastStories.length > 0) {
      return this.handleFollowUp();
    }

    // Fresh topic query
    const matched = this.matchTopic(lower);
    if (matched.stories.length > 0) {
      this.context.lastTopic   = matched.topic;
      this.context.lastStories = matched.stories;
      this.context.lastDetailIndex = 0;
      const intro = matched.topic
        ? `Here are the latest stories on **${this.titleCase(matched.topic)}**:`
        : `I found some stories matching your query:`;
      return this.makeBotMessage(intro, matched.stories.slice(0, 3));
    }

    // Nothing matched — suggest topics
    this.context.lastStories = [];
    return this.makeBotMessage(
      `I couldn't find coverage for *"${input}"* in today's feed. You might like:\n\n- Markets\n- Technology\n- World News\n- Energy\n- Policy\n- Business`,
      []
    );
  }

  private handleFollowUp(): ChatMessage {
    const { lastStories, lastDetailIndex, lastTopic } = this.context;
    const next = lastDetailIndex + 3;

    if (next >= lastStories.length) {
      this.context.lastDetailIndex = 0; // wrap back
      return this.makeBotMessage(
        `That's all the **${this.titleCase(lastTopic)}** stories I have right now. Ask me about another topic or type a keyword to search.`,
        []
      );
    }

    const batch = lastStories.slice(next, next + 3);
    this.context.lastDetailIndex = next;
    return this.makeBotMessage(
      `More on **${this.titleCase(lastTopic)}**:`,
      batch
    );
  }

  private matchTopic(input: string): { topic: string; stories: NewsStory[] } {
    const home = this.content.getHomeContent();

    // Collect every story from all sources
    const all: NewsStory[] = [
      home.leadStory,
      home.spotlightStory,
      ...home.topHeadlines,
      ...home.sections.flatMap(s => s.stories),
    ];

    // Try section title or TOPIC_MAP keywords first (structured)
    for (const [topic, keywords] of Object.entries(TOPIC_MAP)) {
      if (keywords.some(kw => input.includes(kw))) {
        const section = home.sections.find(s => s.id === topic);
        if (section) {
          return { topic, stories: section.stories };
        }
        // fallthrough: do free-text search with topic keywords
        const matched = all.filter(s =>
          keywords.some(kw =>
            [s.title, s.summary, s.category].join(' ').toLowerCase().includes(kw)
          )
        );
        if (matched.length) return { topic, stories: this.dedupe(matched) };
      }
    }

    // Free-text search across all stories using the raw input words
    const words = input.split(/\s+/).filter(w => w.length > 2);
    const scored = all
      .map(s => {
        const haystack = [s.title, s.summary, s.category].join(' ').toLowerCase();
        const hits = words.filter(w => haystack.includes(w)).length;
        return { story: s, hits };
      })
      .filter(x => x.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .map(x => x.story);

    return { topic: '', stories: this.dedupe(scored) };
  }

  private dedupe(stories: NewsStory[]): NewsStory[] {
    const seen = new Set<string>();
    return stories.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }

  private makeBotMessage(content: string, stories: NewsStory[]): ChatMessage {
    return {
      id: this.uid(),
      role: 'bot',
      content,
      stories: stories.length > 0 ? stories : undefined,
      timestamp: new Date(),
    };
  }

  private makeUserMessage(content: string): ChatMessage {
    return { id: this.uid(), role: 'user', content, timestamp: new Date() };
  }

  private titleCase(s: string): string {
    return s.replace(/\b\w/g, c => c.toUpperCase());
  }

  private uid(): string {
    return Math.random().toString(36).slice(2);
  }
}
