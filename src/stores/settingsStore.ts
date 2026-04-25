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
  creditReminderDays: number;
  setCreditReminderDays: (days: number) => void;
  warrantyReminderDays: number;
  setWarrantyReminderDays: (days: number) => void;
  subscriptionReminderDays: number;
  setSubscriptionReminderDays: (days: number) => void;
  creditLastDayAlert: boolean;
  setCreditLastDayAlert: (enabled: boolean) => void;
  warrantyLastDayAlert: boolean;
  setWarrantyLastDayAlert: (enabled: boolean) => void;
  subscriptionLastDayAlert: boolean;
  setSubscriptionLastDayAlert: (enabled: boolean) => void;
  occasionEarlyReminderDays: number;
  setOccasionEarlyReminderDays: (days: number) => void;
  occasionOnDayAlert: boolean;
  setOccasionOnDayAlert: (enabled: boolean) => void;
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
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
      creditReminderDays: 7,
      setCreditReminderDays: (creditReminderDays) => set({ creditReminderDays }),
      warrantyReminderDays: 7,
      setWarrantyReminderDays: (warrantyReminderDays) => set({ warrantyReminderDays }),
      subscriptionReminderDays: 3,
      setSubscriptionReminderDays: (subscriptionReminderDays) => set({ subscriptionReminderDays }),
      creditLastDayAlert: true,
      setCreditLastDayAlert: (creditLastDayAlert) => set({ creditLastDayAlert }),
      warrantyLastDayAlert: true,
      setWarrantyLastDayAlert: (warrantyLastDayAlert) => set({ warrantyLastDayAlert }),
      subscriptionLastDayAlert: true,
      setSubscriptionLastDayAlert: (subscriptionLastDayAlert) => set({ subscriptionLastDayAlert }),
      occasionEarlyReminderDays: 0,
      setOccasionEarlyReminderDays: (occasionEarlyReminderDays) => set({ occasionEarlyReminderDays }),
      occasionOnDayAlert: true,
      setOccasionOnDayAlert: (occasionOnDayAlert) => set({ occasionOnDayAlert }),
      currency: 'ILS',
      setCurrency: (currency) => set({ currency }),
      dateFormat: 'DD/MM/YYYY',
      setDateFormat: (dateFormat) => set({ dateFormat }),
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
