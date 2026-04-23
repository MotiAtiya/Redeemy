import type { ComponentProps } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface ActionItem {
  icon: IoniconsName;
  label: string;
  color: string;
  onPress: () => void;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Pass null to skip an action conditionally without changing the array structure */
  actions: (ActionItem | null)[];
  cancelLabel: string;
  /** Runs after the Modal's native dismiss animation completes */
  onDismiss?: () => void;
}

/**
 * Bottom action sheet modal used in subscription/credit/warranty detail screens.
 */
export function ActionModal({ visible, onClose, actions, cancelLabel, onDismiss }: Props) {
  const colors = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.separator }]} />
        {actions.map((action, idx) =>
          action ? (
            <TouchableOpacity key={idx} style={styles.button} onPress={action.onPress}>
              <Ionicons name={action.icon} size={22} color={action.color} />
              <Text style={[styles.label, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ) : null
        )}
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.background }]}
          onPress={onClose}
        >
          <Text style={[styles.cancelText, { color: colors.textPrimary }]}>{cancelLabel}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 36,
    gap: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  button: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 10 },
  label: { fontSize: 16 },
  cancelButton: { alignItems: 'center', padding: 14, marginTop: 8, borderRadius: 10 },
  cancelText: { fontSize: 16, fontWeight: '600' },
});
