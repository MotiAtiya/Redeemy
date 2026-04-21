import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type CurrencyCode, CURRENCY_SYMBOLS } from '@/stores/settingsStore';

const CURRENCIES: CurrencyCode[] = ['ILS', 'USD', 'EUR', 'GBP'];

interface Props {
  value: CurrencyCode;
  onChange: (code: CurrencyCode) => void;
}

export function CurrencyPicker({ value, onChange }: Props) {
  const colors = useAppTheme();

  return (
    <View style={styles.row}>
      {CURRENCIES.map((code) => {
        const isActive = code === value;
        return (
          <TouchableOpacity
            key={code}
            onPress={() => onChange(code)}
            style={[
              styles.chip,
              { borderColor: isActive ? colors.primary : colors.separator,
                backgroundColor: isActive ? colors.primarySurface : colors.background },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
          >
            <Text
              style={[
                styles.chipText,
                { color: isActive ? colors.primary : colors.textSecondary,
                  fontWeight: isActive ? '700' : '400' },
              ]}
            >
              {CURRENCY_SYMBOLS[code]} {code}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14 },
});
