import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useCreditsStore } from '@/stores/creditsStore';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { formatCurrency } from '@/lib/formatCurrency';
import { CreditStatus } from '@/types/creditTypes';
import type { AppColors } from '@/constants/colors';

interface StoreRow {
  storeName: string;
  activeCount: number;
  totalAgot: number;
}

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      alignSelf: 'flex-start',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 12,
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
  });
}

export default function StoresScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
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
        map.set(credit.storeName, { storeName: credit.storeName, activeCount: 1, totalAgot: credit.amount });
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
    return (
      <View style={styles.emptyState}>
        <Ionicons name="storefront-outline" size={56} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>{t('stores.empty.title')}</Text>
        <Text style={styles.emptySubtitle}>{t('stores.empty.subtitle')}</Text>
        <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/add-credit')}>
          <Text style={styles.emptyActionText}>{t('stores.empty.action')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>{t('stores.title')}</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('stores.search')}
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

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
              <Ionicons name="storefront-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowName} numberOfLines={1}>{item.storeName}</Text>
              <Text style={styles.rowMeta}>
                {item.activeCount} active credit{item.activeCount !== 1 ? 's' : ''}
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
