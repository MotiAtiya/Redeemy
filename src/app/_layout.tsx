import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { GluestackProvider } from '@/components/ui/GluestackProvider';
import { useAuthState } from '@/hooks/useAuthState';
import { useBadgeUpdater } from '@/hooks/useBadgeUpdater';
import { useNetworkMonitor } from '@/hooks/useNetworkMonitor';
import { useAppTheme, useIsDark } from '@/hooks/useAppTheme';
import { OfflineToast } from '@/components/redeemy/OfflineToast';
import { useAuthStore } from '@/stores/authStore';
import { AuthStatus } from '@/types/userTypes';
import { configureGoogleSignIn } from '@/lib/auth';
import { registerNotificationCategories, getCreditIdFromNotification } from '@/lib/notifications';

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

  // Redirect based on auth status
  useEffect(() => {
    if (authStatus === AuthStatus.LOADING) return;

    const inAuthGroup = segments[0] === 'auth';

    if (authStatus === AuthStatus.UNAUTHENTICATED && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (authStatus === AuthStatus.AUTHENTICATED && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [authStatus, segments, router]);

  // Deep-link from notification tap
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
  return (
    <GluestackProvider>
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
        </Stack>
      </AuthGate>
    </GluestackProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
