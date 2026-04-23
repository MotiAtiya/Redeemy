import type { ComponentProps } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface CategoryItem {
  id: string;
  icon: IoniconsName;
}

interface Props {
  categories: CategoryItem[];
  selected: string;
  onSelect: (id: string) => void;
  /** Returns display label for a given category id */
  labelFor: (id: string) => string;
}

/**
 * Reusable 3-column category grid used in add-credit, add-warranty, add-subscription.
 */
export function CategorySelector({ categories, selected, onSelect, labelFor }: Props) {
  const colors = useAppTheme();

  return (
    <View style={styles.grid}>
      {categories.map((cat) => {
        const isSelected = cat.id === selected;
        return (
          <Pressable
            key={cat.id}
            style={[
              styles.cell,
              { borderColor: colors.separator, backgroundColor: colors.background },
              isSelected && { borderColor: colors.primary, backgroundColor: colors.primarySurface },
            ]}
            onPress={() => onSelect(cat.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
          >
            <View style={styles.cellInner}>
              <Ionicons
                name={cat.icon}
                size={26}
                color={isSelected ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.label,
                  { color: colors.textSecondary },
                  isSelected && { color: colors.primary, fontWeight: '700' },
                ]}
                numberOfLines={2}
              >
                {labelFor(cat.id)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cellInner: { alignItems: 'center', gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});
