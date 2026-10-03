import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Status } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { ReassignmentService } from '../../core/services/reassignment.service';
import { TeamStore } from '../../core/services/team-store.service';
import { ViewingAsService } from '../../core/services/viewing-as.service';
import { formatLongDate, formatTime, MOCK_TODAY } from '../../core/utils/date';
import { isDone } from '../../core/utils/insights';
import { ManagerOnly } from '../../shared/manager-only/manager-only';
import { PersonCard } from '../../shared/person-card/person-card';
import { ReassignCard } from '../../shared/reassign-card/reassign-card';
import { STATUS_META, StatusDot } from '../../shared/status-dot/status-dot';
import { PersonDrawer } from './person-drawer/person-drawer';

/** Manager view of the team: how everyone is, then their work. Click a card for depth. */
@Component({
  selector: 'app-team',
  imports: [PersonCard, PersonDrawer, ReassignCard, StatusDot, ManagerOnly, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team.html',
  styleUrl: './team.scss',
})
export class TeamPage {
  protected readonly store = inject(TeamStore);
  protected readonly viewingAs = inject(ViewingAsService);
  protected readonly reassignment = inject(ReassignmentService);
  private readonly notifications = inject(NotificationService);

  protected readonly selectedId = signal<string | null>(null);
  protected readonly filter = signal<Status | 'all'>('all');

  protected readonly visible = computed(() => {
    const f = this.filter();
    return this.store.members().filter((m) => f === 'all' || this.store.statusOf(m.id) === f);
  });
  protected readonly date = formatLongDate(MOCK_TODAY);
  protected readonly time = formatTime;

  protected readonly summary = computed(() => {
    const members = this.store.members();
    const today = this.store.todayTasks();
    const statuses = members.map((m) => this.store.statusOf(m.id));
    const counts = (Object.keys(STATUS_META) as Status[]).map((s) => ({ status: s, label: STATUS_META[s].label, n: statuses.filter((x) => x === s).length }));
    return {
      available: members.filter((m) => this.store.isAvailable(m.id)).length,
      total: members.length,
      checkedIn: members.filter((m) => this.store.todayCheckIn(m.id)).length,
      done: today.filter(isDone).length,
      tasks: today.length,
      counts,
      distLabel: counts.filter((c) => c.n).map((c) => `${c.label} ${c.n}`).join(', '),
    };
  });

  /** Health first, then blockers and strain. At most 7 (Miller). */
  protected readonly alerts = computed(() => {
    const list: { id: string; personId: string; status: 'resting' | 'blocked' | 'attention'; title: string; detail: string }[] = [];
    for (const m of this.store.members()) {
      const s = this.store.statusOf(m.id);
      if (s === 'resting') {
        const health = this.notifications.all().find((n) => n.kind === 'health' && n.personId === m.id);
        list.push({ id: 'r' + m.id, personId: m.id, status: s, title: `${m.name} is unwell and needs rest today.`, detail: health?.body ?? 'Unwell – needs rest.' });
      }
    }
    for (const m of this.store.members()) {
      const s = this.store.statusOf(m.id);
      if (s === 'blocked') list.push({ id: 'b' + m.id, personId: m.id, status: s, title: `${m.name} is blocked`, detail: this.store.presenceNote(m.id) ?? '' });
      if (s === 'attention') {
        list.push({ id: 'a' + m.id, personId: m.id, status: s, title: `${m.name} may need a lighter load`, detail: this.store.outlooks().get(m.id)?.reasons[0] ?? '' });
      }
    }
    return list.slice(0, 7);
  });
}
