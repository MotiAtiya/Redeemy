import type { ReactNode } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Props {
  onPress: () => void;
  dimmed?: boolean;
  accessibilityLabel?: string;
  children: ReactNode;
}

/**
 * Shared card shell used by CreditCard, WarrantyCard, and SubscriptionCard.
 * Provides the shadow/border/margin container and optional dimmed state.
 */
export function BaseCard({ onPress, dimmed = false, accessibilityLabel, children }: Props) {
  const colors = useAppTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }, dimmed && styles.cardDimmed]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.content}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDimmed: { opacity: 0.75 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
});
