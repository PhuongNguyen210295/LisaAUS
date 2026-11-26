import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import type { Shift } from '../lib/parser';
import { fmtAgo, fmtDay, fmtHours, fmtRange, fmtUntil, hours, weekStart } from '../lib/format';
import { useSchedule } from '../lib/ScheduleContext';
import { colors } from '../lib/theme';

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export default function ShiftsScreen() {
  const { ready, shifts, lastSync, syncState, startSync } = useSchedule();
  const now = useNow();

  const current = shifts.find((s) => s.start <= now && s.end > now);
  const next = shifts.find((s) => s.start > now);

  const sections = useMemo(() => {
    // Show from the start of this week onward.
    const from = weekStart(now);
    const groups = new Map<number, Shift[]>();
    for (const s of shifts) {
      if (s.end < from) continue;
      const k = weekStart(s.start);
      groups.set(k, [...(groups.get(k) ?? []), s]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([k, data]) => ({
        title: k === from ? 'This week' : `Week of ${fmtDay(k)}`,
        total: data.reduce((h, s) => h + hours(s), 0),
        data,
      }));
  }, [shifts, now]);

  if (!ready) return <View style={styles.screen} />;

  return (
    <SectionList
      style={styles.screen}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(s) => s.id}
      refreshControl={
        <RefreshControl refreshing={syncState === 'syncing'} onRefresh={startSync} tintColor={colors.accent} />
      }
      ListHeaderComponent={
        <View>
          {syncState === 'needs-signin' && (
            <Pressable style={styles.banner} onPress={() => router.navigate('/lisa')}>
              <Text style={styles.bannerText}>
                Lisa needs you to sign in again before it can refresh. Tap to open Lisa.
              </Text>
            </Pressable>
          )}
          {(current ?? next) && (
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>{current ? 'On shift now' : `Next shift ${fmtUntil(next!.start, now)}`}</Text>
              <Text style={styles.heroTime}>
                {fmtDay((current ?? next)!.start)} · {fmtRange((current ?? next)!)}
              </Text>
              <Text style={styles.heroSite}>{(current ?? next)!.site}</Text>
              {current && <Text style={styles.heroSub}>Ends {fmtUntil(current.end, now)}</Text>}
            </View>
          )}
          <Text style={styles.synced}>
            {syncState === 'syncing' ? 'Checking Lisa…' : `Last synced ${fmtAgo(lastSync, now)} · pull down to refresh`}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No shifts yet</Text>
          <Text style={styles.emptyText}>
            Open the Lisa tab, sign in, and go to My Schedule. Every week you look at is saved here
            and you'll get reminders before each shift.
          </Text>
          <Pressable style={styles.button} onPress={() => router.navigate('/lisa')}>
            <Text style={styles.buttonText}>Open Lisa</Text>
          </Pressable>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionTotal}>{fmtHours(section.total)}</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const past = item.end < now;
        const active = item.start <= now && item.end > now;
        return (
          <View style={[styles.row, past && styles.past]}>
            <View style={styles.day}>
              <Text style={[styles.dayName, active && styles.today]}>
                {new Date(item.start).toLocaleDateString([], { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayNum, active && styles.today]}>{new Date(item.start).getDate()}</Text>
            </View>
            <View style={[styles.card, active && styles.cardActive]}>
              <Text style={styles.site} numberOfLines={2}>
                {item.site}
              </Text>
              <Text style={styles.time}>
                {fmtRange(item)} · {fmtHours(hours(item))}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  banner: { backgroundColor: '#3A2E12', borderColor: colors.warn, borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  bannerText: { color: colors.warn, fontSize: 14 },
  hero: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, marginBottom: 8 },
  heroLabel: { color: colors.accent, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  heroTime: { color: colors.text, fontSize: 20, fontWeight: '600' },
  heroSite: { color: colors.text, fontSize: 15, marginTop: 4 },
  heroSub: { color: colors.muted, fontSize: 13, marginTop: 6 },
  synced: { color: colors.muted, fontSize: 12, marginBottom: 8, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 8, backgroundColor: colors.bg },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  sectionTotal: { color: colors.muted, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  past: { opacity: 0.45 },
  day: { width: 52 },
  dayName: { color: colors.muted, fontSize: 15 },
  dayNum: { color: colors.text, fontSize: 18 },
  today: { color: colors.accent },
  card: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12 },
  cardActive: { borderColor: colors.accent },
  site: { color: colors.text, fontSize: 15 },
  time: { color: colors.muted, fontSize: 14, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 12 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  button: { backgroundColor: colors.primary, borderRadius: 6, paddingVertical: 12, paddingHorizontal: 28, marginTop: 20 },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
