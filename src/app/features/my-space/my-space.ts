import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { SKILL_LABELS, SkillArea, Task } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { TeamStore } from '../../core/services/team-store.service';
import { ViewingAsService } from '../../core/services/viewing-as.service';
import { formatDay, fToC, formatLongDate, MOCK_TODAY, mockNow, weekStart } from '../../core/utils/date';
import { FRAMEWORK_TIPS, IMPROVEMENT_ACTIONS, isUnwell, moodEmoji, STATUS_LABELS, strengthsAndGaps, TYPE_LABELS } from '../../core/utils/insights';
import { SevenDayTable } from '../../shared/charts/seven-day-table';
import { SkillRadar } from '../../shared/charts/skill-radar';
import { InfoTip } from '../../shared/info-tip/info-tip';
import { StatusDot } from '../../shared/status-dot/status-dot';
import { CheckInForm } from './check-in-form';

/** A developer's own space: check-in, tasks, history, growth, reflection and outlook. */
@Component({
  selector: 'app-my-space',
  imports: [MatButtonModule, CheckInForm, StatusDot, SevenDayTable, SkillRadar, InfoTip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-space.html',
  styleUrl: './my-space.scss',
})
export class MySpace {
  protected readonly store = inject(TeamStore);
  protected readonly viewingAs = inject(ViewingAsService);
  private readonly notifications = inject(NotificationService);

  protected readonly date = formatLongDate(MOCK_TODAY);
  protected readonly tips = FRAMEWORK_TIPS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly moodEmoji = moodEmoji;
  protected readonly fToC = fToC;
  protected readonly formatDay = formatDay;

  protected readonly me = computed(() => this.store.member(this.viewingAs.viewerId()));
  protected readonly status = computed(() => this.store.statusOf(this.viewingAs.viewerId()));
  protected readonly checkIn = computed(() => this.store.todayCheckIn(this.viewingAs.viewerId()));
  protected readonly unwell = computed(() => isUnwell(this.checkIn()));
  protected readonly editing = signal(false);
  protected readonly lastResult = signal<{ unwell: boolean; suggestions: number } | null>(null);
  private readonly form = viewChild(CheckInForm);

  protected readonly tasks = computed(() => this.store.tasksToday(this.viewingAs.viewerId()));
  protected readonly load = computed(() => this.store.loadOf(this.viewingAs.viewerId()));
  protected readonly outlook = computed(() => this.store.outlooks().get(this.viewingAs.viewerId()));

  /** One small action for each weak area (≤ 2/5); if none, for the lowest area below 4. */
  protected readonly growth = computed(() => {
    const me = this.me();
    if (!me) return [];
    const { gaps } = strengthsAndGaps(me);
    const areas = gaps.length
      ? gaps
      : (Object.entries(me.skills) as [SkillArea, number][]).filter(([, v]) => v < 4).sort((a, b) => a[1] - b[1]).slice(0, 1).map(([area, score]) => ({ area, score }));
    return areas.map((g) => ({ ...g, label: SKILL_LABELS[g.area], action: IMPROVEMENT_ACTIONS[g.area] }));
  });

  // ---- weekly Stoic reflection ----
  private readonly thisWeek = weekStart(MOCK_TODAY);
  protected readonly reflection = computed(() =>
    this.store.reflections().filter((r) => r.personId === this.viewingAs.viewerId()).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0],
  );
  protected readonly wentWell = signal('');
  protected readonly inMyControl = signal('');
  protected readonly improve = signal('');
  protected readonly reflectionSaved = signal(false);

  constructor() {
    // Switching "Viewing as" resets the per-person form state.
    effect(() => {
      this.viewingAs.viewerId();
      untracked(() => {
        this.editing.set(false);
        this.lastResult.set(null);
        const r = this.reflection();
        const current = r?.weekStart === this.thisWeek;
        this.wentWell.set(current ? r.wentWell : '');
        this.inMyControl.set(current ? r.inMyControl : '');
        this.improve.set(current ? r.improve : '');
        this.reflectionSaved.set(false);
      });
    });
  }

  protected edit(): void {
    this.editing.set(true);
    queueMicrotask(() => this.form()?.prefill(this.checkIn()));
  }

  protected onSaved(result: { unwell: boolean; suggestions: number }): void {
    this.editing.set(false);
    this.lastResult.set(result);
  }

  protected progress(t: Task): void {
    const pct = Math.min(100, t.percentDone + 25);
    this.store.updateTask(t.id, { percentDone: pct, status: pct >= 100 ? 'completed' : 'in-progress' });
  }

  protected report(t: Task): void {
    this.store.updateTask(t.id, { status: 'reported', percentDone: 100 });
    this.notifications.push({ to: 'mgr', kind: 'info', personId: t.ownerId, link: '/tasks',
      title: `${this.me()?.name} reported "${t.title}" as done`, body: 'Ready for your review.' });
  }

  protected saveReflection(): void {
    const me = this.me();
    if (!me) return;
    this.store.addReflection({
      id: `r-${me.id}-${this.thisWeek}`,
      personId: me.id,
      weekStart: this.thisWeek,
      wentWell: this.wentWell().trim(),
      inMyControl: this.inMyControl().trim(),
      improve: this.improve().trim(),
      createdAt: mockNow(),
    });
    this.reflectionSaved.set(true);
  }
}
