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
import { HeroCard } from '@/components/redeemy/HeroCard';
import { HeroBadge } from '@/components/redeemy/HeroBadge';
import { DetailScreenHeader } from '@/components/redeemy/DetailScreenHeader';
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
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
    heroTitle: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    heroYears: { fontSize: 15, color: colors.primary, fontWeight: '600', textAlign: 'center' },
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

  const days = daysUntilNextOccurrence(eventDate, occasion.useHebrewDate, occasion.hebrewDay, occasion.hebrewMonth);
  const nextDate = nextOccurrenceDate(eventDate, occasion.useHebrewDate, occasion.hebrewDay, occasion.hebrewMonth);
  const yearsCount = nextDate.getFullYear() - eventDate.getFullYear();

  const heroTitle = (() => {
    switch (occasion.type) {
      case 'birthday':   return t('occasions.heroTitle.birthday', { name: occasion.name });
      case 'anniversary': return t('occasions.heroTitle.anniversary', { name: occasion.name });
      case 'yahrzeit':   return t('occasions.heroTitle.yahrzeit', { name: occasion.name });
      case 'other':      return t('occasions.heroTitle.other', { label: occasion.customLabel ?? '', name: occasion.name });
    }
  })();

  const yearsLabel = yearsCount > 0
    ? t('occasions.yearsCount', { count: yearsCount })
    : '';

  const nextLabel = days === 0
    ? t('occasions.today')
    : t('occasions.nextOn', { date: formatDate(nextDate, dateFormat) });

  const nextBadgeColor = days === 0 || days <= 7
    ? { color: colors.urgencyRed, bgColor: colors.urgencyRedSurface }
    : days <= 30
    ? { color: colors.urgencyAmber, bgColor: colors.urgencyAmberSurface }
    : { color: colors.urgencyGreen, bgColor: colors.urgencyGreenSurface };

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
      <DetailScreenHeader
        title={occasion.name}
        onBack={() => router.back()}
        onMenu={() => setShowActionSheet(true)}
        colors={colors}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <HeroCard iconName={TYPE_ICONS[occasion.type]}>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          {!!yearsLabel && <Text style={styles.heroYears}>{yearsLabel}</Text>}
          <HeroBadge text={nextLabel} color={nextBadgeColor.color} bgColor={nextBadgeColor.bgColor} />
        </HeroCard>

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
              showSeparator={!!occasion.notes}
            />
          )}
          {!!occasion.notes && (
            <DetailRow
              icon="document-text-outline"
              label={t('occasion.detail.notes')}
              value={occasion.notes}
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
