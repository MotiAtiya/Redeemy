import { z } from 'zod';
import { CreditStatus } from '@/types/creditTypes';
import { GroupRole } from '@/types/groupTypes';

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
// Group schema
// ---------------------------------------------------------------------------

export const GroupSchema = z.object({
  groupName: z.string().min(1, 'Group name is required').max(50),
});

export type GroupSchemaInput = z.input<typeof GroupSchema>;

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
// Shared enums re-exported for convenience
// ---------------------------------------------------------------------------
export { CreditStatus, GroupRole };
