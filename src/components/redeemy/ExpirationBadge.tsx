import { View, Text, StyleSheet } from 'react-native';

interface Props {
  expirationDate: Date;
}

function getDaysRemaining(expirationDate: Date): number {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((expirationDate.getTime() - now.getTime()) / msPerDay);
}

function getBadgeColor(days: number): string {
  if (days < 7) return '#F44336';   // red
  if (days <= 30) return '#FF9800'; // amber
  return '#4CAF50';                 // green
}

export function ExpirationBadge({ expirationDate }: Props) {
  const days = getDaysRemaining(expirationDate);
  const color = getBadgeColor(days);

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
    <View style={[styles.badge, { backgroundColor: `${color}1A`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
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
