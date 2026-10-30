import { doctorById, eventsOf } from '@smile/shared';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Intro } from '../components/Intro';
import { ToastProvider, useToast } from '../components/Toast';
import { installLocale, tr } from '../i18n';
import { appNow, AppProvider, useApp } from '../state/app';
import { installTheme, ThemeProvider, useTheme } from '../state/theme';
import { C } from '../theme';
import { installWebStyles } from '../web/css';

installLocale();
installWebStyles();
installTheme(appNow());
SplashScreen.preventAutoHideAsync().catch(() => {});

function Themed({ children }: PropsWithChildren) {
  const { now } = useApp();
  return <ThemeProvider now={now}>{children}</ThemeProvider>;
}

function Bar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'night' ? 'light' : 'dark'} />;
}

/** What the clinic does on its panel arrives here as a notification, like a push message would. */
function ClinicNotes() {
  const { bridge } = useApp();
  const toast = useToast();
  const seen = useRef<number>(Date.now());
  useEffect(() => {
    const fresh = bridge.events.filter((e) => e.at > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(...fresh.map((e) => e.at));
    for (const e of fresh) {
      if (e.kind === 'reply') toast(tr('Bericht van de kliniek'), { text: e.text, icon: 'chat', onPress: () => router.push('/chat') });
      if (e.kind === 'photo-reply') toast(e.ok ? tr('Je wond geneest goed') : tr('De kliniek belt je even'), { text: `${doctorById(e.by).name}: ${e.text}`, icon: 'camera', onPress: () => router.push('/foto') });
      if (e.kind === 'pause-ok') toast(tr('De tandarts heeft je pauze gezien'), { text: tr('Even rustig ademen. Je geeft zelf aan wanneer het weer gaat.'), icon: 'hand' });
      if (e.kind === 'offer') toast(tr('Er is een eerdere plek vrij'), { text: tr('Tik om hem te bekijken'), icon: 'calendar', onPress: () => router.push('/afspraken') });
      if (e.kind === 'delay') toast(tr('{name} loopt {n} minuten uit').replace('{name}', doctorById(e.doctor).name).replace('{n}', String(e.minutes)), { text: tr('Je hoeft nog niet te komen; we houden je op de hoogte.'), icon: 'clock' });
    }
    // Earlier offers the patient has not answered yet stay visible on the appointments tab.
    void eventsOf;
  }, [bridge, toast]);
  return null;
}

export default function RootLayout() {
  // The opening plays each time the app starts; on the web ?intro=0 skips it (for screenshots and deep links).
  const [intro, setIntro] = useState(() => !(Platform.OS === 'web' && new URLSearchParams(globalThis.location?.search ?? '').get('intro') === '0'));
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Themed>
          <ToastProvider>
            <View style={{ flex: 1, backgroundColor: C.bg }}>
              <Bar />
              <ClinicNotes />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="afspraak" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="spoed" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="stoel" options={{ animation: 'fade' }} />
              </Stack>
              {intro ? <Intro onDone={() => setIntro(false)} /> : null}
            </View>
          </ToastProvider>
        </Themed>
      </AppProvider>
    </SafeAreaProvider>
  );
}
