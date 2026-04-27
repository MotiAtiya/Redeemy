import { create } from 'zustand';

export interface EntityState<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
}

export interface EntityActions<T> {
  setItems: (items: T[]) => void;
  addItem: (item: T) => void;
  updateItem: (id: string, changes: Partial<T>) => void;
  removeItem: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export type EntityStore<T> = EntityState<T> & EntityActions<T>;

/** Creates a Zustand store with standard CRUD state + actions for a typed entity.
 *  All entities must have a string `id` field. */
export function createEntityStore<T extends { id: string }>() {
  return create<EntityStore<T>>()((set) => ({
    items: [],
    isLoading: false,
    error: null,

    setItems: (items) => set({ items }),
    addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
    updateItem: (id, changes) =>
      set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...changes } : i)) })),
    removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }));
}
