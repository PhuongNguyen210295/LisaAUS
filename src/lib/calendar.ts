import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import type { Shift } from './parser';

const TITLE = 'Lisa Shifts';

async function getOrCreateCalendar(): Promise<string | null> {
  const { granted } = await Calendar.requestCalendarPermissionsAsync();
  if (!granted) return null;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === TITLE);
  if (existing) return existing.id;

  const source =
    Platform.OS === 'ios'
      ? (await Calendar.getDefaultCalendarAsync()).source
      : { isLocalAccount: true, name: TITLE, type: Calendar.SourceType.LOCAL as string };

  return Calendar.createCalendarAsync({
    title: TITLE,
    name: TITLE,
    color: '#3B82F6',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: Platform.OS === 'ios' ? source.id : undefined,
    source,
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/**
 * Make the "Lisa Shifts" calendar match the app: clear its events from a week ago
 * onward, then add every shift in that window. Returns false if permission was denied.
 */
export async function syncCalendar(shifts: Shift[]): Promise<boolean> {
  const id = await getOrCreateCalendar();
  if (!id) return false;

  const from = new Date(Date.now() - 7 * 864e5);
  const to = new Date(Date.now() + 365 * 864e5);
  const old = await Calendar.getEventsAsync([id], from, to);
  for (const e of old) await Calendar.deleteEventAsync(e.id);

  for (const s of shifts) {
    if (s.end < from.getTime()) continue;
    await Calendar.createEventAsync(id, {
      title: `Shift · ${s.site}`,
      location: s.site,
      startDate: new Date(s.start),
      endDate: new Date(s.end),
      notes: 'Synced from Lisa',
    });
  }
  return true;
}

export async function removeCalendar(): Promise<void> {
  const { granted } = await Calendar.getCalendarPermissionsAsync();
  if (!granted) return;
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  for (const c of calendars.filter((c) => c.title === TITLE)) await Calendar.deleteCalendarAsync(c.id);
}
