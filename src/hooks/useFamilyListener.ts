import { useEffect } from 'react';
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
  const setFamilyCreditsMigrated = useSettingsStore((s) => s.setFamilyCreditsMigrated);

  useEffect(() => {
    if (!familyId) return;

    function handleUserRemoved() {
      setFamilyId(null);
      setFamilyCreditsMigrated(false);
    }

    const unsubscribe = subscribeToFamily(familyId, currentUid, handleUserRemoved);
    return unsubscribe;
  }, [familyId, currentUid, setFamilyId, setFamilyCreditsMigrated]);
}
