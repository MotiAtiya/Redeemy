import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Slide {
  id: string;
  emoji: string;
  titleKey: string;
  subtitleKey: string;
  isNotification?: boolean;
}

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    emoji: '🎉',
    titleKey: 'onboarding.welcome.title',
    subtitleKey: 'onboarding.welcome.subtitle',
  },
  {
    id: 'credits',
    emoji: '💳',
    titleKey: 'onboarding.credits.title',
    subtitleKey: 'onboarding.credits.subtitle',
  },
  {
    id: 'warranties',
    emoji: '🛡️',
    titleKey: 'onboarding.warranties.title',
    subtitleKey: 'onboarding.warranties.subtitle',
  },
  {
    id: 'subscriptions',
    emoji: '🔄',
    titleKey: 'onboarding.subscriptions.title',
    subtitleKey: 'onboarding.subscriptions.subtitle',
  },
  {
    id: 'family',
    emoji: '👨‍👩‍👧',
    titleKey: 'onboarding.family.title',
    subtitleKey: 'onboarding.family.subtitle',
  },
  {
    id: 'notifications',
    emoji: '🔔',
    titleKey: 'onboarding.notifications.title',
    subtitleKey: 'onboarding.notifications.subtitle',
    isNotification: true,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded);
  const setHasOnboarded = useSettingsStore((s) => s.setHasOnboarded);

  // If user is viewing again from Settings, hasOnboarded is already true
  const isViewingAgain = hasOnboarded;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function animateTransition(callback: () => void) {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }

  function goToPrev() {
    animateTransition(() => setCurrentIndex((prev) => prev - 1));
  }

  function goToNext() {
    if (currentIndex >= SLIDES.length - 1) {
      animateTransition(() => setIsComplete(true));
      return;
    }
    animateTransition(() => setCurrentIndex((prev) => prev + 1));
  }

  async function handleAllowNotifications() {
    await Notifications.requestPermissionsAsync();
    animateTransition(() => setIsComplete(true));
  }

  function handleSkipNotifications() {
    animateTransition(() => setIsComplete(true));
  }

  function skipAll() {
    setHasOnboarded(true);
    router.replace('/(tabs)');
  }

  function completeAndNavigate(destination?: 'credit' | 'warranty' | 'subscription') {
    setHasOnboarded(true);
    router.replace('/(tabs)');
    if (destination) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (destination === 'credit') router.push('/add-credit');
          else if (destination === 'warranty') router.push('/add-warranty');
          else if (destination === 'subscription') router.push('/add-subscription');
        });
      });
    }
  }

  const slide = SLIDES[currentIndex];

  // ─── Completion screen ───────────────────────────────────────────────────
  if (isComplete) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.slideContent}>
            <View style={[styles.emojiCircle, { backgroundColor: colors.primarySurface }]}>
              <Text style={styles.emoji}>✅</Text>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('onboarding.complete.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('onboarding.complete.subtitle')}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.primarySurface, borderWidth: 0 }]}
              onPress={() => completeAndNavigate('credit')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                {t('onboarding.complete.addCredit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.primarySurface, borderWidth: 0 }]}
              onPress={() => completeAndNavigate('warranty')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                {t('onboarding.complete.addWarranty')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.primarySurface, borderWidth: 0 }]}
              onPress={() => completeAndNavigate('subscription')}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
                {t('onboarding.complete.addSubscription')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => completeAndNavigate()}
            >
              <Text style={styles.primaryButtonText}>{t('onboarding.complete.goToApp')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ─── Slide screen ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Back arrow — visible from slide 2 onwards */}
      {currentIndex > 0 && (
        <TouchableOpacity
          style={[styles.topAction, { left: 16 }]}
          onPress={goToPrev}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={24}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      )}

      {/* Close (viewing again) or Skip (first time) */}
      {isViewingAgain ? (
        <TouchableOpacity
          style={[styles.topAction, { right: 16 }]}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={22} color={colors.textTertiary} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.topAction, { right: 16 }]}
          onPress={skipAll}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.skipText, { color: colors.textTertiary }]}>
            {t('onboarding.skip')}
          </Text>
        </TouchableOpacity>
      )}

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Illustration */}
        <View style={styles.slideContent}>
          <View style={[styles.emojiCircle, { backgroundColor: colors.primarySurface }]}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t(slide.titleKey)}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t(slide.subtitleKey)}
          </Text>
        </View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? colors.primary : colors.separator,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Actions */}
        {slide.isNotification ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleAllowNotifications}
            >
              <Text style={styles.primaryButtonText}>
                {t('onboarding.notifications.allow')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textLink} onPress={handleSkipNotifications}>
              <Text style={[styles.textLinkLabel, { color: colors.textTertiary }]}>
                {t('onboarding.notifications.later')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={goToNext}
            >
              <Text style={styles.primaryButtonText}>{t('onboarding.continue')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topAction: {
    position: 'absolute',
    top: 56,
    zIndex: 10,
    padding: 8,
  },
  skipText: { fontSize: 15 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 32,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: { fontSize: 72 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  textLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textLinkLabel: { fontSize: 15 },
});
