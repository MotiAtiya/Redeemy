import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  I18nManager,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { cancelAllNotifications, rescheduleAllNotifications } from '@/lib/notifications';
import { deleteAllUserCredits } from '@/lib/firestoreCredits';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore, type DateFormat } from '@/stores/settingsStore';
import { REMINDER_PRESETS } from '@/constants/reminders';
import { useAppTheme, useIsDark } from '@/hooks/useAppTheme';

const logoLight = require('../../../assets/images/logo-light.png');
const logoDark = require('../../../assets/images/logo-dark.png');
import * as Updates from 'expo-updates';
import { saveLanguage, resolveLanguage, applyRTL, type AppLanguage } from '@/lib/i18n';
import i18n from '@/lib/i18n';
import type { AppColors } from '@/constants/colors';

type ThemeMode = 'light' | 'dark' | 'system';

const NOTIF_HOURS = [7, 8, 9, 10, 12, 18, 20];
const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
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

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 16, paddingBottom: 32 },
    screenTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 24,
      alignSelf: 'flex-start',
    },
    section: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginStart: 4,
      alignSelf: 'flex-start',
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
    displayName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, alignSelf: 'flex-start' },
    email: { fontSize: 13, color: colors.textSecondary, marginTop: 1, alignSelf: 'flex-start' },
    separator: { height: 1, backgroundColor: colors.separator, marginStart: 16 },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    settingsLabel: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
    settingsSubtitle: { fontSize: 13, color: colors.textTertiary, marginEnd: 4 },
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
    sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, alignSelf: 'flex-start' },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
    },
    themeOptionLabel: { fontSize: 16, color: colors.textPrimary, alignSelf: 'flex-start' },
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
    aboutLabel: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
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
    // Language sheet (reuses sheet/sheetHandle/sheetTitle/themeOption styles)
    langOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
    },
    langOptionLabel: { fontSize: 16, color: colors.textPrimary, alignSelf: 'flex-start' },
    langSeparator: { height: 1, backgroundColor: colors.separator },
    aboutHeader: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
    },
    aboutLogoImage: {
      width: 72,
      height: 72,
      borderRadius: 16,
      marginBottom: 10,
    },
  });
}

export default function MoreScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isDark = useIsDark();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();

  const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light',  label: t('more.theme.light'),  icon: '☀️' },
    { mode: 'dark',   label: t('more.theme.dark'),   icon: '🌙' },
    { mode: 'system', label: t('more.theme.system'), icon: '📱' },
  ];

  const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
    { value: 'system', label: t('more.language.system')  },
    { value: 'en',     label: t('more.language.english') },
    { value: 'he',     label: t('more.language.hebrew')  },
  ];

  const currentUser = useAuthStore((s) => s.currentUser);
  const credits = useCreditsStore((s) => s.credits);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const setDateFormat = useSettingsStore((s) => s.setDateFormat);
  const defaultReminderDays = useSettingsStore((s) => s.defaultReminderDays);
  const setDefaultReminderDays = useSettingsStore((s) => s.setDefaultReminderDays);
  const notificationHour = useSettingsStore((s) => s.notificationHour);
  const setNotificationHour = useSettingsStore((s) => s.setNotificationHour);

  const [deletingData, setDeletingData] = useState(false);
  const [showAppearanceSheet, setShowAppearanceSheet] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showDateFormatSheet, setShowDateFormatSheet] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);
  const [showNotifTimeSheet, setShowNotifTimeSheet] = useState(false);

  function formatNotifHour(hour: number): string {
    if (i18n.language === 'he') return `${String(hour).padStart(2, '0')}:00`;
    const suffix = hour < 12 ? 'AM' : 'PM';
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h}:00 ${suffix}`;
  }

  function reminderLabel(days: number): string {
    if (days === 1) return t('reminder.1day');
    if (days === 7) return t('reminder.1week');
    if (days === 30) return t('reminder.1month');
    return t('reminder.3months');
  }

  async function handleNotifHourChange(hour: number) {
    setNotificationHour(hour);
    setShowNotifTimeSheet(false);
    if (notificationsEnabled) {
      const activeCredits = credits.filter((c) => c.status === 'active');
      await rescheduleAllNotifications(activeCredits);
    }
  }

  const themeModeLabel = THEME_OPTIONS.find((o) => o.mode === themeMode)?.label ?? t('more.theme.system');
  const languageLabel = LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? t('more.language.system');

  async function handleNotificationsToggle(enabled: boolean) {
    setNotificationsEnabled(enabled);
    if (!enabled) {
      await cancelAllNotifications();
    } else {
      const activeCredits = credits.filter((c) => c.status === 'active');
      await rescheduleAllNotifications(activeCredits);
    }
  }

  async function handleDeleteAllData() {
    Alert.alert(t('more.deleteData.title'), t('more.deleteData.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('more.deleteData.confirm'),
        style: 'destructive',
        onPress: async () => {
          if (!currentUser?.uid) return;
          setDeletingData(true);
          try {
            await cancelAllNotifications();
            await deleteAllUserCredits(currentUser.uid);
            resetAllStores();
            setDeletingData(false);
            Alert.alert(t('more.deleteData.successTitle'), t('more.deleteData.successMessage'));
          } catch {
            setDeletingData(false);
            Alert.alert(t('common.error'), t('more.deleteData.error'));
          }
        },
      },
    ]);
  }

  async function handleLanguageChange(newLang: AppLanguage) {
    await saveLanguage(newLang);
    const resolved = resolveLanguage(newLang);
    await i18n.changeLanguage(resolved);
    setLanguage(newLang);
    setShowLanguageSheet(false);
    const needsRestart = applyRTL(resolved);
    if (needsRestart) {
      Alert.alert(
        t('more.language.restartTitle'),
        t('more.language.restartMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('more.language.restartNow'),
            onPress: () => Updates.reloadAsync(),
          },
        ]
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>{t('more.title')}</Text>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('more.sections.account')}</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/account')}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
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
                  {currentUser?.email ?? ''}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Settings section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('more.sections.settings')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => setShowAppearanceSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('more.appearance')}, ${themeModeLabel}`}
            >
              <Ionicons name="contrast-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.appearance')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>{themeModeLabel}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <View style={styles.settingsRow}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.notifications.label')}</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: colors.separator, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.settingsRow} onPress={() => setShowNotifTimeSheet(true)} accessibilityRole="button">
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.notifTime.label')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>{formatNotifHour(notificationHour)}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.settingsRow} onPress={() => setShowReminderSheet(true)} accessibilityRole="button">
              <Ionicons name="alarm-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.defaultReminder.label')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>{reminderLabel(defaultReminderDays)}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.settingsRow} onPress={() => setShowDateFormatSheet(true)} accessibilityRole="button">
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.dateFormat.label')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>{dateFormat}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Language section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('more.sections.language')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => setShowLanguageSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('more.language.label')}, ${languageLabel}`}
            >
              <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.language.label')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>{languageLabel}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('more.sections.about')}</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeader}>
              <Image
                source={isDark ? logoDark : logoLight}
                style={styles.aboutLogoImage}
                contentFit="contain"
              />
              <Text style={styles.aboutAppName}>Redeemy</Text>
              <Text style={styles.aboutTagline}>{t('more.about.tagline')}</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            </View>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => Linking.openURL('mailto:a.moti96@gmail.com')}
            >
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.aboutLabel}>{t('more.about.contact')}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <View style={styles.aboutRow}>
              <Ionicons name="code-slash-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.aboutLabel}>{t('more.about.madeWith')}</Text>
              </View>
              <Text style={styles.aboutValue}>{t('more.about.tech')}</Text>
            </View>
          </View>
        </View>

        {/* Delete all data */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.signOutRow}
              onPress={handleDeleteAllData}
              disabled={deletingData}
              accessibilityRole="button"
              accessibilityLabel={t('more.deleteData.button')}
            >
              {deletingData ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  <Text style={styles.signOutText}>{t('more.deleteData.button')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>



      </ScrollView>

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
          <Text style={styles.sheetTitle}>{t('more.theme.title')}</Text>

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
                <View style={{ flex: 1 }}>
                  <Text style={styles.themeOptionLabel}>{option.label}</Text>
                </View>
                {themeMode === option.mode && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              {index < THEME_OPTIONS.length - 1 && <View style={styles.themeSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Date Format bottom sheet */}
      <Modal visible={showDateFormatSheet} transparent animationType="slide" onRequestClose={() => setShowDateFormatSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDateFormatSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.dateFormat.title')}</Text>
          {DATE_FORMAT_OPTIONS.map((option, index) => (
            <View key={option.value}>
              <TouchableOpacity
                style={styles.themeOption}
                onPress={() => { setDateFormat(option.value); setShowDateFormatSheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: dateFormat === option.value }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.themeOptionLabel}>{option.label}</Text>
                </View>
                {dateFormat === option.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < DATE_FORMAT_OPTIONS.length - 1 && <View style={styles.themeSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Default Reminder bottom sheet */}
      <Modal visible={showReminderSheet} transparent animationType="slide" onRequestClose={() => setShowReminderSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowReminderSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.defaultReminder.title')}</Text>
          {REMINDER_PRESETS.map((preset, index) => (
            <View key={preset.days}>
              <TouchableOpacity
                style={styles.themeOption}
                onPress={() => { setDefaultReminderDays(preset.days); setShowReminderSheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: defaultReminderDays === preset.days }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.themeOptionLabel}>{reminderLabel(preset.days)}</Text>
                </View>
                {defaultReminderDays === preset.days && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < REMINDER_PRESETS.length - 1 && <View style={styles.themeSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Notification Time bottom sheet */}
      <Modal visible={showNotifTimeSheet} transparent animationType="slide" onRequestClose={() => setShowNotifTimeSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowNotifTimeSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.notifTime.title')}</Text>
          {NOTIF_HOURS.map((hour, index) => (
            <View key={hour}>
              <TouchableOpacity
                style={styles.themeOption}
                onPress={() => handleNotifHourChange(hour)}
                accessibilityRole="radio"
                accessibilityState={{ checked: notificationHour === hour }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.themeOptionLabel}>{formatNotifHour(hour)}</Text>
                </View>
                {notificationHour === hour && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < NOTIF_HOURS.length - 1 && <View style={styles.themeSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Language bottom sheet */}
      <Modal
        visible={showLanguageSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageSheet(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowLanguageSheet(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.language.title')}</Text>

          {LANGUAGE_OPTIONS.map((option, index) => (
            <View key={option.value}>
              <TouchableOpacity
                style={styles.langOption}
                onPress={() => handleLanguageChange(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: language === option.value }}
                accessibilityLabel={option.label}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.langOptionLabel}>{option.label}</Text>
                </View>
                {language === option.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              {index < LANGUAGE_OPTIONS.length - 1 && <View style={styles.langSeparator} />}
            </View>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
