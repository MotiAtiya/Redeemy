import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Modal,
  ScrollView,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { cancelAllNotifications, rescheduleAllNotifications } from '@/lib/notifications';
import { useCreditsStore } from '@/stores/creditsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { REMINDER_PRESETS } from '@/constants/reminders';
import { useAppTheme } from '@/hooks/useAppTheme';
import i18n from '@/lib/i18n';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 16, paddingBottom: 32 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 8,
    },
    headerTitle: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
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
      marginBottom: 20,
    },
    separator: { height: 1, backgroundColor: colors.separator, marginStart: 16 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    rowLabel: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
    rowSubtitle: { fontSize: 13, color: colors.textTertiary, marginEnd: 4 },
    rowLabelDisabled: { color: colors.textTertiary },
    // Bottom sheets
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
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
    },
    optionLabel: { fontSize: 16, color: colors.textPrimary, alignSelf: 'flex-start' },
    optionSeparator: { height: 1, backgroundColor: colors.separator },
  });
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();

  const credits = useCreditsStore((s) => s.credits);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const expiryNotificationEnabled = useSettingsStore((s) => s.expiryNotificationEnabled);
  const setExpiryNotificationEnabled = useSettingsStore((s) => s.setExpiryNotificationEnabled);
  const notificationHour = useSettingsStore((s) => s.notificationHour);
  const notificationMinute = useSettingsStore((s) => s.notificationMinute);
  const setNotificationTime = useSettingsStore((s) => s.setNotificationTime);
  const defaultReminderDays = useSettingsStore((s) => s.defaultReminderDays);
  const setDefaultReminderDays = useSettingsStore((s) => s.setDefaultReminderDays);

  const [showNotifTimeSheet, setShowNotifTimeSheet] = useState(false);
  const [showReminderSheet, setShowReminderSheet] = useState(false);

  const notifTimeDate = new Date();
  notifTimeDate.setHours(notificationHour, notificationMinute, 0, 0);

  function formatNotifTime(hour: number, minute: number): string {
    const mm = String(minute).padStart(2, '0');
    if (i18n.language === 'he') return `${String(hour).padStart(2, '0')}:${mm}`;
    const suffix = hour < 12 ? 'AM' : 'PM';
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h}:${mm} ${suffix}`;
  }

  function reminderLabel(days: number): string {
    if (days === 1) return t('reminder.1day');
    if (days === 7) return t('reminder.1week');
    if (days === 30) return t('reminder.1month');
    return t('reminder.3months');
  }

  async function handleMasterToggle(enabled: boolean) {
    setNotificationsEnabled(enabled);
    if (!enabled) {
      await cancelAllNotifications();
    } else {
      const activeCredits = credits.filter((c) => c.status === 'active');
      await rescheduleAllNotifications(activeCredits);
    }
  }

  async function handleExpiryToggle(enabled: boolean) {
    setExpiryNotificationEnabled(enabled);
    const activeCredits = credits.filter((c) => c.status === 'active');
    await rescheduleAllNotifications(activeCredits);
  }

  async function handleNotifTimeChange(_: DateTimePickerEvent, date?: Date) {
    if (!date) return;
    setNotificationTime(date.getHours(), date.getMinutes());
    const activeCredits = credits.filter((c) => c.status === 'active');
    await rescheduleAllNotifications(activeCredits);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('notificationSettings.title')}</Text>
        </View>

        <View style={styles.card}>
          {/* Master toggle */}
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t('notificationSettings.enable')}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleMasterToggle}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.separator} />

          {/* Expiry day toggle */}
          <View style={[styles.row, !notificationsEnabled && { opacity: 0.4 }]}>
            <Ionicons name="calendar-clear-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.expiryDay')}
              </Text>
            </View>
            <Switch
              value={expiryNotificationEnabled}
              onValueChange={handleExpiryToggle}
              disabled={!notificationsEnabled}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.separator} />

          {/* Notification time */}
          <TouchableOpacity
            style={[styles.row, !notificationsEnabled && { opacity: 0.4 }]}
            onPress={() => notificationsEnabled && setShowNotifTimeSheet(true)}
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.notifTime')}
              </Text>
            </View>
            <Text style={styles.rowSubtitle}>{formatNotifTime(notificationHour, notificationMinute)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.separator} />

          {/* Default reminder */}
          <TouchableOpacity
            style={[styles.row, !notificationsEnabled && { opacity: 0.4 }]}
            onPress={() => notificationsEnabled && setShowReminderSheet(true)}
            accessibilityRole="button"
          >
            <Ionicons name="alarm-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.defaultReminder')}
              </Text>
            </View>
            <Text style={styles.rowSubtitle}>{reminderLabel(defaultReminderDays)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Notification Time bottom sheet */}
      <Modal visible={showNotifTimeSheet} transparent animationType="slide" onRequestClose={() => setShowNotifTimeSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowNotifTimeSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.notifTime.title')}</Text>
          <DateTimePicker
            value={notifTimeDate}
            mode="time"
            display="spinner"
            onChange={handleNotifTimeChange}
            style={{ width: '100%' }}
            textColor={colors.textPrimary}
          />
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
                style={styles.option}
                onPress={() => { setDefaultReminderDays(preset.days); setShowReminderSheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: defaultReminderDays === preset.days }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{reminderLabel(preset.days)}</Text>
                </View>
                {defaultReminderDays === preset.days && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < REMINDER_PRESETS.length - 1 && <View style={styles.optionSeparator} />}
            </View>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
