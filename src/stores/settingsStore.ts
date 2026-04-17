import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsStore {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  themeMode: 'system',
  setThemeMode: (themeMode) => set({ themeMode }),
}));
