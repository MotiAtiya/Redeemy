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
import { useCreditsStore } from '@/stores/creditsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { REMINDER_PRESETS } from '@/constants/reminders';
import { SUBSCRIPTION_REMINDER_PRESETS } from '@/constants/subscriptionReminders';
import { OCCASION_REMINDER_PRESETS } from '@/constants/occasionReminders';
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
    typeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      letterSpacing: 0.6,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 6,
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
  const [showCreditSheet, setShowCreditSheet] = useState(false);
  const [showWarrantySheet, setShowWarrantySheet] = useState(false);
  const [showSubscriptionSheet, setShowSubscriptionSheet] = useState(false);
  const [showOccasionSheet, setShowOccasionSheet] = useState(false);
  const [showDocumentSheet, setShowDocumentSheet] = useState(false);

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

          {/* Credits */}
          <Text style={styles.typeLabel}>{t('notificationSettings.credits').toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => notificationsEnabled && setShowCreditSheet(true)}
            accessibilityRole="button"
          >
            <Ionicons name="card-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.reminderBefore')}
              </Text>
            </View>
            <Text style={styles.rowSubtitle}>{reminderLabel(creditReminderDays)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Ionicons name="calendar-clear-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.lastDayAlert')}
              </Text>
            </View>
            <Switch
              style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
              value={creditLastDayAlert}
              onValueChange={setCreditLastDayAlert}
              disabled={!notificationsEnabled}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.sectionSeparator} />

          {/* Warranties */}
          <Text style={styles.typeLabel}>{t('notificationSettings.warranties').toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => notificationsEnabled && setShowWarrantySheet(true)}
            accessibilityRole="button"
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.reminderBefore')}
              </Text>
            </View>
            <Text style={styles.rowSubtitle}>{reminderLabel(warrantyReminderDays)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Ionicons name="calendar-clear-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.lastDayAlert')}
              </Text>
            </View>
            <Switch
              style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
              value={warrantyLastDayAlert}
              onValueChange={setWarrantyLastDayAlert}
              disabled={!notificationsEnabled}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.sectionSeparator} />

          {/* Subscriptions */}
          <Text style={styles.typeLabel}>{t('notificationSettings.subscriptions').toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => notificationsEnabled && setShowSubscriptionSheet(true)}
            accessibilityRole="button"
          >
            <Ionicons name="repeat-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.reminderBeforeBilling')}
              </Text>
            </View>
            <Text style={styles.rowSubtitle}>{subscriptionReminderLabel(subscriptionReminderDays)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Ionicons name="calendar-clear-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.lastDayBeforeBilling')}
              </Text>
            </View>
            <Switch
              style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
              value={subscriptionLastDayAlert}
              onValueChange={setSubscriptionLastDayAlert}
              disabled={!notificationsEnabled}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.sectionSeparator} />

          {/* Occasions */}
          <Text style={styles.typeLabel}>{t('notificationSettings.occasions').toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => notificationsEnabled && setShowOccasionSheet(true)}
            accessibilityRole="button"
          >
            <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.reminderBeforeOccasion')}
              </Text>
            </View>
            <Text style={styles.rowSubtitle}>{occasionReminderLabel(occasionEarlyReminderDays)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.onDayAlert')}
              </Text>
            </View>
            <Switch
              style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
              value={occasionOnDayAlert}
              onValueChange={setOccasionOnDayAlert}
              disabled={!notificationsEnabled}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.sectionSeparator} />

          {/* Documents */}
          <Text style={styles.typeLabel}>{t('notificationSettings.documents').toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => notificationsEnabled && setShowDocumentSheet(true)}
            accessibilityRole="button"
          >
            <Ionicons name="documents-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.reminderBeforeExpiry')}
              </Text>
            </View>
            <Text style={styles.rowSubtitle}>{documentReminderLabel(documentReminderDays)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Ionicons name="calendar-clear-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, !notificationsEnabled && styles.rowLabelDisabled]}>
                {t('notificationSettings.expiryDayAlert')}
              </Text>
            </View>
            <Switch
              style={{ transform: [{ scaleX: Platform.OS === 'ios' && isRTL ? -1 : 1 }] }}
              value={documentExpiryAlert}
              onValueChange={setDocumentExpiryAlert}
              disabled={!notificationsEnabled}
              trackColor={{ false: colors.separator, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
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

      {/* Notification Time bottom sheet */}
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

      {/* Credit Reminder bottom sheet */}
      <Modal visible={showCreditSheet} transparent animationType="slide" onRequestClose={() => setShowCreditSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCreditSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('notificationSettings.sheetTitleCredit')}</Text>
          {REMINDER_PRESETS.map((preset, index) => (
            <View key={preset.days}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => { setCreditReminderDays(preset.days); setShowCreditSheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: creditReminderDays === preset.days }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{reminderLabel(preset.days)}</Text>
                </View>
                {creditReminderDays === preset.days && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < REMINDER_PRESETS.length - 1 && <View style={styles.optionSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Warranty Reminder bottom sheet */}
      <Modal visible={showWarrantySheet} transparent animationType="slide" onRequestClose={() => setShowWarrantySheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowWarrantySheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('notificationSettings.sheetTitleWarranty')}</Text>
          {REMINDER_PRESETS.map((preset, index) => (
            <View key={preset.days}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => { setWarrantyReminderDays(preset.days); setShowWarrantySheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: warrantyReminderDays === preset.days }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{reminderLabel(preset.days)}</Text>
                </View>
                {warrantyReminderDays === preset.days && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < REMINDER_PRESETS.length - 1 && <View style={styles.optionSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Subscription Reminder bottom sheet */}
      <Modal visible={showSubscriptionSheet} transparent animationType="slide" onRequestClose={() => setShowSubscriptionSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowSubscriptionSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('notificationSettings.sheetTitleSubscription')}</Text>
          {SUBSCRIPTION_REMINDER_PRESETS.map((preset, index) => (
            <View key={preset.days}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => { setSubscriptionReminderDays(preset.days); setShowSubscriptionSheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: subscriptionReminderDays === preset.days }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{subscriptionReminderLabel(preset.days)}</Text>
                </View>
                {subscriptionReminderDays === preset.days && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < SUBSCRIPTION_REMINDER_PRESETS.length - 1 && <View style={styles.optionSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Document Reminder bottom sheet */}
      <Modal visible={showDocumentSheet} transparent animationType="slide" onRequestClose={() => setShowDocumentSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDocumentSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('notificationSettings.sheetTitleDocument')}</Text>
          {[0, 7, 14, 30, 90].map((days, index, arr) => (
            <View key={days}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => { setDocumentReminderDays(days); setShowDocumentSheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: documentReminderDays === days }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{documentReminderLabel(days)}</Text>
                </View>
                {documentReminderDays === days && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < arr.length - 1 && <View style={styles.optionSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Occasion Early Reminder bottom sheet */}
      <Modal visible={showOccasionSheet} transparent animationType="slide" onRequestClose={() => setShowOccasionSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowOccasionSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('notificationSettings.sheetTitleOccasion')}</Text>
          {OCCASION_REMINDER_PRESETS.map((preset, index) => (
            <View key={preset.days}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => { setOccasionEarlyReminderDays(preset.days); setShowOccasionSheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: occasionEarlyReminderDays === preset.days }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionLabel}>{occasionReminderLabel(preset.days)}</Text>
                </View>
                {occasionEarlyReminderDays === preset.days && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < OCCASION_REMINDER_PRESETS.length - 1 && <View style={styles.optionSeparator} />}
            </View>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
