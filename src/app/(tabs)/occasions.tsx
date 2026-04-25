import { useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
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
import type { AppColors } from '@/constants/colors';

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
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    list: { flex: 1 },
    listContent: { paddingTop: 4, paddingBottom: 24 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    emptySubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    emptyAction: {
      marginTop: 8,
      height: 48,
      paddingHorizontal: 24,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyActionText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });
}

export default function OccasionsScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const currentUser = useAuthStore((s) => s.currentUser);
  const familyId = useSettingsStore((s) => s.familyId);
  const occasions = useOccasionsStore((s) => s.occasions);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToOccasions(currentUser.uid, familyId);
    return unsub;
  }, [currentUser, familyId]);

  const sortedOccasions = useMemo(() => {
    return [...occasions].sort((a, b) => {
      const dateA = a.eventDate instanceof Date ? a.eventDate : new Date(a.eventDate as unknown as string);
      const dateB = b.eventDate instanceof Date ? b.eventDate : new Date(b.eventDate as unknown as string);
      const daysA = daysUntilNextOccurrence(dateA, a.useHebrewDate, a.hebrewDay, a.hebrewMonth);
      const daysB = daysUntilNextOccurrence(dateB, b.useHebrewDate, b.hebrewDay, b.hebrewMonth);
      return daysA - daysB;
    });
  }, [occasions]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('occasions.title')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-occasion')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('occasions.empty.action')}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {sortedOccasions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={38} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t('occasions.empty.title')}</Text>
          <Text style={styles.emptySubtitle}>{t('occasions.empty.subtitle')}</Text>
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={() => router.push('/add-occasion')}
          >
            <Text style={styles.emptyActionText}>{t('occasions.empty.action')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={sortedOccasions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OccasionCard
              occasion={item}
              onPress={() => router.push(`/occasion/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
