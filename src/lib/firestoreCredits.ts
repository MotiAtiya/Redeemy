import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { useCreditsStore } from '@/stores/creditsStore';

const CREDITS_COLLECTION = 'credits';

// ---------------------------------------------------------------------------
// Real-time listener
// ---------------------------------------------------------------------------

/**
 * Subscribes to the current user's active credits.
 * Writes updates directly into creditsStore.
 * Returns an unsubscribe function — call on screen unmount.
 */
export function subscribeToCredits(userId: string): Unsubscribe {
  const q = query(
    collection(db, CREDITS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', CreditStatus.ACTIVE)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const credits: Credit[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as Omit<Credit, 'id' | 'expirationDate' | 'createdAt' | 'updatedAt'>),
          id: d.id,
          // Convert Firestore Timestamps to JS Dates
          expirationDate: data.expirationDate?.toDate?.() ?? new Date(data.expirationDate),
          createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
          redeemedAt: data.redeemedAt?.toDate?.() ?? undefined,
        } as Credit;
      });

      useCreditsStore.getState().setCredits(credits);
      useCreditsStore.getState().setLoading(false);
    },
    (_error) => {
      useCreditsStore.getState().setError('Could not load credits. Check your connection.');
      useCreditsStore.getState().setLoading(false);
    }
  );
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Creates a new credit document in Firestore.
 * Returns the auto-generated document ID.
 *
 * Does NOT upload images — that is handled separately by imageUpload.ts
 * so the document ID is available first.
 */
export async function createCredit(
  creditData: Omit<Credit, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const colRef = collection(db, CREDITS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...creditData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Write the auto-generated ID back into the document
  await updateDoc(docRef, { id: docRef.id });

  return docRef.id;
}

/**
 * Patches an existing credit document.
 * Always sets `updatedAt` to server timestamp.
 */
export async function updateCredit(
  creditId: string,
  changes: Partial<Omit<Credit, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, CREDITS_COLLECTION, creditId);
  await updateDoc(docRef, {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Permanently deletes a credit document.
 */
export async function deleteCredit(creditId: string): Promise<void> {
  await deleteDoc(doc(db, CREDITS_COLLECTION, creditId));
}
