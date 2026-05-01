import { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SubscriptionCard } from '@/components/redeemy/SubscriptionCard';
import { SearchBar } from '@/components/redeemy/SearchBar';
import { EmptyState } from '@/components/redeemy/EmptyState';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatMultiCurrencyTotal } from '@/lib/formatCurrency';
import { SubscriptionStatus, type Subscription } from '@/types/subscriptionTypes';
import { daysUntilBilling, computeMonthlyTotalByCurrency, normalizeToMonthlyAgorot } from '@/lib/subscriptionUtils';
import { SUBSCRIPTION_CATEGORIES } from '@/constants/subscriptionCategories';
import type { AppColors } from '@/constants/colors';

type SortOption = 'billingDate' | 'serviceAZ' | 'amount' | 'recent';

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
    totalAmount: { fontSize: 18, fontWeight: '600', color: colors.primary, paddingHorizontal: 16, marginBottom: 8, alignSelf: 'flex-start' },
    sortMenu: {
      position: 'absolute',
      top: 56,
      right: 16,
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
      zIndex: 10,
      minWidth: 180,
      overflow: 'hidden',
    },
    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sortOptionActive: { backgroundColor: colors.background },
    sortOptionText: { fontSize: 14, color: colors.textPrimary },
    sortOptionTextActive: { color: colors.primary, fontWeight: '600' },
    filterChips: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
    filterChip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.separator,
      backgroundColor: colors.surface,
      alignSelf: 'flex-start',
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { fontSize: 13, color: colors.textSecondary },
    filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
    listContent: { paddingTop: 4, paddingBottom: 100 },
    listContentEmpty: { flex: 1 },
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

function sortSubscriptions(subs: Subscription[], option: SortOption): Subscription[] {
  return [...subs].sort((a, b) => {
    switch (option) {
      case 'billingDate':
        return daysUntilBilling(a) - daysUntilBilling(b);
      case 'serviceAZ':
        return a.serviceName.localeCompare(b.serviceName, 'he');
      case 'amount':
        return normalizeToMonthlyAgorot(b) - normalizeToMonthlyAgorot(a);
      case 'recent':
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });
}

export default function SubscriptionsScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const currencySymbols = CURRENCY_SYMBOLS;

  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);
  const isLoading = useSubscriptionsStore((s) => s.isLoading);

  const [sortOption, setSortOption] = useState<SortOption>('billingDate');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: 'billingDate', label: t('subscriptions.sort.billingDate') },
    { key: 'serviceAZ',   label: t('subscriptions.sort.serviceAZ')   },
    { key: 'amount',      label: t('subscriptions.sort.amount')      },
    { key: 'recent',      label: t('subscriptions.sort.recent')      },
  ];

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((s) => s.status === SubscriptionStatus.ACTIVE),
    [subscriptions]
  );

  const availableCategories = useMemo(() => {
    const cats = [...new Set(activeSubscriptions.map((s) => s.category))];
    return cats.sort((a, b) => {
      if (a === 'other') return 1;
      if (b === 'other') return -1;
      return 0;
    });
  }, [activeSubscriptions]);

  const monthlyTotalByCurrency = useMemo(
    () => computeMonthlyTotalByCurrency(activeSubscriptions),
    [activeSubscriptions]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortSubscriptions(
      activeSubscriptions.filter((s) => {
        if (selectedCategory && s.category !== selectedCategory) return false;
        if (!q) return true;
        return (
          s.serviceName.toLowerCase().includes(q) ||
          (s.notes ?? '').toLowerCase().includes(q)
        );
      }),
      sortOption
    );
  }, [activeSubscriptions, searchQuery, selectedCategory, sortOption]);

  const totalFormatted = formatMultiCurrencyTotal(monthlyTotalByCurrency, currencySymbols);

  function renderEmpty() {
    if (isLoading) return null;
    if (activeSubscriptions.length > 0) {
      return (
        <EmptyState
          icon="search-outline"
          iconSize={48}
          title={t('subscriptions.noResults')}
        />
      );
    }
    return (
      <EmptyState
        icon="repeat-outline"
        title={t('subscriptions.empty.title')}
        subtitle={t('subscriptions.empty.subtitle')}
        actionLabel={t('subscriptions.empty.action')}
        onAction={() => router.push('/add-subscription')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View>
        <View style={styles.header}>
          <Text style={styles.title}>{t('subscriptions.title')}</Text>
          <TouchableOpacity onPress={() => setShowSortMenu((s) => !s)}>
            <Ionicons name="swap-vertical-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {activeSubscriptions.length > 0 && (
          <Text style={styles.totalAmount}>
            {totalFormatted
              ? t('subscriptions.monthlyTotal', { amount: totalFormatted })
              : t('subscriptions.allFree')}
          </Text>
        )}

        {showSortMenu && (
          <View style={styles.sortMenu}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortOption, sortOption === opt.key && styles.sortOptionActive]}
                onPress={() => { setSortOption(opt.key); setShowSortMenu(false); }}
              >
                <Text style={[styles.sortOptionText, sortOption === opt.key && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {sortOption === opt.key && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder={t('subscriptions.search')} />

        {availableCategories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {[null, ...availableCategories].map((item) => {
              const isActive = item === selectedCategory;
              const catMeta = item ? SUBSCRIPTION_CATEGORIES.find((c) => c.id === item) : null;
              return (
                <TouchableOpacity
                  key={item ?? 'all'}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(isActive ? null : item)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {catMeta ? t('subscriptions.category.' + catMeta.id) : t('subscriptions.filter.all')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            subscription={item}
            onPress={() =>
              router.push({ pathname: '/subscription/[id]', params: { id: item.id } })
            }
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listContentEmpty,
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
