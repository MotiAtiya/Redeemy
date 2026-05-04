import { updateBadgeCount, getCreditIdFromNotification } from '@/lib/notifications';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import * as Notifications from 'expo-notifications';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('@/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      creditReminderDays: 7,
      notificationsEnabled: true,
      notificationHour: 9,
      notificationMinute: 0,
      currency: 'ILS',
      creditLastDayAlert: true,
      appIconBadge: true,
    })),
  },
  CURRENCY_SYMBOLS: { ILS: '₪', USD: '$', EUR: '€', GBP: '£' },
}));

jest.mock('@/lib/i18n', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

function makeCredit(overrides: Partial<Credit> = {}): Credit {
  return {
    id: 'credit-1',
    userId: 'user-1',
    storeName: 'Zara',
    amount: 5000,
    category: 'Clothing',
    expirationDate: new Date(Date.now() + 30 * DAY),
    reminderDays: 7,
    status: CreditStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// updateBadgeCount
// ---------------------------------------------------------------------------

describe('updateBadgeCount', () => {
  const setBadgeCountAsync = Notifications.setBadgeCountAsync as jest.Mock;

  beforeEach(() => setBadgeCountAsync.mockReset());

  it('sets badge to 0 when there are no credits', async () => {
    await updateBadgeCount([]);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it('sets badge to 0 when all credits expire after the reminder window', async () => {
    await updateBadgeCount([
      makeCredit({ expirationDate: new Date(Date.now() + 8 * DAY) }),
      makeCredit({ expirationDate: new Date(Date.now() + 30 * DAY) }),
    ]);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it('counts credits expiring within 7 days', async () => {
    await updateBadgeCount([
      makeCredit({ expirationDate: new Date(Date.now() + 3 * DAY) }),  // ✓
      makeCredit({ expirationDate: new Date(Date.now() + 6 * DAY) }),  // ✓
      makeCredit({ expirationDate: new Date(Date.now() + 10 * DAY) }), // ✗
    ]);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(2);
  });

  it('excludes REDEEMED credits from badge count', async () => {
    await updateBadgeCount([
      makeCredit({ expirationDate: new Date(Date.now() + 3 * DAY), status: CreditStatus.REDEEMED }),
      makeCredit({ expirationDate: new Date(Date.now() + 4 * DAY) }),
    ]);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(1);
  });

  it('counts a credit expiring exactly at the boundary', async () => {
    const boundary = new Date();
    boundary.setDate(boundary.getDate() + 7);
    boundary.setSeconds(boundary.getSeconds() - 1);
    await updateBadgeCount([makeCredit({ expirationDate: boundary })]);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(1);
  });

  it('handles a mix of statuses and ranges', async () => {
    await updateBadgeCount([
      makeCredit({ id: '1', expirationDate: new Date(Date.now() + 1 * DAY) }),  // ✓
      makeCredit({ id: '2', expirationDate: new Date(Date.now() + 5 * DAY) }),  // ✓
      makeCredit({ id: '3', expirationDate: new Date(Date.now() + 20 * DAY) }), // ✗ too far
      makeCredit({ id: '4', expirationDate: new Date(Date.now() + 2 * DAY), status: CreditStatus.REDEEMED }), // ✗ redeemed
    ]);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// getCreditIdFromNotification
// ---------------------------------------------------------------------------

describe('getCreditIdFromNotification', () => {
  function makeResponse(data: Record<string, unknown>): Notifications.NotificationResponse {
    return {
      notification: { request: { content: { data } } },
    } as unknown as Notifications.NotificationResponse;
  }

  it('returns the creditId when present', () => {
    expect(getCreditIdFromNotification(makeResponse({ creditId: 'credit-abc' }))).toBe('credit-abc');
  });

  it('returns null when creditId is absent', () => {
    expect(getCreditIdFromNotification(makeResponse({}))).toBeNull();
  });

  it('returns null for unrelated data', () => {
    expect(getCreditIdFromNotification(makeResponse({ other: 'stuff' }))).toBeNull();
  });
});
