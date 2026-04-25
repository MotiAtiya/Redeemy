import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
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
import { SubscriptionBillingCycle, SubscriptionStatus } from '@/types/subscriptionTypes';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import { getNextBillingDate, daysUntilBilling, normalizeToMonthlyAgorot } from '@/lib/subscriptionUtils';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    backButton: { padding: 16 },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFoundText: { fontSize: 16, color: colors.textTertiary },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, alignSelf: 'flex-start' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
    // Hero card
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      gap: 12,
    },
    heroIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroServiceName: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    // Details card
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
    addedFooterText: { fontSize: 12, color: colors.textTertiary, alignSelf: 'flex-start' },
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
    // Toast
    toastContainer: {
      position: 'absolute',
      bottom: 100,
      left: 24,
      right: 24,
      backgroundColor: colors.textPrimary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    toastText: { color: colors.background, fontSize: 14, fontWeight: '600' },
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

  const { toastMessage, showToast } = useToast();

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
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('subscription.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
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
            await updateSubscription(s.id, { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() });
            showToast(t('subscription.cancel.toast', { name: s.serviceName }));
            setTimeout(() => router.back(), 500);
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
            setLoading(true);
            try {
              await cancelSubscriptionNotifications(s);
              removeSubFromStore(s.id);
              await deleteSubscription(s.id);
              router.back();
            } catch {
              setLoading(false);
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
    ? (sub.trialEndsDate instanceof Date ? sub.trialEndsDate : new Date(sub.trialEndsDate as unknown as string))
    : null;

  const commitmentEndDate = sub?.commitmentEndDate
    ? (sub.commitmentEndDate instanceof Date ? sub.commitmentEndDate : new Date(sub.commitmentEndDate as unknown as string))
    : null;

  const familyCreatorName = sub?.familyId && sub.createdBy !== currentUid ? (sub.createdByName ?? null) : null;

  function getBillingText(): string {
    const s = sub!;
    if (s.isFree) return t('subscription.detail.free');
    if (s.isFreeTrial) return t('subscription.detail.freeTrialBilling');
    const amount = formatCurrency(s.amountAgorot, symbol);
    if (s.billingCycle === SubscriptionBillingCycle.MONTHLY) {
      return t('subscription.detail.monthlyAmount', { amount });
    }
    const monthly = formatCurrency(normalizeToMonthlyAgorot(s), symbol);
    return t('subscription.detail.annualAmount', { amount, monthly });
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{sub.serviceName}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowActionSheet(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Ionicons
              name={categoryMeta?.icon ?? 'grid-outline'}
              size={32}
              color={colors.primary}
            />
          </View>
          <Text style={styles.heroServiceName}>{sub.serviceName}</Text>
        </View>

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
          {sub.specialPeriodType === 'discounted' && !!trialEndsDate && (
            <DetailRow
              icon="pricetag-outline"
              label={t('subscription.detail.discountedPeriod')}
              value={t('subscription.detail.discountedDetail', {
                price: formatCurrency(sub.specialPeriodPriceAgorot ?? 0, symbol),
                date: formatDate(trialEndsDate, dateFormat),
                regular: formatCurrency(sub.amountAgorot, symbol),
              })}
              showSeparator
            />
          )}

          {/* Free trial */}
          {sub.isFreeTrial && !!trialEndsDate && (
            <DetailRow
              icon="gift-outline"
              label={t('subscription.detail.freeTrial')}
              value={t('subscription.detail.freeTrialDetail', {
                date: formatDate(trialEndsDate, dateFormat),
                price: formatCurrency(sub.priceAfterTrialAgorot ?? 0, symbol),
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

          {/* Free review reminder */}
          {sub.isFree && !!sub.freeReviewReminderMonths && (
            <DetailRow
              icon="alarm-outline"
              label={t('subscription.detail.reviewReminder')}
              value={t('subscription.detail.reviewReminderValue', { count: sub.freeReviewReminderMonths })}
              showSeparator
            />
          )}

          {/* Category */}
          <DetailRow
            icon={categoryMeta?.icon ?? 'grid-outline'}
            label={t('subscription.detail.category')}
            value={t('subscriptions.category.' + sub.category)}
            showSeparator
          />

          {/* Renewal type — always shown */}
          <DetailRow
            icon={sub.renewalType === 'manual' ? 'hand-left-outline' : 'refresh-outline'}
            label={t('subscription.detail.renewalType')}
            value={sub.renewalType === 'manual'
              ? t('subscription.detail.manualRenewal')
              : t('subscription.detail.autoRenewal')}
            showSeparator={!!sub.reminderSpecialPeriodEnabled || !!sub.notes || !!familyCreatorName}
          />

          {/* Special period reminder */}
          {!!sub.reminderSpecialPeriodEnabled && !!trialEndsDate && (
            <DetailRow
              icon="alarm-outline"
              label={t('subscription.detail.specialPeriodReminderLabel')}
              value={t('subscription.detail.specialPeriodReminderValue')}
              showSeparator={!!sub.notes || !!familyCreatorName}
            />
          )}

          {/* Notes */}
          {!!sub.notes && (
            <DetailRow
              icon="document-text-outline"
              label={t('subscription.detail.notes')}
              value={sub.notes}
              showSeparator={!!familyCreatorName}
              multiline
            />
          )}

          {/* Added by (family member) */}
          {!!familyCreatorName && (
            <DetailRow
              icon="people-outline"
              label={t('subscription.detail.addedBy')}
              value={familyCreatorName}
            />
          )}
        </View>
        <Text style={styles.addedFooterText}>
          {t('subscription.detail.added')}: {formatDate(
            sub.createdAt instanceof Date ? sub.createdAt : new Date(sub.createdAt as unknown as string),
            dateFormat
          )}
        </Text>
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
                      sub.cancelledAt instanceof Date
                        ? sub.cancelledAt
                        : new Date(sub.cancelledAt as unknown as string),
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

      {/* Toast */}
      {toastMessage && (
        <View style={styles.toastContainer} pointerEvents="none">
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

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
