import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSchedule, mergeShifts } from '../src/lib/parser.ts';

// Text as Lisa renders it (from the My Schedule screenshot, week of Nov 20 - Nov 26).
const PAGE = `My Schedule
PN
Fri
20
Yum Restaurant Svcs Grp. - 1900 Colorado Ave
8:00 AM - 4:00 PM
Sat
21
Sun
22
Mon
23
Yum Restaurant Svcs Grp. - 1900 Colorado Ave
8:30 AM - 5:00 PM
Tue
24
Yum Restaurant Svcs Grp. - 1900 Colorado Ave
8:00 AM - 4:00 PM
Wed
25
Yum Restaurant Svcs Grp. - 1900 Colorado Ave
8:00 AM - 4:00 PM
Thu
26
Yum Restaurant Svcs Grp. - 1900 Colorado Ave
8:00 AM - 4:00 PM
Send Me My Schedule
Nov 20 - Nov 26
Scheduled: 40 hrs`;

const NOW = new Date(2026, 10, 26, 11, 2);
const at = (y, mo, d, h, mi = 0) => new Date(y, mo, d, h, mi).getTime();

test('reads every shift and covered day from the My Schedule page', () => {
  const r = parseSchedule(PAGE, NOW);
  assert.equal(r.weekLabel, 'Nov 20 - Nov 26');
  assert.deepEqual(r.coveredDates, [
    '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26',
  ]);
  assert.equal(r.shifts.length, 5);
  assert.equal(r.shifts[0].site, 'Yum Restaurant Svcs Grp. - 1900 Colorado Ave');
  assert.equal(r.shifts[0].start, at(2026, 10, 20, 8));
  assert.equal(r.shifts[1].date, '2026-11-23');
  assert.equal(r.shifts[1].start, at(2026, 10, 23, 8, 30));
  assert.equal(r.shifts[1].end, at(2026, 10, 23, 17));
  const hours = r.shifts.reduce((h, s) => h + (s.end - s.start) / 36e5, 0);
  assert.equal(hours, 40.5);
});

test('overnight shifts end the next day', () => {
  const r = parseSchedule('Sat\n28\nWarehouse\n10:00 PM - 6:00 AM\nNov 27 - Dec 3', NOW);
  assert.equal(r.shifts[0].start, at(2026, 10, 28, 22));
  assert.equal(r.shifts[0].end, at(2026, 10, 29, 6));
});

test('weeks that cross into the new year get the right year', () => {
  const r = parseSchedule('Dec 30 - Jan 5\nThu\n1\nLobby\n7:00 AM - 3:00 PM', new Date(2026, 11, 29));
  assert.equal(r.shifts[0].date, '2027-01-01');
});

test('single-line headers, inline site and lowercase times', () => {
  const r = parseSchedule('Mon 30\nGate 4 · 6am - 2pm', NOW);
  assert.equal(r.shifts[0].date, '2026-11-30');
  assert.equal(r.shifts[0].site, 'Gate 4');
  assert.equal(r.shifts[0].end, at(2026, 10, 30, 14));
});

test('re-syncing a week drops shifts that were removed', () => {
  const first = mergeShifts([], parseSchedule(PAGE, NOW));
  const edited = PAGE.replace('Thu\n26\nYum Restaurant Svcs Grp. - 1900 Colorado Ave\n8:00 AM - 4:00 PM', 'Thu\n26');
  const second = mergeShifts(first, parseSchedule(edited, NOW));
  assert.equal(first.length, 5);
  assert.equal(second.length, 4);
  assert.ok(!second.some((s) => s.date === '2026-11-26'));
});

test('pages without a schedule produce nothing', () => {
  const r = parseSchedule('Sign in\nUsername\nPassword\nForgot password?', NOW);
  assert.equal(r.shifts.length, 0);
  assert.equal(r.coveredDates.length, 0);
});
