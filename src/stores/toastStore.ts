import { create } from 'zustand';

export type ToastVariant = 'success' | 'info';

export interface ToastEntry {
  /** Monotonically-increasing id so the renderer can re-trigger animation
   * even when the same message is shown twice in a row. */
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastStore {
  current: ToastEntry | null;
  show: (message: string, variant?: ToastVariant) => void;
  clear: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  current: null,
  show: (message, variant = 'success') =>
    set({ current: { id: nextId++, message, variant } }),
  clear: () => set({ current: null }),
}));

/**
 * Imperative helper so call sites don't need a hook. Safe to call from
 * anywhere — the global `<Toast />` mounted in the root layout subscribes
 * to the store and animates the new entry in.
 *
 *   showToast(t('toasts.created.credit'));
 *   showToast(t('common.error'), 'info');
 */
export function showToast(message: string, variant: ToastVariant = 'success'): void {
  useToastStore.getState().show(message, variant);
}
