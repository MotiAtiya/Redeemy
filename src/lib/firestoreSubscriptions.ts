import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  deleteField,
  query,
  where,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { normalizeTimestamp, stripUndefined, buildUpdatePayload } from './firestoreUtils';
import { logEvent } from './eventLog';
import { type Subscription } from '@/types/subscriptionTypes';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';

const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

// ---------------------------------------------------------------------------
// Timestamp → Date conversion
// ---------------------------------------------------------------------------

function docToSubscription(d: DocumentSnapshot): Subscription {
  const data = d.data()!;
  return {
    ...(data as Omit<Subscription, 'id' | 'registrationDate' | 'nextBillingDate' | 'trialEndsDate' | 'commitmentEndDate' | 'cancelledAt' | 'createdAt' | 'updatedAt'>),
    id: d.id,
    registrationDate:  normalizeTimestamp(data.registrationDate),
    nextBillingDate:   normalizeTimestamp(data.nextBillingDate),
    trialEndsDate:     normalizeTimestamp(data.trialEndsDate),
    commitmentEndDate: normalizeTimestamp(data.commitmentEndDate),
    cancelledAt:       normalizeTimestamp(data.cancelledAt),
    createdAt:         normalizeTimestamp(data.createdAt) ?? new Date(),
    updatedAt:         normalizeTimestamp(data.updatedAt) ?? new Date(),
  } as Subscription;
}

// ---------------------------------------------------------------------------
// Real-time listener
// ---------------------------------------------------------------------------

/**
 * Subscribes to subscriptions for the current user (or family if in one).
 * When familyId is provided, queries by familyId to get all family subscriptions.
 * When familyId is null/undefined, queries by userId for personal subscriptions only.
 * Writes updates directly into subscriptionsStore.
 * Returns an unsubscribe function — call on screen unmount.
 */
export function subscribeToSubscriptions(userId: string, familyId?: string | null): Unsubscribe {
  const q = familyId
    ? query(collection(db, SUBSCRIPTIONS_COLLECTION), where('familyId', '==', familyId))
    : query(collection(db, SUBSCRIPTIONS_COLLECTION), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const subscriptions: Subscription[] = snapshot.docs.map(docToSubscription);
      useSubscriptionsStore.getState().setSubscriptions(subscriptions);
      useSubscriptionsStore.getState().setLoading(false);
    },
    (_error) => {
      useSubscriptionsStore.getState().setError('Could not load subscriptions. Check your connection.');
      useSubscriptionsStore.getState().setLoading(false);
    }
  );
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Creates a new subscription document in Firestore.
 * Returns the auto-generated document ID.
 */
export async function createSubscription(
  subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const colRef = collection(db, SUBSCRIPTIONS_COLLECTION);
  const data = stripUndefined({ ...subscriptionData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const docRef = await addDoc(colRef, data);
  await updateDoc(docRef, { id: docRef.id });
  void logEvent('item_created', { itemCategory: 'subscription', itemId: docRef.id });
  return docRef.id;
}

/**
 * Patches an existing subscription document.
 * Always sets `updatedAt` to server timestamp.
 */
export async function updateSubscription(
  subscriptionId: string,
  changes: Partial<Omit<Subscription, 'id' | 'createdAt'>>,
  options: { silent?: boolean } = {}
): Promise<void> {
  const docRef = doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionId);
  await updateDoc(docRef, buildUpdatePayload(changes as Record<string, unknown>));
  if (!options.silent) {
    void logEvent('item_updated', { itemCategory: 'subscription', itemId: subscriptionId });
  }
}

/**
 * Permanently deletes a subscription document.
 */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await deleteDoc(doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionId));
  void logEvent('item_deleted', { itemCategory: 'subscription', itemId: subscriptionId });
}

/**
 * Deletes all subscriptions belonging to a given user.
 */
export async function deleteAllUserSubscriptions(userId: string): Promise<void> {
  const q = query(collection(db, SUBSCRIPTIONS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}

/**
 * Batch-assigns familyId (and createdBy info) to all subscriptions belonging to a user.
 * Idempotent: skips docs already correctly tagged so updatedAt isn't churned.
 */
export async function migrateSubscriptionsToFamily(
  userId: string,
  familyId: string,
  createdByName: string
): Promise<void> {
  const q = query(collection(db, SUBSCRIPTIONS_COLLECTION), where('userId', '==', userId));
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
 * Batch-removes familyId and createdBy from all subscriptions belonging to a user.
 * Called when a user leaves a family — their subscriptions revert to personal ownership.
 */
export async function migrateSubscriptionsFromFamily(
  userId: string,
  familyId?: string
): Promise<void> {
  const constraints = familyId
    ? [where('userId', '==', userId), where('familyId', '==', familyId)]
    : [where('userId', '==', userId)];
  const q = query(collection(db, SUBSCRIPTIONS_COLLECTION), ...constraints);
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
