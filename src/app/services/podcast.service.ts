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
    const cats = new Set(
      topics.map(t => TOPIC_TO_CATEGORY[t.toLowerCase()] ?? t.toLowerCase())
    );

    return this.all$.pipe(
      map(all => {
        const matched = all.filter(p => cats.has(p.category.toLowerCase()));
        const result  = matched.length > 0 ? matched : all;
        return result.slice(0, limit);
      }),
    );
  }
}
