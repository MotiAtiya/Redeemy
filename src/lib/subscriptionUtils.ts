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
  if (sub.billingCycle === SubscriptionBillingCycle.MONTHLY && sub.commitmentEndDate) {
    return Math.max(0, Math.ceil((sub.commitmentEndDate.getTime() - Date.now()) / msPerDay));
  }
  const next = getNextBillingDate(sub);
  return Math.max(0, Math.ceil((next.getTime() - Date.now()) / msPerDay));
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
