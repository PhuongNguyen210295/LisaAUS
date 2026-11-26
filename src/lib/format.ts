import type { Shift } from './parser';

export const fmtTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export const fmtRange = (s: Shift) => `${fmtTime(s.start)} – ${fmtTime(s.end)}`;

export const fmtDay = (ms: number) =>
  new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

export const hours = (s: Shift) => (s.end - s.start) / 36e5;

export const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} hrs`;

/** "in 2h 15m", "in 3 days", "now" */
export function fmtUntil(ms: number, now = Date.now()): string {
  const mins = Math.round((ms - now) / 60000);
  if (mins <= 0) return 'now';
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `in ${h}h ${mins % 60}m`;
  const d = Math.round(h / 24);
  return `in ${d} day${d === 1 ? '' : 's'}`;
}

export function fmtAgo(ms: number | null, now = Date.now()): string {
  if (!ms) return 'never';
  const mins = Math.round((now - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Monday-start week key for grouping. */
export function weekStart(ms: number): number {
  const d = new Date(ms);
  const offset = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset).getTime();
}
