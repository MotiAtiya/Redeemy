import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
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
import { useCreditsStore } from '@/stores/creditsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { sortCreditsHistory, filterHistoryCredits, type HistorySortKey, type HistoryDateRange } from '@/lib/creditUtils';
import { CATEGORIES } from '@/constants/categories';
import type { AppColors } from '@/constants/colors';

type SortKey = HistorySortKey;
type DateRange = HistoryDateRange;

interface FilterState {
  categories: string[];
  dateRange: DateRange;
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
    searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
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
    sortLabel: { fontSize: 12, color: colors.textTertiary, paddingHorizontal: 16, marginBottom: 8, alignSelf: 'flex-start' },
    listContent: { paddingBottom: 32 },
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

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('redeemedAt');
  const [filters, setFilters] = useState<FilterState>({ categories: [], dateRange: 'allTime' });
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const filtered = useMemo(
    () => sortCreditsHistory(
      filterHistoryCredits(credits, search, filters.dateRange, filters.categories),
      sortKey
    ),
    [credits, search, filters, sortKey]
  );

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
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
    if (key === 'dateRange') setFilters((f) => ({ ...f, dateRange: 'allTime' }));
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

      <Text style={styles.sortLabel}>{SORT_OPTIONS.find((o) => o.key === sortKey)?.label}</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CreditCard credit={item} variant="redeemed" onPress={() => router.push(`/credit/${item.id}`)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={56} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>{t('history.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>{t('history.empty.subtitle')}</Text>
          </View>
        }
        contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listContentEmpty]}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showFilterSheet} transparent animationType="slide" onRequestClose={() => setShowFilterSheet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowFilterSheet(false)} />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('history.filter.title')}</Text>

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
