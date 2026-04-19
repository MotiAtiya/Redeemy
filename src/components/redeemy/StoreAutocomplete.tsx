import { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCreditsStore } from '@/stores/creditsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { AppColors } from '@/constants/colors';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion?: (storeName: string) => void;
  hasError?: boolean;
}

function makeStyles(colors: AppColors, isRTL: boolean) {
  return StyleSheet.create({
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.separator,
      borderRadius: 10,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      textAlign: isRTL ? 'right' : 'left',
    },
    inputError: { borderColor: colors.danger },
    chips: { paddingTop: 8, gap: 8 },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
    },
    chipText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  });
}

export function StoreAutocomplete({ value, onChange, onSelectSuggestion, hasError }: Props) {
  const colors = useAppTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language.startsWith('he');
  const styles = useMemo(() => makeStyles(colors, isRTL), [colors, isRTL]);
  const credits = useCreditsStore((s) => s.credits);

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
        placeholder={t('addCredit.storeName')}
        placeholderTextColor={colors.textTertiary}
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
              onPress={() => { onChange(item); onSelectSuggestion?.(item); }}
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
