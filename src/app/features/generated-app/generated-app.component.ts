import {
  Component,
  HostBinding,
  Inject,
  OnInit,
  PLATFORM_ID,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser, TitleCasePipe } from '@angular/common';
import { AppBuilderService } from '../../services/app-builder.service';
import { AuthService } from '../../services/auth.service';
import { NewsContentService } from '../../services/news-content.service';
import { AppConfig, GeneratedApp } from '../../models/rone.model';
import { MarketTicker, NewsSection } from '../../models/news.model';

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
  protected readonly assistantOpen = signal(false);
  protected readonly showAccountMenu = signal(false);
  protected assistantInput = '';
  protected readonly floatMessages = signal<FloatingMessage[]>([]);
  protected assistantTyping = false;

  // Section data
  protected filteredSections: NewsSection[] = [];
  protected marketData: MarketTicker[] = [];

  // ── Computed theming ──────────────────────────────────────────────────────
  readonly config = computed(() => this.builder.config());

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
    private readonly contentService: NewsContentService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

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
      `- **Add or remove topics**`
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

  protected goToBuilder(): void { this.router.navigate(['/builder']); }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private loadContent(): void {
    if (!this.app) return;
    const cfg         = this.app.config;
    const allContent  = this.contentService.getHomeContent();
    const topicLower  = cfg.topics.map(t => t.toLowerCase());

    // Filter sections by user's topics
    this.filteredSections = allContent.sections.filter(s =>
      // Section ID or title loosely matches any selected topic
      topicLower.some(t =>
        s.id.toLowerCase().includes(t) ||
        s.title.toLowerCase().includes(t) ||
        this.topicMatchesSection(t, s.id),
      ),
    );

    // If no sections match, fall back to all sections (avoid empty app)
    if (this.filteredSections.length === 0) {
      this.filteredSections = allContent.sections;
    }

    this.marketData = allContent.marketTicker;
  }

  private topicMatchesSection(topicLower: string, sectionId: string): boolean {
    const map: Record<string, string[]> = {
      technology: ['technology', 'tech'],
      markets:    ['markets', 'business', 'finance'],
      business:   ['markets', 'business'],
      world:      ['world'],
      politics:   ['world', 'politics'],
      energy:     ['world', 'markets'],
    };
    return (map[topicLower] ?? []).includes(sectionId);
  }

  private pushFloatUser(content: string): void {
    this.floatMessages.update(m => [...m, { id: `f-${Date.now()}-u`, role: 'user', content }]);
  }

  private pushFloatAssistant(content: string): void {
    this.floatMessages.update(m => [...m, { id: `f-${Date.now()}-a`, role: 'assistant', content }]);
  }

  get currentUser() { return this.auth.currentUser(); }
}
