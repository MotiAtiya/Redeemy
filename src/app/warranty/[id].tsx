import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  I18nManager,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExpirationBadge } from '@/components/redeemy/ExpirationBadge';
import { DetailRow } from '@/components/redeemy/DetailRow';
import { ActionModal } from '@/components/redeemy/ActionModal';
import { deleteWarranty, updateWarranty } from '@/lib/firestoreWarranties';
import { cancelCreditNotifications } from '@/lib/notifications';
import { formatDate } from '@/lib/formatDate';
import { useWarrantiesStore } from '@/stores/warrantiesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { WarrantyStatus } from '@/types/warrantyTypes';
import { CATEGORIES } from '@/constants/categories';
import type { AppColors } from '@/constants/colors';

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    backButton: { padding: 16 },
    notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notFoundText: { fontSize: 16, color: colors.textTertiary },
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
    scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
    image: { width: Dimensions.get('window').width - 32, height: 220, borderRadius: 14, backgroundColor: colors.separator },
    imagePlaceholder: {
      width: '100%',
      height: 220,
      borderRadius: 14,
      backgroundColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
    },
    carouselContainer: { borderRadius: 14, overflow: 'hidden' },
    dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.separator },
    dotActive: { backgroundColor: colors.primary, width: 18 },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 8 },
    storeName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, alignSelf: 'flex-start' },
    productName: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, alignSelf: 'flex-start' },
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
    addedFooterText: { fontSize: 12, color: colors.textTertiary, alignSelf: 'flex-start' },
    footer: {
      padding: 16,
      paddingBottom: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
    closeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 12,
    },
    buttonDisabled: { opacity: 0.7 },
    closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    closedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    closedBannerText: { fontSize: 15, color: colors.textTertiary, fontWeight: '500' },
    fullscreenModal: { flex: 1, backgroundColor: '#000000', direction: 'ltr' },
    fullscreenClose: {
      position: 'absolute',
      top: 56,
      right: 16,
      zIndex: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 20,
      padding: 8,
    },
    fullscreenDownload: {
      position: 'absolute',
      top: 56,
      left: 16,
      zIndex: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 20,
      padding: 8,
    },
    fullscreenScrollView: { flex: 1 },
    fullscreenScrollContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullscreenImage: {
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height,
    },
  });
}

export default function WarrantyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);

  const warranty = useWarrantiesStore((s) => s.warranties.find((w) => w.id === id));
  const removeWarranty = useWarrantiesStore((s) => s.removeWarranty);
  const updateWarrantyInStore = useWarrantiesStore((s) => s.updateWarranty);
  const currentUid = useAuthStore((s) => s.currentUser?.uid);
  const familyAdminId = useFamilyStore((s) => s.family?.adminId);
  const canDelete = warranty
    ? warranty.userId === currentUid || familyAdminId === currentUid
    : false;

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);
  const isClosed = warranty?.status === WarrantyStatus.CLOSED;

  // Normalize images
  const images = warranty?.images ?? (warranty?.imageUrl ? [{ url: warranty.imageUrl, thumbnailUrl: warranty.thumbnailUrl ?? warranty.imageUrl }] : []);

  const categoryMeta = useMemo(
    () => CATEGORIES.find((c) => c.id === warranty?.category),
    [warranty?.category]
  );

  if (!warranty) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('warranty.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleMarkClosed() {
    if (useUIStore.getState().offlineMode) {
      Alert.alert(t('offline.title'), t('warranty.markClosed.offlineMessage'));
      return;
    }
    const w = warranty!;
    Alert.alert(
      t('warranties.closedConfirm.title'),
      t('warranties.closedConfirm.message'),
      [
        { text: t('warranties.closedConfirm.cancel'), style: 'cancel' },
        {
          text: t('warranties.closedConfirm.confirm'),
          onPress: async () => {
            setLoading(true);
            try {
              await cancelCreditNotifications(w.notificationId, w.expirationNotificationId);
              updateWarrantyInStore(w.id, { status: WarrantyStatus.CLOSED, closedAt: new Date() });
              await updateWarranty(w.id, { status: WarrantyStatus.CLOSED, closedAt: new Date() });
              router.back();
            } catch {
              updateWarrantyInStore(w.id, { status: WarrantyStatus.ACTIVE, closedAt: undefined });
              Alert.alert(t('common.error'), t('warranty.markClosed.error'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleDelete() {
    if (useUIStore.getState().offlineMode) {
      setShowActionSheet(false);
      Alert.alert(t('offline.title'), t('warranty.delete.offlineMessage'));
      return;
    }
    const w = warranty!;
    setShowActionSheet(false);
    Alert.alert(
      t('warranty.delete.title'),
      t('warranty.delete.message', { productName: w.productName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('warranty.delete.button'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await cancelCreditNotifications(w.notificationId, w.expirationNotificationId);
              removeWarranty(w.id);
              await deleteWarranty(w.id);
              router.back();
            } catch {
              setLoading(false);
              Alert.alert(t('common.error'), t('warranty.delete.error'));
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
        Alert.alert(t('common.error'), t('credit.image.permissionDenied'));
        return;
      }
      const filename = `redeemy-warranty-${Date.now()}.jpg`;
      const localUri = FileSystem.cacheDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(imageUrl, localUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('credit.image.savedTitle'), t('credit.image.savedMessage'));
    } catch (e) {
      console.error('Download error:', e);
      Alert.alert(t('common.error'), t('credit.image.saveError'));
    } finally {
      setDownloading(false);
    }
  }

  function handleEdit() {
    afterDismissRef.current = () => { router.push(`/add-warranty?warrantyId=${warranty!.id}`); };
    setShowActionSheet(false);
  }

  const expirationDate = warranty.expirationDate
    ? (warranty.expirationDate instanceof Date
        ? warranty.expirationDate
        : new Date(warranty.expirationDate as unknown as string))
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{warranty.storeName}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowActionSheet(true)} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {images.length > 0 ? (
          <View>
            <View style={styles.carouselContainer}>
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
                  <View key={i} style={[styles.dot, i === carouselIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="shield-checkmark-outline" size={40} color={colors.textTertiary} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.storeName}>{warranty.storeName}</Text>
          <Text style={styles.productName}>{warranty.productName}</Text>
          {!warranty.noExpiry && <ExpirationBadge expirationDate={expirationDate ?? undefined} />}
        </View>

        <View style={styles.detailsCard}>
          <DetailRow
            icon="pricetag-outline"
            label={t('warranty.detail.category')}
            value={categoryMeta ? t('category.' + categoryMeta.id) : warranty.category}
            showSeparator
          />
          <DetailRow
            icon="calendar-outline"
            label={t('warranty.detail.expires')}
            value={
              warranty.noExpiry
                ? t('warranty.detail.noExpiry')
                : expirationDate
                ? formatDate(expirationDate, dateFormat)
                : t('warranty.detail.noExpiry')
            }
            showSeparator={!!warranty.notes}
          />
          {!!warranty.notes && (
            <DetailRow
              icon="document-text-outline"
              label={t('warranty.detail.notes')}
              value={warranty.notes}
              multiline
            />
          )}
        </View>
        <Text style={styles.addedFooterText}>
          {t('warranty.detail.added')}: {formatDate(new Date(warranty.createdAt as Date), dateFormat)}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {isClosed ? (
          <View style={styles.closedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.textTertiary} />
            <Text style={styles.closedBannerText}>
              {warranty.closedAt
                ? t('warranty.closedOn', { date: formatDate(new Date(warranty.closedAt as Date), dateFormat) })
                : t('warranties.closedToast')}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.closeButton, loading && styles.buttonDisabled]}
            onPress={handleMarkClosed}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('warranties.markClosed')}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.closeButtonText}>{t('warranties.markClosed')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Full-screen image viewer */}
      <Modal
        visible={showFullscreenImage}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setShowFullscreenImage(false)}
        statusBarTranslucent
      >
        <View style={styles.fullscreenModal}>
          <StatusBar hidden />
          <ScrollView
            style={styles.fullscreenScrollView}
            contentContainerStyle={styles.fullscreenScrollContent}
            maximumZoomScale={5}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
            bouncesZoom
          >
            <Image
              source={{ uri: images[fullscreenIndex]?.url }}
              style={styles.fullscreenImage}
              contentFit="contain"
              transition={200}
            />
          </ScrollView>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setShowFullscreenImage(false)}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fullscreenDownload}
            onPress={handleDownloadImage}
            disabled={downloading}
            hitSlop={12}
          >
            {downloading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Ionicons name="download-outline" size={22} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </Modal>

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
          warranty.status === WarrantyStatus.ACTIVE
            ? { icon: 'create-outline', label: t('warranty.action.edit'), color: colors.textPrimary, onPress: handleEdit }
            : null,
          canDelete
            ? { icon: 'trash-outline', label: t('warranty.action.delete'), color: colors.danger, onPress: handleDelete }
            : null,
        ]}
      />
    </SafeAreaView>
  );
}
