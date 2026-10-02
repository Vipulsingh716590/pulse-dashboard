import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { ApexOptions } from 'ng-apexcharts';
import { ReassignmentService } from '../../../core/services/reassignment.service';
import { TeamStore } from '../../../core/services/team-store.service';
import { average, fToC, MOCK_TODAY, round } from '../../../core/utils/date';
import { DrillDown, inPeriod } from '../../../core/utils/drilldown';
import { FRAMEWORK_TIPS, isUnwell, moodEmoji, personInsights, STATUS_LABELS, strengthsAndGaps } from '../../../core/utils/insights';
import { Chart } from '../../../shared/charts/chart';
import { DrilldownNav } from '../../../shared/charts/drilldown-nav';
import { FocusHeatmap } from '../../../shared/charts/focus-heatmap';
import { SevenDayTable } from '../../../shared/charts/seven-day-table';
import { SkillRadar } from '../../../shared/charts/skill-radar';
import { InfoTip } from '../../../shared/info-tip/info-tip';
import { ReassignCard } from '../../../shared/reassign-card/reassign-card';
import { StatusDot } from '../../../shared/status-dot/status-dot';

/**
 * Side drawer with progressive depth: Today → last 7 days → trends → skills →
 * "Understanding this person" → next-week outlook. Each level opens on click.
 */
@Component({
  selector: 'app-person-drawer',
  imports: [MatButtonModule, MatExpansionModule, StatusDot, FocusHeatmap, SevenDayTable, SkillRadar, Chart, DrilldownNav, InfoTip, ReassignCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './person-drawer.html',
  styleUrl: './person-drawer.scss',
  host: { '(document:keydown.escape)': 'close()' },
})
export class PersonDrawer {
  private readonly store = inject(TeamStore);
  private readonly reassignment = inject(ReassignmentService);

  readonly personId = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly tips = FRAMEWORK_TIPS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly moodEmoji = moodEmoji;

  protected readonly person = computed(() => this.store.member(this.personId()));
  protected readonly status = computed(() => this.store.statusOf(this.personId() ?? ''));
  protected readonly suggestions = computed(() => this.reassignment.forOwner(this.personId() ?? ''));

  private readonly checkIns = computed(() => (this.personId() ? this.store.checkInsFor(this.personId()!) : []));
  private readonly logs = computed(() => (this.personId() ? this.store.focusLogsFor(this.personId()!) : []));

  // ---- 1. Today ----
  protected readonly today = computed(() => {
    const id = this.personId() ?? '';
    const c = this.store.todayCheckIn(id);
    const unwell = isUnwell(c);
    return {
      checkIn: c,
      unwell,
      details: unwell && c?.shareDetails ? [c.temperatureF ? `${c.temperatureF}°F (${fToC(c.temperatureF)}°C)` : '', c.symptoms ?? ''].filter(Boolean).join(' · ') : '',
      note: this.store.presenceNote(id),
      tasks: this.store.tasksToday(id),
      load: this.store.loadOf(id),
      log: this.logs().find((l) => l.date === MOCK_TODAY),
    };
  });

  // ---- 3. Month → Week → Day trends ----
  private readonly dates = computed(() => this.checkIns().map((c) => c.date));
  protected readonly drill = new DrillDown(this.dates, 'Last 30 working days');

  constructor() {
    // A new person starts at the top of the drill-down.
    effect(() => {
      this.personId();
      untracked(() => this.drill.goTo(0));
    });
  }

  protected readonly trend = computed<ApexOptions>(() => {
    const checkIns = this.checkIns();
    const points = this.drill.points();
    const avg = (p: (typeof points)[number], key: 'mood' | 'energy' | 'focus' | 'stress') =>
      round(average(checkIns.filter((c) => inPeriod(c.date, p)).map((c) => c[key])), 1);
    const highlight = this.drill.highlighted();
    return {
      chart: { type: 'line', zoom: { enabled: false } },
      series: [
        { name: 'Mood', data: points.map((p) => avg(p, 'mood')) },
        { name: 'Energy', data: points.map((p) => avg(p, 'energy')) },
        { name: 'Focus', data: points.map((p) => avg(p, 'focus')) },
        { name: 'Stress', data: points.map((p) => avg(p, 'stress')) },
      ],
      colors: ['#6d5dd3', '#3fae6a', '#2f6fed', '#d9822b'],
      stroke: { width: 2, curve: 'smooth', dashArray: [0, 0, 0, 4] },
      markers: { size: 4 },
      xaxis: { categories: points.map((p) => p.shortLabel) },
      yaxis: { min: 1, max: 5, tickAmount: 4 },
      legend: { position: 'top', horizontalAlign: 'left' },
      tooltip: { shared: true, intersect: false },
      annotations: highlight >= 0 ? { xaxis: [{ x: points[highlight]?.shortLabel, borderColor: '#6d5dd3' }] } : {},
    };
  });

  // ---- 4–6 ----
  protected readonly skills = computed(() => (this.person() ? strengthsAndGaps(this.person()!) : { strengths: [], gaps: [] }));
  protected readonly insights = computed(() => {
    const p = this.person();
    if (!p) return [];
    const blocked = this.store.tasksToday(p.id).find((t) => t.blocked)?.blockedReason;
    return personInsights(p, this.checkIns(), this.logs(), this.store.loadOf(p.id), blocked);
  });
  protected readonly outlook = computed(() => this.store.outlooks().get(this.personId() ?? ''));

  protected close(): void {
    if (this.personId()) this.closed.emit();
  }
}
