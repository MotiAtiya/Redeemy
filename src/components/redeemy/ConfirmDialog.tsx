import { Modal, View, Text, TouchableOpacity, StyleSheet, I18nManager } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  buttons: DialogButton[];
  onDismiss: () => void;
}

export function ConfirmDialog({ visible, title, message, buttons, onDismiss }: Props) {
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'center' }]}>
              {title}
            </Text>
            {message ? (
              <Text style={[styles.message, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'center' }]}>
                {message}
              </Text>
            ) : null}
            <View style={[styles.buttonRow, { borderTopColor: colors.separator }]}>
              {buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.button,
                    i < buttons.length - 1 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.separator },
                  ]}
                  onPress={() => {
                    onDismiss();
                    btn.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === 'destructive' && { color: colors.danger },
                      btn.style === 'cancel' && { color: colors.textSecondary },
                      btn.style !== 'destructive' && btn.style !== 'cancel' && { color: colors.primary },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: 270,
    borderRadius: 14,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  message: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '400',
  },
});
