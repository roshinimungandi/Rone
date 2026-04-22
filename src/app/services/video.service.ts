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
    const cats = new Set(
      topics.map(t => TOPIC_TO_CATEGORY[t.toLowerCase()] ?? t.toLowerCase())
    );

    return this.all$.pipe(
      map(all => {
        const matched = all.filter(v => cats.has(v.category.toLowerCase()));
        const result  = matched.length > 0 ? matched : all;
        return result.slice(0, limit).map(v => this.mapToVideoItem(v));
      }),
    );
  }

  private mapToVideoItem(v: VideoJsonItem): VideoItem {
    const thumb = v.thumbnailUrl?.startsWith('http')
      ? v.thumbnailUrl
      : (CATEGORY_THUMBNAILS[v.category.toLowerCase()] ?? 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80');
    return {
      id:           v.id,
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
