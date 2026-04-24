import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage } from '@/lib/i18n';

export type ThemeMode = 'light' | 'dark' | 'system';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type CurrencyCode = 'ILS' | 'USD' | 'EUR' | 'GBP';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

interface SettingsStore {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  expiryNotificationEnabled: boolean;
  setExpiryNotificationEnabled: (enabled: boolean) => void;
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
  defaultReminderDays: number;
  setDefaultReminderDays: (days: number) => void;
  notificationHour: number;
  notificationMinute: number;
  setNotificationTime: (hour: number, minute: number) => void;
  familyId: string | null;
  setFamilyId: (id: string | null) => void;
  familyCreditsMigrated: boolean;
  setFamilyCreditsMigrated: (done: boolean) => void;
  hasOnboarded: boolean;
  setHasOnboarded: (done: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      themeMode: 'system',
      setThemeMode: (themeMode) => set({ themeMode }),
      language: 'system',
      setLanguage: (language) => set({ language }),
      notificationsEnabled: true,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      expiryNotificationEnabled: true,
      setExpiryNotificationEnabled: (expiryNotificationEnabled) => set({ expiryNotificationEnabled }),
      currency: 'ILS',
      setCurrency: (currency) => set({ currency }),
      dateFormat: 'DD/MM/YYYY',
      setDateFormat: (dateFormat) => set({ dateFormat }),
      defaultReminderDays: 7,
      setDefaultReminderDays: (defaultReminderDays) => set({ defaultReminderDays }),
      notificationHour: 9,
      notificationMinute: 0,
      setNotificationTime: (notificationHour, notificationMinute) => set({ notificationHour, notificationMinute }),
      familyId: null,
      setFamilyId: (familyId) => set({ familyId }),
      familyCreditsMigrated: false,
      setFamilyCreditsMigrated: (familyCreditsMigrated) => set({ familyCreditsMigrated }),
      hasOnboarded: false,
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
    }),
    {
      name: 'redeemy-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
