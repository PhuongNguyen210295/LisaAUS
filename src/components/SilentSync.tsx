import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSchedule } from '../lib/ScheduleContext';
import { INJECTED_JS, readMessage } from '../lib/inject';

const GIVE_UP_MS = 45000;

/**
 * An invisible copy of Lisa that opens your schedule page, reads it and closes.
 * It uses the sign-in you made in the Lisa tab (cookies are shared). If Lisa asks
 * you to sign in again, the app shows a banner instead.
 */
export function SilentSync() {
  const { syncState, settings, ingestPage, finishSync } = useSchedule();
  const found = useRef(false);

  useEffect(() => {
    if (syncState !== 'syncing') return;
    found.current = false;
    const t = setTimeout(() => finishSync(found.current), GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [syncState, finishSync]);

  if (syncState !== 'syncing') return null;

  return (
    <View style={styles.hidden} pointerEvents="none">
      <WebView
        source={{ uri: settings.syncUrl }}
        injectedJavaScript={INJECTED_JS}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        onMessage={(e) => {
          const msg = readMessage(e.nativeEvent.data);
          // ingestPage flips the state back to idle when it finds a schedule.
          if (msg && ingestPage(msg) !== null) found.current = true;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});
