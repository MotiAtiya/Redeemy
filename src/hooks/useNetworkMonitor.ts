import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useUIStore } from '@/stores/uiStore';
import { useGroupStore } from '@/stores/groupStore';

/**
 * Subscribes to network connectivity changes and syncs the result into
 * uiStore.offlineMode.
 *
 * When reconnecting (offline → online):
 * - Sets isSyncing = true briefly so SyncIndicator shows the "syncing" pulse.
 * - Firestore's offline persistence automatically flushes queued writes.
 *
 * Mount once in AuthGate (_layout.tsx).
 */
export function useNetworkMonitor() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const { setOfflineMode, setIsSyncing } = useUIStore.getState();
      const wasOffline = useUIStore.getState().offlineMode;
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;

      if (!isOnline) {
        setOfflineMode(true);
        setIsSyncing(false);
      } else {
        setOfflineMode(false);
        if (wasOffline) {
          // Just reconnected — show syncing pulse; clears when next snapshot fires
          setIsSyncing(true);
          setTimeout(() => {
            useUIStore.getState().setIsSyncing(false);
          }, 3000);
        }
      }
    });

    return unsubscribe;
  }, []);
}
