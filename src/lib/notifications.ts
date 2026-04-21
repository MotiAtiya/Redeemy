import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import type { Subscription } from '@/types/subscriptionTypes';
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
// Schedule
// ---------------------------------------------------------------------------

/**
 * Schedules a local notification for a credit reminder.
 * If `existingNotificationId` is provided, cancels it first.
 *
 * Returns { reminderId, expiryId } — both may be null if disabled/past.
 */
export async function scheduleReminderNotification(
  credit: Pick<Credit, 'id' | 'storeName' | 'amount' | 'expirationDate' | 'reminderDays'>,
  existingNotificationId?: string,
  existingExpirationNotificationId?: string,
): Promise<{ reminderId: string | null; expiryId: string | null }> {
  if (!credit.expirationDate) return { reminderId: null, expiryId: null };
  if (!useSettingsStore.getState().notificationsEnabled) return { reminderId: null, expiryId: null };

  const granted = await requestNotificationPermission();
  if (!granted) return { reminderId: null, expiryId: null };

  const t = i18n.t.bind(i18n);
  const now = new Date();
  const { notificationHour, notificationMinute, expiryNotificationEnabled, currency } = useSettingsStore.getState();
  const currencySymbol = CURRENCY_SYMBOLS[currency];

  // Cancel existing notifications before re-scheduling
  await cancelNotification(existingNotificationId);
  await cancelNotification(existingExpirationNotificationId);

  // --- Reminder notification (X days before expiration, at user's preferred time) ---
  const triggerDate = new Date(credit.expirationDate);
  triggerDate.setDate(triggerDate.getDate() - credit.reminderDays);
  triggerDate.setHours(notificationHour, notificationMinute, 0, 0);

  let reminderId: string | null = null;
  if (triggerDate > now) {
    reminderId = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifications.reminder.title'),
        body: t('notifications.reminder.body', {
          storeName: credit.storeName,
          amount: formatCurrency(credit.amount, currencySymbol),
          days: credit.reminderDays,
        }),
        data: { creditId: credit.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }

  // --- Expiration-day notification (at configured time on the expiration date) ---
  const expiryTrigger = new Date(credit.expirationDate);
  expiryTrigger.setHours(notificationHour, notificationMinute, 0, 0);

  let expiryId: string | null = null;
  if (expiryNotificationEnabled && expiryTrigger > now) {
    expiryId = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifications.expiry.title'),
        body: t('notifications.expiry.body', {
          storeName: credit.storeName,
          amount: formatCurrency(credit.amount, currencySymbol),
        }),
        data: { creditId: credit.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: expiryTrigger,
      },
    });
  }

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
 */
export async function rescheduleAllNotifications(
  credits: Pick<Credit, 'id' | 'storeName' | 'amount' | 'expirationDate' | 'reminderDays' | 'notificationId' | 'expirationNotificationId'>[]
): Promise<void> {
  for (const credit of credits) {
    await scheduleReminderNotification(credit, credit.notificationId, credit.expirationNotificationId);
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

/**
 * Schedules a single notification for a monthly subscription commitment end.
 * Fires reminderDays before commitmentEndDate. Returns the notification ID or null.
 */
export async function scheduleSubscriptionCommitmentNotification(
  sub: Pick<Subscription, 'id' | 'serviceName' | 'reminderDays' | 'commitmentEndDate'>,
  existingNotificationId?: string,
): Promise<string | null> {
  if (!sub.commitmentEndDate) return null;
  if (!useSettingsStore.getState().notificationsEnabled) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  await cancelNotification(existingNotificationId);

  const t = i18n.t.bind(i18n);
  const { notificationHour, notificationMinute } = useSettingsStore.getState();
  const triggerDate = new Date(sub.commitmentEndDate);
  triggerDate.setDate(triggerDate.getDate() - sub.reminderDays);
  triggerDate.setHours(notificationHour, notificationMinute, 0, 0);

  if (triggerDate <= new Date()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: t('notifications.subscription.title'),
      body: t('notifications.subscription.body', {
        serviceName: sub.serviceName,
        days: sub.reminderDays,
      }),
      data: { subscriptionId: sub.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}
