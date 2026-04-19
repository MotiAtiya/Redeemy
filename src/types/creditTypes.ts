import type { Timestamp } from 'firebase/firestore';

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
  /** Amount in agot (₪ × 100). e.g. ₪50.00 → 5000 */
  amount: number;
  category: string;
  expirationDate: Date;
  /** Days before expiration the reminder fires (e.g. 7 = 1 week before) */
  reminderDays: number;
  notes?: string;
  status: CreditStatus;
  imageUrl?: string;
  thumbnailUrl?: string;
  /** expo-notifications scheduled notification ID — used to cancel on redeem/edit/delete */
  notificationId?: string;
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
  expirationDate: Date;
  reminderDays: number;
  notes: string;
  /** Local image URI returned by expo-image-picker — before upload */
  imageUri?: string;
}
