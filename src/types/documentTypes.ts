import type { Timestamp } from 'firebase/firestore';

export type DocumentType = 'id_card' | 'license' | 'passport' | 'insurance' | 'other';

export interface Document {
  id: string;
  userId: string;
  familyId?: string;
  type: DocumentType;
  ownerName: string;
  expirationDate: Date | Timestamp;
  imageUrl?: string;
  thumbnailUrl?: string;
  notes?: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}
