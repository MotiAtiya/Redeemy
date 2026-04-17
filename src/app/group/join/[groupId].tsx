import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { redeemInviteToken, getGroupWithMembers } from '@/lib/firestoreGroups';
import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { AuthStatus } from '@/types/userTypes';
import { SAGE_TEAL } from '@/components/ui/theme';

/**
 * Handles deep-link invite joins: redeemy://group/join/{groupId}?token={token}
 * Expo Router maps query params via useLocalSearchParams.
 */
export default function JoinGroupScreen() {
  const router = useRouter();
  const { groupId, token } = useLocalSearchParams<{ groupId: string; token: string }>();
  const currentUser = useAuthStore((s) => s.currentUser);
  const authStatus = useAuthStore((s) => s.authStatus);
  const addGroup = useGroupStore((s) => s.addGroup);

  const [status, setStatus] = useState<'joining' | 'success' | 'error' | 'expired'>('joining');

  useEffect(() => {
    // Wait for auth to resolve before attempting to join
    if (authStatus === AuthStatus.LOADING) return;

    if (authStatus === AuthStatus.UNAUTHENTICATED) {
      // Redirect to sign-in; after auth, deep-link will re-fire
      router.replace('/auth/sign-in');
      return;
    }

    if (!currentUser || !groupId || !token) {
      setStatus('error');
      return;
    }

    async function join() {
      try {
        const success = await redeemInviteToken(
          groupId!,
          token!,
          currentUser!.uid,
          currentUser!.displayName ?? undefined
        );

        if (!success) {
          setStatus('expired');
          return;
        }

        // Load the group and add to store
        const group = await getGroupWithMembers(groupId!);
        if (group) addGroup(group);

        setStatus('success');

        // Navigate to group detail after short delay
        setTimeout(() => {
          router.replace(`/group/${groupId}`);
        }, 1500);
      } catch {
        setStatus('error');
      }
    }

    join();
  }, [authStatus, currentUser, groupId, token, addGroup, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {status === 'joining' && (
          <>
            <ActivityIndicator size="large" color={SAGE_TEAL} />
            <Text style={styles.message}>Joining group…</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={styles.icon}>🎉</Text>
            <Text style={styles.title}>You're in!</Text>
            <Text style={styles.message}>Taking you to the group now…</Text>
          </>
        )}

        {status === 'expired' && (
          <>
            <Text style={styles.icon}>⏰</Text>
            <Text style={styles.title}>Invite Expired</Text>
            <Text style={styles.message}>
              This invite link has expired. Ask the group admin to send a new one.
            </Text>
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              Could not join the group. Please try again.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  icon: { fontSize: 56 },
  title: { fontSize: 24, fontWeight: '700', color: '#212121', textAlign: 'center' },
  message: { fontSize: 15, color: '#616161', textAlign: 'center', lineHeight: 22 },
});
