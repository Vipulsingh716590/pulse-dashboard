import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { ReassignmentService } from '../../../core/services/reassignment.service';
import { TeamStore } from '../../../core/services/team-store.service';
import { fToC, MOCK_TODAY } from '../../../core/utils/date';
import { FRAMEWORK_TIPS, isUnwell, personInsights, STATUS_LABELS, strengthsAndGaps } from '../../../core/utils/insights';
import { FocusHeatmap } from '../../../shared/charts/focus-heatmap';
import { SevenDayTable } from '../../../shared/charts/seven-day-table';
import { SimpleTrend } from '../../../shared/charts/simple-trend';
import { SkillRadar } from '../../../shared/charts/skill-radar';
import { InfoTip } from '../../../shared/info-tip/info-tip';
import { ReassignCard } from '../../../shared/reassign-card/reassign-card';
import { StatusDot } from '../../../shared/status-dot/status-dot';

/**
 * Side drawer with progressive depth: Today → last 7 days → 4-week trend → skills →
 * "Understanding this person" → next-week outlook. Each level opens on click.
 */
@Component({
  selector: 'app-person-drawer',
  imports: [MatButtonModule, MatExpansionModule, StatusDot, FocusHeatmap, SevenDayTable, SkillRadar, SimpleTrend, InfoTip, ReassignCard],
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

  protected readonly person = computed(() => this.store.member(this.personId()));
  protected readonly status = computed(() => this.store.statusOf(this.personId() ?? ''));
  protected readonly suggestions = computed(() => this.reassignment.forOwner(this.personId() ?? ''));

  protected readonly checkIns = computed(() => (this.personId() ? this.store.checkInsFor(this.personId()!) : []));
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
