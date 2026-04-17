import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '@/stores/uiStore';

/**
 * Floating banner that slides in from the top when the device is offline.
 * Mount once at the root level inside AuthGate.
 */
export function OfflineToast() {
  const offlineMode = useUIStore((s) => s.offlineMode);
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: offlineMode ? 0 : -80,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [offlineMode, translateY]);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <View style={styles.banner}>
        <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
        <Text style={styles.text}>You're offline — browsing cached credits</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: 'center',
    paddingTop: 52, // below status bar
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#424242',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: { fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
});
