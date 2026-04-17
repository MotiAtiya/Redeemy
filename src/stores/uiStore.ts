import { create } from 'zustand';

type TabName = 'credits' | 'stores' | 'history' | 'more';

interface UIState {
  activeTab: TabName;
  offlineMode: boolean;
  /** True while a Firestore snapshot is in flight (used by SyncIndicator) */
  isSyncing: boolean;
}

interface UIActions {
  setActiveTab: (tab: TabName) => void;
  setOfflineMode: (offline: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()((set) => ({
  // State
  activeTab: 'credits',
  offlineMode: false,
  isSyncing: false,

  // Actions
  setActiveTab: (activeTab) => set({ activeTab }),
  setOfflineMode: (offlineMode) => set({ offlineMode }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
}));
