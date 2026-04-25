import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BaseCard } from './BaseCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { daysUntilNextOccurrence } from '@/lib/hebrewDate';
import { type Occasion, type OccasionType } from '@/types/occasionTypes';
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
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    center: { flex: 1, gap: 4, alignItems: 'flex-start' },
    title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    subtitle: { fontSize: 13, color: colors.textSecondary },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    badgeText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  });
}

function DaysBadge({ days }: { days: number }) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  let bgColor: string;
  let textColor: string;
  let label: string;

  if (days === 0) {
    bgColor = colors.primarySurface;
    textColor = colors.primary;
    label = t('occasions.today');
  } else if (days <= 7) {
    bgColor = colors.urgencyAmberSurface;
    textColor = colors.urgencyAmber;
    label = t('occasions.daysUntil', { count: days });
  } else if (days <= 30) {
    bgColor = colors.urgencyGreenSurface;
    textColor = colors.urgencyGreen;
    label = t('occasions.daysUntil', { count: days });
  } else {
    bgColor = colors.separator;
    textColor = colors.textTertiary;
    label = t('occasions.daysUntil', { count: days });
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor, borderColor: textColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

interface Props {
  occasion: Occasion;
  onPress: () => void;
}

export function OccasionCard({ occasion, onPress }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  const eventDate = occasion.eventDate instanceof Date
    ? occasion.eventDate
    : new Date(occasion.eventDate as unknown as string);

  const days = useMemo(
    () => daysUntilNextOccurrence(eventDate, occasion.useHebrewDate, occasion.hebrewDay, occasion.hebrewMonth),
    [eventDate, occasion.useHebrewDate, occasion.hebrewDay, occasion.hebrewMonth]
  );

  const title = (() => {
    switch (occasion.type) {
      case 'birthday': return t('occasions.cardTitle.birthday', { name: occasion.name });
      case 'anniversary': return t('occasions.cardTitle.anniversary', { name: occasion.name });
      case 'yahrzeit': return t('occasions.cardTitle.yahrzeit', { name: occasion.name });
      case 'other': return `${occasion.customLabel ?? ''} — ${occasion.name}`;
    }
  })();

  const currentYear = new Date().getFullYear();
  const eventYear = eventDate.getFullYear();
  const yearsCount = currentYear - eventYear;

  const subtitle = yearsCount > 0
    ? t('occasions.yearsCount', { count: yearsCount })
    : '';

  return (
    <BaseCard onPress={onPress} accessibilityLabel={title}>
      <View style={styles.iconCircle}>
        <Ionicons name={TYPE_ICONS[occasion.type]} size={22} color={colors.primary} />
      </View>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <DaysBadge days={days} />
    </BaseCard>
  );
}
