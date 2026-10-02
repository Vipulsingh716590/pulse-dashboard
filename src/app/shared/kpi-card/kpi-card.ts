import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { InfoTip } from '../info-tip/info-tip';

@Component({
  selector: 'app-kpi-card',
  imports: [InfoTip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kpi" [class.accent]="accent()">
      <div class="label">
        {{ label() }}
        @if (info()) {
          <app-info-tip [text]="info()!" />
        }
      </div>
      <div class="value">
        {{ value() }}<span class="unit">{{ unit() }}</span>
      </div>
      @if (delta() !== null) {
        <div class="delta" [class.up]="trend() === 'up'" [class.down]="trend() === 'down'">
          {{ trend() === 'up' ? '▲' : trend() === 'down' ? '▼' : '•' }} {{ deltaText() }}
          <span class="muted">{{ deltaLabel() }}</span>
        </div>
      } @else if (hint()) {
        <div class="delta muted">{{ hint() }}</div>
      }
    </div>
  `,
  styles: `
    .kpi {
      height: 100%;
      box-sizing: border-box;
      background: var(--pulse-surface);
      border: 1px solid var(--pulse-border);
      border-radius: var(--pulse-radius);
      box-shadow: var(--pulse-shadow);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .kpi.accent {
      background: linear-gradient(135deg, var(--pulse-accent-soft), var(--pulse-surface));
      border-color: color-mix(in srgb, var(--pulse-accent) 30%, transparent);
    }
    .label { font-size: 0.82rem; color: var(--pulse-muted); display: flex; align-items: center; gap: 4px; }
    .value { font-size: 1.9rem; font-weight: 650; letter-spacing: -0.02em; }
    .accent .value { color: var(--pulse-accent); }
    .unit { font-size: 1rem; font-weight: 500; margin-left: 2px; color: var(--pulse-muted); }
    .delta { font-size: 0.8rem; }
    .delta.up { color: var(--pulse-positive); }
    .delta.down { color: var(--pulse-caution); }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input('');
  /** Change vs previous period; null hides the line. */
  readonly delta = input<number | null>(null);
  readonly deltaUnit = input('%');
  readonly deltaLabel = input('');
  /** Set false when a decrease is good news (e.g. stress). */
  readonly higherIsBetter = input(true);
  readonly hint = input('');
  readonly info = input<string | null>(null);
  readonly accent = input(false);

  protected readonly trend = computed(() => {
    const d = this.delta() ?? 0;
    if (Math.abs(d) < 0.05) return 'flat';
    return d > 0 === this.higherIsBetter() ? 'up' : 'down';
  });
  protected readonly deltaText = computed(() => {
    const d = this.delta() ?? 0;
    return `${d > 0 ? '+' : ''}${d.toFixed(1)}${this.deltaUnit()}`;
  });
}
