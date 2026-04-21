import { useEffect } from 'react';
import { subscribeToSubscriptions } from '@/lib/firestoreSubscriptions';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';

/**
 * Sets up an onSnapshot listener for subscriptions.
 * Tears down and re-subscribes when userId or familyId changes.
 */
export function useSubscriptionsListener(
  userId: string | null,
  familyId: string | null | undefined
): void {
  const setLoading = useSubscriptionsStore((s) => s.setLoading);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const unsubscribe = subscribeToSubscriptions(userId, familyId);
    return unsubscribe;
  }, [userId, familyId, setLoading]);
}
