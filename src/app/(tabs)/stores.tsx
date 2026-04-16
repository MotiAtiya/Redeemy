import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCreditsStore } from '@/stores/creditsStore';
import { formatCurrency } from '@/lib/formatCurrency';
import { CreditStatus } from '@/types/creditTypes';
import { SAGE_TEAL } from '@/components/ui/theme';

interface StoreRow {
  storeName: string;
  activeCount: number;
  totalAgot: number;
}

export default function StoresScreen() {
  const router = useRouter();
  const credits = useCreditsStore((s) => s.credits);
  const [search, setSearch] = useState('');

  // Derive store rows from active credits — no Firestore query needed
  const stores = useMemo<StoreRow[]>(() => {
    const map = new Map<string, StoreRow>();

    for (const credit of credits) {
      if (credit.status !== CreditStatus.ACTIVE) continue;
      const existing = map.get(credit.storeName);
      if (existing) {
        existing.activeCount += 1;
        existing.totalAgot += credit.amount;
      } else {
        map.set(credit.storeName, {
          storeName: credit.storeName,
          activeCount: 1,
          totalAgot: credit.amount,
        });
      }
    }

    return [...map.values()].sort((a, b) =>
      a.storeName.localeCompare(b.storeName)
    );
  }, [credits]);

  const filtered = useMemo(() => {
    if (!search.trim()) return stores;
    const q = search.toLowerCase();
    return stores.filter((s) => s.storeName.toLowerCase().includes(q));
  }, [stores, search]);

  function renderEmpty() {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="storefront-outline" size={56} color="#BDBDBD" />
        <Text style={styles.emptyTitle}>No active credits yet</Text>
        <Text style={styles.emptySubtitle}>
          Add your first credit to get started
        </Text>
        <TouchableOpacity
          style={styles.emptyAction}
          onPress={() => router.push('/add-credit')}
        >
          <Text style={styles.emptyActionText}>Add Credit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Stores</Text>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9E9E9E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stores…"
          placeholderTextColor="#9E9E9E"
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
            onPress={() =>
              router.push({
                pathname: '/store/[name]',
                params: { name: item.storeName },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${item.storeName}, ${item.activeCount} credits, ${formatCurrency(item.totalAgot)}`}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="storefront-outline" size={20} color={SAGE_TEAL} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowName} numberOfLines={1}>
                {item.storeName}
              </Text>
              <Text style={styles.rowMeta}>
                {item.activeCount} active credit{item.activeCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.rowAmount}>{formatCurrency(item.totalAgot)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#212121' },
  listContent: { paddingBottom: 32 },
  listContentEmpty: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF5F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: '#212121' },
  rowMeta: { fontSize: 12, color: '#9E9E9E', marginTop: 2 },
  rowAmount: { fontSize: 16, fontWeight: '700', color: '#212121', marginRight: 4 },
  separator: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 64 },
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
});
