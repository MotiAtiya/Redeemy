import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { formatCurrency } from './formatCurrency';

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
 * Returns the new notificationId to persist on the Firestore document.
 * Returns null if permission is denied or the trigger date is in the past.
 */
export async function scheduleReminderNotification(
  credit: Pick<Credit, 'id' | 'storeName' | 'amount' | 'expirationDate' | 'reminderDays'>,
  existingNotificationId?: string
): Promise<string | null> {
  const granted = await requestNotificationPermission();
  if (!granted) return null;

  // Cancel old notification before re-scheduling
  if (existingNotificationId) {
    await cancelNotification(existingNotificationId);
  }

  // Trigger = expiration date minus reminderDays
  const triggerDate = new Date(credit.expirationDate);
  triggerDate.setDate(triggerDate.getDate() - credit.reminderDays);

  if (triggerDate <= new Date()) return null; // Trigger already passed

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Store Credit Expiring Soon!',
      body: `${credit.storeName} — ${formatCurrency(credit.amount)} expires in ${credit.reminderDays} day${credit.reminderDays !== 1 ? 's' : ''}`,
      data: { creditId: credit.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return notificationId;
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
      new Date(c.expirationDate) <= sevenDaysFromNow
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
