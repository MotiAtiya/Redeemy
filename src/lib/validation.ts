import { z } from 'zod';
import { CreditStatus } from '@/types/creditTypes';

// ---------------------------------------------------------------------------
// Credit schema
// ---------------------------------------------------------------------------

/**
 * Validates CreditFormData before any Firestore write.
 *
 * `amountInput` is the raw user-typed string (e.g. "50" or "50.75").
 * The schema parses it into an agot integer (₪ × 100).
 */
export const CreditSchema = z.object({
  storeName: z.string().min(1, 'Store name is required'),

  amountInput: z
    .string()
    .min(1, 'Amount is required')
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
      message: 'Amount must be a positive number',
    })
    .transform((v) => Math.round(parseFloat(v) * 100)), // → agot integer

  category: z.string().min(1, 'Category is required'),

  expirationDate: z
    .date()
    .refine((d) => d > new Date(), 'Expiration date must be in the future'),

  reminderDays: z.number().int().positive(),

  notes: z.string().optional().default(''),

  imageUri: z.string().optional(),
});

export type CreditSchemaInput = z.input<typeof CreditSchema>;
export type CreditSchemaOutput = z.output<typeof CreditSchema>;

// ---------------------------------------------------------------------------
// User schema
// ---------------------------------------------------------------------------

export const UserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
});

export type UserSchemaInput = z.input<typeof UserSchema>;

// ---------------------------------------------------------------------------
// Subscription schema
// ---------------------------------------------------------------------------

import { SubscriptionBillingCycle, SubscriptionStatus } from '@/types/subscriptionTypes';

export const SubscriptionSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required'),

  billingCycle: z.nativeEnum(SubscriptionBillingCycle),

  amountAgorot: z.number().int().min(0),

  isFree: z.boolean(),

  billingDayOfMonth: z.number().int().min(1).max(28).optional(),

  nextBillingDate: z.date().optional(),

  isFreeTrial: z.boolean(),

  specialPeriodType: z.enum(['trial', 'discounted']).optional(),

  specialPeriodMonths: z.number().int().positive().optional(),

  specialPeriodPriceAgorot: z.number().int().min(0).optional(),

  priceAfterTrialAgorot: z.number().int().min(0).optional(),

  hasFixedPeriod: z.boolean().optional(),

  commitmentMonths: z.number().int().positive().optional(),

  renewalType: z.enum(['auto', 'manual']).optional(),

  freeReviewReminderMonths: z.number().int().positive().optional(),

  category: z.string().min(1, 'Category is required'),

  status: z.nativeEnum(SubscriptionStatus).default(SubscriptionStatus.ACTIVE),

  reminderDays: z.number().int().positive(),

  notes: z.string().optional().default(''),
});

export type SubscriptionSchemaInput = z.input<typeof SubscriptionSchema>;
export type SubscriptionSchemaOutput = z.output<typeof SubscriptionSchema>;

// ---------------------------------------------------------------------------
// Shared enums re-exported for convenience
// ---------------------------------------------------------------------------
export { CreditStatus, SubscriptionBillingCycle, SubscriptionStatus };
