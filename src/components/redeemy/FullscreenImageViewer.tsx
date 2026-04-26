import { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentImage } from '@/lib/imageUpload';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  images: DocumentImage[];
  initialIndex?: number;
  downloading?: boolean;
  onClose: () => void;
  onDownload: () => void;
  onIndexChange?: (index: number) => void;
}

// Static styles — no theme dependency (fullscreen is always dark)
const styles = StyleSheet.create({
  // Always LTR regardless of app language
  modal: { flex: 1, backgroundColor: '#000000', direction: 'ltr' },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  downloadBtn: {
    position: 'absolute',
    top: 56,
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  list: { flex: 1 },
  itemScroll: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  itemScrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  dots: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },
});

export function FullscreenImageViewer({
  visible,
  images,
  initialIndex = 0,
  downloading = false,
  onClose,
  onDownload,
  onIndexChange,
}: Props) {
  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      const timer = setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible, initialIndex]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modal}>
        <StatusBar hidden />
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          style={styles.list}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveIndex(idx);
            onIndexChange?.(idx);
          }}
          renderItem={({ item }) => (
            <ScrollView
              style={styles.itemScroll}
              contentContainerStyle={styles.itemScrollContent}
              maximumZoomScale={5}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
              bouncesZoom
            >
              <Image
                source={{ uri: item.url }}
                style={styles.image}
                contentFit="contain"
                transition={200}
              />
            </ScrollView>
          )}
        />
        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>
        )}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={onDownload}
          disabled={downloading}
          hitSlop={12}
        >
          {downloading
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Ionicons name="download-outline" size={22} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
