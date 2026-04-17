import { updateBadgeCount, getCreditIdFromNotification } from '@/lib/notifications';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import * as Notifications from 'expo-notifications';

// ---------------------------------------------------------------------------
// Mock expo-notifications
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCredit(overrides: Partial<Credit> = {}): Credit {
  return {
    id: 'credit-1',
    userId: 'user-1',
    storeName: 'Zara',
    amount: 5000,
    category: 'Clothing',
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

  beforeEach(() => {
    setBadgeCountAsync.mockReset();
  });

  it('sets badge to 0 when there are no credits', async () => {
    await updateBadgeCount([]);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it('sets badge to 0 when all credits expire after 7 days', async () => {
    const credits = [
      makeCredit({ expirationDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) }),
      makeCredit({ expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
    ];
    await updateBadgeCount(credits);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it('counts credits expiring within 7 days', async () => {
    const credits = [
      makeCredit({ expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }),  // in 3d ✓
      makeCredit({ expirationDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) }),  // in 6d ✓
      makeCredit({ expirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }), // in 10d ✗
    ];
    await updateBadgeCount(credits);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(2);
  });

  it('excludes REDEEMED credits from badge count', async () => {
    const credits = [
      makeCredit({
        expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: CreditStatus.REDEEMED,
      }),
      makeCredit({ expirationDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) }),
    ];
    await updateBadgeCount(credits);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(1);
  });

  it('counts a credit expiring exactly at the 7-day boundary', async () => {
    // Expiring in exactly 7 days (≤ 7 days from now)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    // Subtract a few seconds to ensure it's <= boundary
    sevenDaysFromNow.setSeconds(sevenDaysFromNow.getSeconds() - 1);

    const credits = [makeCredit({ expirationDate: sevenDaysFromNow })];
    await updateBadgeCount(credits);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(1);
  });

  it('handles a mix of active and redeemed credits across ranges', async () => {
    const credits = [
      makeCredit({ id: '1', expirationDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) }), // active, within 7d ✓
      makeCredit({ id: '2', expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }), // active, within 7d ✓
      makeCredit({ id: '3', expirationDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) }), // active, beyond 7d ✗
      makeCredit({ id: '4', expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: CreditStatus.REDEEMED }), // redeemed ✗
    ];
    await updateBadgeCount(credits);
    expect(setBadgeCountAsync).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// getCreditIdFromNotification
// ---------------------------------------------------------------------------

describe('getCreditIdFromNotification', () => {
  function makeResponse(data: Record<string, unknown>): Notifications.NotificationResponse {
    return {
      notification: {
        request: {
          content: { data },
        },
      },
    } as unknown as Notifications.NotificationResponse;
  }

  it('returns the creditId when present in notification data', () => {
    const response = makeResponse({ creditId: 'credit-abc' });
    expect(getCreditIdFromNotification(response)).toBe('credit-abc');
  });

  it('returns null when creditId is absent', () => {
    const response = makeResponse({});
    expect(getCreditIdFromNotification(response)).toBeNull();
  });

  it('returns null when data is undefined', () => {
    const response = makeResponse({ other: 'stuff' });
    expect(getCreditIdFromNotification(response)).toBeNull();
  });
});
