import { create } from 'zustand';
import type { Subscription } from '@/types/subscriptionTypes';

interface SubscriptionsState {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionsActions {
  setSubscriptions: (subscriptions: Subscription[]) => void;
  addSubscription: (subscription: Subscription) => void;
  updateSubscription: (id: string, changes: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useSubscriptionsStore = create<SubscriptionsState & SubscriptionsActions>()((set) => ({
  subscriptions: [],
  isLoading: false,
  error: null,
  setSubscriptions: (subscriptions) => set({ subscriptions }),
  addSubscription: (subscription) => set((s) => ({ subscriptions: [subscription, ...s.subscriptions] })),
  updateSubscription: (id, changes) => set((s) => ({
    subscriptions: s.subscriptions.map((sub) => sub.id === id ? { ...sub, ...changes } : sub),
  })),
  removeSubscription: (id) => set((s) => ({ subscriptions: s.subscriptions.filter((sub) => sub.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
