import type { ComponentProps, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon: IoniconsName;
  label: string;
  value: ReactNode;
  showSeparator?: boolean;
  /** Use for multi-line text values (notes) — left-aligns the text content */
  multiline?: boolean;
}

/**
 * Single detail row with icon + label + value, used in subscription/credit/warranty detail screens.
 * Optionally renders a hairline separator below.
 */
export function DetailRow({ icon, label, value, showSeparator = false, multiline = false }: Props) {
  const colors = useAppTheme();

  return (
    <>
      <View style={styles.row}>
        <Ionicons name={icon} size={18} color={colors.textTertiary} />
        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>{label}</Text>
          {typeof value === 'string' ? (
            <Text
              style={[
                styles.value,
                { color: colors.textPrimary },
                multiline && styles.multiline,
              ]}
            >
              {value}
            </Text>
          ) : (
            value
          )}
        </View>
      </View>
      {showSeparator && (
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  content: { flex: 1, gap: 2 },
  label: { fontSize: 12, fontWeight: '500', alignSelf: 'flex-start' },
  value: { fontSize: 15, alignSelf: 'flex-start' },
  multiline: { textAlign: 'left' },
  separator: { height: 1, marginStart: 44 },
});
