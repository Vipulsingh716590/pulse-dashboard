import { computed, inject, Injectable, signal } from '@angular/core';
import { Member, Task } from '../models';
import { isOpen, skillFor, TYPE_LABELS } from '../utils/insights';
import { NotificationService } from './notification.service';
import { TeamStore } from './team-store.service';

export interface Suggestion {
  key: string;
  task: Task;
  from: Member;
  /** null when nobody qualifies. */
  to: Member | null;
  why: 'unavailable' | 'skill';
  reason: string;
  /** The receiver's load before and after the move, in %. */
  loadBefore?: number;
  loadAfter?: number;
}

/** Minimum owner skill before we suggest help, and minimum skill to receive a task. */
export const MIN_OWNER_SKILL = 3;
export const MIN_RECEIVER_SKILL = 4;

const areaLabel = (type: Task['type']) => (type === 'both' ? 'full-stack' : TYPE_LABELS[type].toLowerCase());

/**
 * Plain rules, no AI:
 * - A task needs a suggestion if its owner is unavailable OR the owner's skill in the task's area is below 3.
 * - Suggest the available person with skill ≥ 4 in that area and the LOWEST current load; on a tie, the higher skill.
 * - Loads add up as suggestions are made, so two tasks don't both land on the same "lightest" person blindly.
 */
export function suggestReassignments(
  tasks: Task[],
  members: Member[],
  isAvailable: (id: string) => boolean,
  loadOf: (id: string) => number,
  statusText: (id: string) => string,
): Suggestion[] {
  const load = new Map(members.map((m) => [m.id, loadOf(m.id)]));
  const out: Suggestion[] = [];
  for (const task of tasks.filter(isOpen)) {
    const from = members.find((m) => m.id === task.ownerId);
    if (!from) continue;
    const ownerSkill = skillFor(from, task.type);
    const unavailable = !isAvailable(from.id);
    if (!unavailable && ownerSkill >= MIN_OWNER_SKILL) continue;

    const area = areaLabel(task.type);
    const candidates = members
      .filter((m) => m.id !== from.id && isAvailable(m.id) && skillFor(m, task.type) >= MIN_RECEIVER_SKILL)
      .sort((a, b) => load.get(a.id)! - load.get(b.id)! || skillFor(b, task.type) - skillFor(a, task.type));
    const to = candidates[0] ?? null;
    const ownerPart = unavailable ? `${from.shortName} is ${statusText(from.id)}` : `${from.shortName} ${area} ${ownerSkill}/5`;

    if (!to) {
      out.push({ key: `${task.id}->none`, task, from, to, why: unavailable ? 'unavailable' : 'skill',
        reason: `${ownerPart}; nobody available has ${area} skill ${MIN_RECEIVER_SKILL}/5 or more. Consider moving it to tomorrow.` });
      continue;
    }
    const before = load.get(to.id)!;
    const after = before + Math.round((task.estimateHours / to.capacityHours) * 100);
    load.set(to.id, after);
    out.push({
      key: `${task.id}->${to.id}`, task, from, to, why: unavailable ? 'unavailable' : 'skill', loadBefore: before, loadAfter: after,
      reason: `${ownerPart}, ${to.shortName} ${area} ${skillFor(to, task.type)}/5, ${to.shortName} load ${before}%`,
    });
  }
  return out;
}

@Injectable({ providedIn: 'root' })
export class ReassignmentService {
  private readonly store = inject(TeamStore);
  private readonly notifications = inject(NotificationService);
  private readonly dismissed = signal<ReadonlySet<string>>(new Set());

  readonly suggestions = computed(() =>
    suggestReassignments(
      this.store.todayTasks(),
      this.store.members(),
      (id) => this.store.isAvailable(id),
      (id) => this.store.loadOf(id),
      (id) => (this.store.statusOf(id) === 'resting' ? 'resting today' : 'offline today'),
    ).filter((s) => !this.dismissed().has(s.key)),
  );

  forOwner(personId: string): Suggestion[] {
    return this.suggestions().filter((s) => s.from.id === personId);
  }

  approve(s: Suggestion): void {
    if (!s.to) return;
    this.store.reassign(s.task.id, s.to.id);
    this.notifications.push({ to: s.to.id, kind: 'reassign', title: `New task for you: ${s.task.title}`,
      body: `Moved from ${s.from.name} by your manager. Reason: ${s.reason}.`, link: '/my-space' });
    this.notifications.push({ to: s.from.id, kind: 'reassign', title: `${s.task.title} moved to ${s.to.name}`,
      body: s.why === 'unavailable' ? 'So you can rest. Get well soon!' : 'A teammate with more experience in this area will take it.', link: '/my-space' });
  }

  dismiss(s: Suggestion): void {
    this.dismissed.update((set) => new Set([...set, s.key]));
  }
}
