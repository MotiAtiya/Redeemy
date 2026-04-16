import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useMemo } from 'react';
import { useCreditsStore } from '@/stores/creditsStore';
import { SAGE_TEAL } from '@/components/ui/theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

export function StoreAutocomplete({ value, onChange, hasError }: Props) {
  const credits = useCreditsStore((s) => s.credits);

  // Derive unique store names from local credits — no network call
  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    const lower = value.toLowerCase();
    const unique = [...new Set(credits.map((c) => c.storeName))];
    return unique
      .filter((name) => name.toLowerCase().includes(lower) && name.toLowerCase() !== lower)
      .slice(0, 5);
  }, [credits, value]);

  return (
    <View>
      <TextInput
        style={[styles.input, hasError && styles.inputError]}
        placeholder="Store Name"
        placeholderTextColor="#9E9E9E"
        value={value}
        onChangeText={onChange}
        returnKeyType="next"
        autoCapitalize="words"
      />
      {suggestions.length > 0 && (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chip}
              onPress={() => onChange(item)}
              accessibilityRole="button"
              accessibilityLabel={`Use ${item}`}
            >
              <Text style={styles.chipText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#212121',
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#D32F2F' },
  chips: { paddingTop: 8, gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SAGE_TEAL,
    backgroundColor: '#EFF5F4',
  },
  chipText: { fontSize: 13, color: SAGE_TEAL, fontWeight: '500' },
});
