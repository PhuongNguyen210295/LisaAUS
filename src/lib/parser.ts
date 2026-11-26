/**
 * Turns the visible text of Lisa's "My Schedule" page into shifts.
 *
 * Lisa has no public API, so the app reads the page the same way you do. The page
 * looks like this (one value per line once rendered as text):
 *
 *   Fri
 *   20
 *   Yum Restaurant Svcs Grp. - 1900 Colorado Ave
 *   8:00 AM - 4:00 PM
 *   Sat
 *   21
 *   ...
 *   Nov 20 - Nov 26
 *
 * This file has no imports so it can run in Node tests as-is.
 */

export type Shift = {
  id: string;
  /** Local calendar date the shift starts on, YYYY-MM-DD. */
  date: string;
  site: string;
  /** Epoch milliseconds. */
  start: number;
  end: number;
};

export type ParsedSchedule = {
  /** Every date whose row was on the page, including days with no shift. */
  coveredDates: string[];
  shifts: Shift[];
  weekLabel: string | null;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const DAY_ONLY = /^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?,?$/i;
const DAY_WITH_NUM = /^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?,?\s+(?:[a-z]{3,9}\.?\s+)?(\d{1,2})$/i;
const NUM_ONLY = /^\d{1,2}$/;
const TIME = String.raw`(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m?\.?`;
const TIME_RANGE = new RegExp(`${TIME}\\s*(?:-|–|—|to)\\s*${TIME}`, 'i');
const WEEK_RANGE = new RegExp(
  String.raw`\b(${MONTHS.join('|')})[a-z]*\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?\s*(?:-|–|—|to)\s*(?:(${MONTHS.join('|')})[a-z]*\.?\s+)?(\d{1,2})(?:,?\s*(\d{4}))?`,
  'i',
);

export function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function toMinutes(h: string, m: string | undefined, ap: string): number {
  let hour = Number(h) % 12;
  if (ap.toLowerCase() === 'p') hour += 12;
  return hour * 60 + Number(m ?? 0);
}

/** The year that puts month/day closest to `now` (handles Dec→Jan weeks). */
function nearestYear(month: number, day: number, now: Date): number {
  let best = now.getFullYear();
  let bestDiff = Infinity;
  for (const y of [best - 1, best, best + 1]) {
    const diff = Math.abs(new Date(y, month, day).getTime() - now.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      best = y;
    }
  }
  return best;
}

function findWeekStart(text: string, now: Date): { start: Date; label: string } | null {
  const m = WEEK_RANGE.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
  const day = Number(m[2]);
  const year = m[3] ? Number(m[3]) : m[6] ? Number(m[6]) : nearestYear(month, day, now);
  return { start: new Date(year, month, day), label: m[0] };
}

/** Resolve "Fri 20" to a real date. */
function resolveDay(weekday: number, dayOfMonth: number, weekStart: Date | null, now: Date): Date | null {
  if (weekStart) {
    for (let i = 0; i < 14; i++) {
      const d = addDays(weekStart, i);
      if (d.getDate() === dayOfMonth) return d;
    }
  }
  // No week label: closest date to today with that weekday and day of month.
  let best: Date | null = null;
  for (let i = -45; i <= 45; i++) {
    const d = addDays(now, i);
    if (d.getDate() === dayOfMonth && d.getDay() === weekday) {
      if (!best || Math.abs(i) < Math.abs((best.getTime() - now.getTime()) / 864e5)) best = d;
    }
  }
  return best;
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function parseSchedule(text: string, now: Date = new Date()): ParsedSchedule {
  const week = findWeekStart(text, now);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const covered = new Set<string>();
  const shifts: Shift[] = [];
  let current: Date | null = null;
  let siteCandidate = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let weekday = -1;
    let dayNum = -1;
    const both = DAY_WITH_NUM.exec(line);
    if (both) {
      weekday = DAYS.indexOf(both[1].slice(0, 3).toLowerCase());
      dayNum = Number(both[2]);
    } else if (DAY_ONLY.test(line) && i + 1 < lines.length && NUM_ONLY.test(lines[i + 1])) {
      weekday = DAYS.indexOf(line.slice(0, 3).toLowerCase());
      dayNum = Number(lines[i + 1]);
      i++;
    }
    if (weekday >= 0) {
      current = resolveDay(weekday, dayNum, week?.start ?? null, now);
      if (current) covered.add(dateKey(current));
      siteCandidate = '';
      continue;
    }

    if (!current) continue;

    const t = TIME_RANGE.exec(line);
    if (!t) {
      siteCandidate = line;
      continue;
    }

    const startMin = toMinutes(t[1], t[2], t[3]);
    let endMin = toMinutes(t[4], t[5], t[6]);
    if (endMin <= startMin) endMin += 24 * 60; // overnight shift

    // Site may share the line with the time, or be the line before it.
    const inline = line.slice(0, t.index).replace(/[\s|·•,-]+$/, '').trim();
    const site = inline || siteCandidate || 'Shift';

    const base = current;
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, startMin).getTime();
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, endMin).getTime();
    const date = dateKey(base);
    shifts.push({ id: hash(`${date}|${startMin}|${endMin}|${site}`), date, site, start, end });
    siteCandidate = '';
  }

  return { coveredDates: [...covered].sort(), shifts, weekLabel: week?.label ?? null };
}

/**
 * Fold a freshly parsed page into what we already know. Dates the page covered are
 * replaced entirely (so cancelled shifts disappear); everything else is kept.
 */
export function mergeShifts(existing: Shift[], parsed: ParsedSchedule): Shift[] {
  const covered = new Set(parsed.coveredDates);
  const kept = existing.filter((s) => !covered.has(s.date));
  const byId = new Map<string, Shift>();
  for (const s of [...kept, ...parsed.shifts]) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) => a.start - b.start);
}
