import { useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CreditCard } from '@/components/redeemy/CreditCard';
import { useCreditsStore } from '@/stores/creditsStore';
import { formatCurrency } from '@/lib/formatCurrency';
import { CreditStatus, type Credit } from '@/types/creditTypes';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: colors.background,
    },
    headerText: { flex: 1 },
    storeName: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, alignSelf: 'flex-start' },
    totalValue: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 1, alignSelf: 'flex-start' },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.5 },
    sectionCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
      backgroundColor: colors.separator,
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderRadius: 8,
    },
    listContent: { paddingBottom: 32 },
    emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.textTertiary },
  });
}

export default function StoreDetailScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
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
    const result: { title: string; key: string; data: Credit[] }[] = [];
    if (active.length > 0) result.push({ title: t('store.active'), key: 'active', data: active });
    if (redeemed.length > 0) result.push({ title: t('store.redeemed'), key: 'redeemed', data: redeemed });
    return result;
  }, [active, redeemed, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.storeName} numberOfLines={1}>{name}</Text>
          {totalAgot > 0 && (
            <Text style={styles.totalValue}>{formatCurrency(totalAgot)} {t('store.active').toLowerCase()}</Text>
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
            variant={section.key === 'redeemed' ? 'redeemed' : 'active'}
            onPress={() => router.push(`/credit/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t('store.empty')}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}
