import { useMemo } from 'react';
import { FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '@/constants/categories';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

interface Props {
  selected: string;
  onChange: (categoryId: string) => void;
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    list: { paddingVertical: 4, gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.separator,
      backgroundColor: colors.surface,
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    label: { fontSize: 13, color: colors.textSecondary },
    labelSelected: { color: '#FFFFFF', fontWeight: '600' },
  });
}

export function CategoryChipSelector({ selected, onChange }: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();

  return (
    <FlatList
      data={CATEGORIES}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const isSelected = item.id === selected;
        return (
          <TouchableOpacity
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onChange(item.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={t('category.' + item.id)}
          >
            <Ionicons
              name={item.icon}
              size={14}
              color={isSelected ? '#FFFFFF' : colors.textSecondary}
            />
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {t('category.' + item.id)}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}
