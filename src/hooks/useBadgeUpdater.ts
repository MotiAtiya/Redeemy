import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useCreditsStore } from '@/stores/creditsStore';
import { updateBadgeCount } from '@/lib/notifications';
import type { Credit } from '@/types/creditTypes';

/**
 * Keeps the app icon badge in sync with credits expiring soon.
 * Badge clears when the user opens the app and is restored when
 * the app goes to the background.
 */
export function useBadgeUpdater() {
  const credits = useCreditsStore((s) => s.credits);

  const creditsRef = useRef<Credit[]>(credits);
  creditsRef.current = credits;

  useEffect(() => {
    Notifications.setBadgeCountAsync(0);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        Notifications.setBadgeCountAsync(0);
      } else if (nextState === 'background') {
        updateBadgeCount(creditsRef.current);
      }
    });

    return () => sub.remove();
  }, []);
}
