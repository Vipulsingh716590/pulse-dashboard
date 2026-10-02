import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
const KEY = 'pulse-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  readonly mode = signal<ThemeMode>(this.initial());

  constructor() {
    effect(() => {
      const dark = this.mode() === 'dark';
      this.doc.documentElement.classList.toggle('dark', dark);
      try {
        localStorage.setItem(KEY, this.mode());
      } catch {
        /* storage unavailable: theme just won't persist */
      }
    });
  }

  toggle(): void {
    this.mode.update((m) => (m === 'dark' ? 'light' : 'dark'));
  }

  private initial(): ThemeMode {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* ignore */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
