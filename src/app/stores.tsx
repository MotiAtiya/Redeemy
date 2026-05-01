import { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SearchBar } from '@/components/redeemy/SearchBar';
import { EmptyState } from '@/components/redeemy/EmptyState';
import { useCreditsStore } from '@/stores/creditsStore';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatCurrency } from '@/lib/formatCurrency';
import { CreditStatus } from '@/types/creditTypes';
import { CATEGORIES, DEFAULT_CATEGORY_ID } from '@/constants/categories';
import { getCategoryForStore } from '@/data/israeliStores';
import type { AppColors } from '@/constants/colors';
import type { ComponentProps } from 'react';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface StoreRow {
  storeName: string;
  activeCount: number;
  totalAgot: number;
  category: string;
}

function getIconForCategory(categoryId: string): IoniconsName {
  return CATEGORIES.find((c) => c.id === categoryId)?.icon ?? 'storefront-outline';
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      backgroundColor: colors.background,
    },
    headerTitle: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    listContent: { paddingBottom: 32 },
    listContentEmpty: { flex: 1 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowContent: { flex: 1 },
    rowName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, alignSelf: 'flex-start' },
    rowMeta: { fontSize: 12, color: colors.textTertiary, marginTop: 2, alignSelf: 'flex-start' },
    rowAmount: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginEnd: 4 },
    separator: { height: 1, backgroundColor: colors.separator, marginStart: 64 },
  });
}

export default function StoresScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const credits = useCreditsStore((s) => s.credits);
  const currencySymbol = CURRENCY_SYMBOLS[useSettingsStore((s) => s.currency)];
  const [search, setSearch] = useState('');

  const stores = useMemo<StoreRow[]>(() => {
    const map = new Map<string, StoreRow>();
    for (const credit of credits) {
      if (credit.status !== CreditStatus.ACTIVE) continue;
      const existing = map.get(credit.storeName);
      if (existing) {
        existing.activeCount += 1;
        existing.totalAgot += credit.amount;
      } else {
        const category =
          credit.category && credit.category !== DEFAULT_CATEGORY_ID
            ? credit.category
            : getCategoryForStore(credit.storeName) ?? DEFAULT_CATEGORY_ID;
        map.set(credit.storeName, {
          storeName: credit.storeName,
          activeCount: 1,
          totalAgot: credit.amount,
          category,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.storeName.localeCompare(b.storeName));
  }, [credits]);

  const filtered = useMemo(() => {
    if (!search.trim()) return stores;
    const q = search.toLowerCase();
    return stores.filter((s) => s.storeName.toLowerCase().includes(q));
  }, [stores, search]);

  function renderEmpty() {
    if (stores.length > 0) {
      return (
        <EmptyState
          icon="search-outline"
          iconSize={48}
          title={t('stores.noResults')}
        />
      );
    }
    return (
      <EmptyState
        icon="storefront-outline"
        title={t('stores.empty.title')}
        subtitle={t('stores.empty.subtitle')}
        actionLabel={t('stores.empty.action')}
        onAction={() => router.push('/add-credit')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('stores.title')}</Text>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder={t('stores.search')} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.storeName}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push({ pathname: '/store/[name]', params: { name: item.storeName } })}
            accessibilityRole="button"
            accessibilityLabel={`${item.storeName}, ${item.activeCount} credits, ${formatCurrency(item.totalAgot, currencySymbol)}`}
          >
            <View style={styles.rowIcon}>
              <Ionicons name={getIconForCategory(item.category)} size={20} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowName} numberOfLines={1}>{item.storeName}</Text>
              <Text style={styles.rowMeta}>
                {t('stores.activeCredits', { count: item.activeCount })}
              </Text>
            </View>
            <Text style={styles.rowAmount}>{formatCurrency(item.totalAgot, currencySymbol)}</Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.listContentEmpty]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
