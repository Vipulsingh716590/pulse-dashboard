import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ViewingAsService } from '../../core/services/viewing-as.service';

/** Shown on manager pages while "Viewing as" is a developer. */
@Component({
  selector: 'app-manager-only',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card note">
      <span class="material-symbols-outlined" aria-hidden="true">visibility_lock</span>
      <h2>{{ title() }} is the manager's view</h2>
      <p class="muted">You're viewing as {{ viewingAs.person()?.name }}. Switch to Manager to see it, or open your own space.</p>
      <div class="actions">
        <button mat-flat-button class="big-action" (click)="viewingAs.set('mgr')">View as Manager</button>
      </div>
    </div>
  `,
  styles: `
    .note { max-width: 520px; margin: 48px auto; text-align: center; display: grid; gap: 8px; justify-items: center; }
    .material-symbols-outlined { font-size: 40px; color: var(--pulse-muted); }
    p { margin: 0; }
    .actions { margin-top: 8px; }
  `,
})
export class ManagerOnly {
  protected readonly viewingAs = inject(ViewingAsService);
  readonly title = input('This page');
}
