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
      @if (bars(); as b) {
        <div class="vs" [attr.aria-label]="'Web Team ' + value() + unit() + ', average other team ' + compare() + unit()">
          <span>Web Team</span>
          <strong>{{ value() }}{{ unit() }}</strong>
          <i><b class="web" [style.width.%]="b.web"></b></i>
          <span>{{ compareName() }}</span>
          <strong class="muted">{{ compare() }}{{ unit() }}</strong>
          <i><b [style.width.%]="b.others"></b></i>
        </div>
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
    .vs {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px dashed var(--pulse-border);
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 4px 10px;
      font-size: 0.76rem;
      color: var(--pulse-muted);
    }
    .vs i { grid-column: 1 / -1; margin-bottom: 4px; height: 6px; border-radius: 3px; background: color-mix(in srgb, var(--pulse-muted) 14%, transparent); overflow: hidden; }
    .vs b { display: block; height: 100%; border-radius: 3px; background: color-mix(in srgb, var(--pulse-muted) 55%, transparent); }
    .vs b.web { background: var(--pulse-accent); }
    .vs strong { color: var(--pulse-text); font-weight: 600; text-align: right; }
    .vs strong.muted { color: var(--pulse-muted); }
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
  /** Same figure for the average other team; shows a Web vs others bar pair. */
  readonly compare = input<number | null>(null);
  readonly compareName = input('Avg. other team');

  protected readonly bars = computed(() => {
    const other = this.compare();
    const web = Number(this.value());
    if (other === null || Number.isNaN(web)) return null;
    const max = Math.max(web, other) || 1;
    return { web: (web / max) * 100, others: (other / max) * 100 };
  });

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
