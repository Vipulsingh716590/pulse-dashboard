import { CheckIn, FocusHour, FocusLog, Member, Outlook, SKILL_LABELS, SkillArea, Task, TaskStatus } from '../models';
import { average, round } from './date';

/**
 * Small, explainable rules. Inputs are always people's own check-ins and tasks;
 * nothing is guessed, and every sentence says what it is based on.
 */

export const FRAMEWORK_TIPS = {
  who5: 'Based on the WHO-5 Wellbeing Index (World Health Organization): 5 questions, score 0–100. Below 50 suggests checking in with someone.',
  maslach: 'Based on the three Maslach burnout dimensions: exhaustion, cynicism and reduced efficacy. Computed from check-ins and tasks, not a diagnosis.',
  flow: 'Based on Flow (Csikszentmihalyi): hours with high focus where the challenge matched the skill.',
  stoic: 'Inspired by Stoic philosophy (Epictetus): put your energy into what is in your control.',
  outlook: 'Simple rules over the last 5 working days, not AI. Each line says why it appears.',
} as const;

export const MOOD_EMOJI = ['😞', '😕', '😐', '🙂', '😄'] as const;
export const moodEmoji = (mood: number) => MOOD_EMOJI[Math.min(5, Math.max(1, Math.round(mood))) - 1];

export const DONE_STATUSES: TaskStatus[] = ['completed', 'reported', 'accepted'];
export const isDone = (t: Task) => DONE_STATUSES.includes(t.status);
export const isOpen = (t: Task) => !isDone(t);

export const STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Planned',
  'in-progress': 'In progress',
  completed: 'Completed',
  reported: 'Reported to manager',
  accepted: 'Accepted',
  pending: 'Pending',
};

/** Skill a task needs from its owner. "Both" needs frontend and backend, so the weaker of the two counts. */
export function skillFor(person: Member, type: Task['type']): number {
  if (type === 'both') return Math.min(person.skills.frontend, person.skills.backend);
  return person.skills[type];
}
export const TYPE_LABELS: Record<Task['type'], string> = { frontend: 'Frontend', backend: 'Backend', both: 'Both' };

/** A person is unwell today when they say so or report 100°F (37.8°C) or more. */
export const isUnwell = (c: CheckIn | undefined) => !!c && (!c.feelingWell || (c.temperatureF ?? 0) >= 100);

/** WHO-5 raw sum (0–25) × 4 = 0–100. */
export const who5Score = (answers: number[]) => answers.reduce((s, a) => s + a, 0) * 4;

/** Flow hour: high focus, real challenge, and challenge roughly equal to skill. */
export const isFlowHour = (h: FocusHour) =>
  h.workType !== 'break' && h.workType !== 'meeting' && h.focus >= 4 && h.challenge >= 3 && Math.abs(h.challenge - h.skill) <= 1;

export const flowHours = (logs: FocusLog[]) => logs.reduce((s, l) => s + l.hours.filter(isFlowHour).length, 0);

/**
 * Maslach-inspired strain signals (0–100, higher = more strain).
 * exhaustion ← low energy, high stress, short sleep · cynicism ← low mood · reduced efficacy ← low focus and unfinished tasks
 */
export function burnoutSignals(checkIns: CheckIn[], tasks: Task[]) {
  if (!checkIns.length) return { exhaustion: 0, cynicism: 0, efficacy: 0 };
  const lowEnergy = average(checkIns.map((c) => (5 - c.energy) / 4));
  const stress = average(checkIns.map((c) => (c.stress - 1) / 4));
  const shortSleep = checkIns.filter((c) => c.sleepHours < 6).length / checkIns.length;
  const lowMood = average(checkIns.map((c) => (5 - c.mood) / 4));
  const lowFocus = average(checkIns.map((c) => (5 - c.focus) / 4));
  const unfinished = tasks.length ? tasks.filter(isOpen).length / tasks.length : 0;
  return {
    exhaustion: Math.round(((lowEnergy + stress + shortSleep) / 3) * 100),
    cynicism: Math.round(lowMood * 100),
    /** Shown as "reduced efficacy": higher means less sense of getting things done. */
    efficacy: Math.round(((lowFocus + unfinished) / 2) * 100),
  };
}

/** Consecutive most recent check-ins with under 6h of sleep. */
export function shortSleepStreak(checkIns: CheckIn[]): number {
  let n = 0;
  for (const c of [...checkIns].sort((a, b) => b.date.localeCompare(a.date))) {
    if (c.sleepHours < 6) n++;
    else break;
  }
  return n;
}

export function strengthsAndGaps(person: Member) {
  const entries = (Object.keys(SKILL_LABELS) as SkillArea[]).map((area) => ({ area, label: SKILL_LABELS[area], score: person.skills[area] }));
  return {
    strengths: entries.filter((e) => e.score >= 4).sort((a, b) => b.score - a.score),
    gaps: entries.filter((e) => e.score <= 2).sort((a, b) => a.score - b.score),
  };
}

/** One small, concrete action per weak area. */
export const IMPROVEMENT_ACTIONS: Record<SkillArea, string> = {
  frontend: 'Rebuild one small component from the design system on your own, then compare.',
  backend: 'Pair with Developer C for 30 minutes on one API endpoint this week.',
  ui: 'Recreate one Figma screen pixel-perfect and ask a designer for 5 minutes of feedback.',
  testing: 'Write one component test for every bug you fix this week.',
  api: 'Read one API handler end to end before you integrate it.',
  communication: 'Post a 3-line written update in the team channel at the end of each day.',
};

/** "Understanding this person": plain-words patterns, each backed by their own data. */
export function personInsights(person: Member, checkIns: CheckIn[], logs: FocusLog[], todayLoad: number, blockedReason?: string): string[] {
  const out: string[] = [];

  // Afternoon focus on long meeting days vs other days
  const meetingHeavy = logs.filter((l) => l.hours.filter((h) => h.workType === 'meeting').length >= 3);
  const others = logs.filter((l) => !meetingHeavy.includes(l));
  const afternoon = (ls: FocusLog[]) => average(ls.flatMap((l) => l.hours.filter((h) => h.hour >= 15).map((h) => h.focus)));
  if (meetingHeavy.length >= 3 && others.length >= 3 && afternoon(others) - afternoon(meetingHeavy) >= 1) {
    out.push(
      `Focus drops after 3 PM on long meeting days (${round(afternoon(meetingHeavy), 1)}/5 vs ${round(afternoon(others), 1)}/5 on lighter days).`,
    );
  }

  // Strengths and the area with the least confidence
  const { strengths, gaps } = strengthsAndGaps(person);
  if (strengths.length && gaps.length) {
    out.push(`Strong in ${strengths.slice(0, 2).map((s) => s.label).join(' and ')}, low confidence in ${gaps.map((g) => g.label).join(' and ')}.`);
  } else if (strengths.length) {
    out.push(`Strong in ${strengths.slice(0, 2).map((s) => s.label).join(' and ')}, no weak areas below 3/5.`);
  }

  // Sleep
  const streak = shortSleepStreak(checkIns);
  if (streak >= 3) out.push(`Slept under 6h for ${streak} days – lighter load suggested.`);

  // Best deep-work window
  const byHour = new Map<number, number>();
  for (const l of logs) for (const h of l.hours) if (isFlowHour(h)) byHour.set(h.hour, (byHour.get(h.hour) ?? 0) + 1);
  const best = [...byHour.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([h]) => h).sort((a, b) => a - b);
  if (best.length === 2 && best[1] - best[0] === 1) out.push(`Does the best deep work between ${hourLabel(best[0])} and ${hourLabel(best[1] + 1)}.`);
  else if (best.length) out.push(`Most flow hours happen around ${hourLabel(best[0])}.`);

  // Load and blockers today
  if (todayLoad > 110) out.push(`Today is planned at ${todayLoad}% of capacity.`);
  if (blockedReason) out.push(`Blocked right now: ${blockedReason.charAt(0).toLowerCase() + blockedReason.slice(1)}.`);

  // Mood trend
  const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
  const last5 = sorted.slice(-5);
  const prev5 = sorted.slice(-10, -5);
  if (last5.length >= 3 && prev5.length >= 3) {
    const diff = average(last5.map((c) => c.mood)) - average(prev5.map((c) => c.mood));
    if (diff <= -0.6) out.push('Mood has dipped compared with the week before. A short 1:1 could help.');
    else if (diff >= 0.6) out.push('Mood is up compared with the week before.');
  }
  return out;
}

export const hourLabel = (h: number) => (h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`);

/**
 * Next-week outlook: a points-based risk level over the last 5 check-ins and today's load.
 * 3+ points = High, 1–2 = Medium, 0 = Low. Every point comes with its reason.
 */
export function nextWeekOutlook(checkIns: CheckIn[], todayLoad: number): Outlook {
  const recent = [...checkIns].sort((a, b) => a.date.localeCompare(b.date)).slice(-5);
  if (recent.length < 3) return { level: 'Low', reasons: ['Not enough recent check-ins to see a pattern yet.'] };
  const reasons: string[] = [];
  let points = 0;
  const sleep = round(average(recent.map((c) => c.sleepHours)), 1);
  const streak = shortSleepStreak(checkIns);
  if (streak >= 3) {
    points += 2;
    reasons.push(`Slept under 6h on each of the last ${streak} days.`);
  } else if (sleep < 6.5) {
    points += 1;
    reasons.push(`Average sleep is ${sleep}h over the last ${recent.length} check-ins.`);
  }
  if (todayLoad >= 120) {
    points += 2;
    reasons.push(`Today is planned at ${todayLoad}% of capacity.`);
  } else if (todayLoad > 100) {
    points += 1;
    reasons.push(`Today is planned at ${todayLoad}% of capacity.`);
  }
  const stress = round(average(recent.map((c) => c.stress)), 1);
  if (stress >= 3.8) {
    points += 1;
    reasons.push(`Stress averaged ${stress}/5 recently.`);
  }
  const energy = round(average(recent.map((c) => c.energy)), 1);
  if (energy <= 2.5) {
    points += 1;
    reasons.push(`Energy averaged ${energy}/5 recently.`);
  }
  const unwell = recent.filter((c) => isUnwell(c)).length;
  if (unwell) {
    points += 1;
    reasons.push(`Felt unwell on ${unwell} of the last ${recent.length} days.`);
  }
  if (!reasons.length) reasons.push(`Sleep (${sleep}h), stress (${stress}/5) and workload all look balanced.`);
  return { level: points >= 3 ? 'High' : points >= 1 ? 'Medium' : 'Low', reasons };
}
