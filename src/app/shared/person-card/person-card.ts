import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TeamStore } from '../../core/services/team-store.service';
import { isDone, isUnwell, strengthsAndGaps } from '../../core/utils/insights';
import { StatusDot } from '../status-dot/status-dot';

/**
 * One person, in the order that matters: how they are (health/availability) first,
 * then how today's work is going, then what they are on right now.
 */
@Component({
  selector: 'app-person-card',
  imports: [StatusDot],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './person-card.html',
  styleUrl: './person-card.scss',
})
export class PersonCard {
  private readonly store = inject(TeamStore);

  readonly personId = input.required<string>();
  readonly open = output<string>();

  protected readonly five = [1, 2, 3, 4, 5];
  protected readonly person = computed(() => this.store.member(this.personId()));
  protected readonly status = computed(() => this.store.statusOf(this.personId()));
  protected readonly checkIn = computed(() => this.store.todayCheckIn(this.personId()));
  protected readonly unwell = computed(() => isUnwell(this.checkIn()));
  protected readonly note = computed(() => this.store.presenceNote(this.personId()) ?? 'Not checked in yet');

  /** Top two skills at 4/5 or higher. */
  protected readonly strengths = computed(() => {
    const p = this.person();
    return p ? strengthsAndGaps(p).strengths.slice(0, 2) : [];
  });

  protected readonly today = computed(() => {
    const tasks = this.store.tasksToday(this.personId());
    const hours = tasks.reduce((s, t) => s + t.estimateHours, 0);
    const doneHours = tasks.reduce((s, t) => s + (t.estimateHours * t.percentDone) / 100, 0);
    return {
      pct: hours ? Math.round((doneHours / hours) * 100) : 0,
      done: tasks.filter(isDone).length,
      total: tasks.length,
      load: this.store.loadOf(this.personId()),
    };
  });

  protected readonly current = computed(() => this.store.currentTask(this.personId()));
}
