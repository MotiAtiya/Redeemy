import { create } from 'zustand';

type TabName = 'credits' | 'stores' | 'history' | 'more';

interface UIState {
  activeTab: TabName;
  offlineMode: boolean;
}

interface UIActions {
  setActiveTab: (tab: TabName) => void;
  setOfflineMode: (offline: boolean) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()((set) => ({
  // State
  activeTab: 'credits',
  offlineMode: false,

  // Actions
  setActiveTab: (activeTab) => set({ activeTab }),
  setOfflineMode: (offlineMode) => set({ offlineMode }),
}));
