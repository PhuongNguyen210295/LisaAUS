import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, type ColorValue } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SilentSync } from '../components/SilentSync';
import { ScheduleProvider } from '../lib/ScheduleContext';
import { colors } from '../lib/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Text style={{ color, fontSize: 20 }}>{glyph}</Text>;
  };

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ScheduleProvider>
        <StatusBar style="light" />
        <Tabs
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.accent,
            headerShadowVisible: false,
            tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.muted,
            sceneStyle: { backgroundColor: colors.bg },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'My Shifts', tabBarIcon: icon('▦') }} />
          <Tabs.Screen name="lisa" options={{ title: 'Lisa', tabBarIcon: icon('⟳') }} />
          <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('⚙') }} />
        </Tabs>
        <SilentSync />
      </ScheduleProvider>
    </SafeAreaProvider>
  );
}
