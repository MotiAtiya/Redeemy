import type { DocumentImage } from '@/lib/imageUpload';

export enum WarrantyStatus {
  ACTIVE  = 'active',
  CLOSED  = 'closed',   // manually closed by user
  EXPIRED = 'expired',  // reserved for future Firestore-side expiry jobs (not used client-side)
}

export interface Warranty {
  id: string;
  userId: string;
  storeName: string;
  productName: string;
  category: string;
  expirationDate?: Date;
  noExpiry: boolean;
  reminderDays: number;
  notes: string;
  imageUri?: string;
  /** @deprecated Use images instead */
  imageUrl?: string;
  /** @deprecated Use images instead */
  thumbnailUrl?: string;
  /** Array of uploaded images (max 3). */
  images?: DocumentImage[];
  status: WarrantyStatus;
  notificationId?: string;
  expirationNotificationId?: string;
  closedAt?: Date;
  // Family sharing
  familyId?: string;
  createdBy?: string;
  createdByName?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
