import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CreditCard } from '@/components/redeemy/CreditCard';
import { SyncIndicator } from '@/components/redeemy/SyncIndicator';
import { subscribeToCredits } from '@/lib/firestoreCredits';
import { sortCreditsHome, filterActiveCredits, type HomeSortKey } from '@/lib/creditUtils';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { CreditStatus } from '@/types/creditTypes';
import type { AppColors } from '@/constants/colors';

type SortKey = HomeSortKey;

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
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
      minWidth: 160,
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
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    creditsList: { flex: 1 },
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

export default function CreditsScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'expiration', label: t('credits.sort.expiration') },
    { key: 'amount',     label: t('credits.sort.amount')     },
    { key: 'storeName',  label: t('credits.sort.storeAZ')    },
    { key: 'createdAt',  label: t('credits.sort.recent')     },
  ];

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const credits = useCreditsStore((s) => s.credits);
  const isLoading = useCreditsStore((s) => s.isLoading);
  const searchQuery = useCreditsStore((s) => s.searchQuery);
  const setSearchQuery = useCreditsStore((s) => s.setSearchQuery);
  const setLoading = useCreditsStore((s) => s.setLoading);

  const [sortKey, setSortKey] = useState<SortKey>('expiration');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoading(true);
    const unsubscribe = subscribeToCredits(currentUser.uid, familyId);
    return unsubscribe;
  }, [currentUser?.uid, familyId, setLoading]);

  const filteredCredits = useMemo(
    () => sortCreditsHome(filterActiveCredits(credits, searchQuery, selectedCategory), sortKey),
    [credits, searchQuery, sortKey, selectedCategory]
  );

  const availableCategories = useMemo(
    () => [...new Set(credits.filter((c) => c.status === CreditStatus.ACTIVE).map((c) => c.category))],
    [credits]
  );

  function openAddCredit() { router.push('/add-credit'); }

  function renderEmpty() {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="wallet-outline" size={56} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>{t('credits.empty.title')}</Text>
        <Text style={styles.emptySubtitle}>{t('credits.empty.subtitle')}</Text>
        <TouchableOpacity style={styles.emptyAction} onPress={openAddCredit}>
          <Text style={styles.emptyActionText}>{t('credits.empty.action')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('credits.title')}</Text>
            <SyncIndicator />
          </View>
          <TouchableOpacity onPress={() => setShowSortMenu((s) => !s)}>
            <Ionicons name="swap-vertical-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {showSortMenu && (
          <View style={styles.sortMenu}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.sortOption, sortKey === opt.key && styles.sortOptionActive]}
                onPress={() => { setSortKey(opt.key); setShowSortMenu(false); }}
              >
                <Text style={[styles.sortOptionText, sortKey === opt.key && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {sortKey === opt.key && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('credits.search')}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {availableCategories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {[null, ...availableCategories].map((item) => {
              const isActive = item === selectedCategory;
              return (
                <TouchableOpacity
                  key={item ?? 'all'}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(isActive ? null : item)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {item != null ? t('category.' + item) : t('credits.filter.all')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {isLoading && credits.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      <FlatList
        data={filteredCredits}
        keyExtractor={(item) => item.id}
        style={styles.creditsList}
        renderItem={({ item }) => (
          <CreditCard credit={item} onPress={() => router.push(`/credit/${item.id}`)} />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filteredCredits.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={openAddCredit}
        accessibilityRole="button"
        accessibilityLabel="Add credit"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
