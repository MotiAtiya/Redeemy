import { create } from 'zustand';
import { type Occasion } from '@/types/occasionTypes';

interface OccasionsState {
  occasions: Occasion[];
  isLoading: boolean;
  error: string | null;
}

interface OccasionsActions {
  setOccasions: (occasions: Occasion[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addOccasion: (occasion: Occasion) => void;
  removeOccasion: (occasionId: string) => void;
  updateOccasion: (occasionId: string, changes: Partial<Occasion>) => void;
}

type OccasionsStore = OccasionsState & OccasionsActions;

export const useOccasionsStore = create<OccasionsStore>()((set) => ({
  occasions: [],
  isLoading: false,
  error: null,

  setOccasions: (occasions) => set({ occasions }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  addOccasion: (occasion) =>
    set((state) => ({ occasions: [occasion, ...state.occasions] })),

  removeOccasion: (occasionId) =>
    set((state) => ({
      occasions: state.occasions.filter((o) => o.id !== occasionId),
    })),

  updateOccasion: (occasionId, changes) =>
    set((state) => ({
      occasions: state.occasions.map((o) =>
        o.id === occasionId ? { ...o, ...changes } : o,
      ),
    })),
}));
