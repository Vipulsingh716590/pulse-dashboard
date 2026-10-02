import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ApexOptions } from 'ng-apexcharts';
import { CheckIn } from '../../core/models';
import { addDays, average, formatDayShort, MOCK_TODAY, round, weekStart } from '../../core/utils/date';
import { Chart } from './chart';

type Key = 'energy' | 'focus' | 'stress';
const LINES: { key: Key; name: string; color: string }[] = [
  { key: 'energy', name: 'Energy', color: '#3fae6a' },
  { key: 'focus', name: 'Focus', color: '#2f6fed' },
  { key: 'stress', name: 'Stress', color: '#d9822b' },
];

/** Last 4 weeks, one weekly average per line, plus one plain sentence per line. */
@Component({
  selector: 'app-simple-trend',
  imports: [Chart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-chart [options]="options()" [height]="height()" />
    <ul class="lines">
      @for (s of sentences(); track s.key) {
        <li><span class="dot" [style.background]="s.color"></span>{{ s.text }}</li>
      }
    </ul>
  `,
  styles: `
    .lines { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; font-size: 0.86rem; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
  `,
})
export class SimpleTrend {
  readonly checkIns = input.required<CheckIn[]>();
  readonly height = input(220);

  private readonly weeks = computed(() => {
    const last = weekStart(MOCK_TODAY);
    return [3, 2, 1, 0].map((i) => addDays(last, -7 * i));
  });

  private readonly averages = computed(() =>
    LINES.map((l) => ({
      ...l,
      values: this.weeks().map((w) => {
        const list = this.checkIns().filter((c) => weekStart(c.date) === w);
        return list.length ? round(average(list.map((c) => c[l.key])), 1) : null;
      }),
    })),
  );

  protected readonly options = computed<ApexOptions>(() => ({
    chart: { type: 'line', zoom: { enabled: false } },
    series: this.averages().map((a) => ({ name: a.name, data: a.values })),
    colors: LINES.map((l) => l.color),
    stroke: { width: 3, curve: 'smooth' },
    markers: { size: 4 },
    xaxis: { categories: this.weeks().map((w, i) => (i === 3 ? 'This week' : 'Wk of ' + formatDayShort(w).replace(/^\w+ /, ''))) },
    yaxis: { min: 1, max: 5, tickAmount: 4 },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => (v == null ? '—' : `${v}/5`) } },
  }));

  protected readonly sentences = computed(() =>
    this.averages().map((a) => {
      const [prev, now] = a.values.slice(-2);
      if (now == null || prev == null) return { ...a, text: `${a.name}: not enough check-ins yet.` };
      const diff = round(now - prev, 1);
      const text =
        Math.abs(diff) < 0.2
          ? `${a.name} is steady at ${now}/5.`
          : `${a.name} is ${Math.abs(diff)} ${diff > 0 ? 'higher' : 'lower'} than last week (${now}/5).`;
      return { ...a, text };
    }),
  );
}
