import * as Notifications from 'expo-notifications';
import { SubscriptionIntent, type Subscription } from '@/types/subscriptionTypes';
import { useSettingsStore } from '@/stores/settingsStore';
import i18n from './i18n';
import { getNextBillingDate } from './subscriptionUtils';
import { requestNotificationPermission, cancelNotification } from './notifications';

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

export interface ScheduledSubscriptionNotifications {
  notificationIds: string[];
  renewalNotificationId?: string;
}

type SchedulableSub = Pick<
  Subscription,
  | 'id'
  | 'serviceName'
  | 'intent'
  | 'reminderDays'
  | 'billingCycle'
  | 'billingDayOfMonth'
  | 'nextBillingDate'
>;

async function scheduleAt(
  date: Date,
  title: string,
  body: string,
  subscriptionId: string,
  intent?: string,
): Promise<string | null> {
  if (date <= new Date()) return null;
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { subscriptionId, type: 'subscription', ...(intent ? { intent } : {}) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

/**
 * Schedules intent-based notifications for a subscription.
 *
 * | Intent    | Notifications                                                    |
 * |-----------|------------------------------------------------------------------|
 * | RENEW     | 1 — on billing day ("התחדש ✓ — האם הסכום השתנה?")               |
 * | CANCEL    | 2 — reminderDays before + 1 day before                          |
 * | CHECK     | 1 — reminderDays before                                         |
 *
 * Caller is responsible for persisting the returned ids on the subscription doc.
 */
export async function scheduleSubscriptionNotifications(
  sub: SchedulableSub,
): Promise<ScheduledSubscriptionNotifications> {
  const empty: ScheduledSubscriptionNotifications = { notificationIds: [], renewalNotificationId: undefined };
  if (!useSettingsStore.getState().notificationsEnabled) return empty;
  const granted = await requestNotificationPermission();
  if (!granted) return empty;

  const t = i18n.t.bind(i18n);
  const { notificationHour, notificationMinute } = useSettingsStore.getState();

  const nextBilling = getNextBillingDate(sub as Subscription);
  const billingTriggerDate = new Date(nextBilling);
  billingTriggerDate.setHours(notificationHour, notificationMinute, 0, 0);

  const dayBefore = new Date(billingTriggerDate);
  dayBefore.setDate(dayBefore.getDate() - 1);

  const reminderBefore = new Date(billingTriggerDate);
  reminderBefore.setDate(reminderBefore.getDate() - Math.max(1, sub.reminderDays));

  const result: ScheduledSubscriptionNotifications = { notificationIds: [] };

  if (sub.intent === SubscriptionIntent.RENEW) {
    const id = await scheduleAt(
      billingTriggerDate,
      t('notifications.subscription.renew.title'),
      t('notifications.subscription.renew.body', { serviceName: sub.serviceName }),
      sub.id,
      'renew',
    );
    if (id) result.renewalNotificationId = id;
    return result;
  }

  if (sub.intent === SubscriptionIntent.CANCEL) {
    const firstId = await scheduleAt(
      reminderBefore,
      t('notifications.subscription.cancel.title'),
      t('notifications.subscription.cancel.body', { serviceName: sub.serviceName, days: sub.reminderDays }),
      sub.id,
    );
    if (firstId) result.notificationIds.push(firstId);
    const secondId = await scheduleAt(
      dayBefore,
      t('notifications.subscription.cancel.title'),
      t('notifications.subscription.cancel.body', { serviceName: sub.serviceName, days: 1 }),
      sub.id,
    );
    if (secondId) result.notificationIds.push(secondId);
    return result;
  }

  // CHECK
  const id = await scheduleAt(
    reminderBefore,
    t('notifications.subscription.check.title'),
    t('notifications.subscription.check.body', { serviceName: sub.serviceName, days: sub.reminderDays }),
    sub.id,
  );
  if (id) result.notificationIds.push(id);
  return result;
}

/**
 * Cancels all scheduled notifications for a subscription.
 */
export async function cancelSubscriptionNotifications(
  sub: Pick<Subscription, 'notificationIds' | 'renewalNotificationId'>,
): Promise<void> {
  const ids = sub.notificationIds ?? [];
  await Promise.all(ids.map((id) => cancelNotification(id)));
  if (sub.renewalNotificationId) await cancelNotification(sub.renewalNotificationId);
}

// ---------------------------------------------------------------------------
// Deep-link helper
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
 * Returns true if a notification response originated from a RENEW-intent on-billing notification.
 * Used by the detail screen to show an "עדכן סכום" inline prompt.
 */
export function isRenewalPromptNotification(
  response: Notifications.NotificationResponse,
): boolean {
  const data = response.notification.request.content.data as
    | { subscriptionId?: string; type?: string; intent?: string }
    | undefined;
  return data?.type === 'subscription' && data?.intent === 'renew';
}
