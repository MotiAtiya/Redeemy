import { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SubscriptionCard } from '@/components/redeemy/SubscriptionCard';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { useSubscriptionsListener } from '@/hooks/useSubscriptionsListener';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatMultiCurrencyTotal } from '@/lib/formatCurrency';
import { SubscriptionStatus, type Subscription } from '@/types/subscriptionTypes';
import { daysUntilBilling, computeMonthlyTotalByCurrency } from '@/lib/subscriptionUtils';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
    totalAmount: { fontSize: 26, fontWeight: '800', color: colors.primary },
    activeCount: { fontSize: 14, color: colors.textSecondary },
    listContent: { paddingTop: 4, paddingBottom: 100 },
    listContentEmpty: { flex: 1 },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      gap: 12,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },
    emptyAction: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    emptyActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    fab: {
      position: 'absolute',
      bottom: 28,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
  });
}

function sortByBillingDays(a: Subscription, b: Subscription): number {
  return daysUntilBilling(a) - daysUntilBilling(b);
}

export default function SubscriptionsScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const currencySymbols = CURRENCY_SYMBOLS;

  // Wire real-time listener
  useSubscriptionsListener(currentUser?.uid ?? null, familyId);

  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);
  const isLoading = useSubscriptionsStore((s) => s.isLoading);

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE),
    [subscriptions]
  );

  const sorted = useMemo(
    () => [...activeSubscriptions].sort(sortByBillingDays),
    [activeSubscriptions]
  );

  const monthlyTotalByCurrency = useMemo(
    () => computeMonthlyTotalByCurrency(activeSubscriptions),
    [activeSubscriptions]
  );

  function renderEmpty() {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="repeat-outline" size={56} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>{t('subscriptions.empty.title')}</Text>
        <Text style={styles.emptySubtitle}>{t('subscriptions.empty.subtitle')}</Text>
        <TouchableOpacity
          style={styles.emptyAction}
          onPress={() => router.push('/add-subscription')}
        >
          <Text style={styles.emptyActionText}>{t('subscriptions.empty.action')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderHeader() {
    if (activeSubscriptions.length === 0) return null;
    const totalFormatted = formatMultiCurrencyTotal(monthlyTotalByCurrency, currencySymbols);
    return (
      <View style={styles.header}>
        <Text style={styles.title}>{t('subscriptions.title')}</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalAmount}>
            {totalFormatted
              ? t('subscriptions.monthlyTotal', { amount: totalFormatted })
              : t('subscriptions.allFree')}
          </Text>
          <Text style={styles.activeCount}>
            {t('subscriptions.activeCount', { count: activeSubscriptions.length })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            subscription={item}
            onPress={() =>
              router.push({ pathname: '/subscription/[id]', params: { id: item.id } })
            }
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          sorted.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-subscription')}
        accessibilityRole="button"
        accessibilityLabel={t('subscriptions.empty.action')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
