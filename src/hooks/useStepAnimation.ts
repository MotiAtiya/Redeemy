import { useRef, useCallback } from 'react';
import { Animated, Dimensions, I18nManager } from 'react-native';

export function useStepAnimation() {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = useCallback(
    (direction: 'forward' | 'back', callback: () => void) => {
      const { width } = Dimensions.get('window');
      // In RTL (Hebrew), "forward" = moving left visually, so directions are mirrored
      const rtl = I18nManager.isRTL;
      const exitX = direction === 'forward' ? (rtl ? width * 0.25 : -width * 0.25) : (rtl ? -width * 0.25 : width * 0.25);
      const enterX = direction === 'forward' ? (rtl ? -width * 0.25 : width * 0.25) : (rtl ? width * 0.25 : -width * 0.25);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: exitX, duration: 110, useNativeDriver: true }),
      ]).start(() => {
        callback();
        slideAnim.setValue(enterX);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 11 }),
        ]).start();
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { fadeAnim, slideAnim, animateTransition };
}
