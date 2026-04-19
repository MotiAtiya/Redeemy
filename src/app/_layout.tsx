import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAuthState } from '@/hooks/useAuthState';
import { useBadgeUpdater } from '@/hooks/useBadgeUpdater';
import { useNetworkMonitor } from '@/hooks/useNetworkMonitor';
import { useAppTheme, useIsDark } from '@/hooks/useAppTheme';
import { OfflineToast } from '@/components/redeemy/OfflineToast';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { AuthStatus } from '@/types/userTypes';
import { configureGoogleSignIn } from '@/lib/auth';
import { registerNotificationCategories, getCreditIdFromNotification } from '@/lib/notifications';
import { getSavedLanguage, resolveLanguage, initI18n, applyRTL } from '@/lib/i18n';

// One-time module-level setup
configureGoogleSignIn();
registerNotificationCategories();

function AuthGate({ children }: { children: React.ReactNode }) {
  useAuthState();
  useBadgeUpdater();
  useNetworkMonitor();

  const router = useRouter();
  const segments = useSegments();
  const authStatus = useAuthStore((s) => s.authStatus);
  const colors = useAppTheme();
  const isDark = useIsDark();

  useEffect(() => {
    if (authStatus === AuthStatus.LOADING) return;
    const inAuthGroup = segments[0] === 'auth';
    if (authStatus === AuthStatus.UNAUTHENTICATED && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (authStatus === AuthStatus.AUTHENTICATED && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [authStatus, segments, router]);

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const creditId = getCreditIdFromNotification(response);
      if (creditId && authStatus === AuthStatus.AUTHENTICATED) {
        router.push(`/credit/${creditId}`);
      }
    });
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const creditId = getCreditIdFromNotification(response);
      if (creditId) router.push(`/credit/${creditId}`);
    });
    return () => sub.remove();
  }, [authStatus, router]);

  if (authStatus === AuthStatus.LOADING) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
      <OfflineToast />
    </View>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const colors = useAppTheme();

  useEffect(() => {
    getSavedLanguage().then((pref) => {
      const lang = resolveLanguage(pref);
      applyRTL(lang);
      initI18n(lang);
      setLanguage(pref);
      setI18nReady(true);
    });
  }, []);

  if (!i18nReady) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#4A9E8E" />
      </View>
    );
  }

  return (
    <AuthGate>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-credit"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen name="credit/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="store/[name]" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
      </Stack>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
