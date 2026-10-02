/**
 * "Today" for the mock data set. A real API would use the server date;
 * keep in sync with TODAY in scripts/generate-mock-data.mjs.
 */
export const MOCK_TODAY = '2026-10-02';

const parse = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00Z');
export const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string): string {
  const day = parse(iso).getUTCDay() || 7;
  return addDays(iso, 1 - day);
}

export const monthKey = (iso: string) => iso.slice(0, 7);

export function lastDayOfMonth(month: string): string {
  const d = parse(month + '-01');
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return toIso(d);
}

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => parse(iso).toLocaleDateString('en-IN', { timeZone: 'UTC', ...opts });

export const formatMonth = (month: string) => fmt(month + '-01', { month: 'short', year: 'numeric' });
export const formatShortMonth = (month: string) => fmt(month + '-01', { month: 'short' });
export const formatDay = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const formatDayShort = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric' });
export const formatLongDate = (iso: string) => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });

/** "10:20" from an ISO date-time. */
export const formatTime = (isoDateTime: string | null | undefined) => (isoDateTime ? isoDateTime.slice(11, 16) : '');

export const average = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);
export const round = (value: number, digits = 0) => Math.round(value * 10 ** digits) / 10 ** digits;
export const fToC = (f: number) => round(((f - 32) * 5) / 9, 1);

/** The demo day starts at 11:45 IST and runs on in real time from page load, so new events sort after the seeded ones. */
const MOCK_START_MINUTES = 11 * 60 + 45;
const loadedAt = Date.now();
export function mockNow(): string {
  const m = Math.min(23 * 60 + 59, MOCK_START_MINUTES + Math.floor((Date.now() - loadedAt) / 60000));
  const seconds = String(Math.floor(((Date.now() - loadedAt) / 1000) % 60)).padStart(2, '0');
  return `${MOCK_TODAY}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${seconds}+05:30`;
}
