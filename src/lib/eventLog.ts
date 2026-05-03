import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db, auth } from './firebase';
import i18n from './i18n';
import type { EventType, EventMetadata } from '@/types/eventTypes';

// Fire-and-forget event logger. Writes to the `events/` Firestore collection
// for the admin dashboard's activity feed. Never blocks the caller. Failures
// are silently swallowed (only surfaced in dev).
//
// Always call with `void logEvent(...)` from non-async paths to make the
// fire-and-forget intent explicit:
//   void logEvent('item_created', { itemCategory: 'credit', itemId });
//
// Skips the write if no user is authenticated (Firestore rules require auth).
export async function logEvent(type: EventType, payload?: EventMetadata): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, 'events'), {
      type,
      userId: user.uid,
      userName: user.displayName ?? user.email ?? null,
      timestamp: serverTimestamp(),
      appVersion: Constants.expoConfig?.version ?? 'unknown',
      platform: Platform.OS as 'ios' | 'android',
      locale: i18n.language,
      ...(payload?.itemCategory ? { itemCategory: payload.itemCategory } : {}),
      ...(payload?.itemId ? { itemId: payload.itemId } : {}),
      ...(payload?.metadata ? { metadata: payload.metadata } : {}),
    });
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[eventLog]', type, err);
    }
  }
}
