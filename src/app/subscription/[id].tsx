import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { showToast } from '@/stores/toastStore';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { updateSubscription, deleteSubscription } from '@/lib/firestoreSubscriptions';
import { cancelSubscriptionNotifications } from '@/lib/subscriptionNotifications';
import { logEvent } from '@/lib/eventLog';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDate } from '@/lib/formatDate';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { DetailRow } from '@/components/redeemy/DetailRow';
import { ActionModal } from '@/components/redeemy/ActionModal';
import { DetailAddedFooter } from '@/components/redeemy/DetailAddedFooter';
import { HeroCard } from '@/components/redeemy/HeroCard';
import { HeroBadge } from '@/components/redeemy/HeroBadge';
import { DetailScreenHeader } from '@/components/redeemy/DetailScreenHeader';
import { NotFoundScreen } from '@/components/redeemy/NotFoundScreen';
import { SubscriptionRenewalPrompt } from '@/components/redeemy/SubscriptionRenewalPrompt';
import { SubscriptionBillingCycle, SubscriptionStatus } from '@/types/subscriptionTypes';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import {
  getNextBillingDate,
  daysUntilBilling,
  normalizeToMonthlyAgorot,
  subscriptionNeedsRenewalConfirmation,
} from '@/lib/subscriptionUtils';
import type { AppColors } from '@/constants/colors';
import { normalizeTimestampOrNow } from "@/lib/dateUtils";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
    // Hero card
    heroServiceName: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    // Details card
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
    // Footer
    footer: {
      padding: 16,
      paddingBottom: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
    cancelSubButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      backgroundColor: colors.danger,
      borderRadius: 12,
    },
    cancelSubButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    buttonDisabled: { opacity: 0.7 },
    cancelledBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    cancelledBannerText: { fontSize: 15, color: colors.textTertiary, fontWeight: '500' },
    // Cancel confirmation sheet
    dangerButton: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 50,
      backgroundColor: colors.danger,
      borderRadius: 12,
      marginTop: 4,
    },
    dangerButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  });
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isRTL = I18nManager.isRTL;
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);

  const sub = useSubscriptionsStore((s) => s.subscriptions.find((item) => item.id === id));
  const updateSubInStore = useSubscriptionsStore((s) => s.updateSubscription);
  const removeSubFromStore = useSubscriptionsStore((s) => s.removeSubscription);
  const currentUid = useAuthStore((s) => s.currentUser?.uid);
  const familyAdminId = useFamilyStore((s) => s.family?.adminId);
  const canDelete = sub
    ? sub.userId === currentUid || familyAdminId === currentUid
    : false;

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);

  const categoryMeta = useMemo(
    () => SUBSCRIPTION_CATEGORIES.find((c) => c.id === sub?.category),
    [sub?.category]
  );

  const isCancelled = sub?.status === SubscriptionStatus.CANCELLED;
  const nextBillingDate = sub ? getNextBillingDate(sub) : null;
  const daysLeft = sub ? daysUntilBilling(sub) : 0;

  // Not-found guard
  if (!sub) {
    return <NotFoundScreen message={t('subscription.notFound')} />;
  }

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleEdit() {
    const s = sub!;
    afterDismissRef.current = () => {
      router.push(`/add-subscription?subscriptionId=${s.id}`);
    };
    setShowActionSheet(false);
  }

  function handleCancelSub() {
    if (useUIStore.getState().offlineMode) {
      Alert.alert(t('offline.title'), t('subscription.cancel.offlineMessage'));
      return;
    }
    const s = sub!;
    Alert.alert(t('subscription.cancel.title'), t('subscription.cancel.message', { name: s.serviceName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('subscription.cancel.confirm'),
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await cancelSubscriptionNotifications(s);
            updateSubInStore(s.id, { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() });
            await updateSubscription(s.id, { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() }, { silent: true });
            void logEvent('subscription_cancelled', { itemCategory: 'subscription', itemId: s.id });
            showToast(t('toasts.subscriptionCancelled'));
            router.back();
          } catch {
            updateSubInStore(s.id, { status: SubscriptionStatus.ACTIVE, cancelledAt: undefined });
            Alert.alert(t('common.error'), t('subscription.cancel.error'));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  async function handleDelete() {
    if (useUIStore.getState().offlineMode) {
      setShowActionSheet(false);
      Alert.alert(t('offline.title'), t('subscription.cancel.offlineMessage'));
      return;
    }
    const s = sub!;
    setShowActionSheet(false);
    Alert.alert(
      t('subscription.delete.title'),
      t('subscription.delete.message', { name: s.serviceName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('subscription.delete.button'),
          style: 'destructive',
          onPress: async () => {
            // Navigate away FIRST so the screen doesn't flash "not found"
            // while the firestore write resolves.
            router.back();
            showToast(t('toasts.deleted.subscription'));
            try {
              await cancelSubscriptionNotifications(s);
              removeSubFromStore(s.id);
              await deleteSubscription(s.id);
            } catch {
              Alert.alert(t('common.error'), t('subscription.delete.error'));
            }
          },
        },
      ]
    );
  }

  // -------------------------------------------------------------------------
  // Billing text helpers
  // -------------------------------------------------------------------------

  const symbol = CURRENCY_SYMBOLS[sub?.currency ?? 'ILS'];

  const trialEndsDate = sub?.trialEndsDate
    ? (normalizeTimestampOrNow(sub.trialEndsDate))
    : null;
  const specialPeriodActive = trialEndsDate ? trialEndsDate > new Date() : false;

  const registrationDate = sub?.registrationDate
    ? (normalizeTimestampOrNow(sub.registrationDate))
    : null;

  const commitmentEndDate = sub?.commitmentEndDate
    ? (normalizeTimestampOrNow(sub.commitmentEndDate))
    : null;

  const familyCreatorName = sub?.familyId && sub.createdBy !== currentUid ? (sub.createdByName ?? null) : null;

  function getHeroBadgeProps(): { text: string; color: string; bgColor: string } | null {
    if (isCancelled) return null;
    if (sub?.isFree) return { text: t('subscription.detail.free'), color: colors.urgencyGreen, bgColor: colors.urgencyGreenSurface };
    const text = getNextBillingText();
    if (daysLeft === 0 || daysLeft <= 7) return { text, color: colors.urgencyRed, bgColor: colors.urgencyRedSurface };
    if (daysLeft <= 30) return { text, color: colors.urgencyAmber, bgColor: colors.urgencyAmberSurface };
    return { text, color: colors.urgencyGreen, bgColor: colors.urgencyGreenSurface };
  }

  function getBillingText(): string {
    const s = sub!;
    if (s.isFree) return t('subscription.detail.free');
    const isTrial = s.specialPeriodType === 'trial' || s.isFreeTrial;
    const regularAgorot = isTrial ? (s.priceAfterTrialAgorot ?? 0) : s.amountAgorot;
    const amount = formatCurrency(regularAgorot, symbol);
    if (s.billingCycle === SubscriptionBillingCycle.MONTHLY) {
      return t('subscription.detail.monthlyAmount', { amount });
    }
    const monthly = formatCurrency(Math.round(regularAgorot / 12), symbol);
    return t('subscription.detail.annualAmount', { amount, monthly });
  }

  // Price string for discounted special period — per-month for monthly billing, bare amount for annual
  function getDiscountedPriceStr(): string {
    const agorot = sub!.specialPeriodPriceAgorot ?? 0;
    if (sub!.billingCycle === SubscriptionBillingCycle.MONTHLY) {
      return t('subscription.detail.monthlyAmount', { amount: formatCurrency(agorot, symbol) });
    }
    return formatCurrency(agorot, symbol);
  }

  function getNextBillingText(): string {
    const s = sub!;
    if (daysLeft === 0) return t('subscription.detail.renewsToday');
    if (daysLeft === 1) return t('subscription.detail.tomorrow');
    if (s.billingCycle === SubscriptionBillingCycle.ANNUAL) {
      const dateStr = nextBillingDate ? formatDate(nextBillingDate, dateFormat) : '';
      return t('subscription.detail.annualRenewal', { date: dateStr, days: daysLeft });
    }
    return t('subscription.detail.inDays', { count: daysLeft });
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const heroBadgeProps = getHeroBadgeProps();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <DetailScreenHeader
        title={sub.serviceName}
        onBack={() => router.back()}
        onMenu={() => setShowActionSheet(true)}
        colors={colors}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero card */}
        <HeroCard iconName={categoryMeta?.icon ?? 'grid-outline'}>
          <Text style={styles.heroServiceName}>{sub.serviceName}</Text>
          {heroBadgeProps && (
            <HeroBadge text={heroBadgeProps.text} color={heroBadgeProps.color} bgColor={heroBadgeProps.bgColor} />
          )}
        </HeroCard>

        {/* Manual-renewal prompt — only when annual + manual + active + nextBillingDate < today */}
        {subscriptionNeedsRenewalConfirmation(sub) && (
          <SubscriptionRenewalPrompt
            subscription={sub}
            onResolved={() => router.back()}
          />
        )}

        {/* Details card */}
        <View style={styles.detailsCard}>
          {/* Billing amount */}
          <DetailRow
            icon="card-outline"
            label={t('subscription.detail.billing')}
            value={getBillingText()}
            showSeparator
          />

          {/* Discounted period (specialPeriodType = 'discounted') */}
          {sub.specialPeriodType === 'discounted' && !!trialEndsDate && specialPeriodActive && (
            <DetailRow
              icon="pricetag-outline"
              label={t('subscription.detail.discountedPeriod')}
              value={t('subscription.detail.discountedDetail', {
                price: getDiscountedPriceStr(),
                date: formatDate(trialEndsDate, dateFormat),
              })}
              showSeparator
            />
          )}

          {/* Free trial */}
          {(sub.isFreeTrial || sub.specialPeriodType === 'trial') && !!trialEndsDate && specialPeriodActive && (
            <DetailRow
              icon="gift-outline"
              label={t('subscription.detail.freeTrial')}
              value={t('subscription.detail.freeTrialDetail', {
                date: formatDate(trialEndsDate, dateFormat),
              })}
              showSeparator
            />
          )}

          {/* Next billing */}
          <DetailRow
            icon="calendar-outline"
            label={t('subscription.detail.nextBilling')}
            value={getNextBillingText()}
            showSeparator
          />

          {/* Billing day of month (monthly only) */}
          {sub.billingCycle === SubscriptionBillingCycle.MONTHLY && !sub.isFree && !!sub.billingDayOfMonth && (
            <DetailRow
              icon="repeat-outline"
              label={t('subscription.detail.billingDay')}
              value={t('subscription.detail.billingDayValue', { day: sub.billingDayOfMonth })}
              showSeparator
            />
          )}

          {/* Commitment period */}
          {sub.hasFixedPeriod && !!sub.commitmentMonths && !!commitmentEndDate && (
            <DetailRow
              icon="lock-closed-outline"
              label={t('subscription.detail.commitmentLabel')}
              value={t('subscription.detail.commitment', {
                months: sub.commitmentMonths,
                date: formatDate(commitmentEndDate, dateFormat),
              })}
              showSeparator
            />
          )}

          {/* Renewal type — only when explicitly set (not for free / noFixed periodic) */}
          {!!sub.renewalType && (
            <DetailRow
              icon={sub.renewalType === 'manual' ? 'hand-left-outline' : 'refresh-outline'}
              label={t('subscription.detail.renewalType')}
              value={sub.renewalType === 'manual'
                ? t('subscription.detail.manualRenewal')
                : t('subscription.detail.autoRenewal')}
              showSeparator
            />
          )}

          {/* Review reminder — free AND monthly noFixed (both store freeReviewReminderMonths) */}
          {!!sub.freeReviewReminderMonths && (
            <DetailRow
              icon="alarm-outline"
              label={t('subscription.detail.reviewReminder')}
              value={t('subscription.detail.reviewReminderValue', { count: sub.freeReviewReminderMonths })}
              showSeparator
            />
          )}

          {/* Notes */}
          {!!sub.notes && (
            <DetailRow
              icon="document-text-outline"
              label={t('subscription.detail.notes')}
              value={sub.notes}
              showSeparator={!!familyCreatorName || !!registrationDate}
              multiline
            />
          )}

          {/* Added by (family member) */}
          {!!familyCreatorName && (
            <DetailRow
              icon="people-outline"
              label={t('subscription.detail.addedBy')}
              value={familyCreatorName}
              showSeparator={!!registrationDate}
            />
          )}

          {/* Registration date — always last */}
          {!!registrationDate && (
            <DetailRow
              icon="log-in-outline"
              label={t('subscription.detail.registrationDate')}
              value={formatDate(registrationDate, dateFormat)}
            />
          )}
        </View>
        <DetailAddedFooter label={t('subscription.detail.added')} createdAt={sub.createdAt} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {isCancelled ? (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            <Text style={styles.cancelledBannerText}>
              {sub.cancelledAt
                ? t('subscription.cancelledBanner', {
                    date: formatDate(
                      normalizeTimestampOrNow(sub.cancelledAt),
                      dateFormat
                    ),
                  })
                : t('subscription.cancelledBanner', { date: '' })}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.cancelSubButton, loading && styles.buttonDisabled]}
            onPress={handleCancelSub}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.cancelSubButtonText}>{t('subscription.cancel.confirm')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Action sheet */}
      <ActionModal
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        cancelLabel={t('common.cancel')}
        onDismiss={() => {
          const action = afterDismissRef.current;
          afterDismissRef.current = null;
          action?.();
        }}
        actions={[
          !isCancelled
            ? { icon: 'create-outline', label: t('subscription.action.edit'), color: colors.textPrimary, onPress: handleEdit }
            : null,
          canDelete
            ? { icon: 'trash-outline', label: t('subscription.action.delete'), color: colors.danger, onPress: handleDelete }
            : null,
        ]}
      />


    </SafeAreaView>
  );
}
