import {
  buildOccasionTitle,
  scheduleOccasionNotifications,
  cancelOccasionNotifications,
} from '@/lib/occasionNotifications';
import type { Occasion } from '@/types/occasionTypes';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  requestNotificationPermission,
  cancelNotification,
  scheduleNotificationAt,
} from '@/lib/notifications';
import { getNextGregorianOccurrences, getNextHebrewOccurrences } from '@/lib/hebrewDate';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: { getState: jest.fn() },
}));

jest.mock('@/lib/notifications', () => ({
  requestNotificationPermission: jest.fn(),
  cancelNotification: jest.fn(),
  scheduleNotificationAt: jest.fn(),
}));

jest.mock('@/lib/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock('@/lib/hebrewDate', () => ({
  getNextGregorianOccurrences: jest.fn(),
  getNextHebrewOccurrences: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultSettings = {
  notificationsEnabled: true,
  notificationHour: 9,
  notificationMinute: 0,
  occasionOnDayAlert: true,
  occasionEarlyReminderDays: 0,
};

function makeOccasion(overrides: Partial<Occasion> = {}): Occasion {
  return {
    id: 'occ-1',
    userId: 'user-1',
    type: 'birthday',
    name: 'אמא',
    eventDate: new Date(1990, 5, 15),
    afterSunset: false,
    useHebrewDate: false,
    notificationIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeFutureDates(count = 5): Date[] {
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.now() + (i + 1) * 365 * 86_400_000)
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (useSettingsStore.getState as jest.Mock).mockReturnValue({ ...defaultSettings });
  (requestNotificationPermission as jest.Mock).mockResolvedValue(true);
  let counter = 0;
  (scheduleNotificationAt as jest.Mock).mockImplementation(() =>
    Promise.resolve(`notif-${++counter}`)
  );
  (cancelNotification as jest.Mock).mockResolvedValue(undefined);
  (getNextGregorianOccurrences as jest.Mock).mockReturnValue(makeFutureDates());
  (getNextHebrewOccurrences as jest.Mock).mockReturnValue(makeFutureDates());
});

// ---------------------------------------------------------------------------
// buildOccasionTitle
// ---------------------------------------------------------------------------

describe('buildOccasionTitle', () => {
  it('returns birthday i18n key', () => {
    expect(buildOccasionTitle(makeOccasion({ type: 'birthday' }))).toBe(
      'occasions.notification.birthday'
    );
  });

  it('returns anniversary i18n key', () => {
    expect(buildOccasionTitle(makeOccasion({ type: 'anniversary' }))).toBe(
      'occasions.notification.anniversary'
    );
  });

  it('returns yahrzeit i18n key', () => {
    expect(buildOccasionTitle(makeOccasion({ type: 'yahrzeit' }))).toBe(
      'occasions.notification.yahrzeit'
    );
  });

  it('returns other i18n key for custom type', () => {
    expect(buildOccasionTitle(makeOccasion({ type: 'other', customLabel: 'יום עלייה' }))).toBe(
      'occasions.notification.other'
    );
  });
});

// ---------------------------------------------------------------------------
// scheduleOccasionNotifications — guard conditions
// ---------------------------------------------------------------------------

describe('scheduleOccasionNotifications — disabled/denied', () => {
  it('returns [] when notificationsEnabled=false', async () => {
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      ...defaultSettings,
      notificationsEnabled: false,
    });
    const ids = await scheduleOccasionNotifications(makeOccasion());
    expect(ids).toEqual([]);
    expect(scheduleNotificationAt).not.toHaveBeenCalled();
  });

  it('returns [] when permission is denied', async () => {
    (requestNotificationPermission as jest.Mock).mockResolvedValue(false);
    const ids = await scheduleOccasionNotifications(makeOccasion());
    expect(ids).toEqual([]);
    expect(scheduleNotificationAt).not.toHaveBeenCalled();
  });

  it('returns [] when both occasionOnDayAlert=false and occasionEarlyReminderDays=0', async () => {
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      ...defaultSettings,
      occasionOnDayAlert: false,
      occasionEarlyReminderDays: 0,
    });
    const ids = await scheduleOccasionNotifications(makeOccasion());
    expect(ids).toEqual([]);
    expect(scheduleNotificationAt).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// scheduleOccasionNotifications — Gregorian
// ---------------------------------------------------------------------------

describe('scheduleOccasionNotifications — Gregorian', () => {
  it('schedules 5 on-day notifications (one per year)', async () => {
    const ids = await scheduleOccasionNotifications(makeOccasion());
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(5);
    expect(ids).toHaveLength(5);
  });

  it('schedules 10 notifications when early reminder is also enabled', async () => {
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      ...defaultSettings,
      occasionOnDayAlert: true,
      occasionEarlyReminderDays: 7,
    });
    const ids = await scheduleOccasionNotifications(makeOccasion());
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(10); // 5 on-day + 5 early
    expect(ids).toHaveLength(10);
  });

  it('schedules only 5 early reminders when occasionOnDayAlert=false', async () => {
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      ...defaultSettings,
      occasionOnDayAlert: false,
      occasionEarlyReminderDays: 7,
    });
    const ids = await scheduleOccasionNotifications(makeOccasion());
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(5);
    expect(ids).toHaveLength(5);
  });

  it('uses getNextGregorianOccurrences for non-Hebrew occasions', async () => {
    await scheduleOccasionNotifications(makeOccasion({ useHebrewDate: false }));
    expect(getNextGregorianOccurrences).toHaveBeenCalled();
    expect(getNextHebrewOccurrences).not.toHaveBeenCalled();
  });

  it('passes the correct month and day to getNextGregorianOccurrences', async () => {
    const eventDate = new Date(1990, 5, 15); // June 15
    await scheduleOccasionNotifications(makeOccasion({ eventDate, useHebrewDate: false }));
    expect(getNextGregorianOccurrences).toHaveBeenCalledWith(5, 15, 5);
  });
});

// ---------------------------------------------------------------------------
// scheduleOccasionNotifications — Hebrew calendar
// ---------------------------------------------------------------------------

describe('scheduleOccasionNotifications — Hebrew calendar', () => {
  it('uses getNextHebrewOccurrences when useHebrewDate=true and hebrewDay/Month are set', async () => {
    await scheduleOccasionNotifications(
      makeOccasion({ useHebrewDate: true, hebrewDay: 1, hebrewMonth: 7 })
    );
    expect(getNextHebrewOccurrences).toHaveBeenCalledWith(1, 7, 5);
    expect(getNextGregorianOccurrences).not.toHaveBeenCalled();
  });

  it('falls back to Gregorian when useHebrewDate=true but hebrewDay/Month are missing', async () => {
    await scheduleOccasionNotifications(
      makeOccasion({ useHebrewDate: true, hebrewDay: undefined, hebrewMonth: undefined })
    );
    expect(getNextGregorianOccurrences).toHaveBeenCalled();
    expect(getNextHebrewOccurrences).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// cancelOccasionNotifications
// ---------------------------------------------------------------------------

describe('cancelOccasionNotifications', () => {
  it('cancels all provided notification IDs', async () => {
    await cancelOccasionNotifications(['id-1', 'id-2', 'id-3']);
    expect(cancelNotification).toHaveBeenCalledTimes(3);
    expect(cancelNotification).toHaveBeenCalledWith('id-1');
    expect(cancelNotification).toHaveBeenCalledWith('id-2');
    expect(cancelNotification).toHaveBeenCalledWith('id-3');
  });

  it('does nothing for an empty array', async () => {
    await cancelOccasionNotifications([]);
    expect(cancelNotification).not.toHaveBeenCalled();
  });

  it('does nothing when called with undefined', async () => {
    await cancelOccasionNotifications(undefined);
    expect(cancelNotification).not.toHaveBeenCalled();
  });
});
