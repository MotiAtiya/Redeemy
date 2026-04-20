import { create } from 'zustand';
import type { Warranty } from '@/types/warrantyTypes';

interface WarrantiesState {
  warranties: Warranty[];
  isLoading: boolean;
  error: string | null;
}

interface WarrantiesActions {
  setWarranties: (warranties: Warranty[]) => void;
  addWarranty: (warranty: Warranty) => void;
  updateWarranty: (id: string, changes: Partial<Warranty>) => void;
  removeWarranty: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWarrantiesStore = create<WarrantiesState & WarrantiesActions>()((set) => ({
  warranties: [],
  isLoading: false,
  error: null,
  setWarranties: (warranties) => set({ warranties }),
  addWarranty: (warranty) => set((s) => ({ warranties: [warranty, ...s.warranties] })),
  updateWarranty: (id, changes) => set((s) => ({
    warranties: s.warranties.map((w) => w.id === id ? { ...w, ...changes } : w),
  })),
  removeWarranty: (id) => set((s) => ({ warranties: s.warranties.filter((w) => w.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
