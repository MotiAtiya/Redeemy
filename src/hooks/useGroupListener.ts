import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useUIStore } from '@/stores/uiStore';
import { subscribeToGroupCredits } from '@/lib/firestoreGroups';
import type { Credit } from '@/types/creditTypes';

/**
 * For each group the user belongs to, subscribes to all group credits and
 * merges credits from OTHER members into creditsStore.
 * The user's own credits (even group ones) are already covered by
 * subscribeToCredits() via the userId == currentUser.uid query.
 */
export function useGroupListener() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const groups = useGroupStore((s) => s.groups);

  useEffect(() => {
    if (!currentUser || groups.length === 0) return;

    const { setIsSyncing } = useUIStore.getState();
    const { replaceGroupCredits, clearGroupCredits } = useCreditsStore.getState();

    setIsSyncing(true);

    const unsubscribers = groups.map((group) => {
      let firstSnapshot = true;

      return subscribeToGroupCredits(group.id, (credits: Credit[]) => {
        replaceGroupCredits(group.id, credits, currentUser.uid);

        if (firstSnapshot) {
          firstSnapshot = false;
          // Check if all groups have fired their first snapshot
          setIsSyncing(false);
        }
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      // Clean up other-member credits when groups subscription ends
      groups.forEach((group) => {
        clearGroupCredits(group.id, currentUser.uid);
      });
    };
  }, [currentUser, groups]);
}
