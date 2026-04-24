import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const LS_KEY = 'rone_collections';

export type SavedItemType = 'article' | 'video' | 'gallery' | 'podcast';

export interface SavedItem {
  id: string;
  type: SavedItemType;
  title: string;
  summary?: string;
  imageUrl?: string;
  category?: string;
  timestamp?: string;
  /** Original source URL for sharing */
  url?: string;
  /** Extra metadata (channel title for videos, episode info for podcasts, etc.) */
  meta?: string;
}

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private readonly platformId = inject(PLATFORM_ID);
  private get isBrowser() { return isPlatformBrowser(this.platformId); }

  readonly savedItems = signal<SavedItem[]>(this.load());

  isSaved(id: string): boolean {
    return this.savedItems().some(s => s.id === id);
  }

  toggleSave(item: SavedItem): void {
    if (this.isSaved(item.id)) {
      this.savedItems.update(s => s.filter(a => a.id !== item.id));
    } else {
      this.savedItems.update(s => [item, ...s]);
    }
    this.persist();
  }

  remove(id: string): void {
    this.savedItems.update(s => s.filter(a => a.id !== id));
    this.persist();
  }

  private load(): SavedItem[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SavedItem[];
      // Migrate old NewsStory format that has no 'type' field
      return parsed.map(item => item.type ? item : { ...item, type: 'article' as SavedItemType });
    } catch { return []; }
  }

  private persist(): void {
    if (!this.isBrowser) return;
    localStorage.setItem(LS_KEY, JSON.stringify(this.savedItems()));
  }
}
