import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const KEY = 'pulse-sidebar-collapsed';

/** App frame: sidebar (bottom nav on phones), top bar, and the routed page. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Sidebar, Topbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <app-sidebar [collapsed]="collapsed()" (toggle)="toggleSidebar()" />
      <div class="main">
        <app-topbar [title]="title()" />
        <main>
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .shell { display: flex; min-height: 100vh; }
    .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    main { flex: 1; min-width: 0; }
    @media (max-width: 768px) {
      .shell { display: block; }
      main { padding-bottom: calc(var(--bottomnav-h) + env(safe-area-inset-bottom)); }
    }
  `,
})
export class Shell {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly collapsed = signal(this.initialCollapsed());

  /** Page title from the deepest route's data. */
  protected readonly title = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let r = this.route;
        while (r.firstChild) r = r.firstChild;
        return (r.snapshot.data['title'] as string) ?? '';
      }),
    ),
    { initialValue: '' },
  );

  protected toggleSidebar(): void {
    this.collapsed.update((v) => !v);
    try {
      localStorage.setItem(KEY, String(this.collapsed()));
    } catch {
      /* ignore */
    }
  }

  private initialCollapsed(): boolean {
    try {
      return localStorage.getItem(KEY) === 'true';
    } catch {
      return false;
    }
  }
}
