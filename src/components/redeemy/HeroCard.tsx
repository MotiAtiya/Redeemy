import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface HeroCardProps {
  iconName?: IoniconsName;
  iconSize?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function HeroCard({ iconName, iconSize = 34, children, style }: HeroCardProps) {
  const colors = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, style]}>
      {iconName && (
        <View style={[styles.iconCircle, { backgroundColor: colors.primarySurface }]}>
          <Ionicons name={iconName} size={iconSize} color={colors.primary} />
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
