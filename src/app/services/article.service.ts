import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { NewsSection, NewsStory } from '../models/news.model';

/** Shape of a single article entry in the new articles.json */
interface ArticleEntry {
  id: string;
  category: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  publishedTime: string;
  url: string;
  thumbnailUrl: string;
}

/** The JSON shape: category key -> array of articles */
type ArticlesJson = Record<string, ArticleEntry[]>;

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=960&q=80';

@Injectable({ providedIn: 'root' })
export class ArticleService {
  private data$: Observable<ArticlesJson>;

  constructor(private http: HttpClient) {
    this.data$ = this.http
      .get<ArticlesJson>('/assets/articles.json')
      .pipe(
        catchError(() => of({} as ArticlesJson)),
        shareReplay(1),
      );
  }

  /**
   * Returns NewsSection[] for the given topics, filtered directly by category key.
   * Each topic maps to one section; only sections with articles are returned.
   */
  getByTopics(topics: string[], pageSize = 20): Observable<NewsSection[]> {
    return this.data$.pipe(
      map(data => {
        const perSection = Math.max(1, Math.ceil(pageSize / topics.length));

        const sections: NewsSection[] = topics
          .map(topic => {
            const key = topic.toLowerCase();
            const entries = data[key] ?? [];
            return {
              id: key,
              title: this.toTitleCase(topic),
              stories: entries.slice(0, perSection).map(e => this.mapToNewsStory(e)),
            };
          })
          .filter(s => s.stories.length > 0);

        // Fallback: return all articles if no topic matched
        if (sections.length === 0) {
          const all = Object.values(data).flat().slice(0, pageSize).map(e => this.mapToNewsStory(e));
          return [{ id: 'news', title: 'News', stories: all }];
        }

        return sections;
      }),
    );
  }

  /** Looks up a single article by id across all categories. */
  getById(id: string): Observable<NewsStory | null> {
    return this.data$.pipe(
      map(data => {
        const entry = Object.values(data).flat().find(e => e.id === id);
        return entry ? this.mapToNewsStory(entry) : null;
      }),
    );
  }

  private mapToNewsStory(e: ArticleEntry): NewsStory {
    const imageUrl = e.thumbnailUrl?.startsWith('http') ? e.thumbnailUrl : FALLBACK_IMAGE;
    return {
      id:        e.id,
      category:  this.toTitleCase(e.category),
      title:     e.title,
      summary:   e.shortDescription,
      timestamp: this.formatTs(e.publishedTime),
      readTime:  this.estimateReadTime(e.longDescription),
      imageUrl,
      author:    '',
      body:      [e.longDescription],
    };
  }

  private toTitleCase(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  private formatTs(iso: string): string {
    if (!iso) return 'recently';
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60_000);
      if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
      return `${Math.floor(hrs / 24)} days ago`;
    } catch { return 'recently'; }
  }

  private estimateReadTime(text: string): string {
    const words = (text ?? '').split(/\s+/).length;
    return `${Math.max(1, Math.round(words / 200))} min read`;
  }
}
