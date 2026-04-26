import { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { DocumentImage } from '@/lib/imageUpload';
import type { AppColors } from '@/constants/colors';

export type PhotoItem =
  | { type: 'local'; uri: string }
  | { type: 'existing'; image: DocumentImage };

interface Props {
  title: string;
  photosHint: string;
  photoItems: PhotoItem[];
  maxPhotos?: number;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    stepScroll: { flex: 1 },
    stepContent: { padding: 24, paddingBottom: 16, flexGrow: 1 },
    stepTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    photoPlaceholderCard: {
      width: '100%',
      height: 180,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
      backgroundColor: colors.surface,
    },
    photoPlaceholderCardText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    photoRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    photoSlotFilled: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.separator,
    },
    slotImage: { width: '100%', height: '100%' },
    removePhotoBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 11,
      padding: 1,
    },
    photoSlotAdd: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

export function PhotoPickerStep({
  title,
  photosHint,
  photoItems,
  maxPhotos = 3,
  onAddPhoto,
  onRemovePhoto,
}: Props) {
  const colors = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const hasPhotos = photoItems.length > 0;
  const canAddMore = photoItems.length < maxPhotos;

  return (
    <ScrollView style={styles.stepScroll} contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>{title}</Text>

      {!hasPhotos ? (
        <TouchableOpacity
          style={styles.photoPlaceholderCard}
          onPress={onAddPhoto}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.photoPlaceholderCardText}>{photosHint}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.photoRow}>
          {photoItems.map((item, index) => {
            const uri = item.type === 'local' ? item.uri : item.image.thumbnailUrl;
            return (
              <View key={index} style={styles.photoSlotFilled}>
                <Image
                  source={{ uri }}
                  style={styles.slotImage}
                  contentFit="cover"
                  transition={200}
                />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => onRemovePhoto(index)}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            );
          })}
          {canAddMore && (
            <TouchableOpacity
              style={styles.photoSlotAdd}
              onPress={onAddPhoto}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={28} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}
