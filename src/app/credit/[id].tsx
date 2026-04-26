import { useState, useRef, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExpirationBadge } from '@/components/redeemy/ExpirationBadge';
import { DetailRow } from '@/components/redeemy/DetailRow';
import { ActionModal } from '@/components/redeemy/ActionModal';
import { FullscreenImageViewer } from '@/components/redeemy/FullscreenImageViewer';
import { deleteCredit, updateCredit } from '@/lib/firestoreCredits';
import { cancelCreditNotifications } from '@/lib/notifications';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { formatCurrency } from '@/lib/formatCurrency';
import { formatDate } from '@/lib/formatDate';
import { useCreditsStore } from '@/stores/creditsStore';
import { useSettingsStore, CURRENCY_SYMBOLS } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { CreditStatus } from '@/types/creditTypes';
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
    amount: { fontSize: 36, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1, alignSelf: 'flex-start' },
    detailsCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
    addedFooterText: { fontSize: 12, color: colors.textTertiary, alignSelf: 'flex-start' },
    footer: {
      padding: 16,
      paddingBottom: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.separator,
    },
    redeemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 12,
    },
    buttonDisabled: { opacity: 0.7 },
    redeemButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    redeemedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    redeemedBannerText: { fontSize: 15, color: colors.textTertiary, fontWeight: '500' },
  });
}

export default function CreditDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useAppTheme();
  const isRTL = I18nManager.isRTL;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const dateFormat = useSettingsStore((s) => s.dateFormat);

  const credit = useCreditsStore((s) => s.credits.find((c) => c.id === id));
  const removeCredit = useCreditsStore((s) => s.removeCredit);
  const updateCreditInStore = useCreditsStore((s) => s.updateCredit);
  const currentUid = useAuthStore((s) => s.currentUser?.uid);
  const familyAdminId = useFamilyStore((s) => s.family?.adminId);
  const canDelete = credit
    ? credit.userId === currentUid || familyAdminId === currentUid
    : false;

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const afterDismissRef = useRef<(() => void) | null>(null);

  // Normalize images: use new images array, fall back to legacy imageUrl
  const images = credit?.images ?? (credit?.imageUrl ? [{ url: credit.imageUrl, thumbnailUrl: credit.thumbnailUrl ?? credit.imageUrl }] : []);
  const isRedeemed = credit?.status === CreditStatus.REDEEMED;

  const categoryMeta = useMemo(
    () => CATEGORIES.find((c) => c.id === credit?.category),
    [credit?.category]
  );

  if (!credit) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('credit.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  async function handleMarkRedeemed() {
    if (useUIStore.getState().offlineMode) {
      Alert.alert(t('offline.title'), t('credit.markRedeemed.offlineMessage'));
      return;
    }
    const c = credit!;
    Alert.alert(t('credit.markRedeemed.title'), t('credit.markRedeemed.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('credit.markRedeemed.confirm'),
        onPress: async () => {
          setLoading(true);
          try {
            await cancelCreditNotifications(c.notificationId, c.expirationNotificationId);
            updateCreditInStore(c.id, { status: CreditStatus.REDEEMED, redeemedAt: new Date() });
            await updateCredit(c.id, { status: CreditStatus.REDEEMED, redeemedAt: new Date() });
            router.back();
          } catch {
            updateCreditInStore(c.id, { status: CreditStatus.ACTIVE });
            Alert.alert(t('common.error'), t('credit.markRedeemed.error'));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  async function handleDelete() {
    if (useUIStore.getState().offlineMode) {
      setShowActionSheet(false);
      Alert.alert(t('offline.title'), t('credit.delete.offlineMessage'));
      return;
    }
    const c = credit!;
    setShowActionSheet(false);
    Alert.alert(t('credit.delete.title'), t('credit.delete.message', { storeName: c.storeName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('credit.delete.button'),
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await cancelCreditNotifications(c.notificationId, c.expirationNotificationId);
            removeCredit(c.id);
            await deleteCredit(c.id);
            router.back();
          } catch {
            setLoading(false);
            Alert.alert(t('common.error'), t('credit.delete.error'));
          }
        },
      },
    ]);
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
      const filename = `redeemy-${Date.now()}.jpg`;
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
    afterDismissRef.current = () => { router.push(`/add-credit?creditId=${credit!.id}`); };
    setShowActionSheet(false);
  }

  async function handleRestore() {
    setShowActionSheet(false);
    const c = credit!;
    setLoading(true);
    try {
      updateCreditInStore(c.id, { status: CreditStatus.ACTIVE, redeemedAt: undefined });
      await updateCredit(c.id, { status: CreditStatus.ACTIVE, redeemedAt: null as any });
      router.back();
    } catch {
      updateCreditInStore(c.id, { status: CreditStatus.REDEEMED, redeemedAt: c.redeemedAt });
      Alert.alert(t('common.error'), t('credit.restore.error'));
    } finally {
      setLoading(false);
    }
  }

  const expirationDate = credit.expirationDate
    ? (credit.expirationDate instanceof Date
        ? credit.expirationDate
        : new Date(credit.expirationDate as unknown as string))
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{credit.storeName}</Text>
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
                  const rawIdx = Math.round(e.nativeEvent.contentOffset.x / (Dimensions.get('window').width - 32));
                  const idx = isRTL ? (images.length - 1 - rawIdx) : rawIdx;
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
            <Ionicons name="image-outline" size={40} color={colors.textTertiary} />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.storeName}>{credit.storeName}</Text>
          <Text style={styles.amount}>{formatCurrency(credit.amount, CURRENCY_SYMBOLS[credit.currency ?? 'ILS'])}</Text>
          <ExpirationBadge expirationDate={expirationDate ?? undefined} />
        </View>

        <View style={styles.detailsCard}>
          <DetailRow
            icon="pricetag-outline"
            label={t('credit.detail.category')}
            value={categoryMeta ? t('category.' + categoryMeta.id) : credit.category}
            showSeparator
          />
          <DetailRow
            icon="calendar-outline"
            label={t('credit.detail.expires')}
            value={expirationDate ? formatDate(expirationDate, dateFormat) : t('credit.detail.noExpiry')}
            showSeparator={!!credit.notes}
          />
          {!!credit.notes && (
            <DetailRow
              icon="document-text-outline"
              label={t('credit.detail.notes')}
              value={credit.notes}
              multiline
            />
          )}
        </View>
        <Text style={styles.addedFooterText}>
          {t('credit.detail.added')}: {formatDate(new Date(credit.createdAt as Date), dateFormat)}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {isRedeemed ? (
          <View style={styles.redeemedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.textTertiary} />
            <Text style={styles.redeemedBannerText}>
              {credit.redeemedAt
                ? t('credit.redeemedOn', { date: formatDate(new Date(credit.redeemedAt as Date), dateFormat) })
                : t('credit.redeemed')}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.redeemButton, loading && styles.buttonDisabled]}
            onPress={handleMarkRedeemed}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('credit.markRedeemed.button')}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.redeemButtonText}>{t('credit.markRedeemed.button')}</Text>
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
          credit.status === CreditStatus.ACTIVE
            ? { icon: 'create-outline', label: t('credit.action.edit'), color: colors.textPrimary, onPress: handleEdit }
            : null,
          credit.status === CreditStatus.REDEEMED
            ? { icon: 'refresh-outline', label: t('credit.action.restore'), color: colors.primary, onPress: handleRestore }
            : null,
          canDelete
            ? { icon: 'trash-outline', label: t('credit.action.delete'), color: colors.danger, onPress: handleDelete }
            : null,
        ]}
      />
    </SafeAreaView>
  );
}
