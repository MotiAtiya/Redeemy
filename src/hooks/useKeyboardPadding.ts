import { useRef, useEffect } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

export function useKeyboardPadding() {
  const keyboardPadding = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height,
        duration: (e as unknown as { duration: number }).duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: (e as unknown as { duration: number }).duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return keyboardPadding;
}
