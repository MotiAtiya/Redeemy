import {
  scheduleSubscriptionNotifications,
  cancelSubscriptionNotifications,
  getSubscriptionIdFromNotification,
  isRenewalPromptNotification,
} from '@/lib/subscriptionNotifications';
import { SubscriptionBillingCycle } from '@/types/subscriptionTypes';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  requestNotificationPermission,
  cancelNotification,
  scheduleNotificationAt,
} from '@/lib/notifications';
import { getNextBillingDate } from '@/lib/subscriptionUtils';

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

jest.mock('@/lib/subscriptionUtils', () => ({
  getNextBillingDate: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FUTURE_DATE = new Date(Date.now() + 30 * 86_400_000);
const COMMIT_END = new Date(Date.now() + 90 * 86_400_000);
const YESTERDAY = new Date(Date.now() - 86_400_000);

const defaultSettings = {
  notificationsEnabled: true,
  notificationHour: 9,
  notificationMinute: 0,
  subscriptionReminderDays: 7,
  subscriptionLastDayAlert: true,
};

type SubInput = Parameters<typeof scheduleSubscriptionNotifications>[0];

function makeSub(overrides: Partial<SubInput> = {}): SubInput {
  return {
    id: 'sub-1',
    serviceName: 'Netflix',
    billingCycle: SubscriptionBillingCycle.ANNUAL,
    billingDayOfMonth: undefined,
    nextBillingDate: FUTURE_DATE,
    renewalType: 'auto',
    isFree: false,
    hasFixedPeriod: false,
    commitmentEndDate: undefined,
    freeReviewReminderMonths: 6,
    registrationDate: YESTERDAY,
    isFreeTrial: false,
    specialPeriodType: undefined,
    specialPeriodUnit: undefined,
    specialPeriodMonths: undefined,
    specialPeriodDays: undefined,
    trialEndsDate: undefined,
    reminderSpecialPeriodEnabled: false,
    ...overrides,
  };
}

function makeNotifResponse(data: Record<string, unknown>) {
  return {
    notification: {
      request: {
        content: { data },
      },
    },
  } as never;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  (useSettingsStore.getState as jest.Mock).mockReturnValue({ ...defaultSettings });
  (requestNotificationPermission as jest.Mock).mockResolvedValue(true);
  let counter = 0;
  (scheduleNotificationAt as jest.Mock).mockImplementation(() =>
    Promise.resolve(`notif-${++counter}`)
  );
  (cancelNotification as jest.Mock).mockResolvedValue(undefined);
  (getNextBillingDate as jest.Mock).mockReturnValue(FUTURE_DATE);
});

// ---------------------------------------------------------------------------
// scheduleSubscriptionNotifications — guard conditions
// ---------------------------------------------------------------------------

describe('scheduleSubscriptionNotifications — disabled/denied', () => {
  it('returns empty when notificationsEnabled=false', async () => {
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      ...defaultSettings,
      notificationsEnabled: false,
    });
    const result = await scheduleSubscriptionNotifications(makeSub());
    expect(result).toEqual({ notificationIds: [] });
    expect(scheduleNotificationAt).not.toHaveBeenCalled();
  });

  it('returns empty when permission is denied', async () => {
    (requestNotificationPermission as jest.Mock).mockResolvedValue(false);
    const result = await scheduleSubscriptionNotifications(makeSub());
    expect(result).toEqual({ notificationIds: [] });
    expect(scheduleNotificationAt).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// scheduleSubscriptionNotifications — periodic review (free / monthly no-fixed)
// ---------------------------------------------------------------------------

describe('scheduleSubscriptionNotifications — periodic review', () => {
  it('free subscription: schedules one review reminder', async () => {
    const result = await scheduleSubscriptionNotifications(
      makeSub({ isFree: true })
    );
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(1);
    expect(result.notificationIds).toHaveLength(1);
    expect(result.renewalNotificationId).toBeUndefined();
  });

  it('monthly with hasFixedPeriod=false: schedules one review reminder', async () => {
    const result = await scheduleSubscriptionNotifications(
      makeSub({
        billingCycle: SubscriptionBillingCycle.MONTHLY,
        hasFixedPeriod: false,
        billingDayOfMonth: 15,
      })
    );
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(1);
    expect(result.notificationIds).toHaveLength(1);
  });

  it('does not treat monthly with hasFixedPeriod=undefined as periodic review', async () => {
    await scheduleSubscriptionNotifications(
      makeSub({
        billingCycle: SubscriptionBillingCycle.MONTHLY,
        hasFixedPeriod: undefined,
        billingDayOfMonth: 15,
        renewalType: 'auto',
      })
    );
    // Not periodic review → schedules billing reminders (not review reminder)
    expect(getNextBillingDate).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// scheduleSubscriptionNotifications — auto renewal
// ---------------------------------------------------------------------------

describe('scheduleSubscriptionNotifications — auto renewal', () => {
  it('schedules N-days-before reminder + renewal notification when subscriptionLastDayAlert=true', async () => {
    const result = await scheduleSubscriptionNotifications(makeSub());
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(2);
    expect(result.notificationIds).toHaveLength(1);
    expect(result.renewalNotificationId).toBeDefined();
  });

  it('only schedules N-days-before reminder when subscriptionLastDayAlert=false', async () => {
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      ...defaultSettings,
      subscriptionLastDayAlert: false,
    });
    const result = await scheduleSubscriptionNotifications(makeSub());
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(1);
    expect(result.notificationIds).toHaveLength(1);
    expect(result.renewalNotificationId).toBeUndefined();
  });

  it('skips N-days-before reminder when subscriptionReminderDays=0', async () => {
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      ...defaultSettings,
      subscriptionReminderDays: 0,
      subscriptionLastDayAlert: true,
    });
    const result = await scheduleSubscriptionNotifications(makeSub());
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(1); // only renewal
    expect(result.notificationIds).toHaveLength(0);
    expect(result.renewalNotificationId).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// scheduleSubscriptionNotifications — manual renewal
// ---------------------------------------------------------------------------

describe('scheduleSubscriptionNotifications — manual renewal', () => {
  it('schedules N-days-before + 1-day-before reminders', async () => {
    const result = await scheduleSubscriptionNotifications(
      makeSub({ renewalType: 'manual' })
    );
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(2);
    expect(result.notificationIds).toHaveLength(2);
    expect(result.renewalNotificationId).toBeUndefined();
  });

  it('schedules only 1-day-before when subscriptionReminderDays=0', async () => {
    (useSettingsStore.getState as jest.Mock).mockReturnValue({
      ...defaultSettings,
      subscriptionReminderDays: 0,
    });
    const result = await scheduleSubscriptionNotifications(
      makeSub({ renewalType: 'manual' })
    );
    expect(scheduleNotificationAt).toHaveBeenCalledTimes(1);
    expect(result.notificationIds).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// scheduleSubscriptionNotifications — monthly with fixed commitment period
// ---------------------------------------------------------------------------

describe('scheduleSubscriptionNotifications — monthly fixed period', () => {
  it('uses commitmentEndDate as anchor (not getNextBillingDate)', async () => {
    await scheduleSubscriptionNotifications(
      makeSub({
        billingCycle: SubscriptionBillingCycle.MONTHLY,
        hasFixedPeriod: true,
        billingDayOfMonth: 15,
        commitmentEndDate: COMMIT_END,
        renewalType: 'auto',
      })
    );
    expect(getNextBillingDate).not.toHaveBeenCalled();
  });

  it('accepts commitmentEndDate as ISO string (Firestore serialization)', async () => {
    const result = await scheduleSubscriptionNotifications(
      makeSub({
        billingCycle: SubscriptionBillingCycle.MONTHLY,
        hasFixedPeriod: true,
        billingDayOfMonth: 15,
        commitmentEndDate: COMMIT_END.toISOString() as unknown as Date,
        renewalType: 'auto',
      })
    );
    expect(result.notificationIds.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// scheduleSubscriptionNotifications — special period
// ---------------------------------------------------------------------------

describe('scheduleSubscriptionNotifications — special period', () => {
  it('schedules specialPeriodNotificationId when reminderSpecialPeriodEnabled=true', async () => {
    const trialEnd = new Date(Date.now() + 14 * 86_400_000);
    const result = await scheduleSubscriptionNotifications(
      makeSub({
        reminderSpecialPeriodEnabled: true,
        trialEndsDate: trialEnd,
        specialPeriodUnit: 'months',
        specialPeriodMonths: 1,
      })
    );
    expect(result.specialPeriodNotificationId).toBeDefined();
  });

  it('uses 7 days before for months-based special period', async () => {
    const trialEnd = new Date(Date.now() + 30 * 86_400_000);
    await scheduleSubscriptionNotifications(
      makeSub({
        reminderSpecialPeriodEnabled: true,
        trialEndsDate: trialEnd,
        specialPeriodUnit: 'months',
        specialPeriodMonths: 1,
      })
    );
    const firstCall = (scheduleNotificationAt as jest.Mock).mock.calls[0];
    const scheduledDate: Date = firstCall[0];
    const expectedDate = new Date(trialEnd);
    expectedDate.setDate(expectedDate.getDate() - 7);
    expect(scheduledDate.getDate()).toBe(expectedDate.getDate());
  });

  it('caps days-based special period lead time at min(floor(days/2), 3)', async () => {
    const trialEnd = new Date(Date.now() + 10 * 86_400_000);
    await scheduleSubscriptionNotifications(
      makeSub({
        reminderSpecialPeriodEnabled: true,
        trialEndsDate: trialEnd,
        specialPeriodUnit: 'days',
        specialPeriodDays: 6, // floor(6/2)=3, min(3,3)=3 → 3 days before
      })
    );
    const firstCall = (scheduleNotificationAt as jest.Mock).mock.calls[0];
    const scheduledDate: Date = firstCall[0];
    const expectedDate = new Date(trialEnd);
    expectedDate.setDate(expectedDate.getDate() - 3);
    expect(scheduledDate.getDate()).toBe(expectedDate.getDate());
  });

  it('uses at least 1 day before for very short day-based periods', async () => {
    const trialEnd = new Date(Date.now() + 5 * 86_400_000);
    await scheduleSubscriptionNotifications(
      makeSub({
        reminderSpecialPeriodEnabled: true,
        trialEndsDate: trialEnd,
        specialPeriodUnit: 'days',
        specialPeriodDays: 1, // floor(1/2)=0, max(0,1)=1 → 1 day before
      })
    );
    const firstCall = (scheduleNotificationAt as jest.Mock).mock.calls[0];
    const scheduledDate: Date = firstCall[0];
    const expectedDate = new Date(trialEnd);
    expectedDate.setDate(expectedDate.getDate() - 1);
    expect(scheduledDate.getDate()).toBe(expectedDate.getDate());
  });

  it('does not schedule special period notification when reminderSpecialPeriodEnabled=false', async () => {
    const result = await scheduleSubscriptionNotifications(
      makeSub({
        reminderSpecialPeriodEnabled: false,
        trialEndsDate: new Date(Date.now() + 14 * 86_400_000),
      })
    );
    expect(result.specialPeriodNotificationId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// cancelSubscriptionNotifications
// ---------------------------------------------------------------------------

describe('cancelSubscriptionNotifications', () => {
  it('cancels all IDs in notificationIds', async () => {
    await cancelSubscriptionNotifications({
      notificationIds: ['id-1', 'id-2'],
    });
    expect(cancelNotification).toHaveBeenCalledWith('id-1');
    expect(cancelNotification).toHaveBeenCalledWith('id-2');
  });

  it('cancels renewalNotificationId if present', async () => {
    await cancelSubscriptionNotifications({
      notificationIds: [],
      renewalNotificationId: 'renewal-1',
    });
    expect(cancelNotification).toHaveBeenCalledWith('renewal-1');
  });

  it('cancels specialPeriodNotificationId if present', async () => {
    await cancelSubscriptionNotifications({
      notificationIds: [],
      specialPeriodNotificationId: 'special-1',
    });
    expect(cancelNotification).toHaveBeenCalledWith('special-1');
  });

  it('handles empty notificationIds without error', async () => {
    await expect(
      cancelSubscriptionNotifications({ notificationIds: [] })
    ).resolves.toBeUndefined();
    expect(cancelNotification).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getSubscriptionIdFromNotification
// ---------------------------------------------------------------------------

describe('getSubscriptionIdFromNotification', () => {
  it('returns subscriptionId when type is subscription', () => {
    const response = makeNotifResponse({ subscriptionId: 'sub-42', type: 'subscription' });
    expect(getSubscriptionIdFromNotification(response)).toBe('sub-42');
  });

  it('returns null when type is not subscription', () => {
    const response = makeNotifResponse({ subscriptionId: 'sub-42', type: 'credit' });
    expect(getSubscriptionIdFromNotification(response)).toBeNull();
  });

  it('returns null when data is missing', () => {
    const response = makeNotifResponse({});
    expect(getSubscriptionIdFromNotification(response)).toBeNull();
  });

  it('returns null when subscriptionId is missing but type matches', () => {
    const response = makeNotifResponse({ type: 'subscription' });
    expect(getSubscriptionIdFromNotification(response)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isRenewalPromptNotification
// ---------------------------------------------------------------------------

describe('isRenewalPromptNotification', () => {
  it('returns true when notificationType is renewal', () => {
    const response = makeNotifResponse({ type: 'subscription', notificationType: 'renewal' });
    expect(isRenewalPromptNotification(response)).toBe(true);
  });

  it('returns true when intent is renew', () => {
    const response = makeNotifResponse({ type: 'subscription', intent: 'renew' });
    expect(isRenewalPromptNotification(response)).toBe(true);
  });

  it('returns false when type is not subscription', () => {
    const response = makeNotifResponse({ type: 'credit', notificationType: 'renewal' });
    expect(isRenewalPromptNotification(response)).toBe(false);
  });

  it('returns false when neither intent nor notificationType matches', () => {
    const response = makeNotifResponse({ type: 'subscription' });
    expect(isRenewalPromptNotification(response)).toBe(false);
  });
});
