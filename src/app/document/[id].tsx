import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  I18nManager,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DetailRow } from '@/components/redeemy/DetailRow';
import { ExpirationBadge } from '@/components/redeemy/ExpirationBadge';
import { ActionModal } from '@/components/redeemy/ActionModal';
import { FullscreenImageViewer } from '@/components/redeemy/FullscreenImageViewer';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';
import { deleteDocument } from '@/lib/firestoreDocuments';
import { formatDate } from '@/lib/formatDate';
import { useAppTheme } from '@/hooks/useAppTheme';
import { type DocumentType } from '@/types/documentTypes';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import type { AppColors } from '@/constants/colors';


function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    backButton: { padding: 16 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
      backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary, alignSelf: 'flex-start' },
    scroll: { flex: 1 },
    scrollContent: { gap: 12, paddingBottom: 32 },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 8, marginHorizontal: 16 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primarySurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, alignSelf: 'flex-start' },
    cardOwner: { fontSize: 15, color: colors.textSecondary, alignSelf: 'flex-start' },
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', marginHorizontal: 16 },
    addedFooterText: { fontSize: 12, color: colors.textTertiary, alignSelf: 'flex-start', marginHorizontal: 16 },
    photoCard: {
      marginHorizontal: 16,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    photo: { width: Dimensions.get('window').width - 32, aspectRatio: 4 / 3 },
    dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.separator },
    dotActive: { backgroundColor: colors.primary, width: 18 },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFoundText: { fontSize: 16, color: colors.textTertiary },
  });
}

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);

  const document = useDocumentsStore((s) => s.documents.find((d) => d.id === id));
  const removeDocument = useDocumentsStore((s) => s.removeDocument);
  const currentUid = useAuthStore((s) => s.currentUser?.uid);
  const familyAdminId = useFamilyStore((s) => s.family?.adminId);
  const canDelete = document
    ? document.userId === currentUid || familyAdminId === currentUid
    : false;

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);

  // Normalize images
  const images = document.images ?? (document.imageUrl ? [{ url: document.imageUrl, thumbnailUrl: document.thumbnailUrl ?? document.imageUrl }] : []);

  if (!document) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('document.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const expirationDate = document.expirationDate instanceof Date
    ? document.expirationDate
    : new Date(document.expirationDate as unknown as string);

  async function handleDelete() {
    if (useUIStore.getState().offlineMode) {
      setShowActionSheet(false);
      Alert.alert(t('offline.title'), t('document.delete.offlineMessage'));
      return;
    }
    setShowActionSheet(false);
    Alert.alert(
      t('document.delete.title'),
      t('document.delete.message', { name: t(`documents.types.${document!.type}`) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('document.delete.button'),
          style: 'destructive',
          onPress: async () => {
            try {
              removeDocument(document!.id);
              await deleteDocument(document!.id);
              router.back();
            } catch {
              Alert.alert(t('common.error'), t('document.delete.error'));
            }
          },
        },
      ]
    );
  }

  async function handleDownloadImage() {
    const imageUrl = images[fullscreenIndex]?.url;
    if (!imageUrl) return;
    setDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('document.image.permissionDenied'));
        return;
      }
      const filename = `redeemy-doc-${Date.now()}.jpg`;
      const localUri = FileSystem.cacheDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(imageUrl, localUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('document.image.savedTitle'), t('document.image.savedMessage'));
    } catch (e) {
      console.error('Download error:', e);
      Alert.alert(t('common.error'), t('document.image.saveError'));
    } finally {
      setDownloading(false);
    }
  }

  function handleEdit() {
    afterDismissRef.current = () => { router.push(`/add-document?documentId=${document!.id}`); };
    setShowActionSheet(false);
  }

  const typeLabel = t(`documents.types.${document.type}`);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{typeLabel}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowActionSheet(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Photo carousel */}
        {images.length > 0 && (
          <View style={{ marginHorizontal: 16 }}>
            <View style={{ borderRadius: 14, overflow: 'hidden' }}>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (Dimensions.get('window').width - 32));
                  setCarouselIndex(idx);
                }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => { setFullscreenIndex(index); setShowFullscreenImage(true); }}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={styles.photo}
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
                  <View key={i} style={[styles.dot, i === carouselIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Main card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{typeLabel}</Text>
          <Text style={styles.cardOwner}>{document.ownerName}</Text>
          <ExpirationBadge expirationDate={expirationDate} />
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <DetailRow
            icon="calendar-outline"
            label={t('document.detail.expiration')}
            value={formatDate(expirationDate, dateFormat)}
            showSeparator={!!document.notes}
          />
          {!!document.notes && (
            <DetailRow
              icon="document-text-outline"
              label={t('document.detail.notes')}
              value={document.notes}
              multiline
            />
          )}
        </View>

        <Text style={styles.addedFooterText}>
          {t('document.detail.added')}: {formatDate(new Date(document.createdAt as Date), dateFormat)}
        </Text>
      </ScrollView>

      <FullscreenImageViewer
        visible={showFullscreenImage}
        images={images}
        initialIndex={fullscreenIndex}
        downloading={downloading}
        onClose={() => setShowFullscreenImage(false)}
        onDownload={handleDownloadImage}
        onIndexChange={setFullscreenIndex}
      />

      <ActionModal
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        cancelLabel={t('common.cancel')}
        onDismiss={() => {
          const action = afterDismissRef.current;
          afterDismissRef.current = null;
          action?.();
        }}
        actions={[
          { icon: 'create-outline', label: t('document.action.edit'), color: colors.textPrimary, onPress: handleEdit },
          canDelete
            ? { icon: 'trash-outline', label: t('document.action.delete'), color: colors.danger, onPress: handleDelete }
            : null,
        ]}
      />
    </SafeAreaView>
  );
}
