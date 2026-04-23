import {
  Component,
  HostBinding,
  HostListener,
  Inject,
  OnInit,
  PLATFORM_ID,
  signal,
  computed,
  afterNextRender,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser, TitleCasePipe, Location } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppBuilderService } from '../../services/app-builder.service';
import { AuthService } from '../../services/auth.service';
import { CollectionsService, SavedItem } from '../../services/collections.service';
import { NewsContentService } from '../../services/news-content.service';
import { PodcastService } from '../../services/podcast.service';
import { VideoService } from '../../services/video.service';
import { AppConfig, GeneratedApp } from '../../models/rone.model';
import { MarketTicker, NewsSection, VideoItem, PodcastItem } from '../../models/news.model';

interface FloatingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-generated-app',
  standalone: true,
  imports: [FormsModule, TitleCasePipe, RouterLink],
  templateUrl: './generated-app.component.html',
  styleUrl: './generated-app.component.css',
})
export class GeneratedAppComponent implements OnInit {
  protected app: GeneratedApp | null = null;
  protected notFound = false;

  // Floating assistant state (GEN-008)
  protected readonly assistantOpen        = signal(false);
  protected readonly showAccountMenu       = signal(false);
  protected readonly showSubscriptionModal = signal(false);
  protected readonly showUpgradePrompt     = signal(false);
  protected readonly savedToast            = signal<{title: string; removing: boolean} | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  protected assistantInput = '';
  protected readonly floatMessages = signal<FloatingMessage[]>([]);
  protected assistantTyping = false;

  // Section data
  protected filteredSections: NewsSection[] = [];
  protected marketData: MarketTicker[] = [];
  protected readonly videoItems      = signal<VideoItem[]>([]);
  protected readonly podcastItems    = signal<PodcastItem[]>([]);
  protected readonly loadingArticles = signal(true);
  protected readonly loadingVideos   = signal(true);
  protected readonly loadingPodcasts = signal(true);

  // Inline video player modal
  protected readonly activeVideo    = signal<VideoItem | null>(null);
  protected readonly videoEmbedError = signal(false);
  protected readonly activeVideoId  = computed(() => {
    const v = this.activeVideo();
    if (!v) return null;
    const match = v.videoUrl.match(/[?&]v=([^&]+)/);
    return match?.[1] ?? v.id.replace(/^yt-/, '');
  });
  /** True when the active video is a direct file URL (MP4 etc.) rather than YouTube. */
  protected readonly isDirectVideo = computed(() => {
    const v = this.activeVideo();
    if (!v) return false;
    return !v.videoUrl.includes('youtube.com') && !v.videoUrl.includes('youtu.be');
  });

  protected readonly safeVideoUrl = computed<SafeResourceUrl | null>(() => {
    const v = this.activeVideo();
    if (!v || !this.isDirectVideo()) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(v.videoUrl);
  });

  protected readonly safeEmbedUrl = computed<SafeResourceUrl | null>(() => {
    if (this.isDirectVideo()) return null;
    const id = this.activeVideoId();
    if (!id) return null;
    // enablejsapi=1 makes YouTube send postMessage events so we can detect errors
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`
    );
  });

  // ── Computed theming ──────────────────────────────────────────────────────
  readonly config    = computed(() => this.builder.config());
  readonly isLive    = computed(() => this.contentService.isLive());
  readonly loadState = computed(() => this.contentService.loadingState());

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.activeVideo()) this.closeVideo();
    if (this.showSubscriptionModal()) this.closeSubscriptionModal();
    if (this.showUpgradePrompt()) this.showUpgradePrompt.set(false);
  }

  @HostBinding('style')
  get themeVars(): string {
    if (!this.app) return '';
    const c = this.app.config;
    return [
      `--g-primary:    ${c.theme.colors.primary}`,
      `--g-accent:     ${c.theme.colors.accent}`,
      `--g-secondary:  ${c.theme.colors.secondary}`,
      `--g-bg:         ${c.theme.colors.background}`,
      `--g-text:       ${c.theme.colors.text}`,
      `--g-columns:    ${c.layout.columns}`,
    ].join('; ');
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly builder: AppBuilderService,
    private readonly auth: AuthService,
    private readonly collectionsService: CollectionsService,
    private readonly contentService: NewsContentService,
    private readonly podcastService: PodcastService,
    private readonly videoService: VideoService,
    private readonly sanitizer: DomSanitizer,
    private readonly location: Location,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {
    // afterNextRender must be called in an injection context (constructor).
    // It fires once in the browser after the first render cycle completes.
    afterNextRender(() => {
      this.loadVideos();
      this.loadPodcasts();
      // YouTube IFrame API sends postMessage events when a video errors.
      // Error codes 101 & 150 = owner blocked embedding; 100 = video not found.
      window.addEventListener('message', (evt: MessageEvent) => {
        if (evt.origin !== 'https://www.youtube.com') return;
        try {
          const data = JSON.parse(evt.data as string);
          if (data.event === 'onError' && [2, 100, 101, 150].includes(data.info as number)) {
            this.videoEmbedError.set(true);
          }
        } catch { /* non-JSON postMessage — ignore */ }
      });
    });
  }

  ngOnInit(): void {
    const appId = this.route.snapshot.paramMap.get('appId') ?? '';
    const loaded = this.builder.loadApp(appId);

    if (!loaded) {
      this.notFound = true;
      return;
    }

    this.app = loaded;
    this.loadContent();
    this.pushFloatAssistant(
      `Hi! I'm the Rone assistant for your **${this.appTitle}** app.\n\n` +
      `You can ask me to:\n` +
      `- Switch to **dark/light mode**\n` +
      `- Change the **accent colour** (e.g., "make it blue")\n` +
      `- Change the **layout** (grid, magazine, list)\n` +
      `- **Add a topic** — I'll ask where you want it placed\n` +
      `- **Remove a topic** (e.g., "remove Markets")`
    );
  }

  get appTitle(): string {
    return this.app?.config.layout.header.appTitle ?? 'My Reuters';
  }

  get isSticky(): boolean {
    return this.app?.config.layout.header.style === 'sticky';
  }

  get isDark(): boolean {
    return this.app?.config.theme.mode === 'dark';
  }

  get fontClass(): string {
    const ff = this.app?.config.typography.fontFamily ?? 'sans-serif';
    return `font-${ff}`;
  }

  get layoutClass(): string {
    return `layout-${this.app?.config.layout.style ?? 'magazine'}`;
  }

  get cardClasses(): string {
    if (!this.app) return '';
    const c = this.app.config;
    return [
      `card-size-${c.cardSize ?? 'normal'}`,
      `card-effect-${c.cardEffect ?? 'none'}`,
      `card-radius-${c.borderRadius ?? 'small'}`,
    ].join(' ');
  }

  /** Ordered, enabled sections (GEN-005 / PRS Section 9.8). */
  get orderedSections(): string[] {
    if (!this.app) return [];
    const cfg = this.app.config;
    return cfg.sectionOrder.filter(s => {
      if (s === 'markets')   return cfg.contentTypes.markets.enabled;
      if (s === 'articles')  return cfg.contentTypes.articles.enabled;
      if (s === 'videos')    return cfg.contentTypes.videos.enabled;
      if (s === 'galleries') return cfg.contentTypes.galleries.enabled;
      if (s === 'podcasts')  return cfg.contentTypes.podcasts.enabled;
      return false;
    });
  }

  // ── Floating assistant ────────────────────────────────────────────────────

  protected toggleAssistant(): void { this.assistantOpen.update(v => !v); }
  protected closeAssistant(): void  { this.assistantOpen.set(false); }

  protected sendAssistantMessage(): void {
    const text = this.assistantInput.trim();
    if (!text) return;
    this.assistantInput = '';
    this.pushFloatUser(text);
    this.assistantTyping = true;

    setTimeout(() => {
      this.assistantTyping = false;
      const response = this.builder.processEditCommand(text);
      this.pushFloatAssistant(response);
      // Reload content after mutation
      if (this.app) {
        this.app = this.builder.loadApp(this.app.id);
        this.loadContent();
        this.loadVideos();
        this.loadPodcasts();
      }
    }, 800);
  }

  protected onAssistantKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendAssistantMessage(); }
  }

  // ── Account menu ──────────────────────────────────────────────────────────

  protected toggleAccountMenu(): void { this.showAccountMenu.update(v => !v); }
  protected closeAccountMenu(): void  { this.showAccountMenu.set(false); }

  protected manageApp(): void {
    this.showAccountMenu.set(false);
    this.router.navigate(['/builder']);
  }

  protected openSubscriptionStatus(): void {
    this.showAccountMenu.set(false);
    this.showSubscriptionModal.set(true);
  }

  protected closeSubscriptionModal(): void {
    this.showSubscriptionModal.set(false);
  }

  /** Computed subscription details for the modal. */
  get subscriptionDetails() {
    const user = this.currentUser;
    if (!user) return null;
    const isPro = user.subscription === 'professional';
    // POC: simulate a fixed expiry 18 days from now for professional, 45 days for basic
    const daysLeft  = isPro ? 18 : 45;
    const renewDate = new Date();
    renewDate.setDate(renewDate.getDate() + daysLeft);
    const renewStr  = renewDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    return {
      plan:      isPro ? 'Professional' : 'Basic',
      price:     isPro ? '$9.99 / month' : 'Free',
      status:    daysLeft <= 7 ? 'expiring-soon' : 'active',
      statusLabel: daysLeft <= 7 ? 'Expiring Soon' : 'Active',
      daysLeft,
      renewDate: renewStr,
      features: isPro
        ? ['Unlimited topics', 'Real-time content refresh', 'Full theme customisation', 'Video & markets data', 'Custom layouts & card styles', 'Priority support']
        : ['Up to 3 topics', 'Standard content refresh', 'Light & dark themes'],
      upgrade: isPro ? null : {
        plan:  'Professional',
        price: '$9.99 / month',
        perks: ['Everything in Basic', 'Unlimited topics', 'Real-time refresh', 'Video & markets data', 'Custom layouts'],
      },
    };
  }

  protected signOut(): void {
    this.auth.logout();
    this.showAccountMenu.set(false);
    this.router.navigate(['/']);
  }

  /** Format floating assistant markdown for innerHTML */
  protected formatFloat(text: string): string {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  protected goToBuilder(): void {
    this.router.navigate(['/builder']);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private loadContent(): void {
    if (!this.app) return;
    const cfg = this.app.config;
    this.loadingArticles.set(true);

    this.contentService.fetchByTopics(cfg.topics, 20).subscribe({
      next: (sections) => {
        this.filteredSections = sections;
        this.loadingArticles.set(false);
      },
      error: () => {
        this.filteredSections = [];
        this.loadingArticles.set(false);
      },
    });

    this.marketData = this.contentService.getHomeContent().marketTicker;
  }

  private loadPodcasts(): void {
    if (!this.app) return;
    const topics = this.app.config.topics?.length ? this.app.config.topics : ['world'];
    this.loadingPodcasts.set(true);
    this.podcastService.getByTopics(topics, topics.length * 3).subscribe({
      next:  (pods) => { this.podcastItems.set(pods);  this.loadingPodcasts.set(false); },
      error: ()     => { this.podcastItems.set([]);    this.loadingPodcasts.set(false); },
    });
  }

  /** Runs browser-side only (safe from SSR hydration). */
  protected playVideo(item: VideoItem): void {
    // embeddable: false means the owner blocked iframe embedding — open on YouTube
    if (item.embeddable === false) {
      window.open(item.videoUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    this.videoEmbedError.set(false);
    this.activeVideo.set(item);
  }

  protected closeVideo(): void {
    this.videoEmbedError.set(false);
    this.activeVideo.set(null);
  }

  private loadVideos(): void {
    if (!this.app) return;
    const topics = this.app.config.topics?.length ? this.app.config.topics : ['world'];
    this.loadingVideos.set(true);
    this.videoService.getByTopics(topics, topics.length * 3).subscribe({
      next:  (vids) => { this.videoItems.set(vids); this.loadingVideos.set(false); },
      error: ()     => { this.videoItems.set([]);   this.loadingVideos.set(false); },
    });
  }

  private pushFloatUser(content: string): void {
    this.floatMessages.update(m => [...m, { id: `f-${Date.now()}-u`, role: 'user', content }]);
  }

  private pushFloatAssistant(content: string): void {
    this.floatMessages.update(m => [...m, { id: `f-${Date.now()}-a`, role: 'assistant', content }]);
  }

  get currentUser() { return this.auth.currentUser(); }

  get canSaveShare(): boolean {
    return this.currentUser?.subscription === 'professional';
  }

  private categoryToTopicLabel(category: string): string {
    const map: Record<string, string> = {
      market: 'Markets', markets: 'Markets',
      business: 'Business', world: 'World',
      technology: 'Technology', tech: 'Technology',
      politics: 'Politics', science: 'Science',
    };
    const key = (category ?? '').toLowerCase();
    return map[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'General');
  }

  get groupedVideos(): { topic: string; items: import('../../models/news.model').VideoItem[] }[] {
    const groups = new Map<string, import('../../models/news.model').VideoItem[]>();
    for (const item of this.videoItems()) {
      const label = this.categoryToTopicLabel(item.category);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(item);
    }
    const topicOrder = (this.app?.config.topics ?? []).map(t => this.categoryToTopicLabel(t));
    return Array.from(groups.entries())
      .map(([topic, items]) => ({ topic, items }))
      .sort((a, b) => {
        const ai = topicOrder.indexOf(a.topic);
        const bi = topicOrder.indexOf(b.topic);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
  }

  get groupedPodcasts(): { topic: string; items: import('../../models/news.model').PodcastItem[] }[] {
    const groups = new Map<string, import('../../models/news.model').PodcastItem[]>();
    for (const item of this.podcastItems()) {
      const label = this.categoryToTopicLabel(item.category);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(item);
    }
    const topicOrder = (this.app?.config.topics ?? []).map(t => this.categoryToTopicLabel(t));
    return Array.from(groups.entries())
      .map(([topic, items]) => ({ topic, items }))
      .sort((a, b) => {
        const ai = topicOrder.indexOf(a.topic);
        const bi = topicOrder.indexOf(b.topic);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
  }

  isSaved(id: string): boolean {
    return this.collectionsService.isSaved(id);
  }

  // ── Unified save helper ──────────────────────────────────────────────────

  toggleSave(item: SavedItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.canSaveShare) {
      this.showUpgradePrompt.set(true);
      return;
    }
    this.collectionsService.toggleSave(item);
    // Show toast only when saving (not when removing)
    if (this.collectionsService.isSaved(item.id)) {
      this.showSavedToast(item.title);
    } else {
      this.savedToast.set(null);
    }
  }

  private showSavedToast(title: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.savedToast.set({ title, removing: false });
    this.toastTimer = setTimeout(() => {
      this.savedToast.update(t => t ? { ...t, removing: true } : null);
      setTimeout(() => this.savedToast.set(null), 350);
    }, 4000);
  }

  shareItem(item: SavedItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.canSaveShare) {
      this.showUpgradePrompt.set(true);
      return;
    }
    const url = item.url ?? window.location.origin;
    if (navigator.share) {
      navigator.share({ title: item.title, text: item.summary ?? '', url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url)
        .then(() => alert('Link copied to clipboard!'))
        .catch(() => {});
    }
  }

  // ── SavedItem factory helpers ──────────────────────────────────────────────

  storyToSavedItem(story: import('../../models/news.model').NewsStory): SavedItem {
    return {
      id: story.id,
      type: 'article',
      title: story.title,
      summary: story.summary,
      imageUrl: story.imageUrl,
      category: story.category,
      timestamp: story.timestamp,
      url: (story as any)['url'] ?? (window?.location?.origin + '/article/' + story.id),
    };
  }

  videoToSavedItem(item: VideoItem): SavedItem {
    return {
      id: item.id,
      type: 'video',
      title: item.title,
      summary: item.description,
      imageUrl: item.thumbnail,
      category: 'Video',
      timestamp: item.publishedAt,
      url: item.videoUrl,
      meta: item.channelTitle + (item.duration ? ' · ' + item.duration : ''),
    };
  }

  galleryToSavedItem(item: {title: string; cat: string; imgs: number}): SavedItem {
    return {
      id: 'gallery-' + item.title.replace(/\s+/g, '-').toLowerCase(),
      type: 'gallery',
      title: item.title,
      category: item.cat,
      meta: item.imgs + ' photos',
    };
  }

  podcastToSavedItem(item: PodcastItem): SavedItem {
    return {
      id: item.id,
      type: 'podcast',
      title: item.title,
      summary: item.description,
      imageUrl: item.imageUrl,
      category: item.category,
      meta: item.host + ' · ' + item.duration,
      url: item.audioUrl,
    };
  }

  // Keep legacy wrappers so existing article HTML still compiles
  toggleSave_legacy(story: import('../../models/news.model').NewsStory, event: Event): void {
    this.toggleSave(this.storyToSavedItem(story), event);
  }

  shareArticle(story: import('../../models/news.model').NewsStory, event: Event): void {
    this.shareItem(this.storyToSavedItem(story), event);
  }

  goToCollections(): void {
    this.showAccountMenu.set(false);
    if (!this.canSaveShare) {
      this.showUpgradePrompt.set(true);
      return;
    }
    this.router.navigate(['/collections']);
  }
}
