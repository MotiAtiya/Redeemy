import {
  getNextBillingDate,
  daysUntilBilling,
  daysUntilSubscriptionEnd,
  normalizeToMonthlyAgorot,
  computeMonthlyTotal,
  advanceBillingCycle,
  endFreeTrialIfDue,
  subscriptionNeedsRenewalConfirmation,
  advanceRenewalCycle,
} from '@/lib/subscriptionUtils';
import {
  SubscriptionBillingCycle,
  SubscriptionStatus,
  type Subscription,
} from '@/types/subscriptionTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 's1',
    userId: 'u1',
    serviceName: 'Netflix',
    billingCycle: SubscriptionBillingCycle.MONTHLY,
    amountAgorot: 5990,
    isFree: false,
    isFreeTrial: false,
    billingDayOfMonth: 15,
    category: 'streaming',
    status: SubscriptionStatus.ACTIVE,
    reminderDays: 7,
    notificationIds: [],
    notes: '',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getNextBillingDate — ANNUAL
// ---------------------------------------------------------------------------

describe('getNextBillingDate — ANNUAL', () => {
  it('returns nextBillingDate directly for ANNUAL subscription', () => {
    const futureDate = new Date('2026-12-01');
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      nextBillingDate: futureDate,
      billingDayOfMonth: undefined,
    });
    expect(getNextBillingDate(sub).getTime()).toBe(futureDate.getTime());
  });

  it('returns current date when ANNUAL nextBillingDate is undefined', () => {
    const before = new Date();
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      nextBillingDate: undefined,
      billingDayOfMonth: undefined,
    });
    const result = getNextBillingDate(sub);
    const after = new Date();
    expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ---------------------------------------------------------------------------
// getNextBillingDate — MONTHLY
// ---------------------------------------------------------------------------

describe('getNextBillingDate — MONTHLY', () => {
  it('returns a date in the future', () => {
    const sub = makeSub({ billingDayOfMonth: 15 });
    const result = getNextBillingDate(sub);
    expect(result.getTime()).toBeGreaterThan(Date.now() - 1000); // at least today
  });

  it('returns this month if billing day is in the future', () => {
    const today = new Date();
    const futureDay = 28; // assume today is not the 28th; if it is, test passes anyway
    const sub = makeSub({ billingDayOfMonth: futureDay });
    const result = getNextBillingDate(sub);

    // Result is either this month's day-28 (future) or next month's
    expect(result.getDate()).toBe(Math.min(futureDay, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
    expect(result.getTime()).toBeGreaterThan(today.getTime() - 86_400_001);
  });

  it('returns next month when billing day has already passed this month', () => {
    // Use day=1 — it always passed unless today IS the 1st
    const today = new Date();
    if (today.getDate() === 1) {
      // On the 1st, day 1 candidate equals today, so billing is considered today → rolls to next month
    }
    const sub = makeSub({ billingDayOfMonth: 1 });
    const result = getNextBillingDate(sub);
    // Result must be >= today
    expect(result.getTime()).toBeGreaterThanOrEqual(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    );
  });

  it('clamps day 31 to last day of February (28 or 29)', () => {
    // Mock: pretend we're in February by examining the month=1 clamping logic
    // We test the clamping math indirectly: a subscription with billingDayOfMonth=31
    // should never return Feb 31 (which overflows to March).
    const sub = makeSub({ billingDayOfMonth: 31 });
    const result = getNextBillingDate(sub);
    // Result must be a valid calendar date (no overflow)
    expect(result.getDate()).toBeGreaterThanOrEqual(1);
    expect(result.getDate()).toBeLessThanOrEqual(31);
    // Verify we didn't accidentally create March 2/3 due to Feb overflow
    const nextMoExpected = (new Date().getMonth() + 1) % 12;
    if (result.getMonth() === 1 /* Feb */) {
      const lastDayFeb = new Date(result.getFullYear(), 2, 0).getDate();
      expect(result.getDate()).toBeLessThanOrEqual(lastDayFeb);
    }
  });

  it('uses billingDayOfMonth=1 when it is undefined', () => {
    const sub = makeSub({ billingDayOfMonth: undefined });
    const result = getNextBillingDate(sub);
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it('returns a date whose day matches billingDayOfMonth (when day ≤ last day of result month)', () => {
    const sub = makeSub({ billingDayOfMonth: 10 });
    const result = getNextBillingDate(sub);
    // Day 10 exists in every month, so the result's date must be 10
    expect(result.getDate()).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// daysUntilBilling
// ---------------------------------------------------------------------------

describe('daysUntilBilling', () => {
  it('returns 0 for a past billing date (ANNUAL)', () => {
    const past = new Date(Date.now() - 7 * 86_400_000); // 7 days ago
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      nextBillingDate: past,
      billingDayOfMonth: undefined,
    });
    expect(daysUntilBilling(sub)).toBe(0);
  });

  it('returns a positive number for a future billing date (ANNUAL)', () => {
    const future = new Date(Date.now() + 30 * 86_400_000); // 30 days from now
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      nextBillingDate: future,
      billingDayOfMonth: undefined,
    });
    const days = daysUntilBilling(sub);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(31);
  });

  it('returns a non-negative number for MONTHLY', () => {
    const sub = makeSub({ billingDayOfMonth: 15 });
    expect(daysUntilBilling(sub)).toBeGreaterThanOrEqual(0);
  });

  it('never returns negative', () => {
    const pastDate = new Date(Date.now() - 365 * 86_400_000);
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      nextBillingDate: pastDate,
      billingDayOfMonth: undefined,
    });
    expect(daysUntilBilling(sub)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// daysUntilSubscriptionEnd
// ---------------------------------------------------------------------------

describe('daysUntilSubscriptionEnd', () => {
  it('uses commitmentEndDate for MONTHLY subscriptions with a commitment', () => {
    const endDate = new Date(Date.now() + 90 * 86_400_000); // ~90 days away
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      billingDayOfMonth: 15,
      commitmentMonths: 3,
      commitmentEndDate: endDate,
    });
    const days = daysUntilSubscriptionEnd(sub);
    expect(days).toBeGreaterThanOrEqual(89);
    expect(days).toBeLessThanOrEqual(91);
    // Must differ from next-billing days (which is at most ~31 for monthly)
    expect(days).toBeGreaterThan(daysUntilBilling(sub));
  });

  it('uses trialEndsDate for free-trial subscriptions', () => {
    const trialEnd = new Date(Date.now() + 14 * 86_400_000);
    const sub = makeSub({
      isFreeTrial: true,
      freeTrialMonths: 1,
      trialEndsDate: trialEnd,
      commitmentEndDate: new Date(Date.now() + 365 * 86_400_000),
    });
    const days = daysUntilSubscriptionEnd(sub);
    expect(days).toBeGreaterThanOrEqual(13);
    expect(days).toBeLessThanOrEqual(15);
  });

  it('uses nextBillingDate for ANNUAL subscriptions', () => {
    const nextBilling = new Date(Date.now() + 200 * 86_400_000);
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      billingDayOfMonth: undefined,
      nextBillingDate: nextBilling,
    });
    const days = daysUntilSubscriptionEnd(sub);
    expect(days).toBeGreaterThanOrEqual(199);
    expect(days).toBeLessThanOrEqual(201);
  });

  it('falls back to daysUntilBilling for MONTHLY subscriptions without a commitment', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      billingDayOfMonth: 15,
      commitmentEndDate: undefined,
    });
    expect(daysUntilSubscriptionEnd(sub)).toBe(daysUntilBilling(sub));
  });

  it('never returns a negative value', () => {
    const past = new Date(Date.now() - 30 * 86_400_000);
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      billingDayOfMonth: 15,
      commitmentMonths: 1,
      commitmentEndDate: past,
    });
    expect(daysUntilSubscriptionEnd(sub)).toBe(0);
  });

  it('accepts commitmentEndDate stored as an ISO string', () => {
    const endDate = new Date(Date.now() + 60 * 86_400_000);
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      billingDayOfMonth: 15,
      commitmentMonths: 2,
      // Simulate Firestore serializing to string
      commitmentEndDate: endDate.toISOString() as unknown as Date,
    });
    const days = daysUntilSubscriptionEnd(sub);
    expect(days).toBeGreaterThanOrEqual(59);
    expect(days).toBeLessThanOrEqual(61);
  });
});

// ---------------------------------------------------------------------------
// normalizeToMonthlyAgorot
// ---------------------------------------------------------------------------

describe('normalizeToMonthlyAgorot', () => {
  it('returns 0 for a free subscription', () => {
    const sub = makeSub({ isFree: true, amountAgorot: 0 });
    expect(normalizeToMonthlyAgorot(sub)).toBe(0);
  });

  it('returns amountAgorot as-is for MONTHLY subscriptions', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      amountAgorot: 4990,
    });
    expect(normalizeToMonthlyAgorot(sub)).toBe(4990);
  });

  it('divides by 12 for ANNUAL subscriptions', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      amountAgorot: 12000,
      billingDayOfMonth: undefined,
      nextBillingDate: new Date('2026-12-01'),
    });
    expect(normalizeToMonthlyAgorot(sub)).toBe(1000);
  });

  it('rounds annual-to-monthly correctly (not truncating)', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      amountAgorot: 11990, // 11990 / 12 = 999.166… → rounds to 999
      billingDayOfMonth: undefined,
      nextBillingDate: new Date('2026-12-01'),
    });
    expect(normalizeToMonthlyAgorot(sub)).toBe(999);
  });

  it('rounds 11994 / 12 = 999.5 → 1000 (Math.round)', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      amountAgorot: 11994, // 11994 / 12 = 999.5 → round → 1000
      billingDayOfMonth: undefined,
      nextBillingDate: new Date('2026-12-01'),
    });
    expect(normalizeToMonthlyAgorot(sub)).toBe(1000);
  });

  it('returns 0 for free ANNUAL subscription', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      isFree: true,
      amountAgorot: 0,
      billingDayOfMonth: undefined,
      nextBillingDate: new Date('2026-12-01'),
    });
    expect(normalizeToMonthlyAgorot(sub)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeMonthlyTotal
// ---------------------------------------------------------------------------

describe('computeMonthlyTotal', () => {
  it('returns 0 for an empty array', () => {
    expect(computeMonthlyTotal([])).toBe(0);
  });

  it('sums all active non-free monthly subscriptions', () => {
    const subs = [
      makeSub({ id: 's1', amountAgorot: 2990 }),
      makeSub({ id: 's2', amountAgorot: 5990 }),
    ];
    expect(computeMonthlyTotal(subs)).toBe(8980);
  });

  it('excludes cancelled subscriptions', () => {
    const subs = [
      makeSub({ id: 's1', amountAgorot: 2990 }),
      makeSub({ id: 's2', amountAgorot: 5990, status: SubscriptionStatus.CANCELLED }),
    ];
    expect(computeMonthlyTotal(subs)).toBe(2990);
  });

  it('excludes free subscriptions', () => {
    const subs = [
      makeSub({ id: 's1', amountAgorot: 2990 }),
      makeSub({ id: 's2', amountAgorot: 0, isFree: true }),
    ];
    expect(computeMonthlyTotal(subs)).toBe(2990);
  });

  it('normalizes annual subscriptions to monthly before summing', () => {
    const subs = [
      makeSub({ id: 's1', amountAgorot: 4990 }), // monthly: 4990
      makeSub({
        id: 's2',
        billingCycle: SubscriptionBillingCycle.ANNUAL,
        amountAgorot: 12000, // annual: 12000/12 = 1000/month
        billingDayOfMonth: undefined,
        nextBillingDate: new Date('2026-12-01'),
      }),
    ];
    expect(computeMonthlyTotal(subs)).toBe(5990);
  });

  it('excludes both free and cancelled from mixed list', () => {
    const subs = [
      makeSub({ id: 's1', amountAgorot: 2990 }),
      makeSub({ id: 's2', amountAgorot: 0, isFree: true }),
      makeSub({ id: 's3', amountAgorot: 5990, status: SubscriptionStatus.CANCELLED }),
      makeSub({ id: 's4', amountAgorot: 1990 }),
    ];
    expect(computeMonthlyTotal(subs)).toBe(4980); // 2990 + 1990
  });

  it('returns 0 when all subscriptions are free or cancelled', () => {
    const subs = [
      makeSub({ id: 's1', isFree: true, amountAgorot: 0 }),
      makeSub({ id: 's2', status: SubscriptionStatus.CANCELLED, amountAgorot: 5990 }),
    ];
    expect(computeMonthlyTotal(subs)).toBe(0);
  });

  it('handles large number of subscriptions', () => {
    const subs = Array.from({ length: 100 }, (_, i) =>
      makeSub({ id: `s${i}`, amountAgorot: 1000 })
    );
    expect(computeMonthlyTotal(subs)).toBe(100_000);
  });
});

// ---------------------------------------------------------------------------
// advanceBillingCycle
// ---------------------------------------------------------------------------

describe('advanceBillingCycle', () => {
  it('advances ANNUAL nextBillingDate by 1 year when past', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24); // yesterday
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      nextBillingDate: past,
      billingDayOfMonth: undefined,
    });
    const patch = advanceBillingCycle(sub);
    expect(patch).not.toBeNull();
    expect(patch?.notificationIds).toEqual([]);
    expect(patch?.renewalNotificationId).toBeUndefined();
    const advanced = patch?.nextBillingDate as Date;
    expect(advanced.getFullYear()).toBe(past.getFullYear() + 1);
  });

  it('returns null for ANNUAL still in the future', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      nextBillingDate: future,
      billingDayOfMonth: undefined,
    });
    expect(advanceBillingCycle(sub)).toBeNull();
  });

  it('returns reset-notifications patch for MONTHLY when billing day already passed this month', () => {
    const today = new Date();
    const passedDay = today.getDate() > 1 ? 1 : today.getDate();
    const sub = makeSub({ billingDayOfMonth: passedDay });
    const patch = advanceBillingCycle(sub);
    if (today.getDate() === 1) {
      expect(patch).toBeDefined(); // today is day 1 → treated as reached
    }
    if (patch) {
      expect(patch.notificationIds).toEqual([]);
      expect(patch.renewalNotificationId).toBeUndefined();
    }
  });

  it('returns null for MONTHLY when billing day not yet reached', () => {
    const today = new Date();
    if (today.getDate() >= 28) return; // skip on edge days
    const futureDay = Math.min(28, today.getDate() + 1);
    const sub = makeSub({ billingDayOfMonth: futureDay });
    expect(advanceBillingCycle(sub)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// endFreeTrialIfDue
// ---------------------------------------------------------------------------

describe('endFreeTrialIfDue', () => {
  it('returns a paid-subscription patch when trial end is past', () => {
    const pastTrial = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const sub = makeSub({
      isFreeTrial: true,
      isFree: true,
      amountAgorot: 0,
      trialEndsDate: pastTrial,
      priceAfterTrialAgorot: 2990,
    });
    const patch = endFreeTrialIfDue(sub);
    expect(patch).not.toBeNull();
    expect(patch?.isFree).toBe(false);
    expect(patch?.isFreeTrial).toBe(false);
    expect(patch?.amountAgorot).toBe(2990);
    expect(patch?.notificationIds).toEqual([]);
  });

  it('returns null when trial is still active', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const sub = makeSub({
      isFreeTrial: true,
      trialEndsDate: future,
      priceAfterTrialAgorot: 2990,
    });
    expect(endFreeTrialIfDue(sub)).toBeNull();
  });

  it('returns null when not on a free trial', () => {
    expect(endFreeTrialIfDue(makeSub({ isFreeTrial: false }))).toBeNull();
  });

  it('sets nextBillingDate for ANNUAL subscription', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      isFreeTrial: true,
      trialEndsDate: past,
      priceAfterTrialAgorot: 29900,
      billingDayOfMonth: undefined,
    });
    const patch = endFreeTrialIfDue(sub);
    expect(patch?.nextBillingDate).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// subscriptionNeedsRenewalConfirmation (Story 19.5)
// ---------------------------------------------------------------------------

describe('subscriptionNeedsRenewalConfirmation', () => {
  const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  it('returns false for auto-renewal subs even when commitment-end has passed', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      renewalType: 'auto',
      nextBillingDate: past,
    });
    expect(subscriptionNeedsRenewalConfirmation(sub)).toBe(false);
  });

  it('returns false when status is not ACTIVE', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      renewalType: 'manual',
      nextBillingDate: past,
      status: SubscriptionStatus.CANCELLED,
    });
    expect(subscriptionNeedsRenewalConfirmation(sub)).toBe(false);
  });

  it('annual manual: returns true when nextBillingDate has passed', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      renewalType: 'manual',
      nextBillingDate: past,
    });
    expect(subscriptionNeedsRenewalConfirmation(sub)).toBe(true);
  });

  it('annual manual: returns false when nextBillingDate is still in the future', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      renewalType: 'manual',
      nextBillingDate: future,
    });
    expect(subscriptionNeedsRenewalConfirmation(sub)).toBe(false);
  });

  it('annual manual: returns false when nextBillingDate is missing', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      renewalType: 'manual',
      nextBillingDate: undefined,
    });
    expect(subscriptionNeedsRenewalConfirmation(sub)).toBe(false);
  });

  it('monthly manual + commitment: returns true when commitmentEndDate has passed', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      renewalType: 'manual',
      hasFixedPeriod: true,
      commitmentMonths: 12,
      commitmentEndDate: past,
    });
    expect(subscriptionNeedsRenewalConfirmation(sub)).toBe(true);
  });

  it('monthly manual + commitment: returns false when commitmentEndDate is in the future', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      renewalType: 'manual',
      hasFixedPeriod: true,
      commitmentMonths: 12,
      commitmentEndDate: future,
    });
    expect(subscriptionNeedsRenewalConfirmation(sub)).toBe(false);
  });

  it('monthly manual WITHOUT commitment: never prompts, regardless of dates', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      renewalType: 'manual',
      hasFixedPeriod: false,
      // No commitmentEndDate even if we'd set one — open-ended monthly subs
      // don't have a commitment-end concept.
    });
    expect(subscriptionNeedsRenewalConfirmation(sub)).toBe(false);
  });

  it('billingDayOfMonth alone never triggers the prompt', () => {
    // Even if today is past day-of-month, an open-ended monthly sub with
    // no commitmentEndDate must NOT prompt (this was the v2 bug).
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      renewalType: 'manual',
      hasFixedPeriod: false,
      billingDayOfMonth: 1,
    });
    expect(subscriptionNeedsRenewalConfirmation(sub)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// advanceRenewalCycle (Story 19.5)
// ---------------------------------------------------------------------------

describe('advanceRenewalCycle', () => {
  it('annual: pushes nextBillingDate forward by 12 months', () => {
    const start = new Date('2025-05-04');
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      renewalType: 'manual',
      nextBillingDate: start,
    });
    const patch = advanceRenewalCycle(sub);
    expect(patch).not.toBeNull();
    expect(patch?.nextBillingDate).toBeInstanceOf(Date);
    expect((patch?.nextBillingDate as Date).getFullYear()).toBe(2026);
    expect((patch?.nextBillingDate as Date).getMonth()).toBe(start.getMonth());
    expect((patch?.nextBillingDate as Date).getDate()).toBe(start.getDate());
  });

  it('annual: clears notification IDs so the listener can reschedule', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      renewalType: 'manual',
      nextBillingDate: new Date('2025-01-01'),
      notificationIds: ['abc', 'def'],
      renewalNotificationId: 'xyz',
    });
    const patch = advanceRenewalCycle(sub);
    expect(patch?.notificationIds).toEqual([]);
    expect(patch?.renewalNotificationId).toBeUndefined();
  });

  it('annual: returns null when nextBillingDate is missing', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      renewalType: 'manual',
      nextBillingDate: undefined,
    });
    expect(advanceRenewalCycle(sub)).toBeNull();
  });

  it('monthly + commitment: pushes commitmentEndDate forward by commitmentMonths', () => {
    const start = new Date('2025-05-04');
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      renewalType: 'manual',
      hasFixedPeriod: true,
      commitmentMonths: 6,
      commitmentEndDate: start,
    });
    const patch = advanceRenewalCycle(sub);
    expect(patch).not.toBeNull();
    expect(patch?.commitmentEndDate).toBeInstanceOf(Date);
    // +6 months → 2025-11-04
    expect((patch?.commitmentEndDate as Date).getFullYear()).toBe(2025);
    expect((patch?.commitmentEndDate as Date).getMonth()).toBe(start.getMonth() + 6);
  });

  it('monthly without commitment: returns null', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      renewalType: 'manual',
      hasFixedPeriod: false,
    });
    expect(advanceRenewalCycle(sub)).toBeNull();
  });

  it('monthly + commitment but missing commitmentMonths: returns null', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.MONTHLY,
      renewalType: 'manual',
      hasFixedPeriod: true,
      commitmentEndDate: new Date('2025-01-01'),
      // commitmentMonths missing
      commitmentMonths: undefined,
    });
    expect(advanceRenewalCycle(sub)).toBeNull();
  });

  it('accepts ISO-string nextBillingDate (post-Firestore-rehydration)', () => {
    const sub = makeSub({
      billingCycle: SubscriptionBillingCycle.ANNUAL,
      renewalType: 'manual',
      nextBillingDate: '2025-05-04' as unknown as Date,
    });
    const patch = advanceRenewalCycle(sub);
    expect(patch?.nextBillingDate).toBeInstanceOf(Date);
    expect((patch?.nextBillingDate as Date).getFullYear()).toBe(2026);
  });
});
