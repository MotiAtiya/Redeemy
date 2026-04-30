import * as Notifications from 'expo-notifications';
import { SubscriptionBillingCycle, type Subscription } from '@/types/subscriptionTypes';
import { useSettingsStore } from '@/stores/settingsStore';
import i18n from './i18n';
import { getNextBillingDate } from './subscriptionUtils';
import { cancelNotification, scheduleNotificationAt } from './notifications';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduledSubscriptionNotifications {
  notificationIds: string[];
  renewalNotificationId?: string;
  specialPeriodNotificationId?: string;
}

type SchedulableSub = Pick<
  Subscription,
  | 'id'
  | 'serviceName'
  | 'billingCycle'
  | 'billingDayOfMonth'
  | 'nextBillingDate'
  | 'renewalType'
  | 'isFree'
  | 'hasFixedPeriod'
  | 'commitmentEndDate'
  | 'freeReviewReminderMonths'
  | 'registrationDate'
  | 'isFreeTrial'
  | 'specialPeriodType'
  | 'specialPeriodUnit'
  | 'specialPeriodMonths'
  | 'specialPeriodDays'
  | 'trialEndsDate'
  | 'reminderSpecialPeriodEnabled'
>;

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

/**
 * Schedules notifications for a subscription based on its type:
 *
 * Free subscription:
 *   → 1 review reminder N months from now
 *
 * Paid — auto renewal (default):
 *   → reminder N days before billing
 *   → on-day renewal notification
 *
 * Paid — manual renewal:
 *   → reminder N days before billing
 *   → reminder 1 day before billing
 *
 * Special period (if reminderSpecialPeriodEnabled):
 *   → reminder 7 days before special period ends
 */
export async function scheduleSubscriptionNotifications(
  sub: SchedulableSub,
): Promise<ScheduledSubscriptionNotifications> {
  const empty: ScheduledSubscriptionNotifications = { notificationIds: [] };
  if (!useSettingsStore.getState().notificationsEnabled) return empty;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return empty;

  const t = i18n.t.bind(i18n);
  const { notificationHour, notificationMinute, subscriptionReminderDays, subscriptionLastDayAlert } = useSettingsStore.getState();
  const result: ScheduledSubscriptionNotifications = { notificationIds: [] };

  // Periodic review reminder: free subscriptions + monthly with no fixed period
  const isPeriodicReview =
    sub.isFree ||
    (sub.billingCycle === SubscriptionBillingCycle.MONTHLY && sub.hasFixedPeriod === false);

  if (isPeriodicReview) {
    const months = sub.freeReviewReminderMonths ?? 6;
    // Anchor to registrationDate; advance by `months` intervals until it's in the future
    const anchor = sub.registrationDate instanceof Date
      ? sub.registrationDate
      : sub.registrationDate
      ? new Date(sub.registrationDate as unknown as string)
      : new Date();
    const now = new Date();
    const reminderDate = new Date(anchor);
    reminderDate.setMonth(reminderDate.getMonth() + months);
    while (reminderDate <= now) {
      reminderDate.setMonth(reminderDate.getMonth() + months);
    }
    reminderDate.setHours(notificationHour, notificationMinute, 0, 0);
    const id = await scheduleNotificationAt(
      reminderDate,
      t('notifications.subscription.freeReview.title'),
      t('notifications.subscription.freeReview.body', { serviceName: sub.serviceName }),
      { subscriptionId: sub.id, type: 'subscription' },
    );
    if (id) result.notificationIds.push(id);
    return result;
  }

  // Special period end reminder (smart timing: min(floor(duration/2), 7) days before)
  if (sub.reminderSpecialPeriodEnabled && sub.trialEndsDate) {
    const endDate = sub.trialEndsDate instanceof Date
      ? sub.trialEndsDate
      : new Date(sub.trialEndsDate as unknown as string);

    // For days-based short trials, use at most half the duration as lead time
    let daysBefore = 7;
    if (sub.specialPeriodUnit === 'days' && sub.specialPeriodDays) {
      daysBefore = Math.max(1, Math.min(Math.floor(sub.specialPeriodDays / 2), 3));
    }

    const reminderDate = new Date(endDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    reminderDate.setHours(notificationHour, notificationMinute, 0, 0);
    const id = await scheduleNotificationAt(
      reminderDate,
      t('notifications.subscription.specialPeriodEnd.title'),
      t('notifications.subscription.specialPeriodEnd.body', { serviceName: sub.serviceName }),
      { subscriptionId: sub.id, type: 'subscription' },
    );
    if (id) result.specialPeriodNotificationId = id;
  }

  // Compute billing trigger date.
  // Monthly with a fixed commitment: notify before the commitment end date, not before each
  // intermediate billing day. Annual and manual-no-fixed: use the next billing date as usual.
  let anchorDate: Date;
  if (
    sub.billingCycle === SubscriptionBillingCycle.MONTHLY &&
    sub.hasFixedPeriod &&
    sub.commitmentEndDate
  ) {
    anchorDate = sub.commitmentEndDate instanceof Date
      ? sub.commitmentEndDate
      : new Date(sub.commitmentEndDate as unknown as string);
  } else {
    anchorDate = getNextBillingDate(sub as Subscription);
  }
  const billingTriggerDate = new Date(anchorDate);
  billingTriggerDate.setHours(notificationHour, notificationMinute, 0, 0);

  const dayBefore = new Date(billingTriggerDate);
  dayBefore.setDate(dayBefore.getDate() - 1);

  const isManual = sub.renewalType === 'manual';

  if (isManual) {
    // Manual renewal: remind N days before + 1 day before
    if (subscriptionReminderDays > 0) {
      const reminderBefore = new Date(billingTriggerDate);
      reminderBefore.setDate(reminderBefore.getDate() - subscriptionReminderDays);
      const firstId = await scheduleNotificationAt(
        reminderBefore,
        t('notifications.subscription.manual.title'),
        t('notifications.subscription.manual.body', { serviceName: sub.serviceName, days: subscriptionReminderDays }),
        { subscriptionId: sub.id, type: 'subscription' },
      );
      if (firstId) result.notificationIds.push(firstId);
    }

    const secondId = await scheduleNotificationAt(
      dayBefore,
      t('notifications.subscription.manual.title'),
      t('notifications.subscription.manual.body', { serviceName: sub.serviceName, days: 1 }),
      { subscriptionId: sub.id, type: 'subscription' },
    );
    if (secondId) result.notificationIds.push(secondId);
  } else {
    // Auto renewal: remind N days before + (optionally) 1 day before renewal
    if (subscriptionReminderDays > 0) {
      const reminderBefore = new Date(billingTriggerDate);
      reminderBefore.setDate(reminderBefore.getDate() - subscriptionReminderDays);
      const reminderId = await scheduleNotificationAt(
        reminderBefore,
        t('notifications.subscription.auto.reminder.title'),
        t('notifications.subscription.auto.reminder.body', { serviceName: sub.serviceName, days: subscriptionReminderDays }),
        { subscriptionId: sub.id, type: 'subscription' },
      );
      if (reminderId) result.notificationIds.push(reminderId);
    }

    if (subscriptionLastDayAlert) {
      const renewalId = await scheduleNotificationAt(
        dayBefore,
        t('notifications.subscription.auto.renewal.title'),
        t('notifications.subscription.auto.renewal.body', { serviceName: sub.serviceName }),
        { subscriptionId: sub.id, type: 'subscription', notificationType: 'renewal' },
      );
      if (renewalId) result.renewalNotificationId = renewalId;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

/**
 * Cancels all scheduled notifications for a subscription.
 */
export async function cancelSubscriptionNotifications(
  sub: Pick<Subscription, 'notificationIds' | 'renewalNotificationId' | 'specialPeriodNotificationId'>,
): Promise<void> {
  const ids = sub.notificationIds ?? [];
  await Promise.all(ids.map((id) => cancelNotification(id)));
  if (sub.renewalNotificationId) await cancelNotification(sub.renewalNotificationId);
  if (sub.specialPeriodNotificationId) await cancelNotification(sub.specialPeriodNotificationId);
}

// ---------------------------------------------------------------------------
// Deep-link helpers
// ---------------------------------------------------------------------------

/**
 * Extracts `subscriptionId` from a notification response, or null if not a subscription payload.
 */
export function getSubscriptionIdFromNotification(
  response: Notifications.NotificationResponse,
): string | null {
  const data = response.notification.request.content.data as
    | { subscriptionId?: string; type?: string }
    | undefined;
  if (!data || data.type !== 'subscription') return null;
  return data.subscriptionId ?? null;
}

/**
 * Returns true if a notification response is an auto-renewal on-billing-day notification.
 * Used by the detail screen to show an "עדכן סכום" inline prompt.
 */
export function isRenewalPromptNotification(
  response: Notifications.NotificationResponse,
): boolean {
  const data = response.notification.request.content.data as
    | { subscriptionId?: string; type?: string; intent?: string; notificationType?: string }
    | undefined;
  return (
    data?.type === 'subscription' &&
    (data?.intent === 'renew' || data?.notificationType === 'renewal')
  );
}
