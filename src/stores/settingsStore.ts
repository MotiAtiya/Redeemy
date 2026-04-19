import { create } from 'zustand';
import type { AppLanguage } from '@/lib/i18n';

export type ThemeMode = 'light' | 'dark' | 'system';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';

interface SettingsStore {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
  defaultReminderDays: number;
  setDefaultReminderDays: (days: number) => void;
  notificationHour: number;
  setNotificationHour: (hour: number) => void;
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  themeMode: 'system',
  setThemeMode: (themeMode) => set({ themeMode }),
  language: 'system',
  setLanguage: (language) => set({ language }),
  notificationsEnabled: true,
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  dateFormat: 'DD/MM/YYYY',
  setDateFormat: (dateFormat) => set({ dateFormat }),
  defaultReminderDays: 7,
  setDefaultReminderDays: (defaultReminderDays) => set({ defaultReminderDays }),
  notificationHour: 9,
  setNotificationHour: (notificationHour) => set({ notificationHour }),
}));
