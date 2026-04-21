import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
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
import { type Subscription } from '@/types/subscriptionTypes';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';

const SUBSCRIPTIONS_COLLECTION = 'subscriptions';

// ---------------------------------------------------------------------------
// Timestamp → Date conversion
// ---------------------------------------------------------------------------

function docToSubscription(d: DocumentSnapshot): Subscription {
  const data = d.data()!;
  return {
    ...(data as Omit<Subscription, 'id' | 'nextBillingDate' | 'trialEndsDate' | 'commitmentEndDate' | 'cancelledAt' | 'createdAt' | 'updatedAt'>),
    id: d.id,
    nextBillingDate:    data.nextBillingDate?.toDate?.() ?? undefined,
    trialEndsDate:      data.trialEndsDate?.toDate?.() ?? undefined,
    commitmentEndDate:  data.commitmentEndDate?.toDate?.() ?? undefined,
    cancelledAt:        data.cancelledAt?.toDate?.() ?? undefined,
    createdAt:          data.createdAt?.toDate?.() ?? new Date(),
    updatedAt:          data.updatedAt?.toDate?.() ?? new Date(),
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
  const data = Object.fromEntries(
    Object.entries({ ...subscriptionData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      .filter(([, v]) => v !== undefined)
  );
  const docRef = await addDoc(colRef, data);
  await updateDoc(docRef, { id: docRef.id });
  return docRef.id;
}

/**
 * Patches an existing subscription document.
 * Always sets `updatedAt` to server timestamp.
 */
export async function updateSubscription(
  subscriptionId: string,
  changes: Partial<Omit<Subscription, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionId);
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(changes as Record<string, unknown>)) {
    payload[k] = v === undefined ? deleteField() : v;
  }
  await updateDoc(docRef, payload);
}

/**
 * Permanently deletes a subscription document.
 */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await deleteDoc(doc(db, SUBSCRIPTIONS_COLLECTION, subscriptionId));
}

/**
 * Deletes all subscriptions belonging to a given user.
 */
export async function deleteAllUserSubscriptions(userId: string): Promise<void> {
  const q = query(collection(db, SUBSCRIPTIONS_COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
}
