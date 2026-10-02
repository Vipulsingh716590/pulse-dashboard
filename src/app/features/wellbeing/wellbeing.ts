import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ApexOptions } from 'ng-apexcharts';
import { CheckIn } from '../../core/models';
import { FilterService } from '../../core/services/filter.service';
import { TeamStore } from '../../core/services/team-store.service';
import { addDays, average, formatDay, formatDayShort, MOCK_TODAY, round, weekStart } from '../../core/utils/date';
import { burnoutSignals, FRAMEWORK_TIPS, isFlowHour, isUnwell, who5Score } from '../../core/utils/insights';
import { Chart } from '../../shared/charts/chart';
import { InfoTip } from '../../shared/info-tip/info-tip';
import { KpiCard } from '../../shared/kpi-card/kpi-card';

/** Below this many check-ins in a range, averages are hidden so nobody can be singled out. */
const MIN_GROUP = 3;
const WEEKS = 6;

/** Team-level wellbeing. Aggregated only: no individual scores or labels on this page. */
@Component({
  selector: 'app-wellbeing',
  imports: [KpiCard, Chart, InfoTip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wellbeing.html',
  styleUrl: './wellbeing.scss',
})
export class WellbeingPage {
  private readonly store = inject(TeamStore);
  protected readonly filter = inject(FilterService);
  protected readonly tips = FRAMEWORK_TIPS;
  protected readonly weekLabel = formatDay;
  protected readonly people = computed(() => this.store.members().length);

  private readonly span = computed(() => ({ today: 1, week: 7, month: 30 })[this.filter.range()]);
  private readonly current = computed(() => this.between(this.filter.from(), MOCK_TODAY));
  private readonly previous = computed(() => this.between(addDays(this.filter.from(), -this.span()), addDays(this.filter.from(), -1)));

  private between(from: string, to: string): CheckIn[] {
    return this.store.checkIns().filter((c) => c.date >= from && c.date <= to);
  }

  protected readonly kpis = computed(() => {
    const cur = this.current();
    const prev = this.previous();
    const enough = cur.length >= MIN_GROUP;
    const avg = (list: CheckIn[], k: 'energy' | 'focus' | 'stress') => round(average(list.map((c) => c[k])), 1);
    const delta = (k: 'energy' | 'focus' | 'stress') => (enough && prev.length >= MIN_GROUP ? avg(cur, k) - avg(prev, k) : null);
    const wellPct = (list: CheckIn[]) => Math.round((list.filter((c) => !isUnwell(c)).length / Math.max(1, list.length)) * 100);
    return {
      enough,
      count: cur.length,
      energy: avg(cur, 'energy'),
      well: wellPct(cur),
      focus: avg(cur, 'focus'),
      stress: avg(cur, 'stress'),
      dEnergy: delta('energy'),
      dWell: enough && prev.length >= MIN_GROUP ? wellPct(cur) - wellPct(prev) : null,
      dFocus: delta('focus'),
      dStress: delta('stress'),
      compare: { today: 'vs yesterday', week: 'vs the week before', month: 'vs the month before' }[this.filter.range()],
    };
  });

  private readonly weeks = computed(() => {
    const last = weekStart(MOCK_TODAY);
    return Array.from({ length: WEEKS }, (_, i) => addDays(last, -7 * (WEEKS - 1 - i)));
  });

  protected readonly trend = computed<ApexOptions>(() => {
    const checkIns = this.store.checkIns();
    const weeks = this.weeks();
    const series = (k: 'energy' | 'focus' | 'stress') =>
      weeks.map((w) => {
        const list = checkIns.filter((c) => weekStart(c.date) === w);
        return list.length >= MIN_GROUP ? round(average(list.map((c) => c[k])), 1) : null;
      });
    return {
      chart: { type: 'line', zoom: { enabled: false } },
      series: [
        { name: 'Energy', data: series('energy') },
        { name: 'Focus', data: series('focus') },
        { name: 'Stress', data: series('stress') },
      ],
      colors: ['#3fae6a', '#2f6fed', '#d9822b'],
      stroke: { width: 2.5, curve: 'smooth', dashArray: [0, 0, 5] },
      markers: { size: 4 },
      xaxis: { categories: weeks.map((w) => formatDayShort(w).replace(/^\w+ /, '') + ' ' + new Date(w + 'T00:00:00Z').toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })) },
      yaxis: { min: 1, max: 5, tickAmount: 4 },
      legend: { position: 'top', horizontalAlign: 'left' },
      tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => (v == null ? '—' : `${v}/5`) } },
    };
  });

  /** Team WHO-5 for the latest completed week, 0–100. */
  protected readonly who5 = computed(() => {
    const all = this.store.who5();
    const weeks = [...new Set(all.map((w) => w.weekStart))].sort();
    const score = (w: string | undefined) => {
      const list = all.filter((x) => x.weekStart === w);
      return list.length >= MIN_GROUP ? Math.round(average(list.map((x) => who5Score(x.answers)))) : null;
    };
    const now = score(weeks.at(-1));
    const before = score(weeks.at(-2));
    return { now, delta: now !== null && before !== null ? now - before : null, week: weeks.at(-1) ?? '' };
  });

  protected readonly who5Gauge = computed<ApexOptions>(() => ({
    chart: { type: 'radialBar' },
    series: [this.who5().now ?? 0],
    labels: ['WHO-5'],
    colors: [(this.who5().now ?? 0) >= 50 ? '#3fae6a' : '#d9822b'],
    plotOptions: {
      radialBar: {
        startAngle: -120,
        endAngle: 120,
        hollow: { size: '62%' },
        track: { background: 'rgba(160,165,185,0.18)' },
        dataLabels: {
          name: { offsetY: 22, fontSize: '13px' },
          value: { offsetY: -12, fontSize: '30px', fontWeight: 700, formatter: (v: number) => `${Math.round(v)}` },
        },
      },
    },
  }));

  /** Maslach-inspired strain, team level, over at least the last week. */
  protected readonly maslach = computed<ApexOptions>(() => {
    const from = this.filter.range() === 'today' ? addDays(MOCK_TODAY, -6) : this.filter.from();
    const checkIns = this.between(from, MOCK_TODAY);
    const tasks = this.store.tasks().filter((t) => t.date >= from && t.date <= MOCK_TODAY);
    const who5 = this.store.who5().filter((w) => w.weekStart >= weekStart(from)).map((w) => who5Score(w.answers));
    const b = burnoutSignals(checkIns, tasks, who5);
    return {
      chart: { type: 'bar' },
      series: [{ name: 'Team strain', data: [b.exhaustion, b.cynicism, b.efficacy] }],
      colors: ['#6d5dd3'],
      plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '48%', distributed: false } },
      xaxis: { categories: ['Exhaustion', 'Cynicism', 'Reduced efficacy'], max: 100 },
      dataLabels: { enabled: true, formatter: (v: number) => `${v}`, style: { fontSize: '12px' } },
      tooltip: { y: { formatter: (v: number) => `${v} / 100 (lower is better)` } },
    };
  });

  protected readonly flow = computed<ApexOptions>(() => {
    const logs = this.store.focusLogs();
    const weeks = this.weeks();
    const data = weeks.map((w) => logs.filter((l) => weekStart(l.date) === w).reduce((s, l) => s + l.hours.filter(isFlowHour).length, 0));
    const best = data.indexOf(Math.max(...data));
    return {
      chart: { type: 'bar' },
      series: [{ name: 'Flow hours', data }],
      colors: weeks.map((_, i) => (i === best ? '#6d5dd3' : '#b9b2ea')),
      plotOptions: { bar: { distributed: true, borderRadius: 6, columnWidth: '55%' } },
      legend: { show: false },
      xaxis: { categories: weeks.map((w) => 'Wk ' + formatDayShort(w).replace(/^\w+ /, '')) },
      yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } },
      tooltip: { y: { formatter: (v: number) => `${v} team flow hours` } },
    };
  });
}
