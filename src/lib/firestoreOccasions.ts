import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
  deleteField,
  query,
  where,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeTimestamp, stripUndefined, buildUpdatePayload } from './firestoreUtils';
import { logEvent } from './eventLog';
import { type Occasion } from '@/types/occasionTypes';
import { useOccasionsStore } from '@/stores/occasionsStore';

const OCCASIONS_COLLECTION = 'occasions';

// ---------------------------------------------------------------------------
// Real-time listener
// ---------------------------------------------------------------------------

export function subscribeToOccasions(userId: string, familyId?: string | null): Unsubscribe {
  const q = familyId
    ? query(collection(db, OCCASIONS_COLLECTION), where('familyId', '==', familyId))
    : query(collection(db, OCCASIONS_COLLECTION), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const occasions: Occasion[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as Omit<Occasion, 'id' | 'eventDate' | 'createdAt' | 'updatedAt'>),
          id: d.id,
          eventDate: normalizeTimestamp(data.eventDate) ?? new Date(),
          createdAt: normalizeTimestamp(data.createdAt) ?? new Date(),
          updatedAt: normalizeTimestamp(data.updatedAt) ?? new Date(),
        } as Occasion;
      });
      useOccasionsStore.getState().setOccasions(occasions);
      useOccasionsStore.getState().setLoading(false);
    },
    (error) => {
      console.error('Occasions snapshot error:', error);
      useOccasionsStore.getState().setLoading(false);
    }
  );
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createOccasion(
  data: Omit<Occasion, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, OCCASIONS_COLLECTION),
      stripUndefined({ ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    );
    void logEvent('item_created', { itemCategory: 'occasion', itemId: ref.id });
    return ref.id;
  } catch (err) {
    void logEvent('firestore_write_failed', {
      itemCategory: 'occasion',
      metadata: { operation: 'create', errorCode: (err as { code?: string })?.code ?? 'unknown' },
    });
    throw err;
  }
}

export async function updateOccasion(
  id: string,
  changes: Partial<Occasion>,
  options: { silent?: boolean } = {}
): Promise<void> {
  await updateDoc(doc(db, OCCASIONS_COLLECTION, id),
    buildUpdatePayload(changes as Record<string, unknown>)
  );
  if (!options.silent) {
    void logEvent('item_updated', { itemCategory: 'occasion', itemId: id });
  }
}

export async function deleteOccasion(id: string): Promise<void> {
  await deleteDoc(doc(db, OCCASIONS_COLLECTION, id));
  void logEvent('item_deleted', { itemCategory: 'occasion', itemId: id });
}

export async function deleteAllUserOccasions(userId: string): Promise<void> {
  const q = query(collection(db, OCCASIONS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Batch-assigns familyId (and createdBy info) to all occasions belonging to a user.
 * Idempotent: skips docs already correctly tagged so updatedAt isn't churned.
 */
export async function migrateOccasionsToFamily(
  userId: string,
  familyId: string,
  createdByName: string
): Promise<void> {
  const q = query(collection(db, OCCASIONS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const toUpdate = snapshot.docs.filter((d) => {
    const data = d.data();
    return data.familyId !== familyId
      || data.createdBy !== userId
      || data.createdByName !== createdByName;
  });
  if (toUpdate.length === 0) return;

  const batch = writeBatch(db);
  toUpdate.forEach((d) => {
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
 * Batch-removes familyId and createdBy from all occasions belonging to a user.
 * Called when a user leaves a family — their occasions revert to personal ownership.
 */
export async function migrateOccasionsFromFamily(
  userId: string,
  familyId?: string
): Promise<void> {
  const constraints = familyId
    ? [where('userId', '==', userId), where('familyId', '==', familyId)]
    : [where('userId', '==', userId)];
  const q = query(collection(db, OCCASIONS_COLLECTION), ...constraints);
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

