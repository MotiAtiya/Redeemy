import { useEffect } from 'react';
import { subscribeToWarranties } from '@/lib/firestoreWarranties';
import { useWarrantiesStore } from '@/stores/warrantiesStore';

/**
 * Sets up an onSnapshot listener for warranties.
 * Tears down and re-subscribes when userId or familyId changes.
 */
export function useWarrantiesListener(
  userId: string | null,
  familyId: string | null | undefined
): void {
  const setLoading = useWarrantiesStore((s) => s.setLoading);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const unsubscribe = subscribeToWarranties(userId, familyId);
    return unsubscribe;
  }, [userId, familyId, setLoading]);
}
