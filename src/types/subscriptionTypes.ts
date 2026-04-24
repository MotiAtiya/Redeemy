import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { CurrencyCode } from '@/stores/settingsStore';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _IoniconsName = ComponentProps<typeof Ionicons>['name'];

export enum SubscriptionBillingCycle {
  MONTHLY = 'monthly',
  ANNUAL  = 'annual',
}

export enum SubscriptionStatus {
  ACTIVE    = 'active',
  CANCELLED = 'cancelled',
}

export interface Subscription {
  id: string;
  userId: string;
  serviceName: string;
  billingCycle: SubscriptionBillingCycle;
  amountAgorot: number;            // integer minor units (× 100), 0 for free/trial
  currency?: CurrencyCode;         // ISO currency code, defaults to global setting
  isFree: boolean;                 // true → amountAgorot = 0, excluded from monthly total
  // Monthly-specific
  billingDayOfMonth?: number;      // 1–28, only for MONTHLY
  hasFixedPeriod?: boolean;        // MONTHLY: whether there's a commitment period
  // Monthly commitment
  commitmentMonths?: number;       // how many months committed (MONTHLY fixed only)
  commitmentEndDate?: Date;        // firstBillingDate + commitmentMonths (stored at creation)
  // Annual-specific
  nextBillingDate?: Date;          // full date, only for ANNUAL
  // Renewal
  renewalType?: 'auto' | 'manual'; // auto = renews automatically, manual = user cancels
  // Special beginning period (trial or discounted)
  isFreeTrial: boolean;            // true when specialPeriodType === 'trial'
  specialPeriodType?: 'trial' | 'discounted';
  specialPeriodUnit?: 'days' | 'months'; // unit for the special period duration
  specialPeriodMonths?: number;    // duration in months (when unit = 'months')
  specialPeriodDays?: number;      // duration in days (when unit = 'days')
  specialPeriodPriceAgorot?: number;   // price during discounted period
  priceAfterTrialAgorot?: number;      // regular price after trial period
  trialEndsDate?: Date;                // createdAt + duration (for both trial & discounted)
  freeTrialMonths?: number;            // kept for backward compat (= specialPeriodMonths when trial)
  // Registration date (anchor for billing day, annual renewal, and review reminders)
  registrationDate?: Date;
  // Free subscription review
  freeReviewReminderMonths?: number;   // remind user to review free sub every N months
  // Classification
  category: string;                // matches subscriptionCategories id
  status: SubscriptionStatus;
  // Reminders
  reminderDays: number;
  reminderSpecialPeriodEnabled?: boolean;  // schedule reminder 7 days before special period ends
  notificationIds: string[];       // advance reminders (before billing)
  renewalNotificationId?: string;  // on-day notification for auto-renewal
  specialPeriodNotificationId?: string; // reminder 7 days before special period ends
  // Optional
  notes?: string;
  // Family sharing
  familyId?: string;
  createdBy?: string;
  createdByName?: string;
  // Lifecycle
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
