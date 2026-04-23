import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CollectionsService, SavedItem } from '../../services/collections.service';
import { AuthService } from '../../services/auth.service';
import { AppBuilderService } from '../../services/app-builder.service';

@Component({
  selector: 'app-collections',
  standalone: true,
  templateUrl: './collections.component.html',
  styleUrl: './collections.component.css',
})
export class CollectionsComponent {
  protected readonly collections = inject(CollectionsService);
  private readonly auth     = inject(AuthService);
  private readonly builder  = inject(AppBuilderService);
  private readonly router   = inject(Router);
  private readonly location = inject(Location);

  get currentUser() { return this.auth.currentUser(); }

  get isDark(): boolean {
    return this.builder.config().theme.mode === 'dark';
  }

  removeItem(id: string): void {
    this.collections.remove(id);
  }

  goBack(): void {
    this.location.back();
  }

  openItem(item: SavedItem): void {
    if (item.type === 'article') {
      this.router.navigate(['/article', item.id]);
    } else if (item.type === 'video' && item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  }

  shareItem(item: SavedItem, event: Event): void {
    event.stopPropagation();
    const url = item.url ?? window.location.href;
    if (navigator.share) {
      navigator.share({ title: item.title, text: item.summary ?? '', url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => alert('Link copied to clipboard!')).catch(() => {});
    }
  }

  typeLabel(type: SavedItem['type']): string {
    return { article: 'Article', video: 'Video', gallery: 'Gallery', podcast: 'Podcast' }[type] ?? type;
  }

  typeIcon(type: SavedItem['type']): string {
    return { article: '📰', video: '▶', gallery: '🖼', podcast: '🎙️' }[type] ?? '📌';
  }
}
