import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { DrillDown } from '../../core/utils/drilldown';

/** Month / Week / Day toggle + breadcrumb + clickable chips for any DrillDown. */
@Component({
  selector: 'app-drilldown-nav',
  imports: [MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let d = drill();
    <div class="row">
      <mat-button-toggle-group
        [value]="d.grain()"
        (change)="d.setGrain($event.value)"
        aria-label="Time granularity"
        hideSingleSelectionIndicator
      >
        <mat-button-toggle value="month">Month</mat-button-toggle>
        <mat-button-toggle value="week">Week</mat-button-toggle>
        <mat-button-toggle value="day">Day</mat-button-toggle>
      </mat-button-toggle-group>
      <nav class="crumbs" aria-label="Drill-down path">
        @for (p of d.trail(); track $index; let last = $last) {
          @if (last) {
            <strong>{{ p.label }}</strong>
          } @else {
            <button type="button" (click)="d.goTo($index)">{{ p.label }}</button><span class="sep">›</span>
          }
        }
      </nav>
    </div>
    @if (showChips()) {
      <div class="chips">
        <span class="muted small">Drill into:</span>
        @for (p of d.points(); track p.start) {
          <button type="button" class="chip" [class.active]="$index === d.highlighted()" (click)="d.drillInto($index)">
            {{ p.shortLabel }}
          </button>
        }
      </div>
    }
  `,
  styles: `
    .row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; font-size: 0.85rem; }
    .crumbs button {
      border: 0; background: none; padding: 0; color: var(--pulse-accent); cursor: pointer; font: inherit;
    }
    .crumbs button:hover { text-decoration: underline; }
    .sep { color: var(--pulse-muted); margin: 0 2px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 10px; }
    .chip {
      border: 1px solid var(--pulse-border); background: var(--pulse-surface-2); color: var(--pulse-text);
      border-radius: 999px; padding: 3px 10px; font: inherit; font-size: 0.78rem; cursor: pointer;
    }
    .chip:hover, .chip.active { border-color: var(--pulse-accent); color: var(--pulse-accent); }
    :host ::ng-deep .mat-button-toggle-appearance-standard .mat-button-toggle-label-content { line-height: 34px; padding: 0 14px; }
  `,
})
export class DrilldownNav {
  readonly drill = input.required<DrillDown>();
  readonly showChips = input(true);
}
