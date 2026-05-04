// Pure date helpers with no Firebase dependency. Living separately from
// firestoreUtils.ts so they can be imported from test-friendly modules
// (subscriptionUtils, etc.) without dragging in the firebase ESM bundle —
// jest's CommonJS pipeline can't parse `export *` from firebase/firestore.

type FirestoreTimestampLike = { toDate: () => Date };

/** Converts a Firestore Timestamp, Date, string, or number to a JS Date.
 *  Returns undefined if the value is null/undefined. */
export function normalizeTimestamp(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (typeof (value as FirestoreTimestampLike).toDate === 'function') {
    return (value as FirestoreTimestampLike).toDate();
  }
  return new Date(value as string | number | Date);
}

/** Same as normalizeTimestamp but falls back to `new Date()` instead of undefined. */
export function normalizeTimestampOrNow(value: unknown): Date {
  return normalizeTimestamp(value) ?? new Date();
}
