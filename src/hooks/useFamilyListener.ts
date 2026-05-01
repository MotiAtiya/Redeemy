import { useEffect } from 'react';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToFamily } from '@/lib/firestoreFamilies';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Sets up an onSnapshot listener when user has a familyId.
 * Tears down listener on cleanup or when familyId changes to null.
 * Automatically clears familyId when the user is removed from the family
 * (kicked by admin or family dissolved).
 * Call from root layout — never in leaf screens.
 */
export function useFamilyListener(familyId: string | null | undefined): void {
  const currentUid = useAuthStore((s) => s.currentUser?.uid);
  const setFamilyId = useSettingsStore((s) => s.setFamilyId);

  useEffect(() => {
    if (!familyId) return;

    function handleUserRemoved() {
      setFamilyId(null);
      // Also clear the server-side pointer so a future sign-in doesn't
      // rehydrate the now-stale familyId. Best-effort.
      if (currentUid) {
        setDoc(doc(db, 'users', currentUid), { familyId: deleteField() }, { merge: true })
          .catch(() => { /* silent */ });
      }
    }

    const unsubscribe = subscribeToFamily(familyId, currentUid, handleUserRemoved);
    return unsubscribe;
  }, [familyId, currentUid, setFamilyId]);
}
