import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useUIStore } from '@/stores/uiStore';
import { SAGE_TEAL } from '@/components/ui/theme';

function resetAllStores() {
  // Clear credits data so no user data lingers in memory after sign-out
  const credits = useCreditsStore.getState();
  credits.setCredits([]);
  credits.setSearchQuery('');
  credits.setError(null);
  credits.setLoading(false);

  // Reset UI state
  const ui = useUIStore.getState();
  ui.setActiveTab('credits');
  ui.setOfflineMode(false);

  // authStore is reset by onAuthStateChanged firing → UNAUTHENTICATED,
  // which also triggers the AuthGate redirect to sign-in
}

export default function MoreScreen() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            resetAllStores();
            await signOut();
            // AuthGate in _layout.tsx redirects to sign-in once
            // onAuthStateChanged fires with null
          } catch {
            setSigningOut(false);
            Alert.alert('Error', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>More</Text>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            <View style={styles.accountRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>
                  {currentUser?.displayName?.[0]?.toUpperCase() ??
                    currentUser?.email?.[0]?.toUpperCase() ??
                    '?'}
                </Text>
              </View>
              <View style={styles.accountInfo}>
                {currentUser?.displayName ? (
                  <Text style={styles.displayName}>{currentUser.displayName}</Text>
                ) : null}
                <Text style={styles.email} numberOfLines={1}>
                  {currentUser?.email ?? 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings section — placeholder for future stories */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <View style={styles.card}>
            <SettingsRow icon="notifications-outline" label="Notifications" />
            <View style={styles.separator} />
            <SettingsRow icon="shield-checkmark-outline" label="Privacy" />
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.signOutRow}
              onPress={handleSignOut}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityLabel="Sign Out"
            >
              {signingOut ? (
                <ActivityIndicator color="#D32F2F" size="small" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <TouchableOpacity style={styles.settingsRow}>
      <Ionicons name={icon} size={20} color="#616161" />
      <Text style={styles.settingsLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1, paddingHorizontal: 16 },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
    marginTop: 16,
    marginBottom: 24,
  },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SAGE_TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  accountInfo: { flex: 1 },
  displayName: { fontSize: 15, fontWeight: '600', color: '#212121' },
  email: { fontSize: 13, color: '#757575', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 16 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  settingsLabel: { flex: 1, fontSize: 15, color: '#212121' },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#D32F2F' },
});
