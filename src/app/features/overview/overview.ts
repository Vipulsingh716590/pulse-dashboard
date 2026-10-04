import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { ApexOptions } from 'ng-apexcharts';
import { FilterService } from '../../core/services/filter.service';
import { TeamStore } from '../../core/services/team-store.service';
import { ViewingAsService } from '../../core/services/viewing-as.service';
import { average, MOCK_TODAY, round } from '../../core/utils/date';
import { DrillDown, inPeriod } from '../../core/utils/drilldown';
import { Chart } from '../../shared/charts/chart';
import { DrilldownNav } from '../../shared/charts/drilldown-nav';
import { KpiCard } from '../../shared/kpi-card/kpi-card';
import { PersonDrawer } from '../team/person-drawer/person-drawer';
import { CoinFlip } from './hero/coin-flip';
import { OrgChart } from './hero/org-chart';
import { TeamId } from '../../core/models';
import { contributionPct, onTimePct, otherTeams, pctChange, TeamTotals, totalsByTeam, webRank } from './team-insights';

const ACCENT = '#6d5dd3';
const OTHERS = '#a3a9b8';

/** "/": the coin hero first, then how the Web Team compares with the rest of MobiKwik. */
@Component({
  selector: 'app-overview',
  imports: [KpiCard, Chart, DrilldownNav, CoinFlip, OrgChart, PersonDrawer],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview {
  private readonly store = inject(TeamStore);
  private readonly filter = inject(FilterService);
  protected readonly viewingAs = inject(ViewingAsService);

  protected readonly teams = this.store.teams;
  protected readonly drill = new DrillDown(this.store.metricDates, 'Last 6 months');

  // ---- Page 1: hero ----
  protected readonly revealed = signal(false);
  protected readonly selectedId = signal<string | null>(null);
  /** Contribution over the whole 6 months, shown on the coin. */
  protected readonly overallContribution = computed(() => Math.round(contributionPct(totalsByTeam(this.store.metrics(), this.drill.trail()[0]))));

  constructor() {
    // The top bar's Today / Week / Month sets how deep the drill-down starts.
    effect(() => {
      const range = this.filter.range();
      if (!this.store.metricDates().length) return;
      untracked(() => {
        this.drill.setGrain(range === 'month' ? 'month' : range === 'week' ? 'week' : 'day');
        if (range === 'today') {
          const i = this.drill.points().findIndex((p) => p.start === MOCK_TODAY);
          if (i >= 0) this.drill.drillInto(i);
        }
      });
    });
  }

  // ---- Page 2: totals for the selected range and the comparison pair ----
  private readonly totals = computed(() => totalsByTeam(this.store.metrics(), this.drill.selected()));
  private readonly currentTotals = computed(() => totalsByTeam(this.store.metrics(), this.drill.current()));
  private readonly previousTotals = computed(() => totalsByTeam(this.store.metrics(), this.drill.previous()));

  protected readonly compareLabel = computed(() => {
    const level = this.drill.selected().level;
    if (level === 'all') return `${this.drill.current().shortLabel} vs ${this.drill.previous()?.shortLabel ?? '—'}`;
    return level === 'month' ? 'vs last month' : level === 'week' ? 'vs previous week' : 'vs previous day';
  });

  protected readonly kpis = computed(() => {
    const totals = this.totals();
    const cur = this.currentTotals();
    const prev = this.previousTotals();
    const hasPrev = prev.size > 0;
    const web = totals.get('web');
    const curWeb = cur.get('web');
    const prevWeb = prev.get('web');
    const others = otherTeams(this.teams()).map((t) => totals.get(t.id));
    return {
      contribution: round(contributionPct(totals), 1),
      contributionDelta: hasPrev ? contributionPct(cur) - contributionPct(prev) : null,
      rank: webRank(totals),
      teamCount: this.teams().length,
      size: this.teams().find((t) => t.isWebTeam)?.headcount ?? 0,
      delivered: web?.tasksDelivered ?? 0,
      deliveredDelta: hasPrev ? pctChange(perDay(curWeb?.tasksDelivered, this.days(this.drill.current())), perDay(prevWeb?.tasksDelivered, this.days(this.drill.previous()))) : null,
      onTime: round(onTimePct(web), 1),
      onTimeDelta: hasPrev ? onTimePct(curWeb) - onTimePct(prevWeb) : null,
      // Same numbers for the average other team, shown under each card.
      othersContribution: round(average(others.map((o) => share(totals, o))), 1),
      othersDelivered: round(average(others.map((o) => o?.tasksDelivered ?? 0)), 1),
      othersOnTime: round(average(others.map((o) => onTimePct(o))), 1),
    };
  });

  private days(p: { start: string; end: string } | null): number {
    if (!p) return 0;
    return this.store.metricDates().filter((d) => d >= p.start && d <= p.end).length;
  }

  // ---- charts ----
  /** Web vs average other team, per working day, for each point the drill-down shows. */
  private readonly trend = computed(() => {
    const metrics = this.store.metrics();
    const others = otherTeams(this.teams());
    return this.drill.points().map((p) => {
      const totals = totalsByTeam(metrics, p);
      const days = Math.max(1, this.store.metricDates().filter((d) => inPeriod(d, p)).length);
      return {
        label: p.shortLabel,
        web: Math.round((totals.get('web')?.impactScore ?? 0) / days),
        others: Math.round(average(others.map((t) => totals.get(t.id)?.impactScore ?? 0)) / days),
        contribution: round(contributionPct(totals), 1),
      };
    });
  });

  protected readonly line = computed<ApexOptions>(() => {
    const trend = this.trend();
    const highlight = this.drill.highlighted();
    return {
      chart: { type: 'line', zoom: { enabled: false } },
      series: [
        { name: 'Web Team', data: trend.map((t) => t.web) },
        { name: 'Avg. other team', data: trend.map((t) => t.others) },
      ],
      colors: [ACCENT, OTHERS],
      stroke: { width: [3, 2], curve: 'smooth', dashArray: [0, 5] },
      markers: { size: 5, hover: { size: 7 } },
      xaxis: { categories: trend.map((t) => t.label) },
      yaxis: { title: { text: 'Impact pts per working day' }, labels: { formatter: (v: number) => `${Math.round(v)}` } },
      legend: { position: 'top', horizontalAlign: 'right' },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (v: number, o?: { seriesIndex: number; dataPointIndex: number }) =>
            o?.seriesIndex === 0 ? `${v} pts/day · ${trend[o.dataPointIndex]?.contribution}% share` : `${v} pts/day`,
        },
      },
      annotations:
        highlight >= 0
          ? { xaxis: [{ x: trend[highlight]?.label, borderColor: ACCENT, label: { text: 'Selected', style: { background: ACCENT, color: '#fff' } } }] }
          : {},
    };
  });

  protected readonly grainHint = computed(() => {
    const g = this.drill.grain();
    return g === 'day' && this.drill.selected().level === 'day' ? 'Pick another day' : `Click a point to open that ${g}`;
  });
}

const perDay = (value: number | undefined, days: number) => (days ? (value ?? 0) / days : 0);

/** One team's share of company-wide impact, 0–100. */
function share(totals: Map<TeamId, TeamTotals>, t: TeamTotals | undefined): number {
  const all = [...totals.values()].reduce((s, x) => s + x.impactScore, 0);
  return all ? ((t?.impactScore ?? 0) / all) * 100 : 0;
}
