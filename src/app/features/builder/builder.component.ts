import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppBuilderService } from '../../services/app-builder.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { BuilderStage } from '../../models/rone.model';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.css',
})
export class BuilderComponent implements OnInit, AfterViewChecked {
  @ViewChild('msgList') private msgList!: ElementRef<HTMLElement>;

  protected inputText    = '';
  private shouldScroll   = false;
  protected showProgress = false;

  /** Reactive selectors from services */
  readonly messages     = computed(() => this.builder.messages());
  readonly stage        = computed(() => this.builder.stage());
  readonly config       = computed(() => this.builder.config());
  readonly isTyping     = computed(() => this.builder.isTyping());
  readonly currentUser  = computed(() => this.auth.currentUser());

  /** Map stages to human-readable progress labels */
  readonly progressSteps: ReadonlyArray<{ stage: BuilderStage; label: string }> = [
    { stage: 'topics',       label: 'Topics'        },
    { stage: 'content_types', label: 'Content Types' },
    { stage: 'theme',        label: 'Appearance'    },
    { stage: 'layout',       label: 'Layout'        },
    { stage: 'title',        label: 'App Name'      },
    { stage: 'confirmation', label: 'Confirm'       },
  ];

  private readonly stageOrder: BuilderStage[] = [
    'greeting', 'topics', 'content_types', 'markets', 'theme', 'layout', 'title', 'confirmation', 'generating', 'complete',
  ];

  constructor(
    private readonly builder: AppBuilderService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) {
      this.router.navigate(['/']);
      return;
    }
    // Start a fresh session so the greeting fires
    this.builder.startSession(user.name.split(' ')[0]);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  protected send(): void {
    const text = this.inputText.trim();
    if (!text || this.stage() === 'generating') return;
    this.inputText = '';
    this.shouldScroll = true;
    this.builder.sendMessage(text);
    // Sync global theme immediately whenever theme stage resolves
    this.themeService.set(this.config().theme.mode === 'dark');

    // Watch for completion so we can redirect (GEN step 5)
    const check = setInterval(() => {
      // Keep updating theme as stage progresses (theme stage resolves asynchronously)
      this.themeService.set(this.config().theme.mode === 'dark');
      if (this.builder.stage() === 'complete') {
        clearInterval(check);
        const app = this.builder.generatedApp();
        if (app) {
          setTimeout(() => this.router.navigate(['/app', app.id]), 2000);
        }
      }
    }, 500);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  protected logout(): void {
    this.themeService.reset();
    this.auth.logout();
    this.router.navigate(['/']);
  }

  protected isStageDone(step: { stage: BuilderStage }): boolean {
    const currentIdx = this.stageOrder.indexOf(this.stage());
    const stepIdx    = this.stageOrder.indexOf(step.stage);
    return currentIdx > stepIdx;
  }

  protected isStageActive(step: { stage: BuilderStage }): boolean {
    const cur = this.stage();
    // Markets is part of content_types flow
    if (step.stage === 'content_types') return cur === 'content_types' || cur === 'markets';
    return cur === step.stage;
  }

  /** Convert assistant markdown (**bold**, *italic*, newlines, bullet lists) to safe HTML. */
  protected formatMessage(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  protected get enabledTopics(): string {
    return this.config().topics.join(', ') || '—';
  }

  protected get enabledTypes(): string {
    const ct = this.config().contentTypes;
    return (Object.entries(ct) as [string, { enabled: boolean }][])
      .filter(([, v]) => v.enabled)
      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
      .join(', ') || '—';
  }

  private scrollToBottom(): void {
    try {
      const el = this.msgList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {
      // noop
    }
  }
}
