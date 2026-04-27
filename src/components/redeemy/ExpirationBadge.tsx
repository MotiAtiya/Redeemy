import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';
import type { TFunction } from 'i18next';

interface Props {
  expirationDate?: Date;
}

function getDaysRemaining(expirationDate: Date): number {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((expirationDate.getTime() - now.getTime()) / msPerDay);
}

export function computeExpiryBadge(
  expirationDate: Date | undefined,
  t: TFunction,
  colors: AppColors
): { text: string; color: string; bgColor: string } {
  if (!expirationDate) {
    return { text: t('badge.noExpiry'), color: colors.urgencyGreen, bgColor: colors.urgencyGreenSurface };
  }
  const days = getDaysRemaining(expirationDate);

  let color: string;
  let bgColor: string;
  if (days < 7) {
    color = colors.urgencyRed;
    bgColor = colors.urgencyRedSurface;
  } else if (days <= 30) {
    color = colors.urgencyAmber;
    bgColor = colors.urgencyAmberSurface;
  } else {
    color = colors.urgencyGreen;
    bgColor = colors.urgencyGreenSurface;
  }

  let text: string;
  if (days < 0) {
    text = t('badge.expired');
  } else if (days === 0) {
    text = t('badge.today');
  } else if (days === 1) {
    text = t('badge.oneDay');
  } else if (days < 7) {
    text = t('badge.days', { days });
  } else if (days < 30) {
    const weeks = Math.ceil(days / 7);
    text = weeks === 1 ? t('badge.oneWeek') : t('badge.weeks', { weeks });
  } else if (days < 365) {
    const months = Math.ceil(days / 30);
    text = months === 1 ? t('badge.oneMonth') : t('badge.months', { months });
  } else {
    const years = Math.ceil(days / 365);
    text = years === 1 ? t('badge.oneYear') : t('badge.years', { years });
  }

  return { text, color, bgColor };
}

export function ExpirationBadge({ expirationDate }: Props) {
  const colors = useAppTheme();
  const { t } = useTranslation();
  const { text, color, bgColor } = computeExpiryBadge(expirationDate, t, colors);
  return (
    <View style={[styles.badge, { backgroundColor: bgColor, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '600' },
});
