import { normalizeTimestampOrNow } from './dateUtils';
import type { Document } from '@/types/documentTypes';

/**
 * Returns the document's expirationDate as a Date (it may arrive as a
 * Firestore Timestamp during initial load).
 */
export function getDocumentExpirationDate(doc: Document): Date {
  return normalizeTimestampOrNow(doc.expirationDate);
}

/** True when this document's expirationDate is in the past. */
export function documentNeedsRenewal(doc: Document): boolean {
  return getDocumentExpirationDate(doc).getTime() < Date.now();
}
