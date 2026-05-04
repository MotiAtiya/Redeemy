import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface DaysOption {
  /** The numeric value stored in settings (e.g. 0 for "none", 7 for "1 week"). */
  days: number;
  /** Already-translated label (e.g. "1 week", "אין", "3 ימים"). */
  label: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: DaysOption[];
  selected: number;
  onSelect: (days: number) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet picker for choosing a "days before" reminder value.
 * Used by notification-settings for credits / warranties / subscriptions /
 * documents / occasions — they all share this exact UX, only the title
 * and the options change.
 */
export function DaysPickerSheet({ visible, title, options, selected, onSelect, onClose }: Props) {
  const colors = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.separator }]} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {options.map((opt, index) => (
          <View key={opt.days}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => { onSelect(opt.days); onClose(); }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected === opt.days }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{opt.label}</Text>
              </View>
              {selected === opt.days && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            {index < options.length - 1 && (
              <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            )}
          </View>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 16, alignSelf: 'flex-start' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  optionLabel: { fontSize: 16, alignSelf: 'flex-start' },
  separator: { height: 1 },
});
