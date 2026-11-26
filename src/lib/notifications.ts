import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Shift } from './parser';
import type { Settings } from './storage';
import { fmtRange } from './format';

// iOS keeps at most 64 pending local notifications per app.
const MAX_PENDING = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('shifts', {
      name: 'Shift reminders',
      // Re-exported via `export *`, which the lint rule can't follow; it exists at runtime.
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Replace every scheduled reminder with ones for the current upcoming shifts. */
export async function rescheduleReminders(shifts: Shift[], settings: Settings): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (settings.reminderMinutes <= 0 && !settings.nightBefore) return;
  if (!(await ensurePermission())) return;

  const now = Date.now();
  const pending: { at: number; title: string; body: string }[] = [];

  for (const s of shifts) {
    if (settings.reminderMinutes > 0) {
      const at = s.start - settings.reminderMinutes * 60000;
      if (at > now) {
        pending.push({
          at,
          title: `Shift in ${settings.reminderMinutes >= 60 ? `${settings.reminderMinutes / 60}h` : `${settings.reminderMinutes}m`}`,
          body: `${fmtRange(s)} · ${s.site}`,
        });
      }
    }
    if (settings.nightBefore) {
      const d = new Date(s.start);
      const at = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 20, 0).getTime();
      if (at > now) {
        pending.push({ at, title: 'Working tomorrow', body: `${fmtRange(s)} · ${s.site}` });
      }
    }
  }

  pending.sort((a, b) => a.at - b.at);
  for (const p of pending.slice(0, MAX_PENDING)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(p.at),
        channelId: 'shifts',
      },
    });
  }
}
