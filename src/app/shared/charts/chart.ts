import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ApexOptions, ChartComponent } from 'ng-apexcharts';
import { ThemeService } from '../../core/services/theme.service';

/**
 * Thin wrapper around <apx-chart>: applies Pulse fonts, colors and light/dark theme,
 * and turns clicks on bars, slices and markers into a simple `pointSelect` index.
 */
@Component({
  selector: 'app-chart',
  imports: [ChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let o = merged();
    <apx-chart
      [chart]="o.chart"
      [series]="$any(o.series)"
      [colors]="o.colors"
      [labels]="o.labels"
      [xaxis]="o.xaxis"
      [yaxis]="o.yaxis"
      [plotOptions]="o.plotOptions"
      [dataLabels]="o.dataLabels"
      [legend]="o.legend"
      [stroke]="o.stroke"
      [fill]="o.fill"
      [markers]="o.markers"
      [tooltip]="o.tooltip"
      [grid]="o.grid"
      [states]="o.states"
      [annotations]="o.annotations"
      [responsive]="o.responsive"
      [theme]="o.theme"
      [noData]="o.noData"
    />
  `,
  styles: `
    :host { display: block; min-width: 0; }
  `,
})
export class Chart {
  private readonly theme = inject(ThemeService);

  readonly options = input.required<ApexOptions>();
  readonly height = input<number | string>(300);
  /** Emits the data point index that was clicked. */
  readonly pointSelect = output<number>();

  protected readonly merged = computed<ApexOptions>(() => {
    const o = this.options();
    const dark = this.theme.mode() === 'dark';
    const emit = (_e: unknown, _ctx: unknown, cfg?: { dataPointIndex?: number }) => {
      if (cfg?.dataPointIndex != null && cfg.dataPointIndex >= 0) this.pointSelect.emit(cfg.dataPointIndex);
    };
    return {
      ...o,
      chart: {
        height: this.height(),
        fontFamily: 'Inter Variable, Roboto, system-ui, sans-serif',
        foreColor: dark ? '#9ea3b5' : '#6b7185',
        background: 'transparent',
        toolbar: { show: false },
        animations: { enabled: true, speed: 400 },
        ...o.chart,
        type: o.chart?.type ?? 'line',
        events: { dataPointSelection: emit, markerClick: emit, ...o.chart?.events },
      },
      // slice gaps match the card background
      stroke: ['donut', 'pie', 'radialBar'].includes(o.chart?.type ?? '') ? { width: 2, colors: [dark ? '#1c1d24' : '#ffffff'], ...o.stroke } : o.stroke,
      grid: { borderColor: dark ? '#2f303a' : '#eceef4', strokeDashArray: 4, ...o.grid },
      tooltip: { theme: dark ? 'dark' : 'light', ...o.tooltip },
      theme: { mode: dark ? 'dark' : 'light', ...o.theme },
      legend: { fontSize: '12px', ...o.legend },
      dataLabels: { enabled: false, ...o.dataLabels },
      noData: { text: 'Loading…' },
    };
  });
}
