import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { CurrencyCode } from '@/stores/settingsStore';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _IoniconsName = ComponentProps<typeof Ionicons>['name'];

export enum SubscriptionBillingCycle {
  MONTHLY = 'monthly',
  ANNUAL  = 'annual',
}

export enum SubscriptionIntent {
  RENEW  = 'renew',
  CANCEL = 'cancel',
  CHECK  = 'check',
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
  amountAgorot: number;            // integer minor units (× 100), 0 for free
  currency?: CurrencyCode;         // ISO currency code, defaults to global setting
  isFree: boolean;                 // true → amountAgorot = 0, excluded from monthly total
  // Monthly-specific
  billingDayOfMonth?: number;      // 1–31, only for MONTHLY
  // Monthly commitment
  commitmentMonths?: number;       // how many months committed (MONTHLY only, mandatory for new)
  commitmentEndDate?: Date;        // firstBillingDate + commitmentMonths (stored at creation)
  // Annual-specific
  nextBillingDate?: Date;          // full date, only for ANNUAL
  // Free trial (MONTHLY only)
  isFreeTrial: boolean;
  freeTrialMonths?: number;
  priceAfterTrialAgorot?: number;  // required if isFreeTrial === true
  trialEndsDate?: Date;            // computed: createdAt + freeTrialMonths
  // Classification
  category: string;                // matches subscriptionCategories id
  intent: SubscriptionIntent;
  status: SubscriptionStatus;
  // Reminders
  reminderDays: number;
  notificationIds: string[];       // up to 2 (week + day before for CANCEL/MODIFY)
  renewalNotificationId?: string;  // on-day notification for RENEW intent
  // Optional
  websiteUrl?: string;
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
