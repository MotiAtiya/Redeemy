import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
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
import { SubscriptionBillingCycle, SubscriptionStatus } from '@/types/subscriptionTypes';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import { getNextBillingDate, daysUntilBilling, normalizeToMonthlyAgorot } from '@/lib/subscriptionUtils';
import type { AppColors } from '@/constants/colors';

// ---------------------------------------------------------------------------
// useToast — copied from src/app/family/[id].tsx
// ---------------------------------------------------------------------------

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    timerRef.current = setTimeout(() => setMessage(null), 2000);
  }, []);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { toastMessage: message, showToast: show };
}

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
    intentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    intentBadgeText: { fontSize: 13, fontWeight: '600' },
    // Details card
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
    detailRowContent: { flex: 1, gap: 2 },
    detailLabel: { fontSize: 12, color: colors.textTertiary, fontWeight: '500', alignSelf: 'flex-start' },
    detailValue: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
    notesValue: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start', textAlign: 'left' },
    separator: { height: 1, backgroundColor: colors.separator, marginStart: 44 },
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
    // Overlay / action sheet
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    actionSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      paddingBottom: 36,
      gap: 4,
    },
    actionSheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.separator,
      alignSelf: 'center',
      marginBottom: 12,
    },
    actionSheetButton: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 10 },
    actionSheetLabel: { fontSize: 16 },
    cancelButton: {
      alignItems: 'center',
      padding: 14,
      marginTop: 8,
      backgroundColor: colors.background,
      borderRadius: 10,
    },
    cancelText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    // Cancel confirmation sheet
    cancelSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 36,
      gap: 12,
    },
    cancelSheetTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 4,
    },
    cancelSheetMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
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
  const [showCancelSheet, setShowCancelSheet] = useState(false);
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

  async function handleCancelConfirm() {
    if (useUIStore.getState().offlineMode) {
      Alert.alert(t('offline.title'), t('subscription.cancel.offlineMessage'));
      return;
    }
    const s = sub!;
    setLoading(true);
    try {
      await cancelSubscriptionNotifications(s);
      updateSubInStore(s.id, { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() });
      await updateSubscription(s.id, { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() });
      setShowCancelSheet(false);
      showToast(t('subscription.cancel.toast', { name: s.serviceName }));
      setTimeout(() => router.back(), 500);
    } catch {
      updateSubInStore(s.id, { status: SubscriptionStatus.ACTIVE, cancelledAt: undefined });
      setShowCancelSheet(false);
      Alert.alert(t('common.error'), t('subscription.cancel.error'));
    } finally {
      setLoading(false);
    }
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

  function getBillingText(): string {
    const s = sub!;
    if (s.isFree) return t('subscription.detail.free');
    const symbol = CURRENCY_SYMBOLS[s.currency ?? 'ILS'];
    const amount = formatCurrency(s.amountAgorot, symbol);
    if (s.billingCycle === SubscriptionBillingCycle.MONTHLY) {
      const base = t('subscription.detail.monthlyAmount', { amount });
      if (s.commitmentMonths && s.commitmentEndDate) {
        const endDate = s.commitmentEndDate instanceof Date
          ? s.commitmentEndDate
          : new Date(s.commitmentEndDate as unknown as string);
        return `${base} · ${t('subscription.detail.commitment', {
          months: s.commitmentMonths,
          date: formatDate(endDate, dateFormat),
        })}`;
      }
      return base;
    }
    const monthly = formatCurrency(normalizeToMonthlyAgorot(s), symbol);
    return t('subscription.detail.annualAmount', { amount, monthly });
  }

  function getNextBillingText(): string {
    const s = sub!;
    if (daysLeft === 0) return t('subscription.detail.renewsToday');
    if (s.billingCycle === SubscriptionBillingCycle.MONTHLY) {
      return t('subscription.detail.monthlyBillingDay', {
        day: s.billingDayOfMonth ?? 1,
        days: daysLeft,
      });
    }
    const dateStr = nextBillingDate ? formatDate(nextBillingDate, dateFormat) : '';
    return t('subscription.detail.annualRenewal', { date: dateStr, days: daysLeft });
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
          {sub.renewalType === 'manual' && (
            <View style={[styles.intentBadge, { backgroundColor: colors.urgencyAmberSurface }]}>
              <Ionicons name="hand-left-outline" size={14} color={colors.urgencyAmber} />
              <Text style={[styles.intentBadgeText, { color: colors.urgencyAmber }]}>
                {t('subscription.detail.manualRenewal')}
              </Text>
            </View>
          )}
        </View>

        {/* Details card */}
        <View style={styles.detailsCard}>
          {/* Billing */}
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>{t('subscription.detail.billing')}</Text>
              <Text style={styles.detailValue}>{getBillingText()}</Text>
            </View>
          </View>
          <View style={styles.separator} />

          {/* Next billing */}
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>{t('subscription.detail.nextBilling')}</Text>
              <Text style={styles.detailValue}>{getNextBillingText()}</Text>
            </View>
          </View>

          {/* Free trial (only if applicable) */}
          {sub.isFreeTrial && !!sub.trialEndsDate && (
            <>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Ionicons name="gift-outline" size={18} color={colors.textTertiary} />
                <View style={styles.detailRowContent}>
                  <Text style={styles.detailLabel}>{t('subscription.detail.freeTrial')}</Text>
                  <Text style={styles.detailValue}>
                    {t('subscription.detail.freeTrialDetail', {
                      date: formatDate(
                        sub.trialEndsDate instanceof Date
                          ? sub.trialEndsDate
                          : new Date(sub.trialEndsDate as unknown as string),
                        dateFormat
                      ),
                      price: formatCurrency(sub.priceAfterTrialAgorot ?? 0, CURRENCY_SYMBOLS[sub.currency ?? 'ILS']),
                    })}
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.separator} />

          {/* Category */}
          <View style={styles.detailRow}>
            <Ionicons name={categoryMeta?.icon ?? 'grid-outline'} size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>{t('subscription.detail.category')}</Text>
              <Text style={styles.detailValue}>{t('subscriptions.category.' + sub.category)}</Text>
            </View>
          </View>
          <View style={styles.separator} />

          {/* Renewal type (only show if manual) */}
          {sub.renewalType === 'manual' && (
            <>
              <View style={styles.detailRow}>
                <Ionicons name="hand-left-outline" size={18} color={colors.textTertiary} />
                <View style={styles.detailRowContent}>
                  <Text style={styles.detailLabel}>{t('subscription.detail.renewalType')}</Text>
                  <Text style={styles.detailValue}>{t('subscription.detail.manualRenewal')}</Text>
                </View>
              </View>
              <View style={styles.separator} />
            </>
          )}

          {/* Reminder */}
          <View style={styles.detailRow}>
            <Ionicons name="notifications-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>{t('subscription.detail.reminder')}</Text>
              <Text style={styles.detailValue}>
                {t('subscription.detail.reminderDays', { count: sub.reminderDays })}
              </Text>
            </View>
          </View>

          {/* Notes (only if set) */}
          {!!sub.notes && (
            <>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={18} color={colors.textTertiary} />
                <View style={styles.detailRowContent}>
                  <Text style={styles.detailLabel}>{t('subscription.detail.notes')}</Text>
                  <Text style={styles.notesValue}>{sub.notes}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.separator} />

          {/* Added date */}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>{t('subscription.detail.added')}</Text>
              <Text style={styles.detailValue}>
                {formatDate(
                  sub.createdAt instanceof Date ? sub.createdAt : new Date(sub.createdAt as unknown as string),
                  dateFormat
                )}
              </Text>
            </View>
          </View>
        </View>
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
            onPress={() => setShowCancelSheet(true)}
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
      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
        onDismiss={() => {
          const action = afterDismissRef.current;
          afterDismissRef.current = null;
          action?.();
        }}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowActionSheet(false)} />
        <View style={styles.actionSheet}>
          <View style={styles.actionSheetHandle} />
          {!isCancelled && (
            <TouchableOpacity style={styles.actionSheetButton} onPress={handleEdit}>
              <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
              <Text style={[styles.actionSheetLabel, { color: colors.textPrimary }]}>
                {t('subscription.action.edit')}
              </Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity style={styles.actionSheetButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
              <Text style={[styles.actionSheetLabel, { color: colors.danger }]}>
                {t('subscription.action.delete')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowActionSheet(false)}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Cancel confirmation sheet */}
      <Modal
        visible={showCancelSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelSheet(false)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCancelSheet(false)} />
        <View style={styles.cancelSheet}>
          <View style={styles.actionSheetHandle} />
          <Text style={styles.cancelSheetTitle}>{t('subscription.cancel.title')}</Text>
          <Text style={styles.cancelSheetMessage}>
            {t('subscription.cancel.message', { name: sub.serviceName })}
          </Text>
          <TouchableOpacity
            style={[styles.dangerButton, loading && styles.buttonDisabled]}
            onPress={handleCancelConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.dangerButtonText}>{t('subscription.cancel.confirm')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCancelSheet(false)}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
