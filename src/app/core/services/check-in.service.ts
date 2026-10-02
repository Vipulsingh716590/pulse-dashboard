import { inject, Injectable } from '@angular/core';
import { CheckIn } from '../models';
import { fToC } from '../utils/date';
import { isUnwell } from '../utils/insights';
import { NotificationService } from './notification.service';
import { ReassignmentService } from './reassignment.service';
import { TeamStore } from './team-store.service';

/**
 * Saves a daily check-in. If the person is unwell (or reports 100°F / 37.8°C or more), automatically:
 * 1. their status turns 🔵 Resting (TeamStore.statuses reacts to the check-in),
 * 2. the manager's bell gets "<Name> is unwell and needs rest today.",
 * 3. reassignment suggestions appear for their open tasks (ReassignmentService reacts too).
 */
@Injectable({ providedIn: 'root' })
export class CheckInService {
  private readonly store = inject(TeamStore);
  private readonly notifications = inject(NotificationService);
  private readonly reassignment = inject(ReassignmentService);

  submit(c: CheckIn): { unwell: boolean; suggestions: number } {
    const wasUnwell = isUnwell(this.store.todayCheckIn(c.personId));
    this.store.upsertCheckIn(c);
    const unwell = isUnwell(c);
    const suggestions = this.reassignment.forOwner(c.personId).length;
    if (unwell && !wasUnwell) {
      const name = this.store.name(c.personId);
      const details = [
        c.temperatureF ? `Temperature ${c.temperatureF}°F (${fToC(c.temperatureF)}°C)` : '',
        c.symptoms?.trim() ? `Symptoms: ${c.symptoms.trim()}` : '',
      ].filter(Boolean);
      this.notifications.push({
        to: 'mgr', kind: 'health', personId: c.personId, link: '/team',
        title: `${name} is unwell and needs rest today.`,
        body: c.shareDetails && details.length ? details.join(' · ') : 'Unwell – needs rest.',
      });
      if (suggestions) {
        this.notifications.push({
          to: 'mgr', kind: 'reassign', personId: c.personId, link: '/tasks',
          title: `${suggestions} task${suggestions > 1 ? 's' : ''} from ${name} can be covered`,
          body: 'Reassignment suggestions are ready to approve.',
        });
      }
    }
    return { unwell, suggestions };
  }
}
