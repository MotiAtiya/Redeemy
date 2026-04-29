import { useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { Alert } from 'react-native';

/**
 * Intercepts hardware back / swipe-back navigation while a form has unsaved data.
 * Shows a confirmation alert; the user can either stay or confirm exit.
 */
export function useFormExitConfirmation(
  shouldPrevent: boolean,
  title: string,
  message: string,
  confirmText: string,
  cancelText: string,
) {
  const navigation = useNavigation();

  usePreventRemove(shouldPrevent, ({ data }) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel' },
      {
        text: confirmText,
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });
}
