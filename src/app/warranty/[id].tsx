import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import { downloadImageToLibrary } from '@/lib/imageDownload';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { computeExpiryBadge } from '@/components/redeemy/ExpirationBadge';
import { HeroCard } from '@/components/redeemy/HeroCard';
import { HeroBadge } from '@/components/redeemy/HeroBadge';
import { ImageCarousel } from '@/components/redeemy/ImageCarousel';
import { DetailScreenHeader } from '@/components/redeemy/DetailScreenHeader';
import { NotFoundScreen } from '@/components/redeemy/NotFoundScreen';
import { DetailRow } from '@/components/redeemy/DetailRow';
import { ActionModal } from '@/components/redeemy/ActionModal';
import { FullscreenImageViewer } from '@/components/redeemy/FullscreenImageViewer';
import { deleteWarranty, updateWarranty } from '@/lib/firestoreWarranties';
import { cancelCreditNotifications } from '@/lib/notifications';
import { logEvent } from '@/lib/eventLog';
import { formatDate } from '@/lib/formatDate';
import { useWarrantiesStore } from '@/stores/warrantiesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useUIStore } from '@/stores/uiStore';
import { showToast } from '@/stores/toastStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { WarrantyStatus, type Warranty } from '@/types/warrantyTypes';
import { WARRANTY_PRODUCT_TYPES } from '@/data/warrantyProductTypes';
import type { AppColors } from '@/constants/colors';
import { normalizeTimestampOrNow } from "@/lib/dateUtils";

function getProductDisplay(w: Warranty): { type: string; brand?: string; model?: string } {
  if (w.productType) {
    const typeEntry = WARRANTY_PRODUCT_TYPES.find((p) => p.id === w.productType);
    return {
      type: typeEntry ? typeEntry.heLabel : w.productType,
      brand: w.brand || undefined,
      model: w.model || undefined,
    };
  }
  return { type: w.productName ?? '—' };
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
    heroStoreName: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
    heroProductName: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
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
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);
  const isClosed = warranty?.status === WarrantyStatus.CLOSED;

  // Normalize images
  const images = warranty?.images ?? (warranty?.imageUrl ? [{ url: warranty.imageUrl, thumbnailUrl: warranty.thumbnailUrl ?? warranty.imageUrl }] : []);

  const productDisplay = useMemo(() => warranty ? getProductDisplay(warranty) : { type: '—' }, [warranty]);

  if (!warranty) {
    return <NotFoundScreen message={t('warranty.notFound')} />;
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
              await updateWarranty(w.id, { status: WarrantyStatus.CLOSED, closedAt: new Date() }, { silent: true });
              void logEvent('warranty_closed', { itemCategory: 'warranty', itemId: w.id });
              showToast(t('toasts.warrantyClosed'));
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
      t('warranty.delete.message', { productName: getProductDisplay(w).type }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('warranty.delete.button'),
          style: 'destructive',
          onPress: async () => {
            // Navigate away FIRST — otherwise the store update flashes a
            // "not found" view on this detail screen while the firestore
            // write resolves. The snapshot listener reconciles on errors.
            router.back();
            showToast(t('toasts.deleted.warranty'));
            try {
              await cancelCreditNotifications(w.notificationId, w.expirationNotificationId);
              removeWarranty(w.id);
              await deleteWarranty(w.id);
            } catch {
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
    await downloadImageToLibrary({
      url: imageUrl,
      filenamePrefix: 'redeemy-warranty',
      onPermissionDenied: () => Alert.alert(t('common.error'), t('image.permissionDenied')),
      onSuccess: () => Alert.alert(t('image.savedTitle'), t('image.savedMessage')),
      onError: (e) => {
        console.error('Download error:', e);
        Alert.alert(t('common.error'), t('image.saveError'));
      },
    });
    setDownloading(false);
  }

  function handleEdit() {
    afterDismissRef.current = () => { router.push(`/add-warranty?warrantyId=${warranty!.id}`); };
    setShowActionSheet(false);
  }

  const expirationDate = warranty.expirationDate
    ? (normalizeTimestampOrNow(warranty.expirationDate))
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <DetailScreenHeader
        title={warranty.storeName}
        onBack={() => router.back()}
        onMenu={() => setShowActionSheet(true)}
        colors={colors}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ImageCarousel
          images={images}
          onImagePress={(index) => { setFullscreenIndex(index); setShowFullscreenImage(true); }}
          emptyIcon="shield-checkmark-outline"
          colors={colors}
        />

        <HeroCard>
          <Text style={styles.heroStoreName}>{warranty.storeName}</Text>
          <Text style={styles.heroProductName}>{productDisplay.type}</Text>
          {(productDisplay.brand || productDisplay.model) && (
            <Text style={styles.heroStoreName}>
              {[productDisplay.brand, productDisplay.model].filter(Boolean).join(' · ')}
            </Text>
          )}
          {(() => {
            const badge = computeExpiryBadge(warranty.noExpiry ? undefined : (expirationDate ?? undefined), t, colors);
            return <HeroBadge text={badge.text} color={badge.color} bgColor={badge.bgColor} />;
          })()}
        </HeroCard>

        <View style={styles.detailsCard}>
          <DetailRow
            icon="cube-outline"
            label={t('warranty.detail.product')}
            value={productDisplay.type}
            showSeparator
          />
          {!!productDisplay.brand && (
            <DetailRow
              icon="business-outline"
              label={t('warranty.detail.brand')}
              value={productDisplay.brand}
              showSeparator
            />
          )}
          {!!productDisplay.model && (
            <DetailRow
              icon="barcode-outline"
              label={t('warranty.detail.model')}
              value={productDisplay.model}
              showSeparator
            />
          )}
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

      <FullscreenImageViewer
        visible={showFullscreenImage}
        image={images[fullscreenIndex] ?? null}
        downloading={downloading}
        onClose={() => setShowFullscreenImage(false)}
        onDownload={handleDownloadImage}
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
