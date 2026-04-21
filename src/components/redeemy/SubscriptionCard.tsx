import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDate } from '@/lib/formatDate';
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
    cardDimmed: { opacity: 0.6 },
    cancelledBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: colors.separator,
    },
    cancelledBadgeText: { fontSize: 11, fontWeight: '600', color: colors.textTertiary },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    // Amount block (start side — right in RTL, left in LTR)
    amountBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 84,
      position: 'relative',
    },
    amountNumber: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.primary,
      letterSpacing: -0.5,
      textAlign: 'center',
    },
    amountNumberFree: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textTertiary,
    },
    amountNumberTrial: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.urgencyAmber,
    },
    amountCents: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0,
    },
    amountPeriod: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    // Content column — alignItems: 'flex-start' flips to right in RTL, same as CreditCard
    contentColumn: { flex: 1, gap: 5, alignItems: 'flex-start' },
    serviceName: {
      fontSize: 16,
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
    // Urgency badge
    urgencyBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
    },
    urgencyBadgeText: { fontSize: 11, fontWeight: '600' },
    // Category icon circle (end side — left in RTL, right in LTR)
    categoryIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
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
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  subscription: Subscription;
  onPress: () => void;
  variant?: 'active' | 'cancelled';
}

export function SubscriptionCard({ subscription: sub, onPress, variant = 'active' }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const currencySymbol = CURRENCY_SYMBOLS[sub.currency ?? 'ILS'];
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const currentUid = useAuthStore((s) => s.currentUser?.uid);

  const isCancelled = variant === 'cancelled';
  const categoryMeta = SUBSCRIPTION_CATEGORIES.find((c) => c.id === sub.category);
  const intentConfig = INTENT_CONFIG[sub.intent];
  const cancelledDate = isCancelled && sub.cancelledAt
    ? formatDate(
        sub.cancelledAt instanceof Date
          ? sub.cancelledAt
          : new Date(sub.cancelledAt as unknown as string),
        dateFormat
      )
    : null;

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

  // Days for urgency
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

  // Urgency label
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

  // Amount block content
  const { amountLabel, periodLabel, amountStyle } = useMemo(() => {
    if (sub.isFree) {
      return { amountLabel: t('subscriptionCard.free'), periodLabel: null, amountStyle: styles.amountNumberFree };
    }
    if (sub.isFreeTrial) {
      return { amountLabel: t('subscriptionCard.trial'), periodLabel: null, amountStyle: styles.amountNumberTrial };
    }
    const monthly = sub.billingCycle === SubscriptionBillingCycle.ANNUAL
      ? normalizeToMonthlyAgorot(sub)
      : sub.amountAgorot;
    return {
      amountLabel: formatCurrency(monthly, currencySymbol),
      periodLabel: t('subscriptionCard.perMonth'),
      amountStyle: styles.amountNumber,
    };
  }, [sub, t, currencySymbol, styles]);

  return (
    <TouchableOpacity
      style={[styles.card, isCancelled && styles.cardDimmed]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={sub.serviceName}
    >
      <View style={styles.content}>
        {/* Amount block (start side) */}
        <View style={styles.amountBlock}>
          {(() => {
            const dotIndex = amountLabel.indexOf('.');
            if (dotIndex === -1) {
              return <Text style={amountStyle} numberOfLines={1}>{amountLabel}</Text>;
            }
            const whole = amountLabel.slice(0, dotIndex);
            const cents = amountLabel.slice(dotIndex + 1);
            return (
              <Text style={amountStyle} numberOfLines={1}>
                {whole}
                <Text style={[amountStyle, styles.amountCents]}>.{cents}</Text>
              </Text>
            );
          })()}
          {periodLabel && (
            <Text style={styles.amountPeriod}>{periodLabel}</Text>
          )}
        </View>

        {/* Content column */}
        <View style={styles.contentColumn}>
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

          {isCancelled ? (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledBadgeText}>
                {cancelledDate
                  ? t('subscriptionCard.cancelledOn', { date: cancelledDate })
                  : t('subscriptionCard.cancelled')}
              </Text>
            </View>
          ) : (
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyBg, borderColor: urgencyText }]}>
              <Text style={[styles.urgencyBadgeText, { color: urgencyText }]}>
                {urgencyLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Category icon circle (end side) */}
        <View style={styles.categoryIconCircle}>
          <Ionicons
            name={categoryMeta?.icon ?? 'repeat-outline'}
            size={20}
            color={colors.primary}
          />
          {showMemberAvatar && (
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>{memberInitials}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
