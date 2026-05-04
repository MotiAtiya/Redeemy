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
import { WarrantyCard } from '@/components/redeemy/WarrantyCard';
import { SearchBar } from '@/components/redeemy/SearchBar';
import { EmptyState } from '@/components/redeemy/EmptyState';
import { useWarrantiesStore } from '@/stores/warrantiesStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { WarrantyStatus, type Warranty } from '@/types/warrantyTypes';
import { getWarrantyProductLabel } from '@/data/warrantyProductTypes';
import type { AppColors } from '@/constants/colors';

function warrantyProductDisplay(w: Warranty, language: string | undefined): string {
  return getWarrantyProductLabel(w.productType, language) || w.productName || '';
}

type SortOption = 'expiry' | 'productName' | 'storeName' | 'recent';

function makeStyles(colors: AppColors) {
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

function sortWarranties(warranties: Warranty[], sortOption: SortOption, language: string | undefined): Warranty[] {
  const collatorLocale = language?.startsWith('en') ? 'en' : 'he';
  return [...warranties].sort((a, b) => {
    switch (sortOption) {
      case 'expiry':
        if (a.noExpiry && b.noExpiry) return 0;
        if (a.noExpiry) return 1;
        if (b.noExpiry) return -1;
        return (a.expirationDate!.getTime()) - (b.expirationDate!.getTime());
      case 'productName':
        return warrantyProductDisplay(a, language).localeCompare(warrantyProductDisplay(b, language), collatorLocale);
      case 'storeName':
        return a.storeName.localeCompare(b.storeName, collatorLocale);
      case 'recent':
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });
}

export default function WarrantiesScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, i18n } = useTranslation();
  const warranties = useWarrantiesStore((s) => s.warranties);

  const [sortOption, setSortOption] = useState<SortOption>('expiry');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);

  const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: 'expiry',       label: t('warranties.sort.expiry')       },
    { key: 'productName',  label: t('warranties.sort.productName')  },
    { key: 'storeName',    label: t('warranties.sort.storeName')    },
    { key: 'recent',       label: t('warranties.sort.recent')       },
  ];

  const activeWarranties = useMemo(() =>
    warranties.filter((w) =>
      w.status === WarrantyStatus.ACTIVE &&
      (w.noExpiry || !w.expirationDate || w.expirationDate > new Date())
    ),
  [warranties]);

  // Collect unique productType values present in active warranties (for filter chips)
  const availableProductTypes = useMemo(
    () => [...new Set(activeWarranties.map((w) => w.productType).filter((p): p is string => !!p))],
    [activeWarranties]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortWarranties(
      activeWarranties.filter((w) => {
        if (selectedProductType && w.productType !== selectedProductType) return false;
        if (!q) return true;
        return (
          w.storeName.toLowerCase().includes(q) ||
          warrantyProductDisplay(w, i18n.language).toLowerCase().includes(q) ||
          (w.brand ?? '').toLowerCase().includes(q) ||
          (w.model ?? '').toLowerCase().includes(q) ||
          (w.notes ?? '').toLowerCase().includes(q)
        );
      }),
      sortOption,
      i18n.language,
    );
  }, [activeWarranties, searchQuery, selectedProductType, sortOption, i18n.language]);

  function renderEmpty() {
    if (activeWarranties.length > 0) {
      return (
        <EmptyState
          icon="search-outline"
          iconSize={48}
          title={t('warranties.noResults')}
        />
      );
    }
    return (
      <EmptyState
        icon="shield-checkmark-outline"
        title={t('warranties.empty.title')}
        subtitle={t('warranties.empty.subtitle')}
        actionLabel={t('warranties.empty.action')}
        onAction={() => router.push('/add-warranty')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View>
        <View style={styles.header}>
          <Text style={styles.title}>{t('warranties.title')}</Text>
          <TouchableOpacity onPress={() => setShowSortMenu((s) => !s)}>
            <Ionicons name="swap-vertical-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

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

        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder={t('warranties.search')} />

        {availableProductTypes.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {[null, ...availableProductTypes].map((item) => {
              const isActive = item === selectedProductType;
              const typeLabel = item
                ? (getWarrantyProductLabel(item, i18n.language) || item)
                : t('warranties.filter.all');
              return (
                <TouchableOpacity
                  key={item ?? 'all'}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedProductType(isActive ? null : (item ?? null))}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {typeLabel}
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
          <WarrantyCard
            warranty={item}
            onPress={() => router.push({ pathname: '/warranty/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listContentEmpty]}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-warranty')}
        accessibilityRole="button"
        accessibilityLabel={t('warranties.empty.action')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
