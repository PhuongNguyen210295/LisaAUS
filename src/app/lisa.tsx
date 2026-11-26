import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { INJECTED_JS, readMessage } from '../lib/inject';
import { useSchedule } from '../lib/ScheduleContext';
import { LISA_HOME } from '../lib/storage';
import { colors } from '../lib/theme';

/**
 * The real Lisa site. Sign in here once; while you browse My Schedule, each week
 * on screen is saved to the app automatically.
 */
export default function LisaScreen() {
  const { settings, ingestPage } = useSchedule();
  // WebView's default generic (undefined) collapses its props to `never`; `object` keeps them.
  const web = useRef<WebView<object>>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  // Fixed on first render: changing `source` later would make the page reload.
  const [startUrl] = useState(settings.syncUrl || LISA_HOME);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = (text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <Pressable disabled={!canGoBack} onPress={() => web.current?.goBack()} hitSlop={10}>
          <Text style={[styles.barBtn, !canGoBack && styles.disabled]}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hint}>Open My Schedule to sync</Text>
        <Pressable onPress={() => web.current?.reload()} hitSlop={10}>
          <Text style={styles.barBtn}>Reload</Text>
        </Pressable>
      </View>
      <WebView
        ref={web}
        source={{ uri: startUrl }}
        injectedJavaScript={INJECTED_JS}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        pullToRefreshEnabled
        style={styles.web}
        onNavigationStateChange={(n) => setCanGoBack(n.canGoBack)}
        onMessage={(e) => {
          const msg = readMessage(e.nativeEvent.data);
          if (!msg) return;
          const count = ingestPage(msg);
          if (count !== null) say(`Synced ${count} shift${count === 1 ? '' : 's'} ✓`);
        }}
      />
      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  barBtn: { color: colors.accent, fontSize: 15 },
  disabled: { opacity: 0.35 },
  hint: { color: colors.muted, fontSize: 12 },
  web: { flex: 1, backgroundColor: colors.bg },
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastText: { color: colors.text, fontWeight: '600' },
});
