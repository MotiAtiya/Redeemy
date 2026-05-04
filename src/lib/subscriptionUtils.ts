import { SubscriptionBillingCycle, SubscriptionStatus, type Subscription } from '@/types/subscriptionTypes';

/**
 * Computes the next billing date for a subscription.
 * ANNUAL: returns nextBillingDate directly.
 * MONTHLY: finds the next occurrence of billingDayOfMonth from today.
 */
/**
 * Returns the last day of the given year/month (0-indexed month).
 */
function lastDayOf(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getNextBillingDate(sub: Subscription): Date {
  if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL) {
    return sub.nextBillingDate ?? new Date();
  }
  // MONTHLY: find next occurrence of billingDayOfMonth, clamped to the actual
  // last day of the month (e.g. billing on 31st → Feb 28/29, Apr 30, etc.)
  const today = new Date();
  const day = sub.billingDayOfMonth ?? 1;
  const yr = today.getFullYear();
  const mo = today.getMonth();
  const candidate = new Date(yr, mo, Math.min(day, lastDayOf(yr, mo)));
  if (candidate <= today) {
    // Billing day already passed this month — compute next month correctly
    const nextMo = mo + 1 > 11 ? 0 : mo + 1;
    const nextYr = mo + 1 > 11 ? yr + 1 : yr;
    return new Date(nextYr, nextMo, Math.min(day, lastDayOf(nextYr, nextMo)));
  }
  return candidate;
}

/**
 * Returns days until next billing event (rounded up).
 * Returns 0 if billing is today or in the past.
 */
export function daysUntilBilling(sub: Subscription): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const next = getNextBillingDate(sub);
  return Math.max(0, Math.ceil((next.getTime() - Date.now()) / msPerDay));
}

/**
 * Returns days until the subscription itself ends, rounded up.
 * - Free trial → trialEndsDate
 * - MONTHLY with a commitment → commitmentEndDate
 * - ANNUAL → nextBillingDate (end of the current annual term)
 * - Otherwise falls back to the next billing date.
 */
export function daysUntilSubscriptionEnd(sub: Subscription): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const endDate: Date | undefined = (() => {
    if (sub.isFreeTrial && sub.trialEndsDate) return sub.trialEndsDate;
    if (sub.billingCycle === SubscriptionBillingCycle.MONTHLY && sub.commitmentEndDate) {
      return sub.commitmentEndDate instanceof Date
        ? sub.commitmentEndDate
        : new Date(sub.commitmentEndDate as unknown as string);
    }
    if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL && sub.nextBillingDate) {
      return sub.nextBillingDate instanceof Date
        ? sub.nextBillingDate
        : new Date(sub.nextBillingDate as unknown as string);
    }
    return undefined;
  })();
  if (!endDate) return daysUntilBilling(sub);
  return Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / msPerDay));
}

// ---------------------------------------------------------------------------
// Badge / reminder info
// ---------------------------------------------------------------------------

export type ReminderType = 'trial' | 'discounted' | 'review' | 'renews' | 'expires';

export interface ReminderInfo {
  days: number;
  type: ReminderType;
}

/**
 * Returns the relevant "next event" for the subscription badge:
 *
 * 1. Still in trial/discounted period → time until it ends
 * 2. Free or monthly no-fixed → time until next periodic review reminder
 * 3. Auto-renewing (fixed/annual) → time until next billing (badge says "מתחדש")
 * 4. Manual renewal → time until next billing (badge says "פג")
 */
export function getNextReminderInfo(sub: Subscription): ReminderInfo {
  const msPerDay = 1000 * 60 * 60 * 24;
  const now = Date.now();

  // 1. In special period?
  if (sub.trialEndsDate) {
    const trialEnd = sub.trialEndsDate instanceof Date
      ? sub.trialEndsDate
      : new Date(sub.trialEndsDate as unknown as string);
    if (trialEnd.getTime() > now) {
      const days = Math.max(0, Math.ceil((trialEnd.getTime() - now) / msPerDay));
      return { days, type: sub.specialPeriodType === 'discounted' ? 'discounted' : 'trial' };
    }
  }

  // 2. Free or monthly no-fixed → periodic review reminder
  if (sub.isFree || sub.hasFixedPeriod === false) {
    const months = sub.freeReviewReminderMonths ?? 6;
    const anchor = sub.registrationDate instanceof Date
      ? sub.registrationDate
      : sub.registrationDate
        ? new Date(sub.registrationDate as unknown as string)
        : new Date();
    const reminderDate = new Date(anchor);
    reminderDate.setMonth(reminderDate.getMonth() + months);
    while (reminderDate.getTime() <= now) {
      reminderDate.setMonth(reminderDate.getMonth() + months);
    }
    const days = Math.max(0, Math.ceil((reminderDate.getTime() - now) / msPerDay));
    return { days, type: 'review' };
  }

  // 3. Manual renewal → expires at commitmentEndDate (if set), else nextBillingDate
  if (sub.renewalType === 'manual') {
    const expiryDate = sub.commitmentEndDate
      ? (sub.commitmentEndDate instanceof Date
          ? sub.commitmentEndDate
          : new Date(sub.commitmentEndDate as unknown as string))
      : getNextBillingDate(sub);
    const days = Math.max(0, Math.ceil((expiryDate.getTime() - now) / msPerDay));
    return { days, type: 'expires' };
  }

  // 4. Auto-renewing → next billing date
  const nextDate = getNextBillingDate(sub);
  const days = Math.max(0, Math.ceil((nextDate.getTime() - now) / msPerDay));
  return { days, type: 'renews' };
}

/**
 * Normalizes subscription amount to monthly agorot.
 * Free subscriptions return 0.
 */
export function normalizeToMonthlyAgorot(sub: Subscription): number {
  if (sub.isFree) return 0;
  if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL) {
    return Math.round(sub.amountAgorot / 12);
  }
  return sub.amountAgorot;
}

/**
 * Sums all active non-free subscriptions normalized to monthly agorot.
 */
export function computeMonthlyTotal(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.status === SubscriptionStatus.ACTIVE && !s.isFree)
    .reduce((acc, s) => acc + normalizeToMonthlyAgorot(s), 0);
}

/**
 * Returns a map of currency code → monthly agorot for all active non-free subscriptions.
 * e.g. { ILS: 15000, USD: 1700 }
 */
export function computeMonthlyTotalByCurrency(
  subscriptions: Subscription[]
): Partial<Record<string, number>> {
  const result: Partial<Record<string, number>> = {};
  for (const s of subscriptions) {
    if (s.status !== SubscriptionStatus.ACTIVE || s.isFree) continue;
    const code = s.currency ?? 'ILS';
    result[code] = (result[code] ?? 0) + normalizeToMonthlyAgorot(s);
  }
  return result;
}

/**
 * Computes the commitment end date for a monthly subscription.
 * firstBillingDate + commitmentMonths months (with day clamping).
 */
export function computeCommitmentEndDate(firstBillingDate: Date, commitmentMonths: number): Date {
  const end = new Date(firstBillingDate);
  end.setMonth(end.getMonth() + commitmentMonths);
  return end;
}

/**
 * Advances a subscription's billing cycle by one period after the billing date has passed.
 *
 * For ANNUAL: nextBillingDate moves +1 year.
 * For MONTHLY: the billing date is derived from billingDayOfMonth at read-time, so we
 * don't mutate any stored date — we only reset notificationIds so the caller re-schedules.
 *
 * Returns a patch suitable for `updateSubscription(sub.id, patch)`.
 * Returns null when no advance is needed (nextBillingDate still in the future / missing data).
 */
export function advanceBillingCycle(sub: Subscription): Partial<Subscription> | null {
  const now = Date.now();
  if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL) {
    if (!sub.nextBillingDate) return null;
    const current = sub.nextBillingDate instanceof Date
      ? sub.nextBillingDate
      : new Date(sub.nextBillingDate as unknown as string);
    if (current.getTime() > now) return null;
    const next = new Date(current);
    next.setFullYear(next.getFullYear() + 1);
    return {
      nextBillingDate: next,
      notificationIds: [],
      renewalNotificationId: undefined,
    };
  }
  // MONTHLY — only advance if current billing day has already passed this cycle.
  if (!sub.billingDayOfMonth) return null;
  const today = new Date();
  const day = sub.billingDayOfMonth;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const thisMonthBillingDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    Math.min(day, lastDay),
  );
  // Only trigger when we're past the billing date for the current month.
  if (thisMonthBillingDate > today) return null;
  return {
    notificationIds: [],
    renewalNotificationId: undefined,
  };
}

/**
 * Checks whether a free trial has ended (today ≥ trialEndsDate).
 * Returns a patch that converts the subscription to a paid subscription:
 *   isFree, isFreeTrial → false
 *   amountAgorot → priceAfterTrialAgorot
 * nextBillingDate advances one month from trialEndsDate (for ANNUAL callers adapt as needed).
 * Returns null when not applicable.
 */
export function endFreeTrialIfDue(sub: Subscription): Partial<Subscription> | null {
  if (!sub.isFreeTrial || !sub.trialEndsDate || !sub.priceAfterTrialAgorot) return null;
  const trialEnd = sub.trialEndsDate instanceof Date
    ? sub.trialEndsDate
    : new Date(sub.trialEndsDate as unknown as string);
  if (trialEnd.getTime() > Date.now()) return null;
  const nextBilling = new Date(trialEnd);
  nextBilling.setMonth(nextBilling.getMonth() + 1);
  const patch: Partial<Subscription> = {
    isFree: false,
    isFreeTrial: false,
    amountAgorot: sub.priceAfterTrialAgorot,
    notificationIds: [],
    renewalNotificationId: undefined,
  };
  if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL) {
    patch.nextBillingDate = nextBilling;
  }
  return patch;
}

/**
 * True iff this subscription is manual-renewal + active + already past
 * its current billing date AND the user hasn't yet confirmed renewal for
 * the current cycle.
 *
 * For ANNUAL subs the "current billing date" is the stored `nextBillingDate`.
 * For MONTHLY subs the current billing date is `billingDayOfMonth` of this
 * calendar month — and we use `lastRenewalConfirmedAt` to remember whether
 * the user already clicked "I renewed" for this cycle (otherwise the prompt
 * would re-appear every render even after confirmation).
 *
 * Auto-renewal subs are unaffected (always returns false).
 */
export function subscriptionNeedsRenewalConfirmation(sub: Subscription): boolean {
  if (sub.renewalType !== 'manual') return false;
  if (sub.status !== SubscriptionStatus.ACTIVE) return false;

  if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL) {
    if (!sub.nextBillingDate) return false;
    const next = sub.nextBillingDate instanceof Date
      ? sub.nextBillingDate
      : new Date(sub.nextBillingDate as unknown as string);
    return next.getTime() <= Date.now();
  }

  if (sub.billingCycle === SubscriptionBillingCycle.MONTHLY) {
    if (!sub.billingDayOfMonth) return false;
    const today = new Date();
    const day = sub.billingDayOfMonth;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const thisMonthBillingDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      Math.min(day, lastDay),
    );
    // Billing day for this month hasn't arrived yet → no prompt.
    if (thisMonthBillingDate > today) return false;

    // The user is implicitly "paid up" through one of these signals, in priority:
    //   1. Explicit confirmation via the prompt (lastRenewalConfirmedAt)
    //   2. The subscription's createdAt — adding a sub means "I'm paid up now"
    // (We deliberately do NOT use updatedAt — it changes for many unrelated edits
    //  like notes/reminder tweaks; treating those as renewal would suppress the
    //  prompt forever.)
    const candidateRaw = sub.lastRenewalConfirmedAt ?? sub.createdAt;
    if (candidateRaw) {
      const candidate = candidateRaw instanceof Date
        ? candidateRaw
        : new Date(candidateRaw as unknown as string);
      if (candidate.getTime() >= thisMonthBillingDate.getTime()) return false;
    }
    return true;
  }

  return false;
}
