import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { mergeShifts, parseSchedule, type Shift } from './parser';
import { clear, DEFAULT_SETTINGS, load, save, type Settings } from './storage';
import { rescheduleReminders } from './notifications';
import { removeCalendar, syncCalendar } from './calendar';
import { isLisaUrl, type PageMessage } from './inject';

/** Re-check Lisa when the app is opened and the last sync is older than this. */
const STALE_MS = 3 * 60 * 60 * 1000;

export type SyncState = 'idle' | 'syncing' | 'needs-signin';

type Ctx = {
  ready: boolean;
  shifts: Shift[];
  settings: Settings;
  lastSync: number | null;
  syncState: SyncState;
  /** Feed a page from the Lisa WebView. Returns its shift count, or null if it wasn't a schedule. */
  ingestPage: (msg: PageMessage) => number | null;
  startSync: () => void;
  finishSync: (found: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  clearAll: () => Promise<void>;
};

const ScheduleContext = createContext<Ctx | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const lastSyncRef = useRef<number | null>(null);
  useEffect(() => {
    lastSyncRef.current = lastSync;
  }, [lastSync]);

  useEffect(() => {
    load().then((d) => {
      setShifts(d.shifts);
      setSettings(d.settings);
      setLastSync(d.lastSync);
      setReady(true);
    });
  }, []);

  // Persist, then keep reminders and the phone calendar in step with the schedule.
  useEffect(() => {
    if (!ready) return;
    save({ shifts, settings, lastSync }).catch((e) => console.warn('Save failed', e));
  }, [ready, shifts, settings, lastSync]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      rescheduleReminders(shifts, settings).catch((e) => console.warn('Reminders failed', e));
      if (settings.calendarSync) syncCalendar(shifts).catch((e) => console.warn('Calendar sync failed', e));
    }, 1500);
    return () => clearTimeout(t);
  }, [ready, shifts, settings]);

  const ingestPage = useCallback((msg: PageMessage) => {
    if (!isLisaUrl(msg.url)) return null;
    const parsed = parseSchedule(msg.text);
    if (parsed.coveredDates.length === 0) return null;
    setShifts((prev) => mergeShifts(prev, parsed));
    setLastSync(Date.now());
    setSettings((s) => (s.syncUrl === msg.url ? s : { ...s, syncUrl: msg.url }));
    setSyncState('idle');
    return parsed.shifts.length;
  }, []);

  const startSync = useCallback(() => setSyncState('syncing'), []);
  const finishSync = useCallback((found: boolean) => setSyncState(found ? 'idle' : 'needs-signin'), []);

  // Quietly refresh on launch and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!ready) return;
    const maybeSync = () => {
      const last = lastSyncRef.current;
      if (!last || Date.now() - last > STALE_MS) setSyncState((s) => (s === 'idle' ? 'syncing' : s));
    };
    maybeSync();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && maybeSync());
    return () => sub.remove();
  }, [ready]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      if (s.calendarSync && patch.calendarSync === false) removeCalendar().catch(() => {});
      return { ...s, ...patch };
    });
  }, []);

  const clearAll = useCallback(async () => {
    await clear();
    await removeCalendar().catch(() => {});
    setShifts([]);
    setLastSync(null);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ ready, shifts, settings, lastSync, syncState, ingestPage, startSync, finishSync, updateSettings, clearAll }),
    [ready, shifts, settings, lastSync, syncState, ingestPage, startSync, finishSync, updateSettings, clearAll],
  );
  // Wait for the saved schedule so screens never start from empty defaults.
  if (!ready) return null;
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule(): Ctx {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used inside ScheduleProvider');
  return ctx;
}
