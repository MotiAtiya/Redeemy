import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CreditCard } from '@/components/redeemy/CreditCard';
import { WarrantyCard } from '@/components/redeemy/WarrantyCard';
import { SubscriptionCard } from '@/components/redeemy/SubscriptionCard';
import { useCreditsStore } from '@/stores/creditsStore';
import { useWarrantiesStore } from '@/stores/warrantiesStore';
import { useSubscriptionsStore } from '@/stores/subscriptionsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { sortCreditsHistory, filterHistoryCredits, dateRangeStart, type HistorySortKey, type HistoryDateRange } from '@/lib/creditUtils';
import { normalizeToMonthlyAgorot } from '@/lib/subscriptionUtils';
import { CATEGORIES } from '@/constants/categories';
import { CreditStatus } from '@/types/creditTypes';
import { WarrantyStatus } from '@/types/warrantyTypes';
import { SubscriptionStatus } from '@/types/subscriptionTypes';
import type { AppColors } from '@/constants/colors';

type SortKey = HistorySortKey;
type DateRange = HistoryDateRange;

type ItemType = 'all' | 'credits' | 'warranties' | 'subscriptions';

interface FilterState {
  categories: string[];
  dateRange: DateRange;
  type: ItemType;
}

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
    },
    title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
    headerActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      height: 44,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    searchIcon: { marginEnd: 8 },
    searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left', letterSpacing: 0 },
    activeFilters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    activeFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
    },
    activeFilterChipText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textTertiary,
      letterSpacing: 0.5,
      marginStart: 16,
      marginTop: 16,
      marginBottom: 8,
      alignSelf: 'flex-start',
    },
    scrollContent: { paddingBottom: 32 },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      gap: 12,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    filterSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
      gap: 12,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.separator,
      alignSelf: 'center',
      marginBottom: 8,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 4, alignSelf: 'flex-start' },
    filterSectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      marginTop: 4,
      alignSelf: 'flex-start',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.separator,
      backgroundColor: colors.background,
    },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { fontSize: 13, color: colors.textSecondary },
    filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
    doneButton: {
      marginTop: 8,
      height: 50,
      backgroundColor: colors.primary,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    doneButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();
  const credits = useCreditsStore((s) => s.credits);
  const warranties = useWarrantiesStore((s) => s.warranties);
  const subscriptions = useSubscriptionsStore((s) => s.subscriptions);

  const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
    { key: 'thisMonth',   label: t('history.dateRange.thisMonth')   },
    { key: 'last3Months', label: t('history.dateRange.last3Months') },
    { key: 'thisYear',    label: t('history.dateRange.thisYear')    },
    { key: 'allTime',     label: t('history.dateRange.allTime')     },
  ];

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'redeemedAt', label: t('history.sort.recentlyRedeemed') },
    { key: 'storeName',  label: t('history.sort.storeAZ')          },
    { key: 'amount',     label: t('history.sort.amountHighLow')    },
  ];

  const TYPE_OPTIONS: { key: ItemType; label: string }[] = [
    { key: 'all',           label: t('history.filter.typeAll')           },
    { key: 'credits',       label: t('history.filter.typeCredits')       },
    { key: 'warranties',    label: t('history.filter.typeWarranties')    },
    { key: 'subscriptions', label: t('history.filter.typeSubscriptions') },
  ];

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('redeemedAt');
  const [filters, setFilters] = useState<FilterState>({ categories: [], dateRange: 'allTime', type: 'all' });
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Redeemed credits
  const redeemedCredits = useMemo(
    () => sortCreditsHistory(
      filterHistoryCredits(credits, search, filters.dateRange, filters.categories)
        .filter((c) => c.status === CreditStatus.REDEEMED),
      sortKey
    ),
    [credits, search, filters, sortKey]
  );

  // Expired credits
  const expiredCredits = useMemo(
    () => sortCreditsHistory(
      filterHistoryCredits(credits, search, filters.dateRange, filters.categories)
        .filter((c) => c.status === CreditStatus.EXPIRED),
      sortKey
    ),
    [credits, search, filters, sortKey]
  );

  // Closed (redeemed) warranties
  const closedWarranties = useMemo(() => {
    return warranties
      .filter((w) =>
        w.status === WarrantyStatus.CLOSED
        && (!search.trim() ||
          w.storeName.toLowerCase().includes(search.toLowerCase()) ||
          w.productName.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        const aDate = (a.closedAt ?? a.updatedAt ?? a.createdAt).getTime();
        const bDate = (b.closedAt ?? b.updatedAt ?? b.createdAt).getTime();
        return bDate - aDate;
      });
  }, [warranties, search]);

  // Cancelled subscriptions
  const cancelledSubscriptions = useMemo(() => {
    const rangeStart = dateRangeStart(filters.dateRange);
    const q = search.trim().toLowerCase();
    return subscriptions
      .filter((s) => {
        if (s.status !== SubscriptionStatus.CANCELLED) return false;
        const when = s.cancelledAt ?? s.updatedAt ?? s.createdAt;
        if (!when) return false;
        if (when < rangeStart) return false;
        if (q && !s.serviceName.toLowerCase().includes(q) && !(s.notes ?? '').toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortKey) {
          case 'storeName':
            return a.serviceName.localeCompare(b.serviceName);
          case 'amount':
            return normalizeToMonthlyAgorot(b) - normalizeToMonthlyAgorot(a);
          case 'redeemedAt':
          default: {
            const aT = (a.cancelledAt ?? a.updatedAt ?? a.createdAt).getTime();
            const bT = (b.cancelledAt ?? b.updatedAt ?? b.createdAt).getTime();
            return bT - aT;
          }
        }
      });
  }, [subscriptions, search, filters.dateRange, sortKey]);

  // Auto-expired warranties (active but past expiration date)
  const expiredWarranties = useMemo(() => {
    const now = new Date();
    return warranties
      .filter((w) =>
        w.status === WarrantyStatus.ACTIVE && w.expirationDate && w.expirationDate < now
        && (!search.trim() ||
          w.storeName.toLowerCase().includes(search.toLowerCase()) ||
          w.productName.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => {
        const aDate = (a.expirationDate ?? a.updatedAt ?? a.createdAt).getTime();
        const bDate = (b.expirationDate ?? b.updatedAt ?? b.createdAt).getTime();
        return bDate - aDate;
      });
  }, [warranties, search]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.type !== 'all') {
      chips.push({ key: 'type', label: TYPE_OPTIONS.find((o) => o.key === filters.type)?.label ?? '' });
    }
    if (filters.dateRange !== 'allTime') {
      chips.push({ key: 'dateRange', label: DATE_RANGE_OPTIONS.find((o) => o.key === filters.dateRange)?.label ?? '' });
    }
    for (const catId of filters.categories) {
      const cat = CATEGORIES.find((c) => c.id === catId);
      if (cat) chips.push({ key: catId, label: t('category.' + catId) });
    }
    return chips;
  }, [filters]);

  function removeFilterChip(key: string) {
    if (key === 'type') setFilters((f) => ({ ...f, type: 'all' }));
    else if (key === 'dateRange') setFilters((f) => ({ ...f, dateRange: 'allTime' }));
    else setFilters((f) => ({ ...f, categories: f.categories.filter((c) => c !== key) }));
  }

  function toggleCategory(catId: string) {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(catId)
        ? f.categories.filter((c) => c !== catId)
        : [...f.categories, catId],
    }));
  }

  const showCredits       = filters.type !== 'warranties' && filters.type !== 'subscriptions';
  const showWarranties    = filters.type !== 'credits' && filters.type !== 'subscriptions';
  const showSubscriptions = filters.type !== 'credits' && filters.type !== 'warranties';
  const isEmpty =
    (showCredits ? redeemedCredits.length + expiredCredits.length : 0) === 0 &&
    (showWarranties ? closedWarranties.length + expiredWarranties.length : 0) === 0 &&
    (showSubscriptions ? cancelledSubscriptions.length : 0) === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('history.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => {
            const idx = SORT_OPTIONS.findIndex((o) => o.key === sortKey);
            setSortKey(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].key);
          }}>
            <Ionicons name="swap-vertical-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFilterSheet(true)}>
            <Ionicons
              name={activeFilterChips.length > 0 ? 'filter' : 'filter-outline'}
              size={22}
              color={activeFilterChips.length > 0 ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('history.search')}
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {activeFilterChips.length > 0 && (
        <View style={styles.activeFilters}>
          {activeFilterChips.map((chip) => (
            <TouchableOpacity key={chip.key} style={styles.activeFilterChip} onPress={() => removeFilterChip(chip.key)}>
              <Text style={styles.activeFilterChipText}>{chip.label}</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isEmpty ? (
        <View style={{ flex: 1 }}>
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={56} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t('history.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>{t('history.empty.subtitle')}</Text>
          </View>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {showCredits && redeemedCredits.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>{t('history.sectionCreditsRedeemed').toUpperCase()}</Text>
              <FlatList
                data={redeemedCredits}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <CreditCard
                    credit={item}
                    variant="redeemed"
                    onPress={() => router.push(`/credit/${item.id}`)}
                  />
                )}
              />
            </>
          )}
          {showCredits && expiredCredits.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>{t('history.sectionCreditsExpired').toUpperCase()}</Text>
              <FlatList
                data={expiredCredits}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <CreditCard
                    credit={item}
                    variant="expired"
                    onPress={() => router.push(`/credit/${item.id}`)}
                  />
                )}
              />
            </>
          )}
          {showWarranties && closedWarranties.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>{t('history.sectionWarrantiesClosed').toUpperCase()}</Text>
              <FlatList
                data={closedWarranties}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <WarrantyCard
                    warranty={item}
                    variant="closed"
                    onPress={() => router.push({ pathname: '/warranty/[id]', params: { id: item.id } })}
                  />
                )}
              />
            </>
          )}
          {showWarranties && expiredWarranties.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>{t('history.sectionWarrantiesExpired').toUpperCase()}</Text>
              <FlatList
                data={expiredWarranties}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <WarrantyCard
                    warranty={item}
                    variant="expired"
                    onPress={() => router.push({ pathname: '/warranty/[id]', params: { id: item.id } })}
                  />
                )}
              />
            </>
          )}
          {showSubscriptions && cancelledSubscriptions.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>{t('history.sectionSubscriptionsCancelled').toUpperCase()}</Text>
              <FlatList
                data={cancelledSubscriptions}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <SubscriptionCard
                    subscription={item}
                    variant="cancelled"
                    onPress={() => router.push({ pathname: '/subscription/[id]', params: { id: item.id } })}
                  />
                )}
              />
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={showFilterSheet} transparent animationType="slide" onRequestClose={() => setShowFilterSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowFilterSheet(false)} />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('history.filter.title')}</Text>

          <Text style={styles.filterSectionLabel}>{t('history.filter.type')}</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((opt) => {
              const isActive = filters.type === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilters((f) => ({ ...f, type: opt.key }))}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.filterSectionLabel}>{t('history.filter.dateRange')}</Text>
          <View style={styles.chipRow}>
            {DATE_RANGE_OPTIONS.map((opt) => {
              const isActive = filters.dateRange === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilters((f) => ({ ...f, dateRange: opt.key }))}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.filterSectionLabel}>{t('history.filter.category')}</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const isActive = filters.categories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  <Ionicons name={cat.icon} size={13} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{t('category.' + cat.id)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={() => setShowFilterSheet(false)}>
            <Text style={styles.doneButtonText}>{t('history.filter.apply')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
