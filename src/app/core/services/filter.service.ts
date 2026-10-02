import { computed, Injectable, signal } from '@angular/core';
import { addDays, MOCK_TODAY } from '../utils/date';

export type DateRange = 'today' | 'week' | 'month';

/** The top bar's Today / Week / Month filter. Week and Month are rolling (last 7 / 30 days). */
@Injectable({ providedIn: 'root' })
export class FilterService {
  readonly range = signal<DateRange>('today');

  readonly from = computed(() => ({ today: MOCK_TODAY, week: addDays(MOCK_TODAY, -6), month: addDays(MOCK_TODAY, -29) })[this.range()]);
  readonly label = computed(() => ({ today: 'Today', week: 'Last 7 days', month: 'Last 30 days' })[this.range()]);

  inRange(date: string): boolean {
    return date >= this.from() && date <= MOCK_TODAY;
  }
}
