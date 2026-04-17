import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';

export function SyncIndicator() {
  const offlineMode = useUIStore((s) => s.offlineMode);
  const isSyncing = useUIStore((s) => s.isSyncing);
  const colors = useAppTheme();
  const opacity = useRef(new Animated.Value(1)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isSyncing && !offlineMode) {
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      opacity.setValue(1);
    }
    return () => { animRef.current?.stop(); };
  }, [isSyncing, offlineMode, opacity]);

  const color = offlineMode ? colors.iconInactive : colors.primary;

  return (
    <Animated.View
      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity }}
      accessibilityLabel={offlineMode ? 'Offline' : isSyncing ? 'Syncing' : 'Synced'}
    />
  );
}
