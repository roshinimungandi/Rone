import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PodcastItem } from '../models/news.model';

/**
 * Topic aliases: user-facing topic names (as stored in AppConfig.topics)
 * mapped to the category keys used in podcasts.json.
 */
const TOPIC_TO_CATEGORY: Record<string, string> = {
  markets:    'market',
  market:     'market',
  business:   'business',
  world:      'world',
  technology: 'technology',
  tech:       'technology',
  politics:   'politics',
  science:    'science',
};

@Injectable({ providedIn: 'root' })
export class PodcastService {
  private all$: Observable<PodcastItem[]>;

  constructor(private http: HttpClient) {
    this.all$ = this.http
      .get<PodcastItem[]>('/assets/podcasts.json')
      .pipe(
        catchError(() => of([] as PodcastItem[])),
      );
  }

  /**
   * Returns podcasts whose category matches any of the supplied topic strings.
   * Falls back to all podcasts when no topics match.
   */
  getByTopics(topics: string[], limit = 6): Observable<PodcastItem[]> {
    const catList = topics.map(t => TOPIC_TO_CATEGORY[t.toLowerCase()] ?? t.toLowerCase());
    const cats = new Set(catList);
    const perCat = Math.max(1, Math.ceil(limit / cats.size));

    return this.all$.pipe(
      map(all => {
        const matched = all.filter(p => cats.has(p.category.toLowerCase()));
        if (matched.length === 0) {
          return all.slice(0, limit);
        }
        // Take up to perCat items per category, preserving topic order
        const seen = new Map<string, number>();
        const result: PodcastItem[] = [];
        for (const p of matched) {
          const cat = p.category.toLowerCase();
          const count = seen.get(cat) ?? 0;
          if (count < perCat) {
            seen.set(cat, count + 1);
            result.push(p);
          }
          if (result.length >= limit) break;
        }
        return result;
      }),
    );
  }
}
