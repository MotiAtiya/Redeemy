import { View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '@/constants/colors';

interface DetailScreenHeaderProps {
  title: string;
  onBack: () => void;
  onMenu: () => void;
  colors: AppColors;
}

export function DetailScreenHeader({ title, onBack, onMenu, colors }: DetailScreenHeaderProps) {
  const isRTL = I18nManager.isRTL;
  const styles = makeStyles(colors);

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={8}>
        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onMenu} hitSlop={8}>
        <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textPrimary,
      alignSelf: 'flex-start',
    },
  });
}
