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
          eventDate: data.eventDate?.toDate?.() ?? new Date(data.eventDate),
          createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
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
  const ref = await addDoc(collection(db, OCCASIONS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateOccasion(
  id: string,
  changes: Partial<Occasion>
): Promise<void> {
  await updateDoc(doc(db, OCCASIONS_COLLECTION, id), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOccasion(id: string): Promise<void> {
  await deleteDoc(doc(db, OCCASIONS_COLLECTION, id));
}
