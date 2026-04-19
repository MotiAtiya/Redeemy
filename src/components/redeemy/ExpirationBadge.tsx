import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Props {
  expirationDate: Date;
}

function getDaysRemaining(expirationDate: Date): number {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((expirationDate.getTime() - now.getTime()) / msPerDay);
}

export function ExpirationBadge({ expirationDate }: Props) {
  const colors = useAppTheme();
  const { t } = useTranslation();
  const days = getDaysRemaining(expirationDate);

  let textColor: string;
  let bgColor: string;

  if (days < 7) {
    textColor = colors.urgencyRed;
    bgColor = colors.urgencyRedSurface;
  } else if (days <= 30) {
    textColor = colors.urgencyAmber;
    bgColor = colors.urgencyAmberSurface;
  } else {
    textColor = colors.urgencyGreen;
    bgColor = colors.urgencyGreenSurface;
  }

  let label: string;
  if (days < 0) {
    label = t('badge.expired');
  } else if (days === 0) {
    label = t('badge.today');
  } else if (days === 1) {
    label = t('badge.oneDay');
  } else if (days < 7) {
    label = t('badge.days', { days });
  } else if (days < 30) {
    const weeks = Math.ceil(days / 7);
    label = weeks === 1 ? t('badge.oneWeek') : t('badge.weeks', { weeks });
  } else if (days < 365) {
    const months = Math.ceil(days / 30);
    label = months === 1 ? t('badge.oneMonth') : t('badge.months', { months });
  } else {
    const years = Math.ceil(days / 365);
    label = years === 1 ? t('badge.oneYear') : t('badge.years', { years });
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor, borderColor: textColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
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
