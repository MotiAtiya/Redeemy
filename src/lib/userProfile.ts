import {
  collection,
  doc,
  query,
  where,
  getDocs,
  writeBatch,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useSettingsStore } from '@/stores/settingsStore';

const ITEM_COLLECTIONS = [
  'credits',
  'warranties',
  'subscriptions',
  'occasions',
  'documents',
] as const;

/**
 * When a user renames themselves, propagate the new display name to the two
 * places that snapshot it server-side:
 *   1. families/{id}.members.{uid}.displayName  (so the member list shows it)
 *   2. createdByName on every item they authored in family context
 *      (so the avatar tooltip / future displays read correctly)
 *
 * Skips items' updatedAt so renames don't churn list sort order.
 * Does nothing if the user isn't in a family — items only carry createdByName
 * when familyId is set, and leaving family already strips it.
 *
 * Each step runs independently via allSettled — a single permission hiccup on
 * one collection won't fail the whole propagation. Callers should treat this
 * as best-effort: the core auth/users-doc rename is what actually matters.
 */
export async function propagateDisplayNameChange(
  userId: string,
  newName: string,
): Promise<void> {
  const familyId = useSettingsStore.getState().familyId;
  if (!familyId) return;

  const labels = ['family', ...ITEM_COLLECTIONS] as const;
  const results = await Promise.allSettled([
    updateDoc(doc(db, 'families', familyId), {
      [`members.${userId}.displayName`]: newName,
      updatedAt: serverTimestamp(),
    }),
    ...ITEM_COLLECTIONS.map(async (col) => {
      // Filter on userId (not createdBy) so Firestore's rules-aware query
      // analyzer can prove every matched doc is readable. In this app
      // userId === createdBy always — both are set to the original creator.
      const q = query(collection(db, col), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const toUpdate = snapshot.docs.filter((d) => d.data().createdBy === userId);
      if (toUpdate.length === 0) return;
      const batch = writeBatch(db);
      toUpdate.forEach((d) => batch.update(d.ref, { createdByName: newName }));
      await batch.commit();
    }),
  ]);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`displayName propagation [${labels[i]}] failed:`, r.reason);
    }
  });
}
