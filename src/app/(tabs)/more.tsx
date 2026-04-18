import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light',  label: 'Light',  icon: '☀️' },
  { mode: 'dark',   label: 'Dark',   icon: '🌙' },
  { mode: 'system', label: 'System', icon: '📱' },
];

function resetAllStores() {
  const credits = useCreditsStore.getState();
  credits.setCredits([]);
  credits.setSearchQuery('');
  credits.setError(null);
  credits.setLoading(false);

  const ui = useUIStore.getState();
  ui.setActiveTab('credits');
  ui.setOfflineMode(false);
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, paddingHorizontal: 16 },
    screenTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 24,
    },
    section: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
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
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    accountInfo: { flex: 1 },
    displayName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    email: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
    separator: { height: 1, backgroundColor: colors.separator, marginLeft: 16 },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    settingsLabel: { flex: 1, fontSize: 15, color: colors.textPrimary },
    settingsSubtitle: { fontSize: 13, color: colors.textTertiary, marginRight: 4 },
    signOutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
    },
    signOutText: { fontSize: 15, fontWeight: '600', color: colors.danger },
    // Appearance sheet
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.separator,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
    },
    themeOptionLabel: { flex: 1, fontSize: 16, color: colors.textPrimary },
    themeOptionEmoji: { fontSize: 20 },
    themeSeparator: { height: 1, backgroundColor: colors.separator },
    aboutCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    aboutLabel: { flex: 1, fontSize: 15, color: colors.textPrimary },
    aboutValue: { fontSize: 15, color: colors.textSecondary },
    aboutAppName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 4,
    },
    aboutTagline: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 4,
    },
    aboutVersion: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    aboutHeader: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    aboutIconWrapper: {
      width: 60,
      height: 60,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
  });
}

export default function MoreScreen() {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const currentUser = useAuthStore((s) => s.currentUser);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  const [signingOut, setSigningOut] = useState(false);
  const [showAppearanceSheet, setShowAppearanceSheet] = useState(false);

  const themeModeLabel = THEME_OPTIONS.find((o) => o.mode === themeMode)?.label ?? 'System';

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

        {/* Settings section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => setShowAppearanceSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={`Appearance, currently ${themeModeLabel}`}
            >
              <Ionicons name="contrast-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.settingsLabel}>Appearance</Text>
              <Text style={styles.settingsSubtitle}>{themeModeLabel}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeader}>
              <View style={styles.aboutIconWrapper}>
                <Ionicons name="card-outline" size={30} color="#FFFFFF" />
              </View>
              <Text style={styles.aboutAppName}>Redeemy</Text>
              <Text style={styles.aboutTagline}>Never let a gift card expire</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            </View>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => Linking.openURL('mailto:a.moti96@gmail.com')}
            >
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.aboutLabel}>Contact Support</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <View style={styles.aboutRow}>
              <Ionicons name="code-slash-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.aboutLabel}>Made with</Text>
              <Text style={styles.aboutValue}>React Native + Expo</Text>
            </View>
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
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Appearance bottom sheet */}
      <Modal
        visible={showAppearanceSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAppearanceSheet(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowAppearanceSheet(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Appearance</Text>

          {THEME_OPTIONS.map((option, index) => (
            <View key={option.mode}>
              <TouchableOpacity
                style={styles.themeOption}
                onPress={() => {
                  setThemeMode(option.mode);
                  setShowAppearanceSheet(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: themeMode === option.mode }}
                accessibilityLabel={option.label}
              >
                <Text style={styles.themeOptionEmoji}>{option.icon}</Text>
                <Text style={styles.themeOptionLabel}>{option.label}</Text>
                {themeMode === option.mode && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              {index < THEME_OPTIONS.length - 1 && <View style={styles.themeSeparator} />}
            </View>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
