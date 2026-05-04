import { collection, deleteField, query, serverTimestamp, where, type Query, type CollectionReference } from 'firebase/firestore';
import { db } from './firebase';
import type { DocumentImage } from './imageUpload';

// Re-exported for backward compat — the implementation lives in dateUtils so
// jest tests can import them without dragging in the firebase ESM bundle.
export { normalizeTimestamp, normalizeTimestampOrNow } from './dateUtils';

// ---------------------------------------------------------------------------
// Image normalization
// ---------------------------------------------------------------------------

/** Normalizes legacy single-image fields (imageUrl/thumbnailUrl) into a
 *  DocumentImage array. Returns undefined if no image data is present. */
export function normalizeImages(
  images: unknown,
  imageUrl?: string,
  thumbnailUrl?: string
): DocumentImage[] | undefined {
  if (images != null) return images as DocumentImage[];
  if (!imageUrl) return undefined;
  return [{ url: imageUrl, thumbnailUrl: thumbnailUrl ?? imageUrl }];
}

// ---------------------------------------------------------------------------
// Payload helpers
// ---------------------------------------------------------------------------

/** Strips undefined values from a plain object (Firestore rejects undefined fields). */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/** Builds a Firestore update payload: undefined values become deleteField(),
 *  and updatedAt is set to serverTimestamp(). */
export function buildUpdatePayload(
  changes: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(changes)) {
    payload[k] = v === undefined ? deleteField() : v;
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Ownership queries
// ---------------------------------------------------------------------------

/**
 * Builds the per-user / per-family Firestore query for a feature collection.
 * If the user is in a family, scope by `familyId`; otherwise by personal `userId`.
 * Used by every subscribeTo* listener in firestoreCredits / firestoreWarranties /
 * firestoreSubscriptions / firestoreOccasions / firestoreDocuments.
 */
export function ownerQuery(
  collectionName: string,
  userId: string,
  familyId?: string | null,
): Query {
  const ref: CollectionReference = collection(db, collectionName);
  return familyId
    ? query(ref, where('familyId', '==', familyId))
    : query(ref, where('userId', '==', userId));
}
