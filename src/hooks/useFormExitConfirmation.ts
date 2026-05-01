import { useNavigation } from 'expo-router';
import { usePreventRemove } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * Intercepts hardware back / swipe-back navigation while a form has unsaved data.
 * Shows a confirmation alert; the user can either stay or confirm exit.
 *
 * Pass `false` while submitting so router.back() after a successful save
 * doesn't trigger the alert.
 */
export function useFormExitConfirmation(shouldPrevent: boolean) {
  const navigation = useNavigation();
  const { t } = useTranslation();

  usePreventRemove(shouldPrevent, ({ data }) => {
    Alert.alert(
      t('common.exitForm.title'),
      t('common.exitForm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.exitForm.confirm'),
          style: 'destructive',
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    );
  });
}
