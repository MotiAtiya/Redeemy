import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Props {
  totalSteps: number;
  currentStep: number; // 0-based
}

interface DotProps {
  state: 'completed' | 'active' | 'upcoming';
}

function AnimatedDot({ state }: DotProps) {
  const colors = useAppTheme();
  const widthAnim = useRef(new Animated.Value(state === 'active' ? 24 : 8)).current;
  const opacityAnim = useRef(new Animated.Value(state === 'upcoming' ? 0.3 : 1)).current;
  const prevState = useRef(state);

  useEffect(() => {
    if (prevState.current === state) return;
    prevState.current = state;

    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: state === 'active' ? 24 : 8,
        useNativeDriver: false,
        tension: 70,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: state === 'upcoming' ? 0.3 : 1,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [state, widthAnim, opacityAnim]);

  const bgColor =
    state === 'upcoming' ? colors.separator : colors.primary;

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: widthAnim,
          backgroundColor: bgColor,
          opacity: opacityAnim,
        },
      ]}
    />
  );
}

export function StepProgressBar({ totalSteps, currentStep }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const state =
          index < currentStep
            ? 'completed'
            : index === currentStep
            ? 'active'
            : 'upcoming';
        return <AnimatedDot key={index} state={state} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
});
