import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { OccasionCard } from '@/components/redeemy/OccasionCard';
import { useOccasionsStore } from '@/stores/occasionsStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { subscribeToOccasions } from '@/lib/firestoreOccasions';
import { daysUntilNextOccurrence } from '@/lib/hebrewDate';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type OccasionType } from '@/types/occasionTypes';
import type { AppColors } from '@/constants/colors';

type SortKey = 'daysUntil' | 'name' | 'year';

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
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      textAlign: isRTL ? 'right' : 'left',
      letterSpacing: 0,
    },
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
    list: { flex: 1 },
    listContent: { paddingTop: 4, paddingBottom: 100 },
    listContentEmpty: { flex: 1 },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      gap: 12,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
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

const TYPE_FILTERS: OccasionType[] = ['birthday', 'anniversary', 'yahrzeit', 'other'];

export default function OccasionsScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const { t } = useTranslation();

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'daysUntil', label: t('occasions.sort.daysUntil') },
    { key: 'name',      label: t('occasions.sort.name')      },
    { key: 'year',      label: t('occasions.sort.year')      },
  ];

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const occasions = useOccasionsStore((s) => s.occasions);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<OccasionType | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('daysUntil');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToOccasions(currentUser.uid, familyId);
    return unsub;
  }, [currentUser, familyId]);

  const availableTypes = useMemo(
    () => TYPE_FILTERS.filter((type) => occasions.some((o) => o.type === type)),
    [occasions]
  );

  const filteredOccasions = useMemo(() => {
    let list = occasions;

    if (selectedType) {
      list = list.filter((o) => o.type === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((o) =>
        o.name.toLowerCase().includes(q) ||
        (o.customLabel ?? '').toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const dateA = a.eventDate instanceof Date ? a.eventDate : new Date(a.eventDate as unknown as string);
      const dateB = b.eventDate instanceof Date ? b.eventDate : new Date(b.eventDate as unknown as string);

      if (sortKey === 'daysUntil') {
        return (
          daysUntilNextOccurrence(dateA, a.useHebrewDate, a.hebrewDay, a.hebrewMonth) -
          daysUntilNextOccurrence(dateB, b.useHebrewDate, b.hebrewDay, b.hebrewMonth)
        );
      }
      if (sortKey === 'name') {
        return a.name.localeCompare(b.name, 'he');
      }
      // year — oldest event first
      return dateA.getFullYear() - dateB.getFullYear();
    });
  }, [occasions, searchQuery, selectedType, sortKey]);

  function renderEmpty() {
    if (occasions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={38} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t('occasions.empty.title')}</Text>
          <Text style={styles.emptySubtitle}>{t('occasions.empty.subtitle')}</Text>
          <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/add-occasion')}>
            <Text style={styles.emptyActionText}>{t('occasions.empty.action')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    // Has occasions but search/filter returned nothing
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>{t('occasions.noResults')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View>
        <View style={styles.header}>
          <Text style={styles.title}>{t('occasions.title')}</Text>
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
            placeholder={t('occasions.search')}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {availableTypes.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          {([null, ...availableTypes] as (OccasionType | null)[]).map((type) => {
            const isActive = type === selectedType;
            return (
              <TouchableOpacity
                key={type ?? 'all'}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedType(isActive ? null : type)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {type ? t(`occasions.types.${type}`) : t('occasions.filter.all')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        )}
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          filteredOccasions.length === 0 && styles.listContentEmpty,
        ]}
        data={filteredOccasions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OccasionCard
            occasion={item}
            onPress={() => router.push(`/occasion/${item.id}`)}
          />
        )}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-occasion')}
        accessibilityRole="button"
        accessibilityLabel={t('occasions.empty.action')}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
