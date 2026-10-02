import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ReassignmentService, Suggestion } from '../../core/services/reassignment.service';
import { ViewingAsService } from '../../core/services/viewing-as.service';
import { TYPE_LABELS } from '../../core/utils/insights';

/** "Move <task> from E to C – reason: …" with large Approve / Dismiss buttons right under it. */
@Component({
  selector: 'app-reassign-card',
  imports: [MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = suggestion();
    <article class="sug" [class.none]="!s.to">
      <div class="move">
        <span class="avatar" [style.background]="s.from.avatarColor">{{ s.from.initials }}</span>
        <span class="material-symbols-outlined arrow" aria-hidden="true">arrow_forward</span>
        @if (s.to) {
          <span class="avatar" [style.background]="s.to.avatarColor">{{ s.to.initials }}</span>
        } @else {
          <span class="avatar empty">?</span>
        }
        <span class="pill" [class]="s.task.type">{{ typeLabel[s.task.type] }}</span>
      </div>
      <p class="what">
        @if (s.to) {
          Move <strong>{{ s.task.title }}</strong> from {{ s.from.shortName }} to {{ s.to.shortName }}
        } @else {
          <strong>{{ s.task.title }}</strong> needs a plan
        }
      </p>
      <p class="why">Reason: {{ s.reason }}</p>
      @if (s.to && s.loadAfter !== undefined) {
        <p class="why">{{ s.to.shortName }}'s load would go from {{ s.loadBefore }}% to {{ s.loadAfter }}%.</p>
      }
      @if (viewingAs.isManager()) {
        <div class="actions">
          @if (s.to) {
            <button mat-flat-button class="big-action" (click)="service.approve(s)">Approve</button>
          }
          <button mat-stroked-button class="big-action" (click)="service.dismiss(s)">Dismiss</button>
        </div>
      }
    </article>
  `,
  styles: `
    .sug {
      display: grid; gap: 8px; padding: 16px; border-radius: 14px;
      border: 1px solid color-mix(in srgb, var(--pulse-accent) 30%, var(--pulse-border));
      background: linear-gradient(135deg, var(--pulse-accent-soft), var(--pulse-surface) 80%);
    }
    .sug.none { border-color: var(--pulse-border); background: var(--pulse-surface-2); }
    .move { display: flex; align-items: center; gap: 8px; }
    .move .pill { margin-left: auto; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 0.72rem; font-weight: 600; }
    .avatar.empty { background: var(--status-offline); }
    .arrow { color: var(--pulse-muted); font-size: 20px; }
    p { margin: 0; }
    .what { font-size: 0.92rem; line-height: 1.4; }
    .why { font-size: 0.8rem; color: var(--pulse-muted); }
    .actions { display: flex; gap: 8px; margin-top: 4px; }
    .actions button { flex: 1; }
  `,
})
export class ReassignCard {
  protected readonly service = inject(ReassignmentService);
  protected readonly viewingAs = inject(ViewingAsService);
  protected readonly typeLabel = TYPE_LABELS;
  readonly suggestion = input.required<Suggestion>();
}
