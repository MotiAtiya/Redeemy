import { View, Text, StyleSheet } from 'react-native';
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
    label = 'Expired';
  } else if (days === 0) {
    label = 'Today';
  } else if (days === 1) {
    label = '1 day left';
  } else if (days < 7) {
    label = `${days} days left`;
  } else if (days < 30) {
    label = `${Math.ceil(days / 7)}w left`;
  } else {
    label = `${Math.ceil(days / 30)}mo left`;
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
