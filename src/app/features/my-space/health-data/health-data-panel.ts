import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApexOptions } from 'ng-apexcharts';
import { WearableReading } from '../../../core/models';
import { WEARABLE_PROVIDER } from '../../../core/services/wearable.service';
import { addDays, formatDayShort, MOCK_TODAY } from '../../../core/utils/date';
import { Chart } from '../../../shared/charts/chart';

const DEVICES = ['Fitbit', 'Garmin', 'Oura Ring', 'Apple Health', 'Google Health Connect'];

/**
 * Private smartwatch panel. Opened only from the developer's own My Space;
 * nothing here is stored in TeamStore, so the manager views can never read it.
 */
@Component({
  selector: 'app-health-data-panel',
  imports: [MatButtonModule, MatSlideToggleModule, Chart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './health-data-panel.html',
  styleUrl: './health-data-panel.scss',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class HealthDataPanel {
  private readonly provider = inject(WEARABLE_PROVIDER);

  readonly personId = input.required<string>();
  readonly closed = output<void>();

  protected readonly deviceName = this.provider.deviceName;
  protected readonly devices = DEVICES;
  protected readonly connected = signal(true);
  protected readonly comingSoon = signal<string | null>(null);
  protected readonly readings = signal<WearableReading[]>([]);

  constructor() {
    effect((onCleanup) => {
      const sub = this.provider.readings(this.personId(), addDays(MOCK_TODAY, -6), MOCK_TODAY).subscribe((r) => this.readings.set(r));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected readonly today = computed(() => this.readings().at(-1));

  /** Gentle, non-diagnostic notes when a value is outside the usual range. */
  protected readonly notes = computed(() => {
    const t = this.today();
    const list = this.readings();
    if (!t) return [];
    const usualRhr = list.slice(0, -1).reduce((s, r) => s + r.restingHeartRate, 0) / Math.max(1, list.length - 1);
    const out: string[] = [];
    if (t.skinTempDeltaC >= 0.6) out.push(`Your skin temperature is ${t.skinTempDeltaC} °C above your normal. Consider resting and checking with a thermometer.`);
    if (t.restingHeartRate - usualRhr >= 6) out.push(`Your resting heart rate is ${Math.round(t.restingHeartRate - usualRhr)} bpm higher than your usual. A lighter day may help.`);
    if ((t.systolic ?? 0) >= 130 || (t.diastolic ?? 0) >= 85) out.push('Your blood pressure reading is a little higher than the usual range. If this repeats, talk to a doctor.');
    if (t.stressScore >= 60) out.push('Your watch shows a high stress score today. A short walk or a few slow breaths can help.');
    return out;
  });

  protected readonly heartChart = computed<ApexOptions>(() => ({
    chart: { type: 'line', zoom: { enabled: false } },
    series: [
      { name: 'Resting HR', data: this.readings().map((r) => r.restingHeartRate) },
      { name: 'Avg HR', data: this.readings().map((r) => r.heartRate) },
    ],
    colors: ['#e05a5a', '#f0a3a3'],
    stroke: { width: 3, curve: 'smooth', dashArray: [0, 4] },
    markers: { size: 3 },
    xaxis: { categories: this.readings().map((r) => this.day(r.date)) },
    yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => `${v} bpm` } },
  }));

  protected readonly bpChart = computed<ApexOptions>(() => ({
    chart: { type: 'line', zoom: { enabled: false } },
    series: [
      { name: 'Systolic', data: this.readings().map((r) => r.systolic ?? null) },
      { name: 'Diastolic', data: this.readings().map((r) => r.diastolic ?? null) },
    ],
    colors: ['#6d5dd3', '#2f6fed'],
    stroke: { width: 3, curve: 'smooth' },
    markers: { size: 3 },
    xaxis: { categories: this.readings().map((r) => this.day(r.date)) },
    yaxis: { min: 60, max: 150, tickAmount: 3 },
    legend: { position: 'top', horizontalAlign: 'left' },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => `${v} mmHg` } },
  }));

  protected connect(device: string): void {
    this.comingSoon.set(`${device}: coming soon – using demo data for now.`);
  }

  private day(date: string): string {
    return date === MOCK_TODAY ? 'Today' : formatDayShort(date);
  }
}
