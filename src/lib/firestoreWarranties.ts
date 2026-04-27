import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { deleteEntityImages } from './imageUpload';
import { normalizeTimestamp, normalizeImages, stripUndefined, buildUpdatePayload } from './firestoreUtils';
import { WarrantyStatus, type Warranty } from '@/types/warrantyTypes';
import { useWarrantiesStore } from '@/stores/warrantiesStore';

const WARRANTIES_COLLECTION = 'warranties';

// ---------------------------------------------------------------------------
// Timestamp → Date conversion
// ---------------------------------------------------------------------------

function docToWarranty(d: DocumentSnapshot): Warranty {
  const data = d.data()!;
  return {
    ...(data as Omit<Warranty, 'id' | 'expirationDate' | 'closedAt' | 'createdAt' | 'updatedAt'>),
    id: d.id,
    images: normalizeImages(data.images, data.imageUrl, data.thumbnailUrl),
    expirationDate: normalizeTimestamp(data.expirationDate),
    closedAt: normalizeTimestamp(data.closedAt),
    createdAt: normalizeTimestamp(data.createdAt) ?? new Date(),
    updatedAt: normalizeTimestamp(data.updatedAt) ?? new Date(),
  } as Warranty;
}

// ---------------------------------------------------------------------------
// Real-time listener
// ---------------------------------------------------------------------------

/**
 * Subscribes to warranties for the current user (or family if in one).
 * When familyId is provided, queries by familyId to get all family warranties.
 * When familyId is null/undefined, queries by userId for personal warranties only.
 * Writes updates directly into warrantiesStore.
 * Returns an unsubscribe function — call on screen unmount.
 */
export function subscribeToWarranties(userId: string, familyId?: string | null): Unsubscribe {
  const q = familyId
    ? query(collection(db, WARRANTIES_COLLECTION), where('familyId', '==', familyId))
    : query(collection(db, WARRANTIES_COLLECTION), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const warranties: Warranty[] = snapshot.docs.map(docToWarranty);
      useWarrantiesStore.getState().setWarranties(warranties);
      useWarrantiesStore.getState().setLoading(false);
    },
    (_error) => {
      useWarrantiesStore.getState().setError('Could not load warranties. Check your connection.');
      useWarrantiesStore.getState().setLoading(false);
    }
  );
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Creates a new warranty document in Firestore.
 * Returns the auto-generated document ID.
 */
export async function createWarranty(
  warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const colRef = collection(db, WARRANTIES_COLLECTION);
  const data = stripUndefined({ ...warrantyData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const docRef = await addDoc(colRef, data);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

/**
 * Patches an existing warranty document.
 * Always sets `updatedAt` to server timestamp.
 */
export async function updateWarranty(
  warrantyId: string,
  changes: Partial<Omit<Warranty, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, WARRANTIES_COLLECTION, warrantyId);
  await updateDoc(docRef, buildUpdatePayload(changes as Record<string, unknown>));
}

/**
 * Permanently deletes a warranty document and its images.
 */
export async function deleteWarranty(warrantyId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, WARRANTIES_COLLECTION, warrantyId)),
    deleteEntityImages('warranties', warrantyId),
  ]);
}

/**
 * Deletes all warranties belonging to a given user.
 */
export async function deleteAllUserWarranties(userId: string): Promise<void> {
  const q = query(collection(db, WARRANTIES_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}

// Re-export WarrantyStatus so callers don't need a separate import
export { WarrantyStatus };
