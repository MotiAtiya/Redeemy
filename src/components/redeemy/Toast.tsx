import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToastStore } from '@/stores/toastStore';
import { useAppTheme } from '@/hooks/useAppTheme';

const VISIBLE_MS = 2200;
const FADE_MS = 220;

/**
 * Single global toast renderer. Mount once near the root of the app — call
 * `showToast(message)` from anywhere to display.
 *
 * Style mirrors the iOS pill toast: rounded, surface-on-text-primary so it
 * inverts cleanly between light and dark themes. Always anchored bottom-center,
 * above the tab bar / safe-area inset.
 */
export function Toast() {
  const colors = useAppTheme();
  const current = useToastStore((s) => s.current);
  const clear = useToastStore((s) => s.clear);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!current) return;

    // Cancel any pending hide from a previous toast and re-run the in animation
    // so back-to-back toasts each get the full pop-in.
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    opacity.setValue(0);
    translateY.setValue(20);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    hideTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: FADE_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) clear();
      });
    }, VISIBLE_MS);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
    // We key on `current?.id` so each new toast (even with identical text)
    // re-runs the animation cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  const { message, variant } = current;
  const showCheckIcon = variant === 'success';

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrapper, { opacity, transform: [{ translateY }] }]}
    >
      <View style={[styles.pill, { backgroundColor: colors.textPrimary }]}>
        {showCheckIcon && (
          <Ionicons name="checkmark-circle" size={18} color={colors.urgencyGreen} />
        )}
        <Text style={[styles.text, { color: colors.background }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 22,
    maxWidth: '88%',
    // Subtle elevation so it floats over content. iOS shadow + Android elevation.
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
