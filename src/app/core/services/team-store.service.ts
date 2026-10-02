import { computed, inject, Injectable, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CheckIn, Member, Outlook, Reflection, Status, Task } from '../models';
import { MOCK_TODAY } from '../utils/date';
import { isOpen, isUnwell, nextWeekOutlook } from '../utils/insights';
import { DataService } from './data.service';

/**
 * In-memory state for the whole app, filled from DataService.
 * Edits (check-ins, reassignments, accepts) update these signals instantly,
 * and every screen that reads them follows.
 */
@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly data = inject(DataService);

  readonly teams = toSignal(this.data.getTeams(), { initialValue: [] });
  readonly metrics = toSignal(this.data.getTeamMetrics(), { initialValue: [] });
  readonly metricDates = computed(() => [...new Set(this.metrics().map((m) => m.date))].sort());
  readonly people = toSignal(this.data.getPeople(), { initialValue: [] });
  readonly presence = toSignal(this.data.getPresence(), { initialValue: [] });
  readonly focusLogs = toSignal(this.data.getFocusLogs(), { initialValue: [] });
  readonly who5 = toSignal(this.data.getWho5(), { initialValue: [] });

  private readonly tasksSource = toSignal(this.data.getTasks(), { initialValue: [] });
  private readonly checkInsSource = toSignal(this.data.getCheckIns(), { initialValue: [] });
  private readonly reflectionsSource = toSignal(this.data.getReflections(), { initialValue: [] });
  readonly tasks = linkedSignal(() => this.tasksSource());
  readonly checkIns = linkedSignal(() => this.checkInsSource());
  readonly reflections = linkedSignal(() => this.reflectionsSource());

  readonly loaded = computed(() => this.people().length > 0 && this.tasks().length > 0);

  /** Lead + developers: everyone who does delivery work. */
  readonly members = computed(() => this.people().filter((p): p is Member => p.role !== 'manager' && !!p.skills));
  readonly developers = computed(() => this.members().filter((p) => p.role === 'developer'));
  readonly manager = computed(() => this.people().find((p) => p.role === 'manager'));
  readonly lead = computed(() => this.members().find((p) => p.role === 'lead'));

  readonly todayTasks = computed(() => this.tasks().filter((t) => t.date === MOCK_TODAY));

  person(id: string | null | undefined) {
    return this.people().find((p) => p.id === id);
  }
  member(id: string | null | undefined): Member | undefined {
    return this.members().find((p) => p.id === id);
  }
  name(id: string | null | undefined): string {
    return this.person(id)?.name ?? '—';
  }

  tasksToday(personId: string): Task[] {
    return this.todayTasks().filter((t) => t.ownerId === personId);
  }

  checkInsFor(personId: string): CheckIn[] {
    return this.checkIns()
      .filter((c) => c.personId === personId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  todayCheckIn(personId: string): CheckIn | undefined {
    return this.checkIns().find((c) => c.personId === personId && c.date === MOCK_TODAY);
  }

  focusLogsFor(personId: string) {
    return this.focusLogs()
      .filter((l) => l.personId === personId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Planned hours today ÷ capacity, in %. */
  readonly loads = computed(() => {
    const map = new Map<string, number>();
    for (const m of this.members()) {
      const hours = this.todayTasks().filter((t) => t.ownerId === m.id).reduce((s, t) => s + t.estimateHours, 0);
      map.set(m.id, Math.round((hours / m.capacityHours) * 100));
    }
    return map;
  });
  loadOf(personId: string): number {
    return this.loads().get(personId) ?? 0;
  }

  readonly outlooks = computed(() => {
    const map = new Map<string, Outlook>();
    for (const m of this.members()) map.set(m.id, nextWeekOutlook(this.checkInsFor(m.id), this.loadOf(m.id)));
    return map;
  });

  /**
   * One status per person, in priority order:
   * 🔵 resting (unwell today) · ⚪ offline · 🟡 blocked · 🔴 needs attention (High risk) · 🟢 working.
   */
  readonly statuses = computed(() => {
    const map = new Map<string, Status>();
    for (const m of this.members()) {
      const presence = this.presence().find((p) => p.personId === m.id);
      let status: Status = 'working';
      if (isUnwell(this.todayCheckIn(m.id))) status = 'resting';
      else if (presence?.state === 'offline') status = 'offline';
      else if (presence?.state === 'blocked' || this.tasksToday(m.id).some((t) => t.blocked && isOpen(t))) status = 'blocked';
      else if (this.outlooks().get(m.id)?.level === 'High') status = 'attention';
      map.set(m.id, status);
    }
    return map;
  });
  statusOf(personId: string): Status {
    return this.statuses().get(personId) ?? 'offline';
  }
  /** Resting and offline people can't take work today. */
  isAvailable(personId: string): boolean {
    const s = this.statusOf(personId);
    return s !== 'resting' && s !== 'offline';
  }
  presenceNote(personId: string): string | undefined {
    if (this.statusOf(personId) === 'resting') return 'Resting today';
    return this.presence().find((p) => p.personId === personId)?.note;
  }

  /** The task to show as "now": in progress first, then the next open one. */
  currentTask(personId: string): Task | undefined {
    const today = this.tasksToday(personId);
    return today.find((t) => t.status === 'in-progress') ?? today.find((t) => isOpen(t));
  }

  // ---------- edits ----------
  upsertCheckIn(c: CheckIn): void {
    this.checkIns.update((list) => [...list.filter((x) => !(x.personId === c.personId && x.date === c.date)), c]);
  }

  updateTask(id: string, patch: Partial<Task>): void {
    this.tasks.update((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  reassign(taskId: string, toId: string): void {
    this.tasks.update((list) => list.map((t) => (t.id === taskId ? { ...t, reassignedFrom: t.ownerId, ownerId: toId } : t)));
  }

  addReflection(r: Reflection): void {
    this.reflections.update((list) => [...list.filter((x) => x.id !== r.id), r]);
  }
}
