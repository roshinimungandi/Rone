import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { VideoItem } from '../models/news.model';

interface VideoJsonItem {
  id: string;
  category: string;
  title: string;
  description: string;
  host: string;
  duration: string;
  videoUrl: string;
  thumbnailUrl: string;
}

const CATEGORY_THUMBNAILS: Record<string, string> = {
  market:     'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
  business:   'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&q=80',
  world:      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
  science:    'https://images.unsplash.com/photo-1532094349884-543290c4b56f?w=600&q=80',
  politics:   'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&q=80',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
};

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
export class VideoService {
  private all$: Observable<VideoJsonItem[]>;

  constructor(private http: HttpClient) {
    this.all$ = this.http
      .get<{ videos: VideoJsonItem[] }>('/assets/videos.json')
      .pipe(
        map(r => r.videos ?? []),
        catchError(() => of([] as VideoJsonItem[])),
      );
  }

  /**
   * Returns videos whose category matches any of the supplied topic strings.
   * Falls back to all videos when no topics match.
   */
  getByTopics(topics: string[], limit = 6): Observable<VideoItem[]> {
    const catList = topics.map(t => TOPIC_TO_CATEGORY[t.toLowerCase()] ?? t.toLowerCase());
    const cats = new Set(catList);
    const perCat = Math.max(1, Math.ceil(limit / cats.size));

    return this.all$.pipe(
      map(all => {
        const matched = all.filter(v => cats.has(v.category.toLowerCase()));
        if (matched.length === 0) {
          // No match at all — show up to limit from everything
          return all.slice(0, limit).map(v => this.mapToVideoItem(v));
        }
        // Take up to perCat items per category, preserving topic order
        const seen = new Map<string, number>();
        const result: VideoItem[] = [];
        for (const v of matched) {
          const cat = v.category.toLowerCase();
          const count = seen.get(cat) ?? 0;
          if (count < perCat) {
            seen.set(cat, count + 1);
            result.push(this.mapToVideoItem(v));
          }
          if (result.length >= limit) break;
        }
        return result;
      }),
    );
  }

  private mapToVideoItem(v: VideoJsonItem): VideoItem {
    const thumb = v.thumbnailUrl?.startsWith('http')
      ? v.thumbnailUrl
      : `https://picsum.photos/seed/${encodeURIComponent(v.id)}/600/338`;
    return {
      id:           v.id,
      category:     v.category,
      title:        v.title,
      description:  v.description,
      thumbnail:    thumb,
      channelTitle: v.host,
      publishedAt:  '',
      duration:     v.duration,
      videoUrl:     v.videoUrl,
      embeddable:   true,
    };
  }
}
