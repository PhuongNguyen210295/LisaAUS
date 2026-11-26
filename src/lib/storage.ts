import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Shift } from './parser';

export type Settings = {
  /** Minutes before a shift to remind you; 0 turns it off. */
  reminderMinutes: number;
  /** 8 PM heads-up the night before each shift. */
  nightBefore: boolean;
  /** Mirror shifts into a "Lisa Shifts" calendar on the phone. */
  calendarSync: boolean;
  /** Page the background sync opens. Updated to wherever a schedule was last found. */
  syncUrl: string;
};

export type Stored = {
  shifts: Shift[];
  settings: Settings;
  lastSync: number | null;
};

export const LISA_HOME = 'https://lisa.aus.com/';

export const DEFAULT_SETTINGS: Settings = {
  reminderMinutes: 60,
  nightBefore: true,
  calendarSync: false,
  syncUrl: LISA_HOME,
};

const KEY = 'lisa-shifts/v1';

export async function load(): Promise<Stored> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<Stored>;
      return {
        shifts: data.shifts ?? [],
        settings: { ...DEFAULT_SETTINGS, ...data.settings },
        lastSync: data.lastSync ?? null,
      };
    }
  } catch (e) {
    console.warn('Could not read saved schedule', e);
  }
  return { shifts: [], settings: DEFAULT_SETTINGS, lastSync: null };
}

export async function save(data: Stored): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export async function clear(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
