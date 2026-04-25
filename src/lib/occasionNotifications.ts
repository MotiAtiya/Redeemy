import { type Occasion } from '@/types/occasionTypes';
import { useSettingsStore } from '@/stores/settingsStore';
import { requestNotificationPermission, cancelNotification, scheduleNotificationAt } from './notifications';
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
  if (!useSettingsStore.getState().notificationsEnabled) return [];

  const granted = await requestNotificationPermission();
  if (!granted) return [];

  const { notificationHour, notificationMinute } = useSettingsStore.getState();
  const eventDate = occasion.eventDate as Date;

  const dates = occasion.useHebrewDate && occasion.hebrewDay != null && occasion.hebrewMonth != null
    ? getNextHebrewOccurrences(occasion.hebrewDay, occasion.hebrewMonth, 5)
    : getNextGregorianOccurrences(eventDate.getMonth(), eventDate.getDate(), 5);

  const title = buildOccasionTitle(occasion);
  const ids: string[] = [];

  for (const date of dates) {
    const trigger = new Date(date);
    trigger.setHours(notificationHour, notificationMinute, 0, 0);
    const id = await scheduleNotificationAt(trigger, title, '', { occasionId: occasion.id });
    if (id) ids.push(id);
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
