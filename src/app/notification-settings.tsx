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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { cancelAllNotifications, rescheduleAllNotifications } from '@/lib/notifications';
import { ReminderSection } from '@/components/redeemy/ReminderSection';
import { type DaysOption } from '@/components/redeemy/DaysPickerSheet';
import { useCreditsStore } from '@/stores/creditsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { REMINDER_PRESETS } from '@/constants/reminders';
import { SUBSCRIPTION_REMINDER_PRESETS } from '@/constants/subscriptionReminders';
import { OCCASION_REMINDER_PRESETS } from '@/constants/occasionReminders';
import { useAppTheme } from '@/hooks/useAppTheme';
import i18n from '@/lib/i18n';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors) {
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
    sectionSeparator: { height: 1, backgroundColor: colors.separator },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    rowLabel: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
    rowSubtitle: { fontSize: 13, color: colors.textTertiary, marginEnd: 4 },
    rowLabelDisabled: { color: colors.textTertiary },
    // Notif-time bottom sheet (the one non-DaysPickerSheet modal)
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
    sheetTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 16,
      alignSelf: 'flex-start',
    },
  });
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const credits = useCreditsStore((s) => s.credits);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const notificationHour = useSettingsStore((s) => s.notificationHour);
  const notificationMinute = useSettingsStore((s) => s.notificationMinute);
  const setNotificationTime = useSettingsStore((s) => s.setNotificationTime);

  const creditReminderDays = useSettingsStore((s) => s.creditReminderDays);
  const setCreditReminderDays = useSettingsStore((s) => s.setCreditReminderDays);
  const creditLastDayAlert = useSettingsStore((s) => s.creditLastDayAlert);
  const setCreditLastDayAlert = useSettingsStore((s) => s.setCreditLastDayAlert);

  const warrantyReminderDays = useSettingsStore((s) => s.warrantyReminderDays);
  const setWarrantyReminderDays = useSettingsStore((s) => s.setWarrantyReminderDays);
  const warrantyLastDayAlert = useSettingsStore((s) => s.warrantyLastDayAlert);
  const setWarrantyLastDayAlert = useSettingsStore((s) => s.setWarrantyLastDayAlert);

  const subscriptionReminderDays = useSettingsStore((s) => s.subscriptionReminderDays);
  const setSubscriptionReminderDays = useSettingsStore((s) => s.setSubscriptionReminderDays);
  const subscriptionLastDayAlert = useSettingsStore((s) => s.subscriptionLastDayAlert);
  const setSubscriptionLastDayAlert = useSettingsStore((s) => s.setSubscriptionLastDayAlert);

  const occasionEarlyReminderDays = useSettingsStore((s) => s.occasionEarlyReminderDays);
  const setOccasionEarlyReminderDays = useSettingsStore((s) => s.setOccasionEarlyReminderDays);
  const occasionOnDayAlert = useSettingsStore((s) => s.occasionOnDayAlert);
  const setOccasionOnDayAlert = useSettingsStore((s) => s.setOccasionOnDayAlert);

  const documentReminderDays = useSettingsStore((s) => s.documentReminderDays);
  const setDocumentReminderDays = useSettingsStore((s) => s.setDocumentReminderDays);
  const documentExpiryAlert = useSettingsStore((s) => s.documentExpiryAlert);
  const setDocumentExpiryAlert = useSettingsStore((s) => s.setDocumentExpiryAlert);

  const appIconBadge = useSettingsStore((s) => s.appIconBadge);
  const setAppIconBadge = useSettingsStore((s) => s.setAppIconBadge);

  const [showNotifTimeSheet, setShowNotifTimeSheet] = useState(false);

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
    if (days === 0) return t('notificationSettings.none');
    if (days === 1) return t('reminder.1day');
    if (days === 7) return t('reminder.1week');
    if (days === 30) return t('reminder.1month');
    return t('reminder.3months');
  }

  function subscriptionReminderLabel(days: number): string {
    if (days === 0) return t('notificationSettings.none');
    if (days === 3) return t('addSubscription.reminder.3days');
    if (days === 7) return t('addSubscription.reminder.1week');
    if (days === 14) return t('addSubscription.reminder.2weeks');
    return t('addSubscription.reminder.1month');
  }

  function documentReminderLabel(days: number): string {
    if (days === 0) return t('notificationSettings.none');
    if (days === 7) return t('reminder.1week');
    if (days === 14) return t('reminder.2weeks');
    if (days === 30) return t('reminder.1month');
    return t('reminder.3months');
  }

  function occasionReminderLabel(days: number): string {
    if (days === 0) return t('notificationSettings.none');
    if (days === 1) return t('reminder.1day');
    if (days === 3) return t('reminder.3days');
    if (days === 7) return t('reminder.1week');
    return t('reminder.1month');
  }

  // Build the picker option arrays once per render.
  const creditOptions: DaysOption[] = REMINDER_PRESETS.map((p) => ({
    days: p.days,
    label: reminderLabel(p.days),
  }));
  const warrantyOptions = creditOptions; // identical preset list + label fn
  const subscriptionOptions: DaysOption[] = SUBSCRIPTION_REMINDER_PRESETS.map((p) => ({
    days: p.days,
    label: subscriptionReminderLabel(p.days),
  }));
  const occasionOptions: DaysOption[] = OCCASION_REMINDER_PRESETS.map((p) => ({
    days: p.days,
    label: occasionReminderLabel(p.days),
  }));
  const documentOptions: DaysOption[] = [0, 7, 14, 30, 90].map((days) => ({
    days,
    label: documentReminderLabel(days),
  }));

  async function handleMasterToggle(enabled: boolean) {
    setNotificationsEnabled(enabled);
    if (!enabled) {
      await cancelAllNotifications();
    } else {
      const activeCredits = credits.filter((c) => c.status === 'active');
      await rescheduleAllNotifications(activeCredits);
    }
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

        {/* General card */}
        <View style={styles.card}>
          {/* Master toggle */}
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t('notificationSettings.enable')}</Text>
            </View>
            <Switch
              style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
              value={notificationsEnabled}
              onValueChange={handleMasterToggle}
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
        </View>

        {/* Auto reminders card */}
        <Text style={styles.sectionLabel}>{t('notificationSettings.autoReminders')}</Text>
        <View style={[styles.card, !notificationsEnabled && { opacity: 0.4 }]}>
          <ReminderSection
            enabled={notificationsEnabled}
            typeLabel={t('notificationSettings.credits').toUpperCase()}
            reminderIcon="card-outline"
            reminderLabel={t('notificationSettings.reminderBefore')}
            reminderSheetTitle={t('notificationSettings.sheetTitleCredit')}
            reminderOptions={creditOptions}
            reminderValue={creditReminderDays}
            onReminderChange={setCreditReminderDays}
            switchIcon="calendar-clear-outline"
            switchLabel={t('notificationSettings.lastDayAlert')}
            switchValue={creditLastDayAlert}
            onSwitchChange={setCreditLastDayAlert}
          />

          <View style={styles.sectionSeparator} />

          <ReminderSection
            enabled={notificationsEnabled}
            typeLabel={t('notificationSettings.warranties').toUpperCase()}
            reminderIcon="shield-checkmark-outline"
            reminderLabel={t('notificationSettings.reminderBefore')}
            reminderSheetTitle={t('notificationSettings.sheetTitleWarranty')}
            reminderOptions={warrantyOptions}
            reminderValue={warrantyReminderDays}
            onReminderChange={setWarrantyReminderDays}
            switchIcon="calendar-clear-outline"
            switchLabel={t('notificationSettings.lastDayAlert')}
            switchValue={warrantyLastDayAlert}
            onSwitchChange={setWarrantyLastDayAlert}
          />

          <View style={styles.sectionSeparator} />

          <ReminderSection
            enabled={notificationsEnabled}
            typeLabel={t('notificationSettings.subscriptions').toUpperCase()}
            reminderIcon="repeat-outline"
            reminderLabel={t('notificationSettings.reminderBeforeBilling')}
            reminderSheetTitle={t('notificationSettings.sheetTitleSubscription')}
            reminderOptions={subscriptionOptions}
            reminderValue={subscriptionReminderDays}
            onReminderChange={setSubscriptionReminderDays}
            switchIcon="calendar-clear-outline"
            switchLabel={t('notificationSettings.lastDayBeforeBilling')}
            switchValue={subscriptionLastDayAlert}
            onSwitchChange={setSubscriptionLastDayAlert}
          />

          <View style={styles.sectionSeparator} />

          <ReminderSection
            enabled={notificationsEnabled}
            typeLabel={t('notificationSettings.occasions').toUpperCase()}
            reminderIcon="heart-outline"
            reminderLabel={t('notificationSettings.reminderBeforeOccasion')}
            reminderSheetTitle={t('notificationSettings.sheetTitleOccasion')}
            reminderOptions={occasionOptions}
            reminderValue={occasionEarlyReminderDays}
            onReminderChange={setOccasionEarlyReminderDays}
            switchIcon="calendar-outline"
            switchLabel={t('notificationSettings.onDayAlert')}
            switchValue={occasionOnDayAlert}
            onSwitchChange={setOccasionOnDayAlert}
          />

          <View style={styles.sectionSeparator} />

          <ReminderSection
            enabled={notificationsEnabled}
            typeLabel={t('notificationSettings.documents').toUpperCase()}
            reminderIcon="documents-outline"
            reminderLabel={t('notificationSettings.reminderBeforeExpiry')}
            reminderSheetTitle={t('notificationSettings.sheetTitleDocument')}
            reminderOptions={documentOptions}
            reminderValue={documentReminderDays}
            onReminderChange={setDocumentReminderDays}
            switchIcon="calendar-clear-outline"
            switchLabel={t('notificationSettings.expiryDayAlert')}
            switchValue={documentExpiryAlert}
            onSwitchChange={setDocumentExpiryAlert}
          />
        </View>

        {/* App icon badge */}
        <Text style={styles.sectionLabel}>{t('notificationSettings.appIconBadge.section')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ width: 22, height: 22 }}>
              <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
              <View style={{ position: 'absolute', top: -3, right: -5, minWidth: 13, height: 13, borderRadius: 7, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.surface, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>3</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{t('notificationSettings.appIconBadge.label')}</Text>
              <Text style={[styles.rowSubtitle, { textAlign: 'left' }]}>{t('notificationSettings.appIconBadge.subtitle')}</Text>
            </View>
            <Switch
              style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
              value={appIconBadge}
              onValueChange={setAppIconBadge}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>

      {/* Notification Time bottom sheet — keeps its own inline impl since it's
          a time picker (DateTimePicker), not a list of preset days. */}
      <Modal visible={showNotifTimeSheet} transparent animationType="slide" onRequestClose={() => setShowNotifTimeSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowNotifTimeSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.notifTime.title')}</Text>
          <DateTimePicker
            value={notifTimeDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleNotifTimeChange}
            style={{ width: '100%' }}
            textColor={colors.textPrimary}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
