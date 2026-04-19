import { create } from 'zustand';
import type { AppLanguage } from '@/lib/i18n';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsStore {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  themeMode: 'system',
  setThemeMode: (themeMode) => set({ themeMode }),
  language: 'system',
  setLanguage: (language) => set({ language }),
}));
