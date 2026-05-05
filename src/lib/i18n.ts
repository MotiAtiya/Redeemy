import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import RNRestart from 'react-native-restart';

import en from '@/locales/en.json';
import he from '@/locales/he.json';

export type AppLanguage = 'system' | 'en' | 'he';

const LANG_KEY = '@redeemy/language';

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export async function getSavedLanguage(): Promise<AppLanguage> {
  try {
    const val = await AsyncStorage.getItem(LANG_KEY);
    if (val === 'en' || val === 'he' || val === 'system') return val;
  } catch {}
  return 'system';
}

export async function saveLanguage(lang: AppLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {}
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** Resolves 'system' to the actual locale code */
export function resolveLanguage(pref: AppLanguage): 'en' | 'he' {
  if (pref === 'system') {
    try {
      const languageCode = getLocales()[0]?.languageCode ?? 'en';
      return languageCode === 'he' ? 'he' : 'en';
    } catch {
      return 'en';
    }
  }
  return pref;
}

// ---------------------------------------------------------------------------
// RTL
// ---------------------------------------------------------------------------

/** Returns true if a restart is needed (RTL direction changed) */
export function applyRTL(language: 'en' | 'he'): boolean {
  const shouldBeRTL = language === 'he';
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.forceRTL(shouldBeRTL);
    I18nManager.allowRTL(shouldBeRTL);
    return true;
  }
  return false;
}

export function getIsRTL(): boolean {
  return I18nManager.isRTL;
}

/**
 * Restart the app so a freshly-applied I18nManager.forceRTL() takes visual effect.
 *
 * iOS uses Updates.reloadAsync() — under the new architecture (bridgeless),
 * react-native-restart's bare RCTTriggerReloadCommandListeners() leaves the
 * RCTHost in a half-recreated state and the app appears to shut down. expo-updates
 * does the launcher/bundle-URL prep that bridgeless reload needs.
 *
 * Android uses RNRestart — Updates.reloadAsync() only recreates the JS context,
 * so the existing Activity keeps its old layoutDirection and the RTL flip never
 * shows up. RNRestart kills and re-launches the process via ProcessPhoenix.
 */
export function restartApp(): void {
  if (Platform.OS === 'ios') {
    Updates.reloadAsync();
  } else {
    RNRestart.restart();
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initI18n(language: 'en' | 'he') {
  if (i18next.isInitialized) {
    i18next.changeLanguage(language);
    return;
  }
  i18next.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    pluralSeparator: '_',
  });
}

export default i18next;
