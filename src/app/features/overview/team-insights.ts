import { Team, TeamDailyMetric, TeamId } from '../../core/models';
import { inPeriod, Period } from '../../core/utils/drilldown';

export interface TeamTotals {
  tasksDelivered: number;
  bugsFixed: number;
  featuresShipped: number;
  impactScore: number;
  plannedTasks: number;
  onTimeTasks: number;
}

export const METRICS: { key: keyof TeamTotals; label: string }[] = [
  { key: 'tasksDelivered', label: 'Tasks delivered' },
  { key: 'bugsFixed', label: 'Bugs fixed' },
  { key: 'featuresShipped', label: 'Features shipped' },
  { key: 'impactScore', label: 'Business impact' },
];

const empty = (): TeamTotals => ({ tasksDelivered: 0, bugsFixed: 0, featuresShipped: 0, impactScore: 0, plannedTasks: 0, onTimeTasks: 0 });

/** Sums every metric per team within a period. */
export function totalsByTeam(metrics: TeamDailyMetric[], period: Period | null): Map<TeamId, TeamTotals> {
  const map = new Map<TeamId, TeamTotals>();
  if (!period) return map;
  for (const m of metrics) {
    if (!inPeriod(m.date, period)) continue;
    const t = map.get(m.teamId) ?? empty();
    t.tasksDelivered += m.tasksDelivered;
    t.bugsFixed += m.bugsFixed;
    t.featuresShipped += m.featuresShipped;
    t.impactScore += m.impactScore;
    t.plannedTasks += m.plannedTasks;
    t.onTimeTasks += m.onTimeTasks;
    map.set(m.teamId, t);
  }
  return map;
}

/** Web Team's share of total business impact, 0–100. */
export function contributionPct(totals: Map<TeamId, TeamTotals>): number {
  const all = [...totals.values()].reduce((s, t) => s + t.impactScore, 0);
  return all ? ((totals.get('web')?.impactScore ?? 0) / all) * 100 : 0;
}

export function onTimePct(t: TeamTotals | undefined): number {
  return t && t.plannedTasks ? (t.onTimeTasks / t.plannedTasks) * 100 : 0;
}

/** 1-based rank of the Web Team by business impact. */
export function webRank(totals: Map<TeamId, TeamTotals>): number {
  const sorted = [...totals.entries()].sort((a, b) => b[1].impactScore - a[1].impactScore);
  return sorted.findIndex(([id]) => id === 'web') + 1;
}

export function otherTeams(teams: Team[]): Team[] {
  return teams.filter((t) => !t.isWebTeam);
}

export const pctChange = (now: number, before: number) => (before ? ((now - before) / before) * 100 : 0);
