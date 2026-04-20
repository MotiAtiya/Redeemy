import { useEffect } from 'react';
import { subscribeToFamily } from '@/lib/firestoreFamilies';

/**
 * Sets up an onSnapshot listener when user has a familyId.
 * Tears down listener on cleanup or when familyId changes to null.
 * Call from root layout — never in leaf screens.
 */
export function useFamilyListener(familyId: string | null | undefined): void {
  useEffect(() => {
    if (!familyId) return;
    const unsubscribe = subscribeToFamily(familyId);
    return unsubscribe;
  }, [familyId]);
}
