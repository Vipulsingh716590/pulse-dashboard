import { computed, Signal, signal } from '@angular/core';
import { addDays, formatDay, formatDayShort, formatMonth, formatShortMonth, lastDayOfMonth, monthKey, weekStart } from './date';

export type PeriodLevel = 'all' | 'month' | 'week' | 'day';

/** A node in the Month → Week → Day tree. `start`/`end` are inclusive ISO dates. */
export interface Period {
  level: PeriodLevel;
  start: string;
  end: string;
  label: string; // long label, for breadcrumbs
  shortLabel: string; // axis label
}

const CHILD_LEVEL: Record<PeriodLevel, PeriodLevel | null> = { all: 'month', month: 'week', week: 'day', day: null };

export const inPeriod = (date: string, p: Period) => date >= p.start && date <= p.end;

/** Children of a period, limited to dates that have data. */
export function childrenOf(period: Period, dates: string[]): Period[] {
  const within = [...new Set(dates.filter((d) => inPeriod(d, period)))].sort();
  switch (CHILD_LEVEL[period.level]) {
    case 'month':
      return [...new Set(within.map(monthKey))].map((m) => ({
        level: 'month', start: m + '-01', end: lastDayOfMonth(m), label: formatMonth(m), shortLabel: formatShortMonth(m),
      }));
    case 'week':
      return [...new Set(within.map(weekStart))].map((w) => {
        // whole Monday–Sunday weeks, so the latest week still shows five working days at a month boundary
        const start = w;
        const end = addDays(w, 6);
        return { level: 'week', start, end, label: `Week of ${formatDay(start)}`, shortLabel: formatDayShort(start).replace(/^\w+ /, '') + '–' + formatDayShort(end).replace(/^\w+ /, '') };
      });
    case 'day':
      return within.map((d) => ({ level: 'day', start: d, end: d, label: formatDay(d), shortLabel: formatDayShort(d) }));
    default:
      return [];
  }
}

/**
 * Signal-based drill-down state shared by every Month → Week → Day chart.
 * The path is the breadcrumb; the last entry is the selected range.
 */
export class DrillDown {
  readonly path = signal<Period[]>([]);

  constructor(private readonly dates: Signal<string[]>, private readonly rootLabel = 'All months') {}

  private readonly root = computed<Period>(() => {
    const ds = this.dates();
    const sorted = [...ds].sort();
    return { level: 'all', start: sorted[0] ?? '', end: sorted.at(-1) ?? '', label: this.rootLabel, shortLabel: this.rootLabel };
  });

  /** Breadcrumb from the root to the selection. */
  readonly trail = computed(() => [this.root(), ...this.path()]);
  /** The selected range: filters KPIs and other charts. */
  readonly selected = computed(() => this.trail().at(-1)!);
  /** Granularity of the points currently on the chart. */
  readonly grain = computed<'month' | 'week' | 'day'>(() => {
    const level = this.selected().level;
    return level === 'all' ? 'month' : level === 'month' ? 'week' : 'day';
  });
  /** Points to plot: children of the selection (or, for a day, its sibling days). */
  readonly points = computed(() => {
    const trail = this.trail();
    const sel = trail.at(-1)!;
    return sel.level === 'day' ? childrenOf(trail.at(-2)!, this.dates()) : childrenOf(sel, this.dates());
  });
  /** Index of the selected day among `points`, or -1. */
  readonly highlighted = computed(() => {
    const sel = this.selected();
    return sel.level === 'day' ? this.points().findIndex((p) => p.start === sel.start) : -1;
  });
  /** The period before the selection at the same level (for "change vs last …"). */
  readonly previous = computed<Period | null>(() => {
    const trail = this.trail();
    const sel = trail.at(-1)!;
    if (sel.level === 'all') {
      const months = childrenOf(sel, this.dates());
      return months.at(-2) ?? null;
    }
    const siblings = childrenOf(trail.at(-2)!, this.dates());
    const i = siblings.findIndex((p) => p.start === sel.start);
    return i > 0 ? siblings[i - 1] : null;
  });
  /** For "all", the current period to compare against previous is the latest month. */
  readonly current = computed<Period>(() => {
    const sel = this.selected();
    return sel.level === 'all' ? (childrenOf(sel, this.dates()).at(-1) ?? sel) : sel;
  });

  /** Click on a chart point. */
  drillInto(index: number): void {
    const point = this.points()[index];
    if (!point) return;
    if (this.selected().level === 'day') this.path.update((p) => [...p.slice(0, -1), point]);
    else this.path.update((p) => [...p, point]);
  }

  /** Jump to a breadcrumb entry (0 = root). */
  goTo(index: number): void {
    this.path.update((p) => p.slice(0, index));
  }

  /** Month / Week / Day toggle: go to that granularity, drilling into the latest period if needed. */
  setGrain(grain: 'month' | 'week' | 'day'): void {
    const depth = { month: 0, week: 1, day: 2 }[grain];
    let path = this.path().slice(0, depth);
    while (path.length < depth) {
      const parent = path.at(-1) ?? this.root();
      const latest = childrenOf(parent, this.dates()).at(-1);
      if (!latest) break;
      path = [...path, latest];
    }
    this.path.set(path);
  }
}
