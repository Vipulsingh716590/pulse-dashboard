import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Person } from '../../../core/models';
import { TeamStore } from '../../../core/services/team-store.service';
import { isDone } from '../../../core/utils/insights';
import { StatusDot } from '../../../shared/status-dot/status-dot';

/** Web Team org chart: Manager → Team Lead → Developers A–E, each with a live status dot. */
@Component({
  selector: 'app-org-chart',
  imports: [StatusDot, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './org-chart.html',
  styleUrl: './org-chart.scss',
})
export class OrgChart {
  protected readonly store = inject(TeamStore);

  /** Cards fade in once this turns true. */
  readonly revealed = input(false);
  /** The manager can open a person's detail drawer. */
  readonly canOpen = input(false);
  readonly open = output<string>();

  protected readonly summary = computed(() => {
    const today = this.store.todayTasks();
    return {
      developers: this.store.developers().length,
      projects: new Set(today.map((t) => t.project)).size,
      done: today.filter(isDone).length,
    };
  });

  protected select(p: Person): void {
    if (this.canOpen()) this.open.emit(p.id);
  }
}
