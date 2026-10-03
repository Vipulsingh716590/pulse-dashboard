// Generates the mock JSON in src/assets/mock-data.
// Deterministic (seeded), so re-running gives the same data.
// Run: node scripts/generate-mock-data.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('../src/assets/mock-data/', import.meta.url);
const TODAY = '2026-10-02'; // keep in sync with MOCK_TODAY in src/app/core/utils/date.ts
const NOW_HOUR = 11; // the demo day is "live" until 11:59

// ---------- helpers ----------
let seed = 7;
function rand() {
  // mulberry32
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (min, max) => min + rand() * (max - min);
const int = (min, max) => Math.floor(between(min, max + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const round1 = (v) => Math.round(v * 10) / 10;
const scale5 = (v) => clamp(Math.round(v), 1, 5);

const iso = (d) => d.toISOString().slice(0, 10);
const parse = (s) => new Date(s + 'T00:00:00Z');
const addDays = (s, n) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const weekday = (s) => parse(s).getUTCDay();
const isWeekday = (s) => weekday(s) !== 0 && weekday(s) !== 6;
const weekStart = (s) => addDays(s, 1 - (weekday(s) || 7));
function workingDaysBack(count, end) {
  const days = [];
  for (let d = end; days.length < count; d = addDays(d, -1)) if (isWeekday(d)) days.unshift(d);
  return days;
}
function workingDaysBetween(start, end) {
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWeekday(d)) days.push(d);
  return days;
}
const write = (name, data) => {
  // one row per line: compact but still easy to read and diff
  const body = Array.isArray(data) ? '[\n' + data.map((r) => '  ' + JSON.stringify(r)).join(',\n') + '\n]' : JSON.stringify(data, null, 2);
  writeFileSync(new URL(name, OUT), body + '\n');
  console.log('wrote', name, Array.isArray(data) ? `${data.length} rows` : '');
};

mkdirSync(OUT, { recursive: true });

// ---------- MobiKwik teams (Overview comparison) ----------
const teams = [
  { id: 'web', name: 'Web Team', isWebTeam: true, headcount: 5, color: '#6d5dd3',
    strengths: { frontend: 94, backend: 72, speed: 88, quality: 84, collaboration: 90, innovation: 86 } },
  { id: 'mobile', name: 'Mobile Apps', isWebTeam: false, headcount: 9, color: '#9aa5b8',
    strengths: { frontend: 70, backend: 48, speed: 72, quality: 78, collaboration: 70, innovation: 74 } },
  { id: 'platform', name: 'Platform', isWebTeam: false, headcount: 11, color: '#b4bccb',
    strengths: { frontend: 30, backend: 92, speed: 64, quality: 82, collaboration: 66, innovation: 70 } },
  { id: 'payments', name: 'Payments Core', isWebTeam: false, headcount: 8, color: '#8792a6',
    strengths: { frontend: 25, backend: 88, speed: 60, quality: 86, collaboration: 64, innovation: 62 } },
  { id: 'qa', name: 'QA', isWebTeam: false, headcount: 6, color: '#c8ced9',
    strengths: { frontend: 40, backend: 40, speed: 60, quality: 90, collaboration: 74, innovation: 52 } },
  { id: 'design', name: 'Design', isWebTeam: false, headcount: 4, color: '#d7dbe3',
    strengths: { frontend: 58, backend: 10, speed: 66, quality: 80, collaboration: 82, innovation: 84 } },
  { id: 'data', name: 'Data & Risk', isWebTeam: false, headcount: 5, color: '#a6afc0',
    strengths: { frontend: 20, backend: 70, speed: 58, quality: 76, collaboration: 62, innovation: 80 } },
];
write('teams.json', teams);

// Daily impact baseline per team; Web ≈ the other six combined (≈ 50% share).
const teamProfile = {
  web: { impact: 100, tasks: 15, bugs: 6, features: 1.1, onTime: 0.93 },
  mobile: { impact: 24, tasks: 9, bugs: 4.5, features: 0.5, onTime: 0.82 },
  platform: { impact: 25, tasks: 10, bugs: 5, features: 0.5, onTime: 0.85 },
  payments: { impact: 18, tasks: 7, bugs: 3, features: 0.3, onTime: 0.84 },
  qa: { impact: 10, tasks: 6, bugs: 5.5, features: 0.1, onTime: 0.88 },
  design: { impact: 9, tasks: 4, bugs: 0.5, features: 0.3, onTime: 0.86 },
  data: { impact: 14, tasks: 5, bugs: 2, features: 0.3, onTime: 0.8 },
};
const LOW_FOCUS = (d) => d >= '2026-09-07' && d <= '2026-09-11'; // release crunch + outage
const HIGH_FLOW = (d) => d >= '2026-09-21' && d <= '2026-09-25'; // clear sprint, no meetings
const metricDays = workingDaysBetween('2026-05-01', TODAY);
const teamMetrics = [];
metricDays.forEach((date, i) => {
  const progress = i / metricDays.length; // web team grows steadily over 6 months
  for (const team of teams) {
    const p = teamProfile[team.id];
    const growth = team.id === 'web' ? 0.88 + progress * 0.24 : 0.97 + progress * 0.06;
    const week = LOW_FOCUS(date) ? 0.8 : HIGH_FLOW(date) ? 1.12 : 1;
    const f = growth * (team.id === 'web' ? week : 1) * between(0.82, 1.18);
    const planned = Math.max(1, Math.round(p.tasks * f * between(1.0, 1.12)));
    const delivered = Math.min(planned, Math.round(p.tasks * f));
    teamMetrics.push({
      teamId: team.id,
      date,
      tasksDelivered: delivered,
      bugsFixed: Math.round(p.bugs * f * between(0.7, 1.3)),
      featuresShipped: Math.round(p.features * f * between(0.4, 1.6)),
      impactScore: Math.round(p.impact * f),
      plannedTasks: planned,
      onTimeTasks: Math.round(delivered * clamp(p.onTime * between(0.94, 1.05), 0, 1)),
    });
  }
});
write('team-metrics.json', teamMetrics);

// ---------- Web Team people ----------
// Skill scores are 1–5 per area.
const people = [
  { id: 'mgr', name: 'Ananya Rao', shortName: 'Ananya', role: 'manager', position: 'Engineering Manager', avatarColor: '#2f6fed' },
  { id: 'lead', name: 'Aarav Mehta', shortName: 'Aarav', role: 'lead', position: 'Team Lead, Web', avatarColor: '#6d5dd3',
    skills: { frontend: 4, backend: 4, ui: 3, testing: 3, api: 5, communication: 5 },
    base: { mood: 4, energy: 3.8, stress: 3, focus: 3.6, sleep: 6.9 } },
  { id: 'a', name: 'Developer A', shortName: 'A', role: 'developer', position: 'Senior Frontend Developer', avatarColor: '#d36d9e',
    skills: { frontend: 5, backend: 2, ui: 5, testing: 4, api: 3, communication: 4 },
    base: { mood: 4.1, energy: 4, stress: 2.6, focus: 4, sleep: 7.2 } },
  { id: 'b', name: 'Developer B', shortName: 'B', role: 'developer', position: 'Frontend Developer', avatarColor: '#3d9a8b',
    skills: { frontend: 4, backend: 3, ui: 4, testing: 2, api: 3, communication: 3 },
    base: { mood: 3.7, energy: 3.6, stress: 2.9, focus: 3.6, sleep: 7 }, meetingHeavy: true },
  { id: 'c', name: 'Developer C', shortName: 'C', role: 'developer', position: 'Backend Developer', avatarColor: '#d3a25d',
    skills: { frontend: 3, backend: 5, ui: 2, testing: 4, api: 5, communication: 4 },
    base: { mood: 4.2, energy: 4, stress: 2.4, focus: 3.9, sleep: 7.4 } },
  { id: 'd', name: 'Developer D', shortName: 'D', role: 'developer', position: 'Full-Stack Developer', avatarColor: '#5d8fd3',
    skills: { frontend: 4, backend: 4, ui: 3, testing: 3, api: 4, communication: 3 },
    base: { mood: 3.7, energy: 3.6, stress: 3.2, focus: 3.8, sleep: 6.6 } },
  { id: 'e', name: 'Developer E', shortName: 'E', role: 'developer', position: 'Junior Frontend Developer', avatarColor: '#5db37a',
    skills: { frontend: 4, backend: 2, ui: 3, testing: 2, api: 2, communication: 4 },
    base: { mood: 3.9, energy: 4, stress: 3, focus: 3.5, sleep: 7.3 } },
];
const initials = (name) => (name.startsWith('Developer ') ? 'D' + name.slice(-1) : name.split(' ').map((p) => p[0]).join(''));
write('people.json', people.map(({ base, meetingHeavy, ...p }) => ({
  ...p,
  initials: initials(p.name),
  ...(p.role !== 'manager' ? { capacityHours: 8, reportsTo: p.role === 'lead' ? 'mgr' : 'lead' } : {}),
})));
const members = people.filter((p) => p.role !== 'manager');

// ---------- check-ins and focus over the last 30 working days ----------
const days = workingDaysBack(30, TODAY);
const FEVER = { personId: 'e', date: '2026-09-15' }; // Developer E has a fever
const LEAVE = [{ personId: 'e', date: '2026-09-16' }, { personId: 'lead', date: TODAY }];
const isLeave = (id, d) => LEAVE.some((l) => l.personId === id && l.date === d);
const dCrunch = (id, d) => id === 'd' && d >= '2026-09-28'; // overload + high stress + low energy → high risk
const CHECKED_IN_TODAY = ['a', 'b', 'd']; // C and E can check in from My Space

const notes = {
  good: ['Shipped the KYC step, feels great', 'Good pairing session', 'Clear head today', 'Finally fixed that flaky test',
    'Nice demo with product', 'Quiet morning, lots done'],
  meh: ['Too many meetings', 'Waiting on API contract', 'Bit tired, slow start', 'Context switching a lot', 'Reviewing more than coding today'],
  low: ['Release crunch, long day', 'Outage firefighting took the morning', 'Slept badly', 'Feeling stretched thin', 'Rough day, will reset tomorrow'],
};

const checkIns = [];
const focusLogs = [];
for (const p of members) {
  for (const date of days) {
    if (isLeave(p.id, date)) continue;
    if (date === TODAY && !CHECKED_IN_TODAY.includes(p.id)) continue;
    const b = p.base;
    let mod = { mood: 0, energy: 0, stress: 0, focus: 0, sleep: 0 };
    if (LOW_FOCUS(date)) mod = { mood: -0.9, energy: -0.8, stress: 1.2, focus: -1.5, sleep: -0.8 };
    if (HIGH_FLOW(date)) mod = { mood: 0.7, energy: 0.5, stress: -0.6, focus: 1.1, sleep: 0.3 };
    if (dCrunch(p.id, date)) mod = { mood: -1, energy: -1.3, stress: 1.4, focus: -0.6, sleep: -1.2 };
    const sick = FEVER.personId === p.id && FEVER.date === date;
    const n = () => between(-0.6, 0.6);
    const c = {
      id: `c-${p.id}-${date}`,
      personId: p.id,
      date,
      feelingWell: !sick,
      ...(sick ? { temperatureF: 101.3, symptoms: 'Fever and headache', shareDetails: true } : {}),
      sleepHours: round1(clamp(b.sleep + mod.sleep + between(-0.6, 0.6) - (sick ? 1.5 : 0), 4.5, 9)),
      energy: scale5(b.energy + mod.energy + n() - (sick ? 2 : 0)),
      mood: scale5(b.mood + mod.mood + n() - (sick ? 1.5 : 0)),
      stress: scale5(b.stress + mod.stress + n()),
      focus: scale5(b.focus + mod.focus + n() - (sick ? 2 : 0)),
      submittedAt: `${date}T09:${String(int(5, 40)).padStart(2, '0')}:00+05:30`,
    };
    if (dCrunch(p.id, date)) c.sleepHours = round1(between(5, 5.8));
    const tone = sick ? 'low' : c.mood >= 4 ? 'good' : c.mood <= 2 ? 'low' : 'meh';
    if (sick) c.note = 'Logging off early to rest';
    else if (rand() < 0.7) c.note = pick(notes[tone]);
    checkIns.push(c);

    // 9 AM – 5 PM focus timeline (self-logged with the focus timer)
    const longMeetingDay = p.meetingHeavy ? [2, 4].includes(weekday(date)) : rand() < 0.15; // Tue + Thu for B
    const hours = [];
    const lastHour = date === TODAY ? NOW_HOUR : 16;
    for (let h = 9; h <= lastHour; h++) {
      if (h === 13) { hours.push({ hour: h, focus: 0, challenge: 1, skill: 1, workType: 'break' }); continue; }
      const meeting = h === 10 || (longMeetingDay && [11, 12, 14].includes(h)) || (LOW_FOCUS(date) && h === 15) || (!HIGH_FLOW(date) && rand() < 0.08);
      const fe = rand() < p.skills.frontend / (p.skills.frontend + p.skills.backend);
      const skill = fe ? p.skills.frontend : p.skills.backend;
      let challenge = clamp(skill + int(-1, 1), 1, 5);
      if (LOW_FOCUS(date)) challenge = clamp(skill + pick([-2, 2, 2]), 1, 5);
      if (HIGH_FLOW(date)) challenge = clamp(skill + pick([0, 0, 1]), 1, 5);
      let focus = clamp(Math.round(c.focus + between(-1, 1.2) - (meeting ? 1 : 0)), 0, 5);
      if (longMeetingDay && h >= 15) focus = clamp(focus - 2, 0, 5); // afternoon slump after meetings
      if (sick && h > 11) focus = 0;
      hours.push({ hour: h, focus, challenge, skill, workType: meeting ? 'meeting' : fe ? 'frontend' : 'backend' });
    }
    focusLogs.push({ personId: p.id, date, hours });
  }
}
// Mood and sleep are only used inside this script (note tone, WHO-5); the app does not collect them.
write('check-ins.json', checkIns.map(({ mood, sleepHours, ...c }) => c));
write('focus-logs.json', focusLogs);

// ---------- tasks ----------
const projects = ['Wallet Revamp', 'UPI Autopay', 'Merchant Dashboard', 'KYC Flow', 'Bill Payments', 'Rewards Hub', 'Design System'];
const titles = {
  frontend: ['Build {p} landing page', 'Fix layout bug on {p} mobile view', 'Add skeleton loaders to {p}', 'Accessibility pass on {p} forms',
    'Refactor {p} state to signals', 'Polish {p} empty states', 'Dark mode fixes in {p}', 'Component tests for {p}'],
  backend: ['Add pagination to {p} API', 'Optimise {p} query latency', 'Webhook retries for {p}', 'Rate limiting on {p} endpoints',
    'Audit logging for {p}', 'Move {p} cron to a queue'],
  both: ['Wire {p} form to the new API', 'End-to-end {p} checkout step', 'Feature flag rollout for {p}', 'Error tracking for {p}'],
};
const tasks = [];
let taskNo = 1;
const doneAt = (date, h) => `${date}T${String(h).padStart(2, '0')}:${pick(['10', '25', '40', '55'])}:00+05:30`;
for (const p of members) {
  const feRatio = p.skills.frontend / (p.skills.frontend + p.skills.backend);
  for (const date of days) {
    if (date === TODAY || isLeave(p.id, date)) continue;
    const loadFactor = (dCrunch(p.id, date) ? 1.3 : 0.9) * between(0.85, 1.1);
    let budget = 8 * loadFactor;
    let hour = 9;
    while (budget > 0.8) {
      const est = Math.max(1, Math.round(Math.min(budget, pick([1.5, 2, 2.5, 3, 4])) * 2) / 2);
      budget -= est;
      const r = rand();
      // weaker areas get fewer tasks, but not none
      const type = r < feRatio * 0.85 ? 'frontend' : r < 0.88 ? 'backend' : 'both';
      const project = pick(projects);
      const sick = FEVER.personId === p.id && FEVER.date === date;
      const spill = sick || (LOW_FOCUS(date) && rand() < 0.35) || rand() < 0.05;
      hour += est;
      tasks.push({
        id: `t${taskNo++}`, title: pick(titles[type]).replace('{p}', project), project, type, ownerId: p.id, date, estimateHours: est,
        status: spill ? 'pending' : date >= addDays(TODAY, -1) ? pick(['reported', 'accepted']) : 'accepted',
        percentDone: spill ? int(30, 80) : 100,
        ...(spill ? {} : { completedAt: doneAt(date, Math.min(18, Math.floor(hour))) }),
      });
    }
  }
}

// Today's board, written by hand so the demo story is clear.
const today = (ownerId, title, project, type, estimateHours, status, percentDone, extra = {}) =>
  tasks.push({ id: `t${taskNo++}`, title, project, type, ownerId, date: TODAY, estimateHours, status, percentDone, ...extra });
// A: 6h of 8 → 75%
today('a', 'Polish Wallet Revamp card layout', 'Wallet Revamp', 'frontend', 2, 'reported', 100, { completedAt: `${TODAY}T10:50:00+05:30` });
today('a', 'Add skeleton loaders to Rewards Hub', 'Rewards Hub', 'frontend', 2.5, 'in-progress', 60, { startedAt: `${TODAY}T11:00:00+05:30` });
today('a', 'Dark-mode tokens for Design System', 'Design System', 'frontend', 1.5, 'planned', 0);
// B: 7h → 88%, blocked on designs
today('b', 'Fix Merchant Dashboard mobile layout', 'Merchant Dashboard', 'frontend', 2, 'accepted', 100, { completedAt: `${TODAY}T10:15:00+05:30` });
today('b', 'Build Rewards Hub landing page', 'Rewards Hub', 'frontend', 3, 'in-progress', 35,
  { startedAt: `${TODAY}T10:20:00+05:30`, blocked: true, blockedReason: 'Waiting for final Rewards Hub designs' });
today('b', 'Accessibility pass on KYC Flow forms', 'KYC Flow', 'frontend', 2, 'planned', 0);
// C: 3.2h → 40%, strong in backend → the natural cover
today('c', 'Webhook retries for UPI Autopay', 'UPI Autopay', 'backend', 2, 'completed', 100, { completedAt: `${TODAY}T11:05:00+05:30` });
today('c', 'Optimise Bill Payments query latency', 'Bill Payments', 'backend', 1.2, 'in-progress', 50, { startedAt: `${TODAY}T11:10:00+05:30` });
// D: 10.4h → 130%, stressed and low on energy → needs attention
today('d', 'End-to-end UPI Autopay checkout step', 'UPI Autopay', 'both', 3.5, 'in-progress', 45, { startedAt: `${TODAY}T09:30:00+05:30` });
today('d', 'Rate limiting on Wallet Revamp endpoints', 'Wallet Revamp', 'backend', 2, 'pending', 50, { carriedFrom: addDays(TODAY, -1) });
today('d', 'Wire Merchant Dashboard form to the new API', 'Merchant Dashboard', 'both', 3, 'planned', 0);
today('d', 'Error tracking for Bill Payments', 'Bill Payments', 'both', 1.9, 'planned', 0);
// E: 6.5h → 81%; the backend task is below E's comfort zone (2/5) → suggest moving it to C
today('e', 'Button states for Design System', 'Design System', 'frontend', 2, 'reported', 100, { completedAt: `${TODAY}T10:40:00+05:30` });
today('e', 'Polish KYC Flow empty states', 'KYC Flow', 'frontend', 2, 'in-progress', 55, { startedAt: `${TODAY}T10:45:00+05:30` });
today('e', 'Add pagination to Rewards Hub API', 'Rewards Hub', 'backend', 2.5, 'planned', 0);
write('tasks.json', tasks);

// ---------- live presence (today) ----------
write('presence.json', [
  { personId: 'lead', state: 'offline', note: 'On planned leave today' },
  { personId: 'a', state: 'working' },
  { personId: 'b', state: 'blocked', note: 'Waiting for final Rewards Hub designs' },
  { personId: 'c', state: 'working' },
  { personId: 'd', state: 'working' },
  { personId: 'e', state: 'working' },
]);

// ---------- WHO-5 (weekly, 0–5 per answer) ----------
const weeks = [...new Set(days.map(weekStart))].filter((w) => w !== weekStart(TODAY));
const who5 = [];
for (const p of members) {
  for (const w of weeks) {
    const wk = checkIns.filter((c) => c.personId === p.id && weekStart(c.date) === w);
    const avgMood = wk.reduce((s, c) => s + c.mood, 0) / (wk.length || 1);
    let lvl = clamp(avgMood - 0.5 + between(-0.4, 0.4), 0, 5);
    if (p.id === 'd' && w >= '2026-09-28') lvl = 2.1;
    who5.push({ personId: p.id, weekStart: w, answers: Array.from({ length: 5 }, () => clamp(Math.round(lvl + between(-0.6, 0.6)), 0, 5)) });
  }
}
write('who5.json', who5);

// ---------- Stoic reflections ----------
write('reflections.json', [
  { id: 'r1', personId: 'a', weekStart: '2026-09-21', wentWell: 'Shipped the design-system tokens with zero regressions.',
    inMyControl: 'How I planned my focus blocks.', improve: 'Ask for the API mock on day one.', createdAt: '2026-09-25T17:30:00+05:30' },
  { id: 'r2', personId: 'd', weekStart: '2026-09-21', wentWell: 'Autopay retries are finally stable.',
    inMyControl: 'Taking on the extra payments ticket.', improve: 'Say no to one non-urgent request.', createdAt: '2026-09-25T20:10:00+05:30' },
  { id: 'r3', personId: 'e', weekStart: '2026-09-14', wentWell: 'Recovered well after the fever; the team covered for me.',
    inMyControl: 'Resting instead of pushing through.', improve: 'Write tests for my accessibility fixes.', createdAt: '2026-09-18T18:00:00+05:30' },
]);

// ---------- notifications already waiting this morning ----------
write('notifications.json', [
  { id: 'n1', to: 'mgr', kind: 'blocked', personId: 'b', title: 'Developer B is blocked', body: 'Waiting for final Rewards Hub designs.',
    createdAt: `${TODAY}T10:22:00+05:30`, read: false, link: '/team' },
  { id: 'n2', to: 'mgr', kind: 'attention', personId: 'd', title: 'Developer D may need a lighter load',
    body: 'Stress has been high and energy low for several days, and today is planned at 130% of capacity.', createdAt: `${TODAY}T09:40:00+05:30`, read: false, link: '/team' },
  { id: 'n3', to: 'mgr', kind: 'info', title: 'Two tasks are waiting for your review', body: 'Developer A and Developer E reported work as done.',
    createdAt: `${TODAY}T10:52:00+05:30`, read: true, link: '/tasks' },
  { id: 'n4', to: 'e', kind: 'message', title: 'Welcome back to the Design System work', body: 'Great job on the button states, E. – Ananya',
    createdAt: `${TODAY}T10:55:00+05:30`, read: false },
]);

// ---------- wearable (mock smartwatch data, private to each developer) ----------
// Real data would come from Fitbit / Garmin / Oura / Apple Health / Health Connect.
const wearable = [];
const wearDays = Array.from({ length: 14 }, (_, i) => addDays(TODAY, i - 13));
const wearBase = {
  a: { rhr: 62, sys: 116, dia: 75, steps: 7800 },
  b: { rhr: 66, sys: 118, dia: 77, steps: 6200 },
  c: { rhr: 58, sys: 114, dia: 73, steps: 9400 },
  d: { rhr: 70, sys: 126, dia: 82, steps: 4800 },
  e: { rhr: 64, sys: 117, dia: 76, steps: 7100 },
};
for (const [id, w] of Object.entries(wearBase)) {
  for (const date of wearDays) {
    const crunch = dCrunch(id, date);
    const feverish = id === 'e' && date === TODAY; // the watch notices before E checks in
    const rhr = Math.round(w.rhr + between(-3, 3) + (crunch ? 6 : 0) + (feverish ? 9 : 0));
    wearable.push({
      personId: id,
      date,
      restingHeartRate: rhr,
      heartRate: Math.round(rhr + between(8, 22)),
      systolic: Math.round(w.sys + between(-5, 5) + (crunch ? 6 : 0)),
      diastolic: Math.round(w.dia + between(-4, 4) + (crunch ? 4 : 0)),
      spo2: Math.round(between(96, 99.4)),
      skinTempDeltaC: feverish ? 0.9 : round1(between(-0.3, 0.3)),
      steps: Math.round((w.steps + between(-1800, 1800)) * (isWeekday(date) ? 1 : 1.2) * (date === TODAY ? 0.45 : 1)),
      activeMinutes: Math.round(between(15, 55) * (date === TODAY ? 0.45 : 1)),
      hrvMs: Math.round(between(38, 62) - (crunch ? 14 : 0) - (feverish ? 12 : 0)),
      stressScore: Math.round(clamp(between(22, 48) + (crunch ? 30 : 0) + (feverish ? 15 : 0), 0, 100)),
    });
  }
}
write('wearable.json', wearable);
