import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, I18nManager } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Updates from 'expo-updates';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAuthState } from '@/hooks/useAuthState';
import { useBadgeUpdater } from '@/hooks/useBadgeUpdater';
import { useNetworkMonitor } from '@/hooks/useNetworkMonitor';
import { useFamilyListener } from '@/hooks/useFamilyListener';
import { useFamilyIdRehydrate } from '@/hooks/useFamilyIdRehydrate';
import { useWarrantiesListener } from '@/hooks/useWarrantiesListener';
import { useCreditsListener } from '@/hooks/useCreditsListener';
import { useDocumentsListener } from '@/hooks/useDocumentsListener';
import { useSubscriptionsListener } from '@/hooks/useSubscriptionsListener';
import { useAppTheme, useIsDark } from '@/hooks/useAppTheme';
import { OfflineToast } from '@/components/redeemy/OfflineToast';
import { Toast } from '@/components/redeemy/Toast';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { migrateCreditsToFamily } from '@/lib/firestoreCredits';
import { migrateSubscriptionsToFamily } from '@/lib/firestoreSubscriptions';
import { migrateWarrantiesToFamily } from '@/lib/firestoreWarranties';
import { migrateOccasionsToFamily } from '@/lib/firestoreOccasions';
import { migrateDocumentsToFamily } from '@/lib/firestoreDocuments';
import { AuthStatus } from '@/types/userTypes';
import { configureGoogleSignIn } from '@/lib/auth';
import { logEvent } from '@/lib/eventLog';
import { registerNotificationCategories, getCreditIdFromNotification } from '@/lib/notifications';
import { getSubscriptionIdFromNotification } from '@/lib/subscriptionNotifications';
import { getSavedLanguage, resolveLanguage, initI18n, applyRTL } from '@/lib/i18n';

// One-time module-level setup
configureGoogleSignIn();
// registerNotificationCategories() is called after the user grants permission in onboarding

function AuthGate({ children }: { children: React.ReactNode }) {
  useAuthState();
  useBadgeUpdater();
  useNetworkMonitor();
  useFamilyIdRehydrate();
  const familyId = useSettingsStore((s) => s.familyId);
  useFamilyListener(familyId);

  const currentUser = useAuthStore((s) => s.currentUser);
  useWarrantiesListener(currentUser?.uid ?? null, familyId ?? null);
  useCreditsListener(currentUser?.uid ?? null, familyId ?? null);
  useDocumentsListener(currentUser?.uid ?? null, familyId ?? null);
  useSubscriptionsListener(currentUser?.uid ?? null, familyId ?? null);
  // Family migration runs on every launch / familyId change. Each migrate*ToFamily
  // function is idempotent — it skips docs already correctly tagged, so this is a
  // no-op when nothing needs updating. This makes the system self-healing when
  // schema fields are added (e.g. createdByName on documents).
  useEffect(() => {
    if (!familyId || !currentUser?.uid) return;
    const displayName = currentUser.displayName ?? currentUser.email?.split('@')[0] ?? 'Member';
    Promise.all([
      migrateCreditsToFamily(currentUser.uid, familyId, displayName),
      migrateSubscriptionsToFamily(currentUser.uid, familyId, displayName),
      migrateWarrantiesToFamily(currentUser.uid, familyId, displayName),
      migrateOccasionsToFamily(currentUser.uid, familyId, displayName),
      migrateDocumentsToFamily(currentUser.uid, familyId, displayName),
    ]).catch(() => { /* silent — will retry next launch */ });
  }, [familyId, currentUser?.uid]);

  const router = useRouter();
  const segments = useSegments();
  const authStatus = useAuthStore((s) => s.authStatus);
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded);
  const colors = useAppTheme();
  const isDark = useIsDark();

  // Fire `app_opened` once per cold start, after the user is authenticated.
  // Firestore rules require auth on the events/ collection, so we wait for it.
  const appOpenedLogged = useRef(false);
  useEffect(() => {
    if (appOpenedLogged.current) return;
    if (!currentUser?.uid) return;
    appOpenedLogged.current = true;
    void logEvent('app_opened');
  }, [currentUser?.uid]);

  useEffect(() => {
    if (authStatus === AuthStatus.LOADING) return;
    const inAuthGroup = segments[0] === 'auth';
    if (authStatus === AuthStatus.UNAUTHENTICATED && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (authStatus === AuthStatus.AUTHENTICATED && inAuthGroup) {
      if (!hasOnboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [authStatus, segments, router, hasOnboarded]);

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      if (authStatus !== AuthStatus.AUTHENTICATED) return;
      const subscriptionId = getSubscriptionIdFromNotification(response);
      if (subscriptionId) {
        router.push(`/subscription/${subscriptionId}`);
        return;
      }
      const creditId = getCreditIdFromNotification(response);
      if (creditId) router.push(`/credit/${creditId}`);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const subscriptionId = getSubscriptionIdFromNotification(response);
      if (subscriptionId) {
        router.push(`/subscription/${subscriptionId}`);
        return;
      }
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
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const colors = useAppTheme();

  useEffect(() => {
    // Register notification categories only if permission is already granted
    // (avoids triggering the OS dialog prematurely on fresh installs)
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === 'granted') registerNotificationCategories();
    });
  }, []);

  useEffect(() => {
    getSavedLanguage().then((pref) => {
      const lang = resolveLanguage(pref);
      const needsRestart = applyRTL(lang);
      if (needsRestart) {
        // RTL direction changed (e.g. first launch on Hebrew device) — restart
        // silently before the user sees any UI so layout is correct from the start
        Updates.reloadAsync();
        return;
      }
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
      <Stack screenOptions={{ animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-in" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-credit"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="add-warranty"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen name="credit/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="warranty/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="store/[name]" options={{ headerShown: false }} />
        <Stack.Screen name="subscription/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="add-subscription" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="stores" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="history" options={{ headerShown: false }} />
        <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
        <Stack.Screen name="family/create" options={{ headerShown: false }} />
        <Stack.Screen name="family/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="family/join" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="add-occasion" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="occasion/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="add-document" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="document/[id]" options={{ headerShown: false }} />
      </Stack>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
