import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { subscribeToUserGroups } from '@/lib/firestoreGroups';

/**
 * Subscribes to the current user's family groups in real time.
 * Writes updates directly into groupStore.
 * Mount this hook once from AuthGate in _layout.tsx.
 */
export function useGroupSync() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const setGroups = useGroupStore((s) => s.setGroups);

  useEffect(() => {
    if (!currentUser) {
      setGroups([]);
      return;
    }

    const unsubscribe = subscribeToUserGroups(currentUser.uid, (groups) => {
      setGroups(groups);
    });

    return unsubscribe;
  }, [currentUser, setGroups]);
}
