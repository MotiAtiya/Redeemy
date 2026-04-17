import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CreditCard } from '@/components/redeemy/CreditCard';
import { useCreditsStore } from '@/stores/creditsStore';
import { CreditStatus } from '@/types/creditTypes';
import { sortCreditsHistory, filterHistoryCredits, dateRangeStart, type HistorySortKey, type HistoryDateRange } from '@/lib/creditUtils';
import { CATEGORIES } from '@/constants/categories';
import { SAGE_TEAL } from '@/components/ui/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = HistorySortKey;

type DateRange = HistoryDateRange;

interface FilterState {
  categories: string[];
  dateRange: DateRange;
}

const DATE_RANGE_OPTIONS: { key: DateRange; label: string }[] = [
  { key: 'thisMonth',   label: 'This Month'    },
  { key: 'last3Months', label: 'Last 3 Months' },
  { key: 'thisYear',    label: 'This Year'     },
  { key: 'allTime',     label: 'All Time'      },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'redeemedAt', label: 'Most Recently Redeemed' },
  { key: 'storeName',  label: 'Store Name A–Z'         },
  { key: 'amount',     label: 'Amount (High to Low)'   },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const router = useRouter();
  const credits = useCreditsStore((s) => s.credits);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('redeemedAt');
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    dateRange: 'allTime',
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Apply search + filters + sort
  const filtered = useMemo(
    () => sortCreditsHistory(
      filterHistoryCredits(credits, search, filters.dateRange, filters.categories),
      sortKey
    ),
    [credits, search, filters, sortKey]
  );

  // Active filter chips (for display below search bar)
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.dateRange !== 'allTime') {
      chips.push({
        key: 'dateRange',
        label: DATE_RANGE_OPTIONS.find((o) => o.key === filters.dateRange)?.label ?? '',
      });
    }
    for (const catId of filters.categories) {
      const cat = CATEGORIES.find((c) => c.id === catId);
      if (cat) chips.push({ key: catId, label: cat.label });
    }
    return chips;
  }, [filters]);

  function removeFilterChip(key: string) {
    if (key === 'dateRange') {
      setFilters((f) => ({ ...f, dateRange: 'allTime' }));
    } else {
      setFilters((f) => ({
        ...f,
        categories: f.categories.filter((c) => c !== key),
      }));
    }
  }

  function toggleCategory(catId: string) {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(catId)
        ? f.categories.filter((c) => c !== catId)
        : [...f.categories, catId],
    }));
  }

  // ---- render --------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <View style={styles.headerActions}>
          {/* Sort picker */}
          <TouchableOpacity onPress={() => {
            // Cycle through sort options
            const idx = SORT_OPTIONS.findIndex((o) => o.key === sortKey);
            setSortKey(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].key);
          }}>
            <Ionicons name="swap-vertical-outline" size={22} color="#616161" />
          </TouchableOpacity>
          {/* Filter */}
          <TouchableOpacity onPress={() => setShowFilterSheet(true)}>
            <Ionicons
              name={activeFilterChips.length > 0 ? 'filter' : 'filter-outline'}
              size={22}
              color={activeFilterChips.length > 0 ? SAGE_TEAL : '#616161'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9E9E9E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search history…"
          placeholderTextColor="#9E9E9E"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <View style={styles.activeFilters}>
          {activeFilterChips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={styles.activeFilterChip}
              onPress={() => removeFilterChip(chip.key)}
            >
              <Text style={styles.activeFilterChipText}>{chip.label}</Text>
              <Ionicons name="close" size={12} color={SAGE_TEAL} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sort label */}
      <Text style={styles.sortLabel}>
        {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
      </Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CreditCard
            credit={item}
            variant="redeemed"
            onPress={() => router.push(`/credit/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={56} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>No credits redeemed yet</Text>
            <Text style={styles.emptySubtitle}>
              Your history will appear here after you use a credit
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter bottom sheet */}
      <Modal
        visible={showFilterSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowFilterSheet(false)}
        />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Filter History</Text>

          {/* Date range */}
          <Text style={styles.filterSectionLabel}>DATE RANGE</Text>
          <View style={styles.chipRow}>
            {DATE_RANGE_OPTIONS.map((opt) => {
              const isActive = filters.dateRange === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() =>
                    setFilters((f) => ({ ...f, dateRange: opt.key }))
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Category multi-select */}
          <Text style={styles.filterSectionLabel}>CATEGORY</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => {
              const isActive = filters.categories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={13}
                    color={isActive ? '#FFFFFF' : '#616161'}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && styles.filterChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowFilterSheet(false)}
          >
            <Text style={styles.doneButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#212121' },
  headerActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#212121' },
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
    borderColor: SAGE_TEAL,
    backgroundColor: '#EFF5F4',
  },
  activeFilterChipText: { fontSize: 12, color: SAGE_TEAL, fontWeight: '500' },
  sortLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  listContent: { paddingBottom: 32 },
  listContentEmpty: { flex: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#424242', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#9E9E9E', textAlign: 'center', lineHeight: 20 },
  // Filter sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  filterSheet: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#212121', marginBottom: 4 },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
    letterSpacing: 0.8,
    marginTop: 4,
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
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  filterChipActive: { backgroundColor: SAGE_TEAL, borderColor: SAGE_TEAL },
  filterChipText: { fontSize: 13, color: '#616161' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  doneButton: {
    marginTop: 8,
    height: 50,
    backgroundColor: SAGE_TEAL,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
