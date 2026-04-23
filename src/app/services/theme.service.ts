import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const LS_KEY = 'rone_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private get isBrowser() { return isPlatformBrowser(this.platformId); }

  private readonly _isDark = signal(false);
  readonly isDark = this._isDark.asReadonly();

  constructor() {
    if (this.isBrowser) {
      const saved = localStorage.getItem(LS_KEY);
      // Restore persisted preference; default is light
      if (saved === 'dark') {
        this._isDark.set(true);
        document.body.classList.add('dark-mode');
      } else {
        // 'light' or no preference → ensure light
        this._isDark.set(false);
        document.body.classList.remove('dark-mode');
      }
    }
  }

  /** Apply dark (true) or light (false) globally and persist. */
  set(dark: boolean): void {
    this._isDark.set(dark);
    if (this.isBrowser) {
      document.body.classList.toggle('dark-mode', dark);
      localStorage.setItem(LS_KEY, dark ? 'dark' : 'light');
    }
  }

  /** Reset to light mode and clear persistence (called on sign-out). */
  reset(): void {
    this.set(false);
    if (this.isBrowser) {
      localStorage.removeItem(LS_KEY);
    }
  }
}
