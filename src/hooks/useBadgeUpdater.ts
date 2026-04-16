import { useEffect } from 'react';
import { useCreditsStore } from '@/stores/creditsStore';
import { updateBadgeCount } from '@/lib/notifications';

/**
 * Watches creditsStore and keeps the app icon badge in sync.
 * Call once in the root layout (after auth).
 */
export function useBadgeUpdater() {
  const credits = useCreditsStore((s) => s.credits);

  useEffect(() => {
    updateBadgeCount(credits);
  }, [credits]);
}
