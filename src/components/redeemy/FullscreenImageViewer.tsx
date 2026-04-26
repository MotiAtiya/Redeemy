import {
  View,
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
  image: DocumentImage | null;
  downloading?: boolean;
  onClose: () => void;
  onDownload: () => void;
}

const styles = StyleSheet.create({
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
  scroll: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

export function FullscreenImageViewer({
  visible,
  image,
  downloading = false,
  onClose,
  onDownload,
}: Props) {
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          maximumZoomScale={5}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
          bouncesZoom
        >
          {image && (
            <Image
              source={{ uri: image.url }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          )}
        </ScrollView>
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
