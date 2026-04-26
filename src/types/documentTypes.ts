import type { Timestamp } from 'firebase/firestore';
import type { DocumentImage } from '@/lib/imageUpload';

export type DocumentType = 'id_card' | 'license' | 'passport' | 'insurance' | 'other';

export interface Document {
  id: string;
  userId: string;
  familyId?: string;
  type: DocumentType;
  customTypeName?: string;
  ownerName: string;
  expirationDate: Date | Timestamp;
  /** @deprecated Use images instead */
  imageUrl?: string;
  /** @deprecated Use images instead */
  thumbnailUrl?: string;
  /** Array of uploaded images (max 3). */
  images?: DocumentImage[];
  notes?: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}
