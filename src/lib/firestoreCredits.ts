import { deleteCreditImages } from './imageUpload';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  deleteField,
  doc,
  serverTimestamp,
  query,
  where,
  writeBatch,
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
 * Subscribes to credits for the current user (or family if in one).
 * When familyId is provided, queries by familyId to get all family credits.
 * When familyId is null/undefined, queries by userId for personal credits only.
 * Writes updates directly into creditsStore.
 * Returns an unsubscribe function — call on screen unmount.
 */
export function subscribeToCredits(userId: string, familyId?: string | null): Unsubscribe {
  const q = familyId
    ? query(collection(db, CREDITS_COLLECTION), where('familyId', '==', familyId))
    : query(collection(db, CREDITS_COLLECTION), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const credits: Credit[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as Omit<Credit, 'id' | 'expirationDate' | 'createdAt' | 'updatedAt'>),
          id: d.id,
          // Convert Firestore Timestamps to JS Dates
          expirationDate: data.expirationDate
            ? (data.expirationDate?.toDate?.() ?? new Date(data.expirationDate))
            : undefined,
          createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
          redeemedAt: data.redeemedAt?.toDate?.() ?? undefined,
          expiredAt: data.expiredAt?.toDate?.() ?? undefined,
        } as Credit;
      });

      useCreditsStore.getState().setCredits(credits);
      useCreditsStore.getState().setLoading(false);

      // Auto-expire: any ACTIVE credit whose expiration date is before today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const toExpire = credits.filter(
        (c) => c.status === CreditStatus.ACTIVE && c.expirationDate && new Date(c.expirationDate) < today
      );
      for (const c of toExpire) {
        const expiredAt = new Date(c.expirationDate!);
        expiredAt.setHours(23, 59, 59, 999);
        updateCredit(c.id, { status: CreditStatus.EXPIRED, expiredAt });
      }
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
  // Strip undefined fields — Firestore rejects them
  const data = Object.fromEntries(
    Object.entries({ ...creditData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      .filter(([, v]) => v !== undefined)
  );
  const docRef = await addDoc(colRef, data);

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
  // Replace undefined values with deleteField() so Firestore removes those fields
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(changes as Record<string, unknown>)) {
    payload[k] = v === undefined ? deleteField() : v;
  }
  await updateDoc(docRef, payload);
}

/**
 * Permanently deletes a credit document.
 */
export async function deleteCredit(creditId: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(db, CREDITS_COLLECTION, creditId)),
    deleteCreditImages(creditId),
  ]);
}

/**
 * Deletes all credits (and their images) for a given user.
 */
export async function deleteAllUserCredits(userId: string): Promise<void> {
  const q = query(collection(db, CREDITS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  await Promise.all(
    snapshot.docs.map((d) =>
      Promise.all([deleteDoc(d.ref), deleteCreditImages(d.id)])
    )
  );
}

/**
 * Batch-assigns familyId (and createdBy info) to all credits belonging to a user.
 * Called when a user joins a family — makes their credits visible to all family members.
 */
export async function migrateCreditsToFamily(
  userId: string,
  familyId: string,
  createdByName: string
): Promise<void> {
  const q = query(collection(db, CREDITS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, {
      familyId,
      createdBy: userId,
      createdByName,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/**
 * Batch-removes familyId and createdBy from all credits belonging to a user.
 * Called when a user leaves a family — their credits revert to personal ownership.
 */
export async function migrateCreditsFromFamily(userId: string): Promise<void> {
  const q = query(collection(db, CREDITS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => {
    batch.update(d.ref, {
      familyId: deleteField(),
      createdBy: deleteField(),
      createdByName: deleteField(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
