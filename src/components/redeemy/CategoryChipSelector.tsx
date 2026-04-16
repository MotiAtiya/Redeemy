import { FlatList, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORIES } from '@/constants/categories';
import { SAGE_TEAL } from '@/components/ui/theme';

interface Props {
  selected: string;
  onChange: (categoryId: string) => void;
}

export function CategoryChipSelector({ selected, onChange }: Props) {
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
            accessibilityLabel={item.label}
          >
            <Ionicons
              name={item.icon}
              size={14}
              color={isSelected ? '#FFFFFF' : '#616161'}
            />
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 4, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  chipSelected: {
    backgroundColor: SAGE_TEAL,
    borderColor: SAGE_TEAL,
  },
  label: { fontSize: 13, color: '#616161' },
  labelSelected: { color: '#FFFFFF', fontWeight: '600' },
});
