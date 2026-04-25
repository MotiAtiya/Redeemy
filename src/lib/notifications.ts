import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { formatCurrency } from './formatCurrency';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import i18n from './i18n';

// ---------------------------------------------------------------------------
// Handler — show notification when app is in foreground
// ---------------------------------------------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Requests notification permission. Returns true if granted.
 * Call before scheduling the first notification.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // expo-modules-core PermissionResponse type not resolving transitively;
  // cast to access the well-documented .granted field at runtime.
  const existing = (await Notifications.getPermissionsAsync()) as unknown as { granted: boolean };
  if (existing.granted) return true;

  const result = (await Notifications.requestPermissionsAsync()) as unknown as { granted: boolean };
  return result.granted;
}

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

/**
 * Schedules a single notification at a specific date.
 * Returns the notification ID, or null if the date is in the past.
 */
export async function scheduleNotificationAt(
  date: Date,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  if (date <= new Date()) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/**
 * Schedules a local notification for a credit/warranty reminder.
 * If `existingNotificationId` is provided, cancels it first.
 *
 * Returns { reminderId, expiryId } — both may be null if disabled/past.
 */
export async function scheduleReminderNotification(
  credit: Pick<Credit, 'id' | 'storeName' | 'amount' | 'expirationDate'>,
  reminderDays: number,
  lastDayEnabled: boolean,
  existingNotificationId?: string,
  existingExpirationNotificationId?: string,
): Promise<{ reminderId: string | null; expiryId: string | null }> {
  if (!credit.expirationDate) return { reminderId: null, expiryId: null };
  if (!useSettingsStore.getState().notificationsEnabled) return { reminderId: null, expiryId: null };

  const granted = await requestNotificationPermission();
  if (!granted) return { reminderId: null, expiryId: null };

  const t = i18n.t.bind(i18n);
  const { notificationHour, notificationMinute, currency } = useSettingsStore.getState();
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  // Cancel existing notifications before re-scheduling
  await cancelNotification(existingNotificationId);
  await cancelNotification(existingExpirationNotificationId);

  // --- Reminder notification (X days before expiration, at user's preferred time) ---
  const triggerDate = new Date(credit.expirationDate);
  triggerDate.setDate(triggerDate.getDate() - reminderDays);
  triggerDate.setHours(notificationHour, notificationMinute, 0, 0);

  const reminderId = await scheduleNotificationAt(
    triggerDate,
    t('notifications.reminder.title'),
    t('notifications.reminder.body', {
      storeName: credit.storeName,
      amount: formatCurrency(credit.amount, currencySymbol),
      days: reminderDays,
    }),
    { creditId: credit.id },
  );

  // --- Expiration-day notification (at configured time on the expiration date) ---
  const expiryTrigger = new Date(credit.expirationDate);
  expiryTrigger.setHours(notificationHour, notificationMinute, 0, 0);

  const expiryId = lastDayEnabled
    ? await scheduleNotificationAt(
        expiryTrigger,
        t('notifications.expiry.title'),
        t('notifications.expiry.body', {
          storeName: credit.storeName,
          amount: formatCurrency(credit.amount, currencySymbol),
        }),
        { creditId: credit.id },
      )
    : null;

  return { reminderId, expiryId };
}

/**
 * Cancels a scheduled notification by ID. Safe to call with undefined.
 */
export async function cancelNotification(
  notificationId: string | undefined
): Promise<void> {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancels both the reminder and expiration-day notifications for a credit.
 */
export async function cancelCreditNotifications(
  notificationId: string | undefined,
  expirationNotificationId: string | undefined,
): Promise<void> {
  await Promise.all([
    cancelNotification(notificationId),
    cancelNotification(expirationNotificationId),
  ]);
}

/**
 * Cancels ALL scheduled notifications (used when user disables notifications).
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Re-schedules notifications for all active credits (used when user re-enables notifications).
 * Uses global credit reminder settings from the settings store.
 */
export async function rescheduleAllNotifications(
  credits: Pick<Credit, 'id' | 'storeName' | 'amount' | 'expirationDate' | 'notificationId' | 'expirationNotificationId'>[]
): Promise<void> {
  const { creditReminderDays, creditLastDayAlert } = useSettingsStore.getState();
  for (const credit of credits) {
    await scheduleReminderNotification(credit, creditReminderDays, creditLastDayAlert, credit.notificationId, credit.expirationNotificationId);
  }
}

// ---------------------------------------------------------------------------
// Badge count
// ---------------------------------------------------------------------------

/**
 * Updates the app icon badge to show the number of credits expiring within
 * 7 days. Call whenever creditsStore changes.
 */
export async function updateBadgeCount(credits: Credit[]): Promise<void> {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const count = credits.filter(
    (c) =>
      c.status === CreditStatus.ACTIVE &&
      c.expirationDate != null && new Date(c.expirationDate) <= sevenDaysFromNow
  ).length;

  await Notifications.setBadgeCountAsync(count);
}

// ---------------------------------------------------------------------------
// iOS notification actions (snooze)
// ---------------------------------------------------------------------------

const SNOOZE_CATEGORY_ID = 'CREDIT_EXPIRY';

export async function registerNotificationCategories(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  await Notifications.setNotificationCategoryAsync(SNOOZE_CATEGORY_ID, [
    { identifier: 'SNOOZE_1D', buttonTitle: 'Remind in 1 Day', options: {} },
    { identifier: 'SNOOZE_3D', buttonTitle: 'Remind in 3 Days', options: {} },
    { identifier: 'SNOOZE_1W', buttonTitle: 'Remind in 1 Week', options: {} },
  ]);
}

// ---------------------------------------------------------------------------
// Deep-link handler — navigate to credit/[id] when notification is tapped
// ---------------------------------------------------------------------------

/**
 * Returns the creditId from a notification response, if present.
 */
export function getCreditIdFromNotification(
  response: Notifications.NotificationResponse
): string | null {
  return (response.notification.request.content.data?.creditId as string) ?? null;
}
