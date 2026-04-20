import { create } from 'zustand';
import type { Family } from '@/types/familyTypes';

interface FamilyState {
  family: Family | null;
  isLoading: boolean;
  error: string | null;
}

interface FamilyActions {
  setFamily: (family: Family | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type FamilyStore = FamilyState & FamilyActions;

export const useFamilyStore = create<FamilyStore>()((set) => ({
  family: null,
  isLoading: false,
  error: null,
  setFamily: (family) => set({ family }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
