import { type Occasion } from '@/types/occasionTypes';
import { useSettingsStore } from '@/stores/settingsStore';
import { cancelNotification, scheduleNotificationAt, requestNotificationPermission } from './notifications';
import { getNextGregorianOccurrences, getNextHebrewOccurrences } from './hebrewDate';
import i18n from './i18n';

// ---------------------------------------------------------------------------
// Title builder
// ---------------------------------------------------------------------------

export function buildOccasionTitle(occasion: Occasion): string {
  const t = i18n.t.bind(i18n);
  switch (occasion.type) {
    case 'birthday':
      return t('occasions.notification.birthday', { name: occasion.name });
    case 'anniversary':
      return t('occasions.notification.anniversary', { name: occasion.name });
    case 'yahrzeit':
      return t('occasions.notification.yahrzeit', { name: occasion.name });
    case 'other':
      return t('occasions.notification.other', { label: occasion.customLabel ?? '', name: occasion.name });
  }
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/**
 * Schedules notifications for the next 5 annual occurrences.
 * Returns the scheduled notification IDs.
 */
export async function scheduleOccasionNotifications(
  occasion: Occasion
): Promise<string[]> {
  const settings = useSettingsStore.getState();
  if (!settings.notificationsEnabled) return [];

  const granted = await requestNotificationPermission();
  if (!granted) return [];

  const { notificationHour, notificationMinute, occasionOnDayAlert, occasionEarlyReminderDays } = settings;
  if (!occasionOnDayAlert && occasionEarlyReminderDays === 0) return [];

  const eventDate = occasion.eventDate as Date;
  const dates = occasion.useHebrewDate && occasion.hebrewDay != null && occasion.hebrewMonth != null
    ? getNextHebrewOccurrences(occasion.hebrewDay, occasion.hebrewMonth, 5)
    : getNextGregorianOccurrences(eventDate.getMonth(), eventDate.getDate(), 5);

  const title = buildOccasionTitle(occasion);
  const ids: string[] = [];

  for (const date of dates) {
    // On-day notification
    if (occasionOnDayAlert) {
      const trigger = new Date(date);
      trigger.setHours(notificationHour, notificationMinute, 0, 0);
      const id = await scheduleNotificationAt(trigger, title, '', { occasionId: occasion.id });
      if (id) ids.push(id);
    }

    // Early reminder (N days before)
    if (occasionEarlyReminderDays > 0) {
      const early = new Date(date);
      early.setDate(early.getDate() - occasionEarlyReminderDays);
      early.setHours(notificationHour, notificationMinute, 0, 0);
      const id = await scheduleNotificationAt(early, title, '', { occasionId: occasion.id });
      if (id) ids.push(id);
    }
  }

  return ids;
}

/**
 * Cancels all scheduled notifications for an occasion.
 */
export async function cancelOccasionNotifications(
  notificationIds?: string[]
): Promise<void> {
  if (!notificationIds?.length) return;
  await Promise.all(notificationIds.map((id) => cancelNotification(id)));
}
