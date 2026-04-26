import { useEffect } from 'react';
import { subscribeToDocuments } from '@/lib/firestoreDocuments';
import { useDocumentsStore } from '@/stores/documentsStore';

/**
 * Sets up an onSnapshot listener for documents.
 * Tears down and re-subscribes when userId or familyId changes.
 */
export function useDocumentsListener(
  userId: string | null,
  familyId: string | null | undefined
): void {
  const setLoading = useDocumentsStore((s) => s.setLoading);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const unsubscribe = subscribeToDocuments(userId, familyId);
    return unsubscribe;
  }, [userId, familyId, setLoading]);
}
