import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GluestackProvider } from '@/components/ui/GluestackProvider';
import { useAuthState } from '@/hooks/useAuthState';
import { useAuthStore } from '@/stores/authStore';
import { AuthStatus } from '@/types/userTypes';
import { configureGoogleSignIn } from '@/lib/auth';
import { SAGE_TEAL } from '@/components/ui/theme';

// Configure Google Sign-In once at module load time
configureGoogleSignIn();

/**
 * Starts the Firebase auth listener, guards routes, and shows a loading
 * screen while the persisted session is being resolved.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  useAuthState();

  const router = useRouter();
  const segments = useSegments();
  const authStatus = useAuthStore((s) => s.authStatus);

  useEffect(() => {
    if (authStatus === AuthStatus.LOADING) return;

    const inAuthGroup = segments[0] === 'auth';

    if (authStatus === AuthStatus.UNAUTHENTICATED && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (authStatus === AuthStatus.AUTHENTICATED && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [authStatus, segments, router]);

  // Show a full-screen spinner while the persisted token is being read.
  // This prevents any flash of the sign-in screen for returning users.
  if (authStatus === AuthStatus.LOADING) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={SAGE_TEAL} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GluestackProvider>
      <AuthGate>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
        </Stack>
      </AuthGate>
    </GluestackProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
