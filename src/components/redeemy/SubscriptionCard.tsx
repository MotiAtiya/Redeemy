import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { formatCurrency } from '@/lib/formatCurrency';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import {
  SubscriptionBillingCycle,
  SubscriptionIntent,
  type Subscription,
} from '@/types/subscriptionTypes';
import {
  daysUntilBilling,
  normalizeToMonthlyAgorot,
} from '@/lib/subscriptionUtils';
import type { AppColors } from '@/constants/colors';
import type { ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------------------
// Intent configuration
// ---------------------------------------------------------------------------

interface IntentConfig {
  icon: IoniconsName;
  labelKey: string;
  textColor: keyof AppColors;
  bgColor: keyof AppColors;
}

const INTENT_CONFIG: Record<SubscriptionIntent, IntentConfig> = {
  [SubscriptionIntent.RENEW]: {
    icon: 'refresh-outline',
    labelKey: 'subscriptions.intent.renew',
    textColor: 'urgencyGreen',
    bgColor: 'urgencyGreenSurface',
  },
  [SubscriptionIntent.CANCEL]: {
    icon: 'close-circle-outline',
    labelKey: 'subscriptions.intent.cancel',
    textColor: 'urgencyRed',
    bgColor: 'urgencyRedSurface',
  },
  [SubscriptionIntent.CHECK]: {
    icon: 'eye-outline',
    labelKey: 'subscriptions.intent.check',
    textColor: 'textSecondary',
    bgColor: 'separator',
  },
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      marginHorizontal: 16,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      gap: 12,
    },
    // Left icon column
    iconColumn: { alignItems: 'center', width: 48, position: 'relative' },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    memberAvatar: {
      position: 'absolute',
      bottom: -4,
      end: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    memberAvatarText: { fontSize: 8, fontWeight: '700', color: '#FFFFFF' },
    // Right content column
    contentColumn: { flex: 1, gap: 4 },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    serviceName: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    // Intent badge
    intentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 10,
    },
    intentBadgeText: { fontSize: 11, fontWeight: '600' },
    // Amount line
    amountText: { fontSize: 15, color: colors.textSecondary },
    amountFree: { fontSize: 15, color: colors.textTertiary },
    amountTrial: { fontSize: 15, color: colors.urgencyAmber },
    urgencyBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
    },
    urgencyBadgeText: { fontSize: 11, fontWeight: '600' },
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  subscription: Subscription;
  onPress: () => void;
}

export function SubscriptionCard({ subscription: sub, onPress }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const currencySymbol = CURRENCY_SYMBOLS[sub.currency ?? 'ILS'];
  const currentUid = useAuthStore((s) => s.currentUser?.uid);

  const categoryMeta = SUBSCRIPTION_CATEGORIES.find((c) => c.id === sub.category);
  const intentConfig = INTENT_CONFIG[sub.intent];

  // Family member avatar
  const showMemberAvatar =
    sub.familyId &&
    sub.createdBy &&
    sub.createdByName &&
    sub.createdBy !== currentUid;
  const memberInitials = showMemberAvatar
    ? sub.createdByName!
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : null;

  // Urgency: days until billing (or days until trial ends for free trial)
  const daysForUrgency = useMemo(() => {
    if (sub.isFreeTrial && sub.trialEndsDate) {
      const msPerDay = 1000 * 60 * 60 * 24;
      return Math.max(0, Math.ceil((sub.trialEndsDate.getTime() - Date.now()) / msPerDay));
    }
    return daysUntilBilling(sub);
  }, [sub]);

  // Urgency badge colors
  const { urgencyText, urgencyBg } = useMemo(() => {
    if (daysForUrgency < 7) {
      return { urgencyText: colors.urgencyRed, urgencyBg: colors.urgencyRedSurface };
    }
    if (daysForUrgency <= 30) {
      return { urgencyText: colors.urgencyAmber, urgencyBg: colors.urgencyAmberSurface };
    }
    return { urgencyText: colors.urgencyGreen, urgencyBg: colors.urgencyGreenSurface };
  }, [daysForUrgency, colors]);

  // Amount display
  const amountText = useMemo(() => {
    if (sub.isFree) return null; // handled separately
    if (sub.isFreeTrial && sub.trialEndsDate) return null; // handled separately
    if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL) {
      const monthly = normalizeToMonthlyAgorot(sub);
      return t('subscriptionCard.annualAmount', {
        amount: formatCurrency(sub.amountAgorot, currencySymbol),
        monthly: formatCurrency(monthly, currencySymbol),
      });
    }
    return t('subscriptionCard.monthlyAmount', {
      amount: formatCurrency(sub.amountAgorot, currencySymbol),
    });
  }, [sub, t]);

  // Free trial text
  const trialText = useMemo(() => {
    if (!sub.isFreeTrial || !sub.trialEndsDate) return null;
    if (daysForUrgency === 0) return t('subscriptionCard.freeTrialEndsToday');
    return t('subscriptionCard.freeTrial', { days: daysForUrgency });
  }, [sub, daysForUrgency, t]);

  // Urgency badge label
  const urgencyLabel = useMemo(() => {
    if (daysForUrgency === 0) return t('badge.today');
    if (daysForUrgency === 1) return t('badge.oneDay');
    if (daysForUrgency < 7) return t('badge.days', { days: daysForUrgency });
    if (daysForUrgency < 30) {
      const weeks = Math.ceil(daysForUrgency / 7);
      return weeks === 1 ? t('badge.oneWeek') : t('badge.weeks', { weeks });
    }
    const months = Math.ceil(daysForUrgency / 30);
    return months === 1 ? t('badge.oneMonth') : t('badge.months', { months });
  }, [daysForUrgency, t]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={sub.serviceName}
    >
      <View style={styles.content}>
        {/* Left: category icon + optional member avatar */}
        <View style={styles.iconColumn}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={categoryMeta?.icon ?? 'repeat-outline'}
              size={24}
              color={colors.primary}
            />
          </View>
          {showMemberAvatar && (
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{memberInitials}</Text>
            </View>
          )}
        </View>

        {/* Right: content */}
        <View style={styles.contentColumn}>
          {/* Row 1: service name + intent badge */}
          <View style={styles.topRow}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {sub.serviceName}
            </Text>
            <View
              style={[
                styles.intentBadge,
                { backgroundColor: colors[intentConfig.bgColor] as string },
              ]}
            >
              <Ionicons
                name={intentConfig.icon}
                size={11}
                color={colors[intentConfig.textColor] as string}
              />
              <Text
                style={[
                  styles.intentBadgeText,
                  { color: colors[intentConfig.textColor] as string },
                ]}
              >
                {t(intentConfig.labelKey)}
              </Text>
            </View>
          </View>

          {/* Row 2: amount / free / trial */}
          {sub.isFree ? (
            <Text style={styles.amountFree}>{t('subscriptionCard.free')}</Text>
          ) : trialText ? (
            <Text style={styles.amountTrial}>{trialText}</Text>
          ) : (
            <Text style={styles.amountText}>{amountText}</Text>
          )}

          {/* Row 3: urgency badge */}
          <View style={[styles.urgencyBadge, { backgroundColor: urgencyBg, borderColor: urgencyText, alignSelf: 'flex-start' }]}>
            <Text style={[styles.urgencyBadgeText, { color: urgencyText }]}>
              {urgencyLabel}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
