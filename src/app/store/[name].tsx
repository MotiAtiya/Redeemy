import { useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { CreditCard } from '@/components/redeemy/CreditCard';
import { useCreditsStore } from '@/stores/creditsStore';
import { formatCurrency } from '@/lib/formatCurrency';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { SAGE_TEAL } from '@/components/ui/theme';

export default function StoreDetailScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const credits = useCreditsStore((s) => s.credits);

  const { active, redeemed, totalAgot } = useMemo(() => {
    const storeCredits = credits.filter((c) => c.storeName === name);
    const active = storeCredits.filter((c) => c.status === CreditStatus.ACTIVE);
    const redeemed = storeCredits
      .filter((c) => c.status === CreditStatus.REDEEMED)
      .sort((a, b) => {
        const aDate = a.redeemedAt ? new Date(a.redeemedAt as Date).getTime() : 0;
        const bDate = b.redeemedAt ? new Date(b.redeemedAt as Date).getTime() : 0;
        return bDate - aDate;
      });
    const totalAgot = active.reduce((sum, c) => sum + c.amount, 0);
    return { active, redeemed, totalAgot };
  }, [credits, name]);

  const sections = useMemo(() => {
    const result: { title: string; data: Credit[] }[] = [];
    if (active.length > 0) result.push({ title: 'Active', data: active });
    if (redeemed.length > 0) result.push({ title: 'Redeemed', data: redeemed });
    return result;
  }, [active, redeemed]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.storeName} numberOfLines={1}>{name}</Text>
          {totalAgot > 0 && (
            <Text style={styles.totalValue}>{formatCurrency(totalAgot)} active</Text>
          )}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item, section }) => (
          <CreditCard
            credit={item}
            variant={section.title === 'Redeemed' ? 'redeemed' : 'active'}
            onPress={() => router.push(`/credit/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color="#BDBDBD" />
            <Text style={styles.emptyText}>No credits for this store</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#F5F5F5',
  },
  headerText: { flex: 1 },
  storeName: { fontSize: 20, fontWeight: '700', color: '#212121' },
  totalValue: { fontSize: 13, color: SAGE_TEAL, fontWeight: '600', marginTop: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9E9E9E', letterSpacing: 0.5 },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BDBDBD',
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
  },
  listContent: { paddingBottom: 32 },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 15, color: '#9E9E9E' },
});
