import { create } from 'zustand';
import { type Credit } from '@/types/creditTypes';

interface CreditsState {
  credits: Credit[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
}

interface CreditsActions {
  setCredits: (credits: Credit[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  /** Optimistic add — prepends to the list immediately before Firestore write */
  addCredit: (credit: Credit) => void;
  /** Optimistic remove — used on delete or redemption */
  removeCredit: (creditId: string) => void;
  /** Optimistic update — used on edit or status change */
  updateCredit: (creditId: string, changes: Partial<Credit>) => void;
}

type CreditsStore = CreditsState & CreditsActions;

export const useCreditsStore = create<CreditsStore>()((set) => ({
  // State
  credits: [],
  isLoading: false,
  error: null,
  searchQuery: '',

  // Actions — synchronous setters only; async Firestore logic lives in src/lib/
  setCredits: (credits) => set({ credits }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  addCredit: (credit) =>
    set((state) => ({ credits: [credit, ...state.credits] })),

  removeCredit: (creditId) =>
    set((state) => ({
      credits: state.credits.filter((c) => c.id !== creditId),
    })),

  updateCredit: (creditId, changes) =>
    set((state) => ({
      credits: state.credits.map((c) =>
        c.id === creditId ? { ...c, ...changes } : c,
      ),
    })),

}));
