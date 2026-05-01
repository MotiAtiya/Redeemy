import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Linking,
  Share,
  I18nManager,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore, type DateFormat, type CurrencyCode, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useAppTheme, useIsDark } from '@/hooks/useAppTheme';
import { getInitials } from '@/lib/initials';
import { getAvatarColor } from '@/lib/avatarColor';
import { openStoreReview } from '@/lib/storeReview';

const logoLight = require('../../../assets/images/logo-light.png');
const logoDark = require('../../../assets/images/logo-dark.png');
import * as Updates from 'expo-updates';
import { saveLanguage, resolveLanguage, applyRTL, type AppLanguage } from '@/lib/i18n';
import i18n from '@/lib/i18n';
import type { AppColors } from '@/constants/colors';

type ThemeMode = 'light' | 'dark' | 'system';

const APP_IN_STORE = false;

const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
];


function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 16, paddingBottom: 32 },
    screenTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 24,
      alignSelf: 'flex-start',
    },
    section: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      marginBottom: 8,
      marginStart: 4,
      alignSelf: 'flex-start',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    accountInfo: { flex: 1 },
    displayName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, alignSelf: 'flex-start' },
    email: { fontSize: 13, color: colors.textSecondary, marginTop: 1, alignSelf: 'flex-start' },
    separator: { height: 1, backgroundColor: colors.separator, marginStart: 16 },
    settingsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    settingsLabel: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
    settingsSubtitle: { fontSize: 13, color: colors.textTertiary, marginEnd: 4 },
    // Appearance sheet
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.separator,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, alignSelf: 'flex-start' },
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
    },
    themeOptionLabel: { fontSize: 16, color: colors.textPrimary, alignSelf: 'flex-start' },
    themeOptionEmoji: { fontSize: 20 },
    themeSeparator: { height: 1, backgroundColor: colors.separator },
    aboutCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    aboutLabel: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
    aboutSubtitle: { fontSize: 12, color: colors.textTertiary, alignSelf: 'flex-start', marginTop: 1 },
    aboutValue: { fontSize: 15, color: colors.textSecondary },
    aboutAppName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 4,
    },
    aboutTagline: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 6,
    },
    aboutVersion: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    // Language sheet (reuses sheet/sheetHandle/sheetTitle/themeOption styles)
    langOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: 14,
    },
    langOptionLabel: { fontSize: 16, color: colors.textPrimary, alignSelf: 'flex-start' },
    langSeparator: { height: 1, backgroundColor: colors.separator },
    aboutHeader: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 16,
    },
    aboutLogoImage: {
      width: 88,
      height: 88,
      borderRadius: 20,
      marginBottom: 14,
    },
  });
}

export default function MoreScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isDark = useIsDark();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light',  label: t('more.theme.light'),  icon: '☀️' },
    { mode: 'dark',   label: t('more.theme.dark'),   icon: '🌙' },
    { mode: 'system', label: t('more.theme.system'), icon: '📱' },
  ];

  const LANGUAGE_OPTIONS: { value: AppLanguage; label: string }[] = [
    { value: 'system', label: t('more.language.system')  },
    { value: 'en',     label: t('more.language.english') },
    { value: 'he',     label: t('more.language.hebrew')  },
  ];

  const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
    { value: 'ILS', label: `₪  ${t('more.currency.ILS')}` },
    { value: 'USD', label: `$  ${t('more.currency.USD')}` },
    { value: 'EUR', label: `€  ${t('more.currency.EUR')}` },
    { value: 'GBP', label: `£  ${t('more.currency.GBP')}` },
  ];

  const currentUser = useAuthStore((s) => s.currentUser);
  const family = useFamilyStore((s) => s.family);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const setDateFormat = useSettingsStore((s) => s.setDateFormat);
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);

  async function handleShareApp() {
    try {
      await Share.share({
        message: t('more.about.shareMessage'),
        url: 'https://apps.apple.com/app/id6744642246', // TODO: replace with actual App Store ID
      });
    } catch {
      // user dismissed share sheet — no action needed
    }
  }

  const [showAppearanceSheet, setShowAppearanceSheet] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showDateFormatSheet, setShowDateFormatSheet] = useState(false);
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);

  const themeModeLabel = THEME_OPTIONS.find((o) => o.mode === themeMode)?.label ?? t('more.theme.system');
  const languageLabel = LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ?? t('more.language.system');

  async function handleLanguageChange(newLang: AppLanguage) {
    const resolved = resolveLanguage(newLang);
    const needsRestart = I18nManager.isRTL !== (resolved === 'he');
    setShowLanguageSheet(false);
    if (needsRestart) {
      Alert.alert(
        t('more.language.restartTitle'),
        t('more.language.restartMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('more.language.restartNow'),
            onPress: async () => {
              await saveLanguage(newLang);
              await i18n.changeLanguage(resolved);
              setLanguage(newLang);
              applyRTL(resolved);
              Updates.reloadAsync();
            },
          },
        ]
      );
    } else {
      await saveLanguage(newLang);
      await i18n.changeLanguage(resolved);
      setLanguage(newLang);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>{t('more.title')}</Text>

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('more.sections.account')}</Text>
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/account')}
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <View style={styles.accountRow}>
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(currentUser?.uid) }]}>
                <Text style={styles.avatarInitial}>
                  {currentUser?.displayName
                    ? getInitials(currentUser.displayName)
                    : currentUser?.email?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.accountInfo}>
                {currentUser?.displayName ? (
                  <Text style={styles.displayName}>{currentUser.displayName}</Text>
                ) : null}
                <Text style={styles.email} numberOfLines={1}>
                  {currentUser?.email ?? ''}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Family section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('family.sectionLabel')}</Text>
          <View style={styles.card}>
            {family ? (
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => router.push(`/family/${family.id}`)}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingsLabel, { fontWeight: '600' }]}>{family.name}</Text>
                </View>
                <Text style={styles.settingsSubtitle}>
                  {t('family.memberCount', { count: family.memberList.length })}
                </Text>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => router.push('/family/create')}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsLabel}>{t('family.createRow')}</Text>
                  </View>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
                </TouchableOpacity>
                <View style={styles.separator} />
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={() => router.push('/family/join')}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Ionicons name="link-outline" size={20} color={colors.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingsLabel}>{t('family.joinRow')}</Text>
                  </View>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Settings section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('more.sections.settings')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => setShowAppearanceSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('more.appearance')}, ${themeModeLabel}`}
            >
              <Ionicons name="contrast-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.appearance')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>{themeModeLabel}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => setShowLanguageSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={`${t('more.language.label')}, ${languageLabel}`}
            >
              <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.language.label')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>{languageLabel}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => router.push('/notification-settings')}
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.notifications.label')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>
                {notificationsEnabled ? t('common.on') : t('common.off')}
              </Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.settingsRow} onPress={() => setShowDateFormatSheet(true)} accessibilityRole="button">
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.dateFormat.label')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>{dateFormat}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.settingsRow} onPress={() => setShowCurrencySheet(true)} accessibilityRole="button">
              <Ionicons name="cash-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.currency.label')}</Text>
              </View>
              <Text style={styles.settingsSubtitle}>{CURRENCY_SYMBOLS[currency]} {currency}</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* General section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('more.sections.general')}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => router.push('/history')}
              accessibilityRole="button"
            >
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('more.historyRow')}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => router.push('/onboarding')}
              accessibilityRole="button"
            >
              <Ionicons name="play-circle-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>{t('onboarding.viewTour')}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('more.sections.about')}</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeader}>
              <Image
                source={isDark ? logoDark : logoLight}
                style={styles.aboutLogoImage}
                contentFit="contain"
              />
              <Text style={styles.aboutAppName}>Redeemy</Text>
              <Text style={styles.aboutTagline}>{t('more.about.tagline')}</Text>
              <Text style={styles.aboutVersion}>{t('more.about.version')}</Text>
            </View>
          </View>
        </View>

        {/* Support section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('more.sections.support')}</Text>
          <View style={styles.aboutCard}>
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => Linking.openURL('mailto:a.moti96@gmail.com?subject=Redeemy%20Support')}
            >
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.aboutLabel}>{t('more.about.contact')}</Text>
                <Text style={styles.aboutSubtitle}>a.moti96@gmail.com</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={[styles.aboutRow, !APP_IN_STORE && { opacity: 0.4 }]}
              onPress={APP_IN_STORE ? openStoreReview : undefined}
              disabled={!APP_IN_STORE}
            >
              <Ionicons name="star-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.aboutLabel}>{t('more.about.rateUs')}</Text>
                <Text style={styles.aboutSubtitle}>{t('more.about.rateUsSubtitle')}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity
              style={[styles.aboutRow, !APP_IN_STORE && { opacity: 0.4 }]}
              onPress={APP_IN_STORE ? handleShareApp : undefined}
              disabled={!APP_IN_STORE}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.aboutLabel}>{t('more.about.shareApp')}</Text>
                <Text style={styles.aboutSubtitle}>{t('more.about.shareAppSubtitle')}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>



      </ScrollView>

      {/* Appearance bottom sheet */}
      <Modal
        visible={showAppearanceSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAppearanceSheet(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowAppearanceSheet(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.theme.title')}</Text>

          {THEME_OPTIONS.map((option, index) => (
            <View key={option.mode}>
              <TouchableOpacity
                style={styles.themeOption}
                onPress={() => {
                  setThemeMode(option.mode);
                  setShowAppearanceSheet(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: themeMode === option.mode }}
                accessibilityLabel={option.label}
              >
                <Text style={styles.themeOptionEmoji}>{option.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.themeOptionLabel}>{option.label}</Text>
                </View>
                {themeMode === option.mode && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              {index < THEME_OPTIONS.length - 1 && <View style={styles.themeSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Date Format bottom sheet */}
      <Modal visible={showDateFormatSheet} transparent animationType="slide" onRequestClose={() => setShowDateFormatSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDateFormatSheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.dateFormat.title')}</Text>
          {DATE_FORMAT_OPTIONS.map((option, index) => (
            <View key={option.value}>
              <TouchableOpacity
                style={styles.themeOption}
                onPress={() => { setDateFormat(option.value); setShowDateFormatSheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: dateFormat === option.value }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.themeOptionLabel}>{option.label}</Text>
                </View>
                {dateFormat === option.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < DATE_FORMAT_OPTIONS.length - 1 && <View style={styles.themeSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Currency bottom sheet */}
      <Modal visible={showCurrencySheet} transparent animationType="slide" onRequestClose={() => setShowCurrencySheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCurrencySheet(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.currency.title')}</Text>
          {CURRENCY_OPTIONS.map((option, index) => (
            <View key={option.value}>
              <TouchableOpacity
                style={styles.themeOption}
                onPress={() => { setCurrency(option.value); setShowCurrencySheet(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: currency === option.value }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.themeOptionLabel}>{option.label}</Text>
                </View>
                {currency === option.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {index < CURRENCY_OPTIONS.length - 1 && <View style={styles.themeSeparator} />}
            </View>
          ))}
        </View>
      </Modal>

      {/* Language bottom sheet */}
      <Modal
        visible={showLanguageSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageSheet(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowLanguageSheet(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('more.language.title')}</Text>

          {LANGUAGE_OPTIONS.map((option, index) => (
            <View key={option.value}>
              <TouchableOpacity
                style={styles.langOption}
                onPress={() => handleLanguageChange(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: language === option.value }}
                accessibilityLabel={option.label}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.langOptionLabel}>{option.label}</Text>
                </View>
                {language === option.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              {index < LANGUAGE_OPTIONS.length - 1 && <View style={styles.langSeparator} />}
            </View>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
