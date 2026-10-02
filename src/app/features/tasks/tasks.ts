import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Task, TaskStatus } from '../../core/models';
import { FilterService } from '../../core/services/filter.service';
import { ReassignmentService } from '../../core/services/reassignment.service';
import { TeamStore } from '../../core/services/team-store.service';
import { ViewingAsService } from '../../core/services/viewing-as.service';
import { formatDayShort, MOCK_TODAY } from '../../core/utils/date';
import { STATUS_LABELS, TYPE_LABELS } from '../../core/utils/insights';
import { ReassignCard } from '../../shared/reassign-card/reassign-card';

const RINGS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'planned', label: 'Planned', color: '#a3a9b8' },
  { status: 'in-progress', label: 'In progress', color: 'var(--status-working)' },
  { status: 'completed', label: 'Completed', color: '#6d5dd3' },
  { status: 'reported', label: 'Reported to manager', color: '#2f6fed' },
  { status: 'accepted', label: 'Accepted by manager', color: '#23744a' },
  { status: 'pending', label: 'Pending', color: '#d9822b' },
];
/** Miller's 7±2: longer lists collapse behind "View all". */
const VISIBLE = 7;

/** Daily signal board: where every task stands, and what the manager can act on. */
@Component({
  selector: 'app-tasks',
  imports: [MatButtonModule, ReassignCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
})
export class TasksPage {
  protected readonly store = inject(TeamStore);
  protected readonly filter = inject(FilterService);
  protected readonly viewingAs = inject(ViewingAsService);
  protected readonly reassignment = inject(ReassignmentService);

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly typeLabels = TYPE_LABELS;
  protected readonly selected = signal<TaskStatus | null>(null);
  protected readonly showAll = signal(false);

  private readonly inRange = computed(() => {
    this.filter.range();
    return this.store.tasks().filter((t) => this.filter.inRange(t.date));
  });

  protected readonly rings = computed(() => {
    const tasks = this.inRange();
    const total = Math.max(1, tasks.length);
    return RINGS.map((r) => {
      const n = tasks.filter((t) => t.status === r.status).length;
      return { ...r, n, pct: Math.round((n / total) * 100) };
    });
  });

  /** Things to act on first: reported, then live work, then the rest. */
  protected readonly rows = computed(() => {
    const order: TaskStatus[] = ['reported', 'completed', 'in-progress', 'pending', 'planned', 'accepted'];
    const sel = this.selected();
    return this.inRange()
      .filter((t) => !sel || t.status === sel)
      .sort((a, b) => b.date.localeCompare(a.date) || order.indexOf(a.status) - order.indexOf(b.status));
  });
  protected readonly visible = computed(() => (this.showAll() ? this.rows() : this.rows().slice(0, VISIBLE)));

  protected toggle(status: TaskStatus): void {
    this.selected.update((s) => (s === status ? null : status));
    this.showAll.set(false);
  }

  protected accept(t: Task): void {
    this.store.updateTask(t.id, { status: 'accepted', percentDone: 100 });
  }

  protected canAccept(t: Task): boolean {
    return this.viewingAs.isManager() && (t.status === 'reported' || t.status === 'completed');
  }

  protected dayLabel(date: string): string {
    return date === MOCK_TODAY ? 'Today' : formatDayShort(date);
  }

  protected live(t: Task): boolean {
    return t.status === 'in-progress' && !t.blocked && this.store.isAvailable(t.ownerId);
  }
}
