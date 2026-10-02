import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TeamStore } from '../../core/services/team-store.service';
import { addDays, formatDay, MOCK_TODAY } from '../../core/utils/date';
import { isDone, isUnwell } from '../../core/utils/insights';

/** Day | Health | Energy | Focus | Stress | Tasks done | Note, for the last 7 working days. */
@Component({
  selector: 'app-seven-day-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <table>
        <thead>
          <tr><th>Day</th><th>Health</th><th>Energy</th><th>Focus</th><th>Stress</th><th>Tasks done</th><th>Note</th></tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.date) {
            <tr>
              <td class="day">{{ r.label }}</td>
              <td><span class="health" [class]="r.healthClass">{{ r.health }}</span></td>
              <td>{{ r.energy }}</td>
              <td>{{ r.focus }}</td>
              <td>{{ r.stress }}</td>
              <td>{{ r.done }}</td>
              <td class="note">{{ r.note }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 520px; }
    th { text-align: left; font-weight: 500; color: var(--pulse-muted); font-size: 0.75rem; padding: 8px; border-bottom: 1px solid var(--pulse-border); }
    td { padding: 10px 8px; border-bottom: 1px solid var(--pulse-border); vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    .day { white-space: nowrap; font-weight: 500; }
    .note { color: var(--pulse-muted); }
    .health { white-space: nowrap; }
    .health::before { content: ''; display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; background: var(--c, var(--status-offline)); }
    .well { --c: var(--status-working); }
    .unwell { --c: var(--status-resting); }
  `,
})
export class SevenDayTable {
  private readonly store = inject(TeamStore);
  readonly personId = input.required<string>();
  /** The manager sees temperature only when the person shared details. */
  readonly ownView = input(false);

  protected readonly rows = computed(() => {
    const id = this.personId();
    const checkIns = this.store.checkInsFor(id);
    const tasks = this.store.tasks().filter((t) => t.ownerId === id);
    const rows = [];
    for (let i = 0; rows.length < 7 && i < 21; i++) {
      const date = addDays(MOCK_TODAY, -i);
      const c = checkIns.find((x) => x.date === date);
      const dayTasks = tasks.filter((t) => t.date === date);
      if (!c && !dayTasks.length) continue; // weekends
      const unwell = isUnwell(c);
      const showTemp = unwell && c?.temperatureF && (this.ownView() || c.shareDetails);
      rows.push({
        date,
        label: date === MOCK_TODAY ? 'Today' : formatDay(date),
        health: !c ? 'No check-in' : unwell ? (showTemp ? `Unwell · ${c.temperatureF}°F` : 'Unwell – rest') : 'Well',
        healthClass: !c ? '' : unwell ? 'unwell' : 'well',
        energy: c ? c.energy + '/5' : '—',
        focus: c ? c.focus + '/5' : '—',
        stress: c ? c.stress + '/5' : '—',
        done: `${dayTasks.filter(isDone).length} of ${dayTasks.length}`,
        note: c?.note ?? '',
      });
    }
    return rows;
  });
}
