import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BaseCard } from './BaseCard';
import { MemberAvatar } from './MemberAvatar';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDate } from '@/lib/formatDate';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import {
  SubscriptionBillingCycle,
  type Subscription,
} from '@/types/subscriptionTypes';
import {
  daysUntilBilling,
  daysUntilSubscriptionEnd,
  getNextBillingDate,
  normalizeToMonthlyAgorot,
} from '@/lib/subscriptionUtils';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    cancelledBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.separator,
      backgroundColor: colors.background,
    },
    cancelledBadgeText: { fontSize: 11, fontWeight: '500', color: colors.textTertiary },
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
    amountNumberFree: { fontSize: 16, fontWeight: '700', color: colors.textTertiary },
    amountNumberTrial: { fontSize: 16, fontWeight: '700', color: colors.urgencyAmber },
    amountCents: { fontSize: 13, fontWeight: '600', letterSpacing: 0 },
    amountPeriod: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    contentColumn: { flex: 1, gap: 5, alignItems: 'flex-start' },
    serviceName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    nextBillingText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    urgencyBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
      borderWidth: 1,
    },
    urgencyBadgeText: { fontSize: 11, fontWeight: '600' },
    categoryIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
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

  const isCancelled = variant === 'cancelled';
  const categoryMeta = SUBSCRIPTION_CATEGORIES.find((c) => c.id === sub.category);
  const cancelledDate = isCancelled && sub.cancelledAt
    ? formatDate(
        sub.cancelledAt instanceof Date
          ? sub.cancelledAt
          : new Date(sub.cancelledAt as unknown as string),
        dateFormat
      )
    : null;

  const daysUntilNextBilling = useMemo(() => daysUntilBilling(sub), [sub]);
  const daysForUrgency = useMemo(() => daysUntilSubscriptionEnd(sub), [sub]);

  const { urgencyText, urgencyBg } = useMemo(() => {
    if (daysForUrgency < 7)
      return { urgencyText: colors.urgencyRed, urgencyBg: colors.urgencyRedSurface };
    if (daysForUrgency <= 30)
      return { urgencyText: colors.urgencyAmber, urgencyBg: colors.urgencyAmberSurface };
    return { urgencyText: colors.urgencyGreen, urgencyBg: colors.urgencyGreenSurface };
  }, [daysForUrgency, colors]);

  const urgencyLabel = useMemo(() => {
    if (daysForUrgency === 0) return t('badge.today');
    if (daysForUrgency === 1) return t('badge.oneDay');
    if (daysForUrgency < 7) return t('badge.days', { days: daysForUrgency });
    if (daysForUrgency < 30) {
      const weeks = Math.ceil(daysForUrgency / 7);
      return weeks === 1 ? t('badge.oneWeek') : t('badge.weeks', { weeks });
    }
    const months = Math.max(1, Math.round(daysForUrgency / 30.44));
    return months === 1 ? t('badge.oneMonth') : t('badge.months', { months });
  }, [daysForUrgency, t]);

  const nextBillingLabel = useMemo(() => {
    if (sub.isFree || sub.isFreeTrial) return null;
    const days = daysUntilNextBilling;
    if (days === 0) return t('subscriptionCard.renewsToday');
    if (days === 1) return t('subscriptionCard.renewsTomorrow');
    if (sub.billingCycle === SubscriptionBillingCycle.ANNUAL) {
      const nextDate = getNextBillingDate(sub);
      const dateStr = formatDate(nextDate, dateFormat);
      return t('subscriptionCard.renewsOnDate', { days, date: dateStr });
    }
    return t('subscriptionCard.renewsInDays', { days });
  }, [sub, daysUntilNextBilling, t, dateFormat]);

  const { amountLabel, periodLabel, amountStyle } = useMemo(() => {
    if (sub.isFree)
      return { amountLabel: t('subscriptionCard.free'), periodLabel: null, amountStyle: styles.amountNumberFree };
    if (sub.isFreeTrial)
      return { amountLabel: t('subscriptionCard.trial'), periodLabel: null, amountStyle: styles.amountNumberTrial };
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
    <BaseCard onPress={onPress} dimmed={isCancelled} accessibilityLabel={sub.serviceName}>
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
        {periodLabel && <Text style={styles.amountPeriod}>{periodLabel}</Text>}
      </View>

      {/* Content column */}
      <View style={styles.contentColumn}>
        <Text style={styles.serviceName} numberOfLines={1}>
          {sub.serviceName}
        </Text>

        {nextBillingLabel != null && (
          <Text style={styles.nextBillingText} numberOfLines={1}>
            {nextBillingLabel}
          </Text>
        )}

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
        <MemberAvatar
          familyId={sub.familyId}
          createdBy={sub.createdBy}
          createdByName={sub.createdByName}
        />
      </View>
    </BaseCard>
  );
}
