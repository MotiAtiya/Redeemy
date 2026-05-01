import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon: IoniconName;
  iconSize?: number;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, iconSize = 56, title, subtitle, actionLabel, onAction }: Props) {
  const colors = useAppTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={iconSize} color={colors.textTertiary} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      gap: 12,
    },
    title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    subtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },
    action: {
      marginTop: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    actionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  });
}
