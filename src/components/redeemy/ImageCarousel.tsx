import { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  I18nManager,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentImage } from '@/lib/imageUpload';
import type { AppColors } from '@/constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_WIDTH = SCREEN_WIDTH - 32;

interface ImageCarouselProps {
  images: DocumentImage[];
  /** Called with the tapped image index; use to open the fullscreen viewer. */
  onImagePress: (index: number) => void;
  imageHeight?: number;
  /** Ionicons icon name to show when images is empty. Omit to hide the placeholder. */
  emptyIcon?: string;
  colors: AppColors;
}

export function ImageCarousel({
  images,
  onImagePress,
  imageHeight = 220,
  emptyIcon,
  colors,
}: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isRTL = I18nManager.isRTL;
  const styles = makeStyles(colors, imageHeight);

  if (images.length === 0) {
    if (!emptyIcon) return null;
    return (
      <View style={styles.placeholder}>
        <Ionicons name={emptyIcon as any} size={40} color={colors.textTertiary} />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.carouselContainer}>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={(e) => {
            const rawIdx = Math.round(e.nativeEvent.contentOffset.x / IMAGE_WIDTH);
            const idx = isRTL ? images.length - 1 - rawIdx : rawIdx;
            setActiveIndex(idx);
          }}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => onImagePress(index)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: item.url }}
                style={styles.image}
                contentFit="cover"
                placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                transition={300}
              />
            </TouchableOpacity>
          )}
        />
      </View>
      {images.length > 1 && (
        <View style={styles.dotRow}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: AppColors, imageHeight: number) {
  return StyleSheet.create({
    carouselContainer: { borderRadius: 14, overflow: 'hidden' },
    image: { width: IMAGE_WIDTH, height: imageHeight, backgroundColor: colors.separator },
    placeholder: {
      width: '100%',
      height: imageHeight,
      borderRadius: 14,
      backgroundColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.separator },
    dotActive: { backgroundColor: colors.primary, width: 18 },
  });
}
