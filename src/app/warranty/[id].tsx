import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExpirationBadge } from '@/components/redeemy/ExpirationBadge';
import { deleteWarranty, updateWarranty } from '@/lib/firestoreWarranties';
import { cancelNotification } from '@/lib/notifications';
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
    image: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.separator },
    imagePlaceholder: {
      width: '100%',
      height: 220,
      borderRadius: 14,
      backgroundColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 8 },
    storeName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, alignSelf: 'flex-start' },
    productName: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, alignSelf: 'flex-start' },
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
    detailRowContent: { flex: 1, gap: 2 },
    detailLabel: { fontSize: 12, color: colors.textTertiary, fontWeight: '500', alignSelf: 'flex-start' },
    detailValue: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start' },
    notesValue: { fontSize: 15, color: colors.textPrimary, alignSelf: 'flex-start', textAlign: 'left' },
    separator: { height: 1, backgroundColor: colors.separator, marginStart: 44 },
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    actionSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      paddingBottom: 36,
      gap: 4,
    },
    actionSheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.separator,
      alignSelf: 'center',
      marginBottom: 12,
    },
    actionSheetButton: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 10 },
    actionSheetLabel: { fontSize: 16 },
    cancelButton: {
      alignItems: 'center',
      padding: 14,
      marginTop: 8,
      backgroundColor: colors.background,
      borderRadius: 10,
    },
    cancelText: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
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
  const [loading, setLoading] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);
  const isClosed = warranty?.status === WarrantyStatus.CLOSED;

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
              await cancelNotification(w.notificationId);
              await cancelNotification(w.expirationNotificationId);
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
              await cancelNotification(w.notificationId);
              await cancelNotification(w.expirationNotificationId);
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
        {warranty.imageUrl ? (
          <TouchableOpacity onPress={() => setShowFullscreenImage(true)} activeOpacity={0.9}>
            <Image
              source={{ uri: warranty.imageUrl }}
              style={styles.image}
              contentFit="cover"
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              transition={300}
            />
          </TouchableOpacity>
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
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>{t('warranty.detail.category')}</Text>
              <Text style={styles.detailValue}>{categoryMeta ? t('category.' + categoryMeta.id) : warranty.category}</Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>{t('warranty.detail.expires')}</Text>
              <Text style={styles.detailValue}>
                {warranty.noExpiry
                  ? t('warranty.detail.noExpiry')
                  : expirationDate
                  ? formatDate(expirationDate, dateFormat)
                  : t('warranty.detail.noExpiry')}
              </Text>
            </View>
          </View>
          {expirationDate && !warranty.noExpiry && (
            <>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Ionicons name="notifications-outline" size={18} color={colors.textTertiary} />
                <View style={styles.detailRowContent}>
                  <Text style={styles.detailLabel}>{t('warranty.detail.reminder')}</Text>
                  <Text style={styles.detailValue}>{t('credit.detail.reminderDays', { count: warranty.reminderDays })}</Text>
                </View>
              </View>
            </>
          )}
          {warranty.notes ? (
            <>
              <View style={styles.separator} />
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={18} color={colors.textTertiary} />
                <View style={styles.detailRowContent}>
                  <Text style={styles.detailLabel}>{t('warranty.detail.notes')}</Text>
                  <Text style={styles.notesValue}>{warranty.notes}</Text>
                </View>
              </View>
            </>
          ) : null}
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
            <View style={styles.detailRowContent}>
              <Text style={styles.detailLabel}>{t('warranty.detail.added')}</Text>
              <Text style={styles.detailValue}>{formatDate(new Date(warranty.createdAt as Date), dateFormat)}</Text>
            </View>
          </View>
        </View>
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
              source={{ uri: warranty.imageUrl! }}
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
        </View>
      </Modal>

      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
        onDismiss={() => {
          const action = afterDismissRef.current;
          afterDismissRef.current = null;
          action?.();
        }}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowActionSheet(false)} />
        <View style={styles.actionSheet}>
          <View style={styles.actionSheetHandle} />
          {warranty.status === WarrantyStatus.ACTIVE && (
            <TouchableOpacity style={styles.actionSheetButton} onPress={handleEdit}>
              <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
              <Text style={[styles.actionSheetLabel, { color: colors.textPrimary }]}>{t('warranty.action.edit')}</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity style={styles.actionSheetButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
              <Text style={[styles.actionSheetLabel, { color: colors.danger }]}>{t('warranty.action.delete')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowActionSheet(false)}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
