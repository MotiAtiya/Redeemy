import type { Timestamp } from 'firebase/firestore';
import type { CurrencyCode } from '@/stores/settingsStore';
import type { DocumentImage } from '@/lib/imageUpload';

export enum CreditStatus {
  ACTIVE = 'active',
  REDEEMED = 'redeemed',
  EXPIRED = 'expired',
}

/**
 * Firestore document shape for a credit.
 *
 * IMPORTANT: `amount` is stored as an integer in **agot** (₪ × 100).
 * Display only via `formatCurrency(amount)` — never store formatted strings.
 */
export interface Credit {
  /** Firestore document ID — written back after addDoc() */
  id: string;
  /** Owner's Firebase Auth UID */
  userId: string;
  storeName: string;
  /** Amount in minor units (× 100). e.g. ₪50.00 → 5000, $20.00 → 2000 */
  amount: number;
  /** ISO currency code — defaults to global setting (ILS) if omitted */
  currency?: CurrencyCode;
  category: string;
  expirationDate?: Date;
  /** Days before expiration the reminder fires (e.g. 7 = 1 week before) */
  reminderDays: number;
  notes?: string;
  status: CreditStatus;
  /** @deprecated Use images instead */
  imageUrl?: string;
  /** @deprecated Use images instead */
  thumbnailUrl?: string;
  /** Array of uploaded images (max 3). Newer records use this; legacy records use imageUrl/thumbnailUrl. */
  images?: DocumentImage[];
  /** expo-notifications scheduled notification ID — used to cancel on redeem/edit/delete */
  notificationId?: string;
  /** Notification scheduled for the expiration day itself */
  expirationNotificationId?: string;
  /** Family this credit belongs to (set on join / create while in family) */
  familyId?: string;
  /** UID of the family member who created this credit */
  createdBy?: string;
  /** Display name of the family member who created this credit */
  createdByName?: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  /** Set when status transitions to REDEEMED */
  redeemedAt?: Date | Timestamp;
  /** Set when status transitions to EXPIRED */
  expiredAt?: Date | Timestamp;
}

/**
 * Form state for the Add Credit / Edit Credit screens.
 * `amount` is a raw string during input; converted to agot integer on submit.
 */
export interface CreditFormData {
  storeName: string;
  /** User-typed amount string, e.g. "50" or "50.00" */
  amountInput: string;
  category: string;
  expirationDate: Date | null;
  noExpiry: boolean;
  reminderDays: number;
  notes: string;
  /** Local image URI returned by expo-image-picker — before upload */
  imageUri?: string;
}
