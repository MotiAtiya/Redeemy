import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DetailRow } from '@/components/redeemy/DetailRow';
import { ActionModal } from '@/components/redeemy/ActionModal';
import { useOccasionsStore } from '@/stores/occasionsStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { deleteOccasion } from '@/lib/firestoreOccasions';
import { cancelOccasionNotifications } from '@/lib/occasionNotifications';
import { daysUntilNextOccurrence, nextOccurrenceDate } from '@/lib/hebrewDate';
import { formatDate } from '@/lib/formatDate';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type OccasionType } from '@/types/occasionTypes';
import type { AppColors } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_ICONS: Record<OccasionType, IoniconsName> = {
  birthday: 'gift-outline',
  anniversary: 'heart-outline',
  yahrzeit: 'flame-outline',
  other: 'star-outline',
};

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    backButton: { padding: 16 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, alignSelf: 'flex-start' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 20,
      alignItems: 'center',
      gap: 12,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
    heroYears: { fontSize: 15, color: colors.primary, fontWeight: '600', textAlign: 'center' },
    nextBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: colors.primarySurface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    nextBadgeText: { fontSize: 14, color: colors.primary, fontWeight: '600', textAlign: 'center' },
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFoundText: { fontSize: 16, color: colors.textTertiary },
  });
}

export default function OccasionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);

  const occasion = useOccasionsStore((s) => s.occasions.find((o) => o.id === id));
  const removeOccasion = useOccasionsStore((s) => s.removeOccasion);
  const currentUid = useAuthStore((s) => s.currentUser?.uid);
  const familyAdminId = useFamilyStore((s) => s.family?.adminId);
  const canDelete = occasion
    ? occasion.userId === currentUid || familyAdminId === currentUid
    : false;

  const [showActionSheet, setShowActionSheet] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);

  if (!occasion) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('occasion.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const eventDate = occasion.eventDate instanceof Date
    ? occasion.eventDate
    : new Date(occasion.eventDate as unknown as string);

  const currentYear = new Date().getFullYear();
  const yearsCount = currentYear - eventDate.getFullYear();

  const heroTitle = (() => {
    const isFirst = yearsCount === 1;
    switch (occasion.type) {
      case 'birthday':
        return isFirst
          ? t('occasions.heroTitle.birthdayFirst', { name: occasion.name })
          : t('occasions.heroTitle.birthday', { name: occasion.name });
      case 'anniversary':
        return isFirst
          ? t('occasions.heroTitle.anniversaryFirst', { name: occasion.name })
          : t('occasions.heroTitle.anniversary', { name: occasion.name });
      case 'yahrzeit':
        return isFirst
          ? t('occasions.heroTitle.yahrzeitFirst', { name: occasion.name })
          : t('occasions.heroTitle.yahrzeit', { name: occasion.name });
      case 'other':
        return isFirst
          ? t('occasions.heroTitle.otherFirst', { label: occasion.customLabel ?? '', name: occasion.name })
          : t('occasions.heroTitle.other', { label: occasion.customLabel ?? '', name: occasion.name });
    }
  })();

  const yearsLabel = yearsCount > 0
    ? t('occasions.yearsCount', { count: yearsCount })
    : '';

  const days = daysUntilNextOccurrence(eventDate, occasion.useHebrewDate, occasion.hebrewDay, occasion.hebrewMonth);
  const nextDate = nextOccurrenceDate(eventDate, occasion.useHebrewDate, occasion.hebrewDay, occasion.hebrewMonth);

  const nextLabel = days === 0
    ? t('occasions.today')
    : t('occasions.nextOn', { date: formatDate(nextDate, dateFormat) });

  async function handleDelete() {
    if (useUIStore.getState().offlineMode) {
      setShowActionSheet(false);
      Alert.alert(t('offline.title'), t('occasion.delete.offlineMessage'));
      return;
    }
    setShowActionSheet(false);
    Alert.alert(
      t('occasion.delete.title'),
      t('occasion.delete.message', { name: occasion!.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('occasion.delete.button'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelOccasionNotifications(occasion!.notificationIds);
              removeOccasion(occasion!.id);
              await deleteOccasion(occasion!.id);
              router.back();
            } catch {
              Alert.alert(t('common.error'), t('occasion.delete.error'));
            }
          },
        },
      ]
    );
  }

  function handleEdit() {
    afterDismissRef.current = () => { router.push(`/add-occasion?occasionId=${occasion!.id}`); };
    setShowActionSheet(false);
  }

  const typeLabel = t(`occasions.types.${occasion.type}`);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{occasion.name}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowActionSheet(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Ionicons name={TYPE_ICONS[occasion.type]} size={34} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          {!!yearsLabel && <Text style={styles.heroYears}>{yearsLabel}</Text>}
          <View style={styles.nextBadge}>
            <Text style={styles.nextBadgeText}>{nextLabel}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <DetailRow
            icon="pricetag-outline"
            label={t('occasion.detail.type')}
            value={typeLabel}
            showSeparator
          />
          <DetailRow
            icon="calendar-outline"
            label={t('occasion.detail.eventDate')}
            value={formatDate(eventDate, dateFormat)}
            showSeparator={occasion.useHebrewDate}
          />
          {occasion.useHebrewDate && !!occasion.hebrewDateStr && (
            <DetailRow
              icon="star-outline"
              label={t('occasion.detail.hebrewDate')}
              value={occasion.hebrewDateStr}
            />
          )}
        </View>
      </ScrollView>

      <ActionModal
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        cancelLabel={t('common.cancel')}
        onDismiss={() => {
          const action = afterDismissRef.current;
          afterDismissRef.current = null;
          action?.();
        }}
        actions={[
          { icon: 'create-outline', label: t('occasion.action.edit'), color: colors.textPrimary, onPress: handleEdit },
          canDelete
            ? { icon: 'trash-outline', label: t('occasion.action.delete'), color: colors.danger, onPress: handleDelete }
            : null,
        ]}
      />
    </SafeAreaView>
  );
}
