import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';

/** Small "ⓘ Based on…" marker shown wherever a framework drives the UI. */
@Component({
  selector: 'app-info-tip',
  imports: [MatTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button type="button" class="tip" [matTooltip]="text()" matTooltipClass="pulse-tip" [attr.aria-label]="text()">
    ⓘ@if (label()) {<span>{{ label() }}</span>}
  </button>`,
  styles: `
    .tip {
      border: 0;
      background: none;
      padding: 0 2px;
      color: var(--pulse-muted);
      font: inherit;
      font-size: 0.85rem;
      cursor: help;
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }
    span { font-size: 0.75rem; }
  `,
})
export class InfoTip {
  readonly text = input.required<string>();
  /** Optional visible label, e.g. "Based on WHO-5". */
  readonly label = input('');
}
