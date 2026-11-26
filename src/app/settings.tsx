import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSchedule } from '../lib/ScheduleContext';
import { colors } from '../lib/theme';

const LEAD_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
];

export default function SettingsScreen() {
  const { settings, updateSettings, clearAll, shifts } = useSchedule();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Reminders</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Remind me before each shift</Text>
        <View style={styles.chips}>
          {LEAD_OPTIONS.map((o) => {
            const on = settings.reminderMinutes === o.value;
            return (
              <Pressable
                key={o.value}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => updateSettings({ reminderMinutes: o.value })}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Heads-up at 8 PM the night before</Text>
          <Switch value={settings.nightBefore} onValueChange={(v) => updateSettings({ nightBefore: v })} />
        </View>
      </View>

      <Text style={styles.heading}>Phone calendar</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Add shifts to a “Lisa Shifts” calendar</Text>
          <Switch value={settings.calendarSync} onValueChange={(v) => updateSettings({ calendarSync: v })} />
        </View>
        <Text style={styles.note}>
          Shows your shifts in Google Calendar / Apple Calendar and on widgets. Turning it off removes that calendar.
        </Text>
      </View>

      <Text style={styles.heading}>Sync</Text>
      <View style={styles.card}>
        <Text style={styles.note}>
          The app refreshes from Lisa when you open it (if it has been more than 3 hours) and when you pull down on My
          Shifts. Reminders are stored on the phone, so they go off even if the app is closed or offline.
        </Text>
        <Text style={[styles.note, styles.mono]} numberOfLines={2}>
          Sync page: {settings.syncUrl}
        </Text>
      </View>

      <Pressable
        style={styles.danger}
        onPress={() =>
          Alert.alert('Clear saved schedule?', `Removes ${shifts.length} saved shifts and all reminders.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => clearAll() },
          ])
        }
      >
        <Text style={styles.dangerText}>Clear saved schedule</Text>
      </Pressable>

      <Text style={styles.footer}>
        Your Lisa sign-in and schedule stay on this phone. This app is not made by or affiliated with Allied Universal.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },
  heading: { color: colors.muted, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { color: colors.text, fontSize: 15, flexShrink: 1 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.accent },
  chipText: { color: colors.muted },
  chipTextOn: { color: colors.text, fontWeight: '600' },
  danger: { marginTop: 28, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#5C2B2B', alignItems: 'center' },
  dangerText: { color: '#F28B82', fontSize: 15 },
  footer: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
