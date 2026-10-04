# Pulse – MobiKwik Web Team Dashboard

Angular 22 (standalone components, signals, SCSS, strict TypeScript), Angular Material and ng-apexcharts.
Frontend only: mock JSON in `src/assets/mock-data`, loaded through services that return Observables.

There is **no login**. `/` opens the Overview straight away, and the **Viewing as** menu in the top bar
switches between the Manager and Developers A–E.

## Run it

Needs Node **22.22.3+** or **24.15+** (`node -v`).

```bash
npm install
npm start          # = ng serve → http://localhost:4200
```

Production build: `npm run build` (output in `dist/pulse-dashboard`).

## Pages

| Route | Page | Who |
| --- | --- | --- |
| `/` | Overview: 3D coin hero + org chart, then KPIs and a 6-month trend with Month → Week → Day drill-down | everyone |
| `/team` | Person cards (health first, then today's %, then current task) and a side drawer with 4 levels: today, last 7 days, last 4 weeks, next-week outlook | Manager |
| `/tasks` | Daily signal board: 6 progress rings, task rows with Accept, smart reassignment | everyone (Accept / Approve for Manager) |
| `/wellbeing` | Team averages only: feeling well %, energy, focus, stress, WHO-5, Maslach bars, flow hours | everyone |
| `/my-space` | Health check-in, my tasks, 7-day table, 4-week trend, Stoic reflection, outlook, private **My Health Data** (watch) | the selected developer |

The top bar's **Today / Week / Month** filter sets the Overview drill-down level and the range on Tasks and Wellbeing.

## Try the health alert flow

1. Viewing as **Developer E** → My Space → choose **Unwell** (or type 100.4 °F) → optionally tick *Share details* → **Save check-in**.
2. E's status turns 🔵 Resting automatically.
3. Switch to **Manager**: the bell shows "Developer E is unwell and needs rest today." (details only if shared).
4. Team or Tasks page: reassignment suggestions for E's open tasks. **Approve** moves the task instantly; the new owner gets a notification.

Even before that, the mock data has the example from the brief: E (Backend 2/5) owns a backend task and
C (Backend 5/5, 40% load) is suggested.

## Reassignment rules (`src/app/core/services/reassignment.service.ts`)

- A task needs a suggestion if its owner is unavailable (resting or offline) **or** the owner's skill in the task's area is below 3/5.
- Suggest the available person with skill ≥ 4 in that area and the **lowest current load**; on a tie, the higher skill.
- "Both" tasks use the lower of the person's frontend and backend scores.

## Status colors

🟢 working now · 🟡 blocked · 🔵 resting / unwell · ⚪ offline · 🔴 needs attention (High next-week risk).

## Mock data story

`node scripts/generate-mock-data.mjs` regenerates everything (seeded, so the output is stable). "Today" is Fri 2 Oct 2026.

- 1 Manager, 1 Team Lead, Developers A–E; 6 other MobiKwik teams for comparison (~50% contribution).
- 30 working days of check-ins and 9–5 focus logs: E's fever on 15 Sep, a low-focus week (7–11 Sep), a high-flow week (21–25 Sep).
- Today: the Lead is on leave (⚪), B is blocked on designs (🟡), D has high stress and low energy at 130% load (🔴), C and E haven't checked in yet.
- `wearable.json`: 14 days of mock smartwatch data for A–E (E's watch shows raised skin temperature today).

The app does not collect sleep or mood. Check-ins are: feeling well/unwell, temperature, symptoms (optional), energy, focus and stress.

## My Health Data (private)

The watch button in My Space opens a panel only the developer sees: heart rate, blood pressure, SpO2, skin temperature change, steps, HRV and the watch's stress score. It never reaches the manager, notifications or team averages.
Data comes from `WEARABLE_PROVIDER` (`src/app/core/services/wearable.service.ts`); the mock reads `wearable.json`. To use a real device, write a provider for Fitbit / Garmin / Oura / Health Connect with the same interface and provide it in `app.config.ts`.

## Logo

`src/assets/brand/mobikwik-logo.png` is the MobiKwik logo, used in the top bar and on the heads side of the Overview coin (the tails side shows the 50% contribution). To swap it, replace that file under the same name.

## Folder structure

```
src/app
├── core
│   ├── models          data types
│   ├── services        data, team-store, notification, reassignment, viewing-as, check-in, filter, theme
│   └── utils           dates, drill-down, insight rules
├── layout              shell, sidebar (bottom nav on phones), topbar
├── features            overview, team (+ person drawer), tasks, wellbeing, my-space
└── shared              kpi-card, status-dot, person-card, charts, reassign-card
```

Wellbeing tool, not medical advice.
