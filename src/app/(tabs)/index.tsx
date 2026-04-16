import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CreditCard } from '@/components/redeemy/CreditCard';
import { subscribeToCredits } from '@/lib/firestoreCredits';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { CreditStatus } from '@/types/creditTypes';
import { SAGE_TEAL } from '@/components/ui/theme';
import type { Credit } from '@/types/creditTypes';

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

type SortKey = 'expiration' | 'amount' | 'storeName' | 'createdAt';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'expiration', label: 'Expiration' },
  { key: 'amount',     label: 'Amount'     },
  { key: 'storeName',  label: 'Store A–Z'  },
  { key: 'createdAt',  label: 'Recent'     },
];

function sortCredits(credits: Credit[], key: SortKey): Credit[] {
  return [...credits].sort((a, b) => {
    switch (key) {
      case 'expiration':
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      case 'amount':
        return b.amount - a.amount;
      case 'storeName':
        return a.storeName.localeCompare(b.storeName);
      case 'createdAt':
        return new Date(b.createdAt as Date).getTime() - new Date(a.createdAt as Date).getTime();
    }
  });
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CreditsScreen() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const credits = useCreditsStore((s) => s.credits);
  const isLoading = useCreditsStore((s) => s.isLoading);
  const searchQuery = useCreditsStore((s) => s.searchQuery);
  const setSearchQuery = useCreditsStore((s) => s.setSearchQuery);
  const setLoading = useCreditsStore((s) => s.setLoading);

  const [sortKey, setSortKey] = useState<SortKey>('expiration');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Subscribe to Firestore real-time updates
  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoading(true);
    const unsubscribe = subscribeToCredits(currentUser.uid);
    return unsubscribe;
  }, [currentUser?.uid, setLoading]);

  // Filter + sort — Credits tab shows ACTIVE only
  const filteredCredits = useMemo(() => {
    let result = credits.filter((c) => c.status === CreditStatus.ACTIVE);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.storeName.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      result = result.filter((c) => c.category === selectedCategory);
    }

    return sortCredits(result, sortKey);
  }, [credits, searchQuery, sortKey, selectedCategory]);

  // Unique categories among active credits for filter chips
  const availableCategories = useMemo(
    () => [...new Set(credits.filter((c) => c.status === CreditStatus.ACTIVE).map((c) => c.category))],
    [credits]
  );

  function openAddCredit() {
    router.push('/add-credit');
  }

  // ---- render helpers ------------------------------------------------------

  function renderEmpty() {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="wallet-outline" size={56} color="#BDBDBD" />
        <Text style={styles.emptyTitle}>No credits yet</Text>
        <Text style={styles.emptySubtitle}>
          Add your first credit and never lose money again
        </Text>
        <TouchableOpacity style={styles.emptyAction} onPress={openAddCredit}>
          <Text style={styles.emptyActionText}>Add Credit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Credits</Text>
        <TouchableOpacity onPress={() => setShowSortMenu((s) => !s)}>
          <Ionicons name="swap-vertical-outline" size={22} color="#616161" />
        </TouchableOpacity>
      </View>

      {/* Sort menu */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortOption, sortKey === opt.key && styles.sortOptionActive]}
              onPress={() => {
                setSortKey(opt.key);
                setShowSortMenu(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortKey === opt.key && styles.sortOptionTextActive,
                ]}
              >
                {opt.label}
              </Text>
              {sortKey === opt.key && (
                <Ionicons name="checkmark" size={16} color={SAGE_TEAL} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9E9E9E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by store or notes…"
          placeholderTextColor="#9E9E9E"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category filter chips */}
      {availableCategories.length > 1 && (
        <FlatList
          data={[null, ...availableCategories]}
          keyExtractor={(item) => item ?? 'all'}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
          renderItem={({ item }) => {
            const isActive = item === selectedCategory;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedCategory(isActive ? null : item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {item ?? 'All'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Loading */}
      {isLoading && credits.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={SAGE_TEAL} />
        </View>
      )}

      {/* Credits list */}
      <FlatList
        data={filteredCredits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CreditCard
            credit={item}
            onPress={() => router.push(`/credit/${item.id}`)}
          />
        )}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filteredCredits.length === 0 && styles.listContentEmpty,
        ]}
        getItemLayout={(_data, index) => ({
          length: 108,
          offset: 108 * index,
          index,
        })}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
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
  sortMenu: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: '#FFFFFF',
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
  sortOptionActive: { backgroundColor: '#F5F5F5' },
  sortOptionText: { fontSize: 14, color: '#424242' },
  sortOptionTextActive: { color: SAGE_TEAL, fontWeight: '600' },
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
  filterChips: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: { backgroundColor: SAGE_TEAL, borderColor: SAGE_TEAL },
  filterChipText: { fontSize: 13, color: '#616161' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingTop: 4, paddingBottom: 100 },
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
  emptyAction: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: SAGE_TEAL,
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
    backgroundColor: SAGE_TEAL,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
