import { deleteAllUserCredits } from './firestoreCredits';
import { deleteAllUserWarranties } from './firestoreWarranties';
import { deleteAllUserSubscriptions } from './firestoreSubscriptions';
import { deleteAllUserOccasions } from './firestoreOccasions';
import { deleteAllUserDocuments } from './firestoreDocuments';
import { useCreditsStore } from '@/stores/creditsStore';
import { useWarrantiesStore } from '@/stores/warrantiesStore';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useOccasionsStore } from '@/stores/occasionsStore';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useUIStore } from '@/stores/uiStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Permanently deletes all Firestore data belonging to a user.
 * Used by both "delete all data" and "delete account" flows.
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  await Promise.all([
    deleteAllUserCredits(userId),
    deleteAllUserWarranties(userId),
    deleteAllUserSubscriptions(userId),
    deleteAllUserOccasions(userId),
    deleteAllUserDocuments(userId),
  ]);
}

/**
 * Clears all feature data from local Zustand stores.
 * Used by sign-out, delete-all-data, and delete-account flows.
 */
export function clearAllLocalStores(): void {
  const credits = useCreditsStore.getState();
  credits.setCredits([]);
  credits.setSearchQuery('');
  credits.setError(null);
  credits.setLoading(false);

  useWarrantiesStore.getState().setWarranties([]);
  useSubscriptionsStore.getState().setSubscriptions([]);
  useOccasionsStore.getState().setOccasions([]);
  useDocumentsStore.getState().setDocuments([]);

  useUIStore.getState().setActiveTab('credits');
  useUIStore.getState().setOfflineMode(false);

  useFamilyStore.getState().setFamily(null);
  useSettingsStore.getState().setFamilyId(null);
  useSettingsStore.getState().setFamilyCreditsMigrated(false);
}
