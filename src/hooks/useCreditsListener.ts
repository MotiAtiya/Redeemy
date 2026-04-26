import { useEffect } from 'react';
import { subscribeToCredits } from '@/lib/firestoreCredits';
import { useCreditsStore } from '@/stores/creditsStore';

/**
 * Sets up an onSnapshot listener for credits.
 * Tears down and re-subscribes when userId or familyId changes.
 */
export function useCreditsListener(
  userId: string | null,
  familyId: string | null | undefined
): void {
  const setLoading = useCreditsStore((s) => s.setLoading);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const unsubscribe = subscribeToCredits(userId, familyId);
    return unsubscribe;
  }, [userId, familyId, setLoading]);
}
