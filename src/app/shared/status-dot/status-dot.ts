import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Status } from '../../core/models';

export const STATUS_META: Record<Status, { label: string; emoji: string }> = {
  working: { label: 'Working now', emoji: '🟢' },
  blocked: { label: 'Blocked', emoji: '🟡' },
  resting: { label: 'Resting', emoji: '🔵' },
  offline: { label: 'Offline', emoji: '⚪' },
  attention: { label: 'Needs attention', emoji: '🔴' },
};

/** The one status signal used on every screen: a colored dot, optionally with its label. */
@Component({
  selector: 'app-status-dot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="signal" [class]="status()" [attr.title]="label() ? null : shown()" role="img" [attr.aria-label]="shown()">
    <span class="dot"></span>@if (label()) {<span class="text">{{ shown() }}</span>}
  </span>`,
  styles: `
    .signal { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 500; white-space: nowrap; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--c); flex: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 18%, transparent); }
    .working { --c: var(--status-working); }
    .blocked { --c: var(--status-blocked); }
    .resting { --c: var(--status-resting); }
    .offline { --c: var(--status-offline); }
    .attention { --c: var(--status-attention); }
    .working .dot { animation: live 2s ease-in-out infinite; }
    @keyframes live { 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--c) 8%, transparent); } }
    @media (prefers-reduced-motion: reduce) { .working .dot { animation: none; } }
  `,
})
export class StatusDot {
  readonly status = input.required<Status>();
  /** Show the text label next to the dot. */
  readonly label = input(false);
  /** Override the default label, e.g. "Resting – unwell". */
  readonly text = input<string>('');

  protected readonly shown = computed(() => this.text() || STATUS_META[this.status()].label);
}
